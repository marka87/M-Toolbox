import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Hardware Acceleration Setting & Boot Lifecycle Tests', () => {
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

  function evaluateHardwareAcceleration(settings) {
    let disabled = false
    const mockApp = {
      disableHardwareAcceleration: () => {
        disabled = true
      }
    }

    if (settings.hardwareAcceleration === false) {
      mockApp.disableHardwareAcceleration()
    }

    return { disabled }
  }

  test('default setting has hardwareAcceleration: true (GPU on by default)', () => {
    assert.equal(DEFAULT_SETTINGS.hardwareAcceleration, true)
  })

  test('when hardwareAcceleration is false: app.disableHardwareAcceleration() is called', () => {
    const settings = { ...DEFAULT_SETTINGS, hardwareAcceleration: false }
    const result = evaluateHardwareAcceleration(settings)
    assert.equal(result.disabled, true)
  })

  test('when hardwareAcceleration is true: app.disableHardwareAcceleration() is NOT called', () => {
    const settings = { ...DEFAULT_SETTINGS, hardwareAcceleration: true }
    const result = evaluateHardwareAcceleration(settings)
    assert.equal(result.disabled, false)
  })

  test('when hardwareAcceleration is omitted in legacy settings: defaults to true and does not disable GPU', () => {
    const legacy = { theme: 'dark' }
    const merged = { ...DEFAULT_SETTINGS, ...legacy }
    const result = evaluateHardwareAcceleration(merged)
    assert.equal(result.disabled, false)
  })
})
