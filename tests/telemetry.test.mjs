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

  test('Signature dirty-checking for IPC push prevention (including healthPercent)', () => {
    const makeSignature = (metrics) => {
      return `${metrics.cpuUsagePercent}_${metrics.ramUsagePercent}_${metrics.networkReceiveKBps}_${metrics.networkSendKBps}_${metrics.gpuUsagePercent}_${metrics.battery?.percent}_${metrics.battery?.isCharging}_${metrics.battery?.isAcOnline}_${metrics.battery?.chargeRateWatts}_${metrics.battery?.dischargeRateWatts}_${metrics.battery?.healthPercent}`
    }

    const state1 = {
      cpuUsagePercent: 12,
      ramUsagePercent: 45,
      networkReceiveKBps: 10,
      networkSendKBps: 2,
      gpuUsagePercent: 5,
      battery: {
        percent: 80,
        isCharging: false,
        isAcOnline: true,
        chargeRateWatts: 0,
        dischargeRateWatts: 0,
        healthPercent: 95
      }
    }

    const state2 = { ...state1 }

    assert.equal(makeSignature(state1), makeSignature(state2))

    // CPU changes
    const state3 = { ...state1, cpuUsagePercent: 14 }
    assert.notEqual(makeSignature(state1), makeSignature(state3))

    // Battery percent changes
    const state4 = { ...state1, battery: { ...state1.battery, percent: 79 } }
    assert.notEqual(makeSignature(state1), makeSignature(state4))

    // Health percent changes
    const state5 = { ...state1, battery: { ...state1.battery, healthPercent: 94 } }
    assert.notEqual(makeSignature(state1), makeSignature(state5))
  })

  test('showGpuUsage setting default and backward compatibility migration', () => {
    const DEFAULT_SETTINGS = {
      theme: 'dark',
      accentColor: 'blue',
      startModule: 'dashboard',
      autoStart: false,
      minimizeToTray: false,
      transparencyEffects: true,
      hardwareAcceleration: true,
      experimentalHybridGpuCounters: false,
      showGpuUsage: false
    }

    // Default is false
    assert.equal(DEFAULT_SETTINGS.showGpuUsage, false)

    // Legacy settings file from disk without showGpuUsage field
    const legacyParsedDiskSettings = {
      theme: 'dark',
      accentColor: 'indigo',
      autoStart: true
    }

    const merged = { ...DEFAULT_SETTINGS, ...legacyParsedDiskSettings }
    assert.equal(merged.showGpuUsage, false)
    assert.equal(merged.accentColor, 'indigo')
    assert.equal(merged.autoStart, true)

    // User explicitly enabled showGpuUsage
    const userEnabled = { ...DEFAULT_SETTINGS, ...legacyParsedDiskSettings, showGpuUsage: true }
    assert.equal(userEnabled.showGpuUsage, true)
  })

  test('Metrics subscription excludes "gpu" when showGpuUsage is false', () => {
    const getRequestedMetrics = (component, showGpu) => {
      if (component === 'hud') {
        const list = ['cpu', 'ram', 'battery', 'watts']
        if (showGpu) list.push('gpu')
        return list
      }
      if (component === 'dashboard') {
        const list = ['cpu', 'ram', 'net']
        if (showGpu) list.push('gpu')
        return list
      }
      return []
    }

    // Default: showGpu = false -> neither requests gpu
    const hudDefault = getRequestedMetrics('hud', false)
    assert.ok(!hudDefault.includes('gpu'), 'HUD default must not contain gpu')
    assert.ok(hudDefault.includes('watts'), 'HUD must contain watts')

    const dashDefault = getRequestedMetrics('dashboard', false)
    assert.ok(!dashDefault.includes('gpu'), 'Dashboard default must not contain gpu')

    // Enabled: showGpu = true -> both contain gpu
    const hudGpu = getRequestedMetrics('hud', true)
    assert.ok(hudGpu.includes('gpu'), 'HUD must contain gpu when enabled')

    const dashGpu = getRequestedMetrics('dashboard', true)
    assert.ok(dashGpu.includes('gpu'), 'Dashboard must contain gpu when enabled')
  })

  test('Renderer throttling limits updates to 1s on AC and 2s on battery', () => {
    const shouldUpdate = (now, lastUpdate, isAcOnline, hasBattery) => {
      const isEco = hasBattery && !isAcOnline
      const minInterval = isEco ? 2000 : 1000
      return (now - lastUpdate) >= minInterval
    }

    const last = 10000
    // AC power (1s threshold)
    assert.equal(shouldUpdate(10500, last, true, true), false) // 500ms elapsed -> throttled
    assert.equal(shouldUpdate(10999, last, true, true), false) // 999ms elapsed -> throttled
    assert.equal(shouldUpdate(11000, last, true, true), true)  // 1000ms elapsed -> pass

    // Battery / Eco power (2s threshold)
    assert.equal(shouldUpdate(11500, last, false, true), false) // 1500ms elapsed -> throttled
    assert.equal(shouldUpdate(11999, last, false, true), false) // 1999ms elapsed -> throttled
    assert.equal(shouldUpdate(12000, last, false, true), true)  // 2000ms elapsed -> pass
  })
})

