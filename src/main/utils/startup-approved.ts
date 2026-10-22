const RUN = 'Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const APPROVED = 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved'
// FILETIME counts 100 ns steps since 1601-01-01
const FILETIME_UNIX_EPOCH = BigInt('116444736000000000')

export interface StartupTarget {
  /** Registry key holding the entry (reg.exe syntax); missing for Startup folder files */
  runKey?: string
  /** Key where Windows (and Task Manager) stores the enabled/disabled flag */
  approvedKey: string
  name: string
}

/** Maps the ids from getStartupItems ("hkcu_", "hklm_", "folder_" + name) to registry keys. */
export function parseStartupItemId(itemId: unknown): StartupTarget | null {
  if (typeof itemId !== 'string') return null
  const match = /^(hkcu|hklm|folder)_(.+)$/s.exec(itemId)
  if (!match) return null
  const [, kind, name] = match
  if (kind === 'folder') {
    // A file name only, never a path out of the Startup folder
    if (/[\\/]/.test(name) || name === '.' || name === '..') return null
    return { approvedKey: `HKCU\\${APPROVED}\\StartupFolder`, name }
  }
  const hive = kind.toUpperCase()
  return { runKey: `${hive}\\${RUN}`, approvedKey: `${hive}\\${APPROVED}\\Run`, name }
}

/** StartupApproved value as hex for reg.exe: first byte 02 = enabled, 03 = disabled + FILETIME of the change. */
export function startupApprovedHex(enabled: boolean, now = Date.now()): string {
  if (enabled) return '02' + '00'.repeat(11)
  const fileTime = BigInt(now) * BigInt(10000) + FILETIME_UNIX_EPOCH
  const bytes = new Uint8Array(8)
  new DataView(bytes.buffer).setBigUint64(0, fileTime, true)
  return '03000000' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
