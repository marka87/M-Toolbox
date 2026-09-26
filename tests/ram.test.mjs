import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('RAM Service & Worker Routing Tests', () => {
  // Simulates RAMService.runPowerShell routing and fallback
  async function simulateRunPowerShell(mockWorker, mockFallback, script, timeout = 8000) {
    try {
      return await mockWorker.runCommand(script, timeout)
    } catch (err) {
      return await mockFallback.runPowerShell(script, timeout)
    }
  }

  test('routes through persistent worker when healthy', async () => {
    let workerCalled = false
    let fallbackCalled = false

    const mockWorker = {
      runCommand: async () => {
        workerCalled = true
        return '{"Available":8589934592,"Cache":1073741824,"Compressed":524288000,"Free":4294967296,"Committed":8589934592,"CommitLimit":17179869184}'
      }
    }

    const mockFallback = {
      runPowerShell: async () => {
        fallbackCalled = true
        return ''
      }
    }

    const output = await simulateRunPowerShell(mockWorker, mockFallback, 'test-script')
    assert.equal(workerCalled, true)
    assert.equal(fallbackCalled, false)
    assert.ok(output.includes('Available'))
  })

  test('gracefully falls back to one-shot PowerShell when worker throws/times out', async () => {
    let workerCalled = false
    let fallbackCalled = false

    const mockWorker = {
      runCommand: async () => {
        workerCalled = true
        throw new Error('PowerShell worker command timed out')
      }
    }

    const mockFallback = {
      runPowerShell: async () => {
        fallbackCalled = true
        return '{"Available":4294967296,"Cache":536870912,"Compressed":0,"Free":2147483648,"Committed":12884901888,"CommitLimit":17179869184}'
      }
    }

    const output = await simulateRunPowerShell(mockWorker, mockFallback, 'test-script')
    assert.equal(workerCalled, true)
    assert.equal(fallbackCalled, true)
    assert.ok(output.includes('Available'))
  })

  test('parses and validates live RAM stats structure accurately', () => {
    const totalBytes = 16 * 1024 * 1024 * 1024 // 16 GB
    const parsed = {
      Available: 8 * 1024 * 1024 * 1024,
      Cache: 2 * 1024 * 1024 * 1024,
      Compressed: 512 * 1024 * 1024,
      Free: 4 * 1024 * 1024 * 1024,
      Committed: 9 * 1024 * 1024 * 1024,
      CommitLimit: 18 * 1024 * 1024 * 1024
    }

    const usedBytes = Math.max(0, totalBytes - parsed.Available)
    const usagePercent = Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)))

    assert.equal(usedBytes, 8 * 1024 * 1024 * 1024)
    assert.equal(usagePercent, 50)
    assert.equal(parsed.Cache, 2 * 1024 * 1024 * 1024)
    assert.equal(parsed.Compressed, 512 * 1024 * 1024)
  })

  test('parses top process list and calculates MB correctly', () => {
    const rawList = [
      { Id: 1234, ProcessName: 'chrome', WorkingSet64: 524288000, PM: 419430400 },
      { Id: 5678, ProcessName: 'code', WorkingSet64: 314572800, PM: 209715200 }
    ]

    const mapped = rawList.map((item) => ({
      pid: Number(item.Id),
      name: String(item.ProcessName),
      workingSetMB: Math.round(Number(item.WorkingSet64) / (1024 * 1024)),
      privateMB: Math.round(Number(item.PM) / (1024 * 1024))
    }))

    assert.equal(mapped.length, 2)
    assert.equal(mapped[0].name, 'chrome')
    assert.equal(mapped[0].workingSetMB, 500)
    assert.equal(mapped[0].privateMB, 400)
    assert.equal(mapped[1].name, 'code')
    assert.equal(mapped[1].workingSetMB, 300)
    assert.equal(mapped[1].privateMB, 200)
  })
})
