// Only web links and Windows settings pages. file:// and other protocol handlers can start programs.
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'ms-settings:'])

export function isAllowedExternalUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}
