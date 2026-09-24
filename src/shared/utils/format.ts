/**
 * Formats a byte number into human-readable string (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const idx = Math.min(i, sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`
}

/**
 * Formats transfer speed in bytes per second into KB/s, MB/s, GB/s
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || isNaN(bytesPerSec)) return '0 B/s'
  return `${formatBytes(bytesPerSec)}/s`
}

/**
 * Formats a duration in seconds into human-readable string (e.g. "1 Std. 25 Min." or "45 Sek.")
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0 || isNaN(seconds)) return '0 Sek.'
  const sec = Math.round(seconds)
  if (sec < 60) return `${sec} Sek.`
  const min = Math.floor(sec / 60)
  const remainingSec = sec % 60
  if (min < 60) {
    return remainingSec > 0 ? `${min} Min. ${remainingSec} Sek.` : `${min} Min.`
  }
  const hours = Math.floor(min / 60)
  const remainingMin = min % 60
  return remainingMin > 0 ? `${hours} Std. ${remainingMin} Min.` : `${hours} Std.`
}

/**
 * Formats a percentage value (0 to 100)
 */
export function formatPercent(value: number, decimals = 1): string {
  if (isNaN(value)) return '0 %'
  return `${value.toFixed(decimals)} %`
}
