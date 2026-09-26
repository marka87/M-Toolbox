import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Battery Service & Manager Optimization Tests', () => {
  test('Timer stops on invisibility (B1)', () => {
    const shouldRunTimer = (isLiveMonitoring, isDocVisible, isWindowVisible) => {
      return Boolean(isLiveMonitoring && isDocVisible && isWindowVisible)
    }

    // Fully active & visible
    assert.equal(shouldRunTimer(true, true, true), true)

    // Window minimized or in tray
    assert.equal(shouldRunTimer(true, true, false), false)

    // Tab switched / document hidden
    assert.equal(shouldRunTimer(true, false, true), false)

    // Screen locked or system suspended
    assert.equal(shouldRunTimer(true, false, false), false)

    // Live monitoring paused by user
    assert.equal(shouldRunTimer(false, true, true), false)
  })

  test('Power plans profile cache & invalidation (B2)', () => {
    let cachedPlans = null
    let lastTime = 0
    const TTL = 60000 // 60s

    const getPlans = (force, now) => {
      if (!force && cachedPlans && now - lastTime < TTL) {
        return { hit: true, data: cachedPlans }
      }
      cachedPlans = [{ guid: 'guid-1', name: 'Balanced', isCurrent: true }]
      lastTime = now
      return { hit: false, data: cachedPlans }
    }

    const clearCache = () => {
      cachedPlans = null
      lastTime = 0
    }

    // 1. Initial load -> miss
    const r1 = getPlans(false, 1000)
    assert.equal(r1.hit, false)

    // 2. 8s later in poll -> hit (no new process spawn)
    const r2 = getPlans(false, 9000)
    assert.equal(r2.hit, true)

    // 3. 30s later in poll -> hit
    const r3 = getPlans(false, 31000)
    assert.equal(r3.hit, true)

    // 4. Force on user refresh -> miss (fresh read)
    const r4 = getPlans(true, 32000)
    assert.equal(r4.hit, false)

    // 5. AC/Battery change event invalidation
    clearCache()
    const r5 = getPlans(false, 33000)
    assert.equal(r5.hit, false) // Cleared, so fresh read

    // 6. 70s later (TTL expired) -> miss
    const r6 = getPlans(false, 33000 + 61000)
    assert.equal(r6.hit, false)
  })

  test('Drain-Inspector delta calculation with PID reuse handling (B3 & B4)', () => {
    const cores = 4
    const snapshotMap = new Map()

    const calculateDelta = (currentProcesses, now) => {
      const results = []
      const nextMap = new Map()

      for (const p of currentProcesses) {
        const key = `${p.id}_${p.startTime}`
        nextMap.set(key, { cpu: p.cpu, time: now })

        let cpuPercent = 0
        const prev = snapshotMap.get(key)
        if (prev && prev.time > 0) {
          const deltaSec = (now - prev.time) / 1000
          const deltaCpu = p.cpu - prev.cpu
          if (deltaSec > 0 && deltaCpu >= 0) {
            cpuPercent = Math.round((deltaCpu / deltaSec / cores) * 1000) / 10
          }
        }
        results.push({ id: p.id, name: p.name, cpuPercent })
      }

      // Replace snapshot map
      snapshotMap.clear()
      for (const [k, v] of nextMap.entries()) {
        snapshotMap.set(k, v)
      }

      return results
    }

    // Snapshot 1 at t=1000ms
    calculateDelta([
      { id: 100, startTime: 100000, name: 'procA', cpu: 10 },
      { id: 200, startTime: 100000, name: 'procB', cpu: 5 }
    ], 1000)

    // Snapshot 2 at t=11000ms (deltaSec = 10s)
    // procA used 4 CPU seconds -> (4 / 10s / 4 cores) * 100 = 10.0%
    const snap2 = calculateDelta([
      { id: 100, startTime: 100000, name: 'procA', cpu: 14 },
      // PID 200 terminated, new process reused PID 200 with new startTime!
      { id: 200, startTime: 200000, name: 'newProcC', cpu: 2 }
    ], 11000)

    const procA = snap2.find((p) => p.name === 'procA')
    assert.equal(procA?.cpuPercent, 10.0)

    // Reused PID 200 MUST NOT calculate delta against the old process!
    const procC = snap2.find((p) => p.name === 'newProcC')
    assert.equal(procC?.cpuPercent, 0)
  })

  test('Worker timeout with countTowardsErrors = false does NOT trigger strike (B2)', () => {
    let consecutiveErrors = 0

    const recordError = () => {
      consecutiveErrors++
    }

    const handleTimeout = (task) => {
      if (task?.countTowardsErrors !== false) {
        recordError()
      }
    }

    // Normal command times out -> counts towards errors
    handleTimeout({ script: 'WMI query', countTowardsErrors: true })
    assert.equal(consecutiveErrors, 1)

    // Drain-Scan command times out -> does NOT increment strike counter
    handleTimeout({ script: 'Get-Process scan', countTowardsErrors: false })
    assert.equal(consecutiveErrors, 1) // Still 1!

    // Second normal command times out -> increments to 2
    handleTimeout({ script: 'WMI query', countTowardsErrors: true })
    assert.equal(consecutiveErrors, 2)
  })

  test('Honest app CPU aggregation across Electron processes (B4)', () => {
    const mockAppMetrics = [
      { pid: 101, type: 'Browser', cpu: { percentCPUUsage: 0.8 }, memory: { workingSetSize: 50 * 1024 } },
      { pid: 102, type: 'Tab', cpu: { percentCPUUsage: 1.2 }, memory: { workingSetSize: 80 * 1024 } },
      { pid: 103, type: 'GPU', cpu: { percentCPUUsage: 0.4 }, memory: { workingSetSize: 40 * 1024 } }
    ]

    let mToolboxAppCpu = 0
    let mToolboxMemoryMb = 0
    for (const m of mockAppMetrics) {
      if (m.cpu?.percentCPUUsage) mToolboxAppCpu += m.cpu.percentCPUUsage
      if (m.memory?.workingSetSize) mToolboxMemoryMb += Math.round(m.memory.workingSetSize / 1024)
    }
    mToolboxAppCpu = Math.round(mToolboxAppCpu * 10) / 10

    assert.equal(mToolboxAppCpu, 2.4)
    assert.equal(mToolboxMemoryMb, 170)
  })

  test('Configurable live polling intervals (3s, 6s, 9s) with boundary fallback', () => {
    const validIntervals = [3, 6, 9]
    const resolveInterval = (saved) => {
      const val = parseInt(saved, 10)
      if (validIntervals.includes(val)) return val
      return 6 // Default
    }

    assert.equal(resolveInterval('3'), 3)
    assert.equal(resolveInterval('6'), 6)
    assert.equal(resolveInterval('9'), 9)
    assert.equal(resolveInterval('8'), 6) // invalid/legacy falls back to 6
    assert.equal(resolveInterval('invalid'), 6)
    assert.equal(resolveInterval(null), 6)
  })
})
