import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Telemetry Service Logic & Parser Tests', () => {
  test('NvidiaSmi line parsing & clamping', () => {
    let lastGpuVal = null
    const onValue = (val) => {
      lastGpuVal = val
    }

    // Simulate chunk stream
    let buffer = ''
    const chunk1 = '15\n45\n'
    buffer += chunk1
    const lines1 = buffer.split(/\r?\n/)
    buffer = lines1.pop() || ''

    for (const line of lines1) {
      const val = parseInt(line.trim(), 10)
      if (!isNaN(val)) onValue(Math.min(100, Math.max(0, val)))
    }

    assert.equal(lastGpuVal, 45)

    // Test incomplete line in next chunk
    const chunk2 = '9'
    buffer += chunk2
    const lines2 = buffer.split(/\r?\n/)
    buffer = lines2.pop() || ''
    for (const line of lines2) {
      const val = parseInt(line.trim(), 10)
      if (!isNaN(val)) onValue(Math.min(100, Math.max(0, val)))
    }
    // Should still be 45 because '9' is incomplete in buffer
    assert.equal(lastGpuVal, 45)

    // Complete line in next chunk
    const chunk3 = '9\n'
    buffer += chunk3
    const lines3 = buffer.split(/\r?\n/)
    buffer = lines3.pop() || ''
    for (const line of lines3) {
      const val = parseInt(line.trim(), 10)
      if (!isNaN(val)) onValue(Math.min(100, Math.max(0, val)))
    }
    // Now '99' is parsed
    assert.equal(lastGpuVal, 99)

    // Value exceeding 100 is clamped
    const chunk4 = '150\n'
    buffer += chunk4
    const lines4 = buffer.split(/\r?\n/)
    buffer = lines4.pop() || ''
    for (const line of lines4) {
      const val = parseInt(line.trim(), 10)
      if (!isNaN(val)) onValue(Math.min(100, Math.max(0, val)))
    }
    assert.equal(lastGpuVal, 100)
  })

  test('PersistentPowerShell EOF marker parsing', () => {
    const EOF_MARKER = '___MTB_EOF___'
    const rawStdout = `{"Status":"OK","Remaining":50000,"Full":60000}\r\n${EOF_MARKER}\r\n`

    const markerIdx = rawStdout.indexOf(EOF_MARKER)
    assert.notEqual(markerIdx, -1)

    const output = rawStdout.substring(0, markerIdx).trim()
    const parsed = JSON.parse(output)
    assert.equal(parsed.Status, 'OK')
    assert.equal(parsed.Remaining, 50000)
    assert.equal(parsed.Full, 60000)
  })

  test('Battery percent calculation & clamp', () => {
    const calcPercent = (remaining, full) => {
      if (remaining > 0 && full > 0) {
        return Math.min(100, Math.max(0, Math.round((remaining / full) * 100)))
      }
      return null
    }

    assert.equal(calcPercent(45000, 50000), 90)
    assert.equal(calcPercent(55000, 50000), 100)
    assert.equal(calcPercent(0, 50000), null)
    assert.equal(calcPercent(50000, 0), null)
  })

  test('Battery health (Wear-Level) calculation', () => {
    const calcHealth = (designed, full) => {
      if (designed > 0 && full > 0) {
        return Math.min(100, Math.max(0, Math.round((full / designed) * 100)))
      }
      return undefined
    }

    assert.equal(calcHealth(70000, 63000), 90)
    assert.equal(calcHealth(70000, 75000), 100) // Capped at 100
    assert.equal(calcHealth(0, 63000), undefined)
    assert.equal(calcHealth(70000, 0), undefined)
  })

  test('Eco multiplier logic', () => {
    const getMultiplier = (isAcOnline, hasBattery) => {
      const isEco = !isAcOnline && hasBattery
      return isEco ? 2 : 1
    }

    assert.equal(getMultiplier(true, true), 1) // On AC
    assert.equal(getMultiplier(false, true), 2) // On Battery -> Eco
    assert.equal(getMultiplier(false, false), 1) // Desktop PC (no battery)
  })

  test('Signature dirty-checking for IPC push prevention', () => {
    const makeSignature = (metrics) => {
      return `${metrics.cpuUsagePercent}_${metrics.ramUsagePercent}_${metrics.networkReceiveKBps}_${metrics.networkSendKBps}_${metrics.gpuUsagePercent}_${metrics.battery?.percent}_${metrics.battery?.isCharging}_${metrics.battery?.isAcOnline}_${metrics.battery?.chargeRateWatts}_${metrics.battery?.dischargeRateWatts}`
    }

    const state1 = {
      cpuUsagePercent: 12,
      ramUsagePercent: 45,
      networkReceiveKBps: 10,
      networkSendKBps: 2,
      gpuUsagePercent: 5,
      battery: { percent: 80, isCharging: false, isAcOnline: true, chargeRateWatts: 0, dischargeRateWatts: 0 }
    }

    const state2 = { ...state1 }

    assert.equal(makeSignature(state1), makeSignature(state2))

    // CPU changes
    const state3 = { ...state1, cpuUsagePercent: 14 }
    assert.notEqual(makeSignature(state1), makeSignature(state3))
  })
})
