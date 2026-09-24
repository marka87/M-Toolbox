/**
 * Utility functions for Mini-HUD typography and formatting.
 * Single source of truth for fixed-width tabular formatting.
 */

export function formatHudPercent(percent: number): string {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  return `${clamped} %`
}

export function formatHudWattage(watts: number): string {
  if (isNaN(watts)) return '0.0 W'
  // Round to 1 decimal place to prevent floating-point -0.0
  const rounded = Math.round(watts * 10) / 10
  if (rounded > 0) {
    return `+${rounded.toFixed(1)} W`
  }
  if (rounded < 0) {
    return `\u2212${Math.abs(rounded).toFixed(1)} W`
  }
  return '0.0 W'
}

export function formatHudRamGB(ramGB: number): string {
  return `${Math.round(ramGB)}G`
}

export function getMetricColor(val: number): { text: string; bg: string } {
  if (val < 60) return { text: 'text-emerald-400', bg: 'bg-emerald-400' }
  if (val < 85) return { text: 'text-amber-400', bg: 'bg-amber-400' }
  return { text: 'text-rose-500', bg: 'bg-rose-500' }
}
