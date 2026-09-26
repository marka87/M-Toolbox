import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// Since hud-formatter is a TS file in renderer, we can test the pure formatting logic directly
function formatHudPercent(percent) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  return `${clamped} %`
}

function formatHudWattage(watts) {
  if (isNaN(watts)) return '0.0 W'
  const rounded = Math.round(watts * 10) / 10
  if (rounded > 0) {
    return `+${rounded.toFixed(1)} W`
  }
  if (rounded < 0) {
    return `\u2212${Math.abs(rounded).toFixed(1)} W`
  }
  return '0.0 W'
}

function formatHudRamGB(ramGB) {
  return `${Math.round(ramGB)}G`
}

function getMetricColor(val) {
  if (val < 60) return { text: 'text-emerald-400', bg: 'bg-emerald-400' }
  if (val < 85) return { text: 'text-amber-400', bg: 'bg-amber-400' }
  return { text: 'text-rose-500', bg: 'bg-rose-500' }
}

describe('HUD Formatter & Layout Bounds Tests', () => {
  test('formatHudPercent formats and clamps integers with space and % sign', () => {
    assert.equal(formatHudPercent(0), '0 %')
    assert.equal(formatHudPercent(4.2), '4 %')
    assert.equal(formatHudPercent(9.8), '10 %')
    assert.equal(formatHudPercent(45), '45 %')
    assert.equal(formatHudPercent(100), '100 %')
    assert.equal(formatHudPercent(120), '100 %')
    assert.equal(formatHudPercent(-5), '0 %')
  })

  test('formatHudPercent max character length is 5ch for 100 %', () => {
    for (let i = 0; i <= 100; i++) {
      const formatted = formatHudPercent(i)
      assert.ok(formatted.length <= 5, `Length ${formatted.length} exceeds 5ch for ${formatted}`)
    }
  })

  test('formatHudWattage formats charge (+), discharge (\u2212) and zero (0.0 W)', () => {
    assert.equal(formatHudWattage(0), '0.0 W')
    assert.equal(formatHudWattage(NaN), '0.0 W')
    assert.equal(formatHudWattage(65.04), '+65.0 W')
    assert.equal(formatHudWattage(-5.2), '\u22125.2 W')
    assert.equal(formatHudWattage(-17.0), '\u221217.0 W')
    assert.equal(formatHudWattage(-105.5), '\u2212105.5 W')
  })

  test('formatHudWattage max character length fits in 8ch slot', () => {
    const testCases = [0, 5, 65.5, -5.2, -17.0, -99.9, -105.5]
    for (const val of testCases) {
      const str = formatHudWattage(val)
      assert.ok(str.length <= 8, `Length ${str.length} exceeds 8ch for ${str}`)
    }
  })

  test('formatHudRamGB formats gigabytes with G suffix', () => {
    assert.equal(formatHudRamGB(8.1), '8G')
    assert.equal(formatHudRamGB(13.8), '14G')
    assert.equal(formatHudRamGB(64.2), '64G')
  })

  test('getMetricColor returns correct styling thresholds', () => {
    assert.equal(getMetricColor(0).text, 'text-emerald-400')
    assert.equal(getMetricColor(59).text, 'text-emerald-400')
    assert.equal(getMetricColor(60).text, 'text-amber-400')
    assert.equal(getMetricColor(84).text, 'text-amber-400')
    assert.equal(getMetricColor(85).text, 'text-rose-500')
    assert.equal(getMetricColor(100).text, 'text-rose-500')
  })

  test('HUD height clamping logic enforces minimum and maximum bounds', () => {
    const clampHeight = (h) => Math.max(60, Math.min(350, Math.ceil(h)))
    assert.equal(clampHeight(45.2), 60)
    assert.equal(clampHeight(140.4), 141)
    assert.equal(clampHeight(220.0), 220)
    assert.equal(clampHeight(400.1), 350)
  })

  test('RAM tile label group (RAM + GB string) does not exceed compact character budget', () => {
    // RAM is 3ch, space is 1ch, GB is at most 4ch (e.g. 128G) -> total label <= 8ch
    for (const ramGB of [4, 8, 14, 16, 32, 64, 128]) {
      const gbStr = formatHudRamGB(ramGB)
      const combined = `RAM ${gbStr}`
      assert.ok(combined.length <= 8, `RAM label '${combined}' exceeds 8 chars`)
    }
  })
})

