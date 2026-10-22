import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// Load the real helper (not a copy), so the test breaks when the helper does
const source = fs.readFileSync(new URL('../src/main/utils/startup-approved.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { parseStartupItemId, startupApprovedHex } = await import(`data:text/javascript,${encodeURIComponent(js)}`)

describe('Autostart: StartupApproved keys & values', () => {
  test('registry ids keep names with spaces, quotes and $ unchanged', () => {
    assert.deepEqual(parseStartupItemId('hkcu_Steam Client'), {
      runKey: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      approvedKey: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run',
      name: 'Steam Client'
    })
    assert.equal(parseStartupItemId('hklm_Evil "$(calc)"').name, 'Evil "$(calc)"')
    assert.equal(parseStartupItemId('hklm_x').runKey, 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run')
  })

  test('startup folder ids map to StartupFolder and allow no paths', () => {
    assert.deepEqual(parseStartupItemId('folder_Discord.lnk'), {
      approvedKey: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder',
      name: 'Discord.lnk'
    })
    assert.equal(parseStartupItemId('folder_..\\..\\boot.ini'), null)
    assert.equal(parseStartupItemId('folder_../x'), null)
    assert.equal(parseStartupItemId('folder_..'), null)
  })

  test('unknown or malformed ids are rejected', () => {
    assert.equal(parseStartupItemId('hkcu_'), null)
    assert.equal(parseStartupItemId('other_x'), null)
    assert.equal(parseStartupItemId(undefined), null)
  })

  test('enabled value is 02 followed by 11 zero bytes', () => {
    assert.equal(startupApprovedHex(true), '02' + '00'.repeat(11))
  })

  test('disabled value is 03 000000 + FILETIME (little endian), 12 bytes like Task Manager', () => {
    // 2024-01-01T00:00:00Z = FILETIME 133485408000000000 = 0x01DA3C457689C000
    const hex = startupApprovedHex(false, Date.UTC(2024, 0, 1))
    assert.equal(hex, '03000000' + '00c08976453cda01')
    assert.equal(hex.length, 24)
  })
})
