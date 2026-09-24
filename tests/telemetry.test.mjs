import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Telemetry Service Logic & Parser Tests', () => {
  test('NvidiaSmi output parsing & clamping', () => {
    const parseGpu = (stdout) => {
      const val = parseInt(stdout.trim(), 10)
      if (isNaN(val)) return 0
      return Math.min(100, Math.max(0, val))
    }

    assert.equal(parseGpu('25\r\n'), 25)
    assert.equal(parseGpu('0\n'), 0)
    assert.equal(parseGpu('100\n'), 100)
    assert.equal(parseGpu('150\n'), 100) // Clamped
    assert.equal(parseGpu('-5\n'), 0) // Clamped
    assert.equal(parseGpu('invalid'), 0)
  })

  test('Unified Battery JSON parsing', () => {
    const raw = '{"HasBat":true,"LineStatus":"Online","Percent":85,"Status":"High","ChargeRate":0,"DischargeRate":0}'
    const parsed = JSON.parse(raw)

    assert.equal(parsed.HasBat, true)
    assert.equal(parsed.LineStatus, 'Online')
    assert.equal(parsed.Percent, 85)
    assert.equal(parsed.Status, 'High')
    assert.equal(parsed.ChargeRate, 0)
    assert.equal(parsed.DischargeRate, 0)
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

    // Battery percent changes
    const state4 = { ...state1, battery: { ...state1.battery, percent: 79 } }
    assert.notEqual(makeSignature(state1), makeSignature(state4))
  })
})
