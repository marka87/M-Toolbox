import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// Load the real helper (not a copy), so the test breaks when the allowlist does
const source = fs.readFileSync(new URL('../src/main/utils/external-url.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { isAllowedExternalUrl } = await import(`data:text/javascript,${encodeURIComponent(js)}`)

describe('External URL allowlist (shell.openExternal)', () => {
  test('allows web links and Windows settings pages used by the app', () => {
    assert.equal(isAllowedExternalUrl('https://github.com/marka87/M-Toolbox/releases'), true)
    assert.equal(isAllowedExternalUrl('http://example.com'), true)
    assert.equal(isAllowedExternalUrl('ms-settings:windowsupdate'), true)
    assert.equal(isAllowedExternalUrl('ms-settings:troubleshoot'), true)
  })

  test('blocks protocols that can start programs', () => {
    assert.equal(isAllowedExternalUrl('file:///C:/Windows/System32/cmd.exe'), false)
    assert.equal(isAllowedExternalUrl('FILE:///C:/evil.exe'), false)
    assert.equal(isAllowedExternalUrl('search-ms:query=x'), false)
    assert.equal(isAllowedExternalUrl('ms-msdt:/id PCWDiagnostic'), false)
    assert.equal(isAllowedExternalUrl('C:\\Windows\\System32\\cmd.exe'), false)
  })

  test('blocks empty, malformed and non-string input', () => {
    assert.equal(isAllowedExternalUrl(''), false)
    assert.equal(isAllowedExternalUrl('not a url'), false)
    assert.equal(isAllowedExternalUrl(undefined), false)
    assert.equal(isAllowedExternalUrl(42), false)
  })
})
