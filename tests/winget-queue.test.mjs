import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Load the real SoftwareService (not a copy); its PowerShell import is transpiled next to it
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtb-winget-'))
for (const name of ['powershell.service', 'software.service']) {
  const source = fs.readFileSync(new URL(`../src/main/services/${name}.ts`, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  fs.writeFileSync(path.join(dir, `${name}.mjs`), js.replace("'./powershell.service'", "'./powershell.service.mjs'"))
}
const { SoftwareService } = await import(pathToFileURL(path.join(dir, 'software.service.mjs')))

// winget fails when several instances run at once, so the service must never overlap them
function fakePowerShell() {
  const calls = []
  let running = 0
  let maxRunning = 0
  return {
    calls,
    get maxRunning() { return maxRunning },
    executeCommand: async (command) => {
      calls.push(command)
      maxRunning = Math.max(maxRunning, ++running)
      await new Promise((r) => setTimeout(r, 20))
      running--
      return { stdout: '', stderr: '', exitCode: 0 }
    },
    streamCommand: (command, _onData, _onError, onExit) => {
      calls.push(command)
      maxRunning = Math.max(maxRunning, ++running)
      setTimeout(() => { running--; onExit(0) }, 20)
      return { kill: () => {} }
    }
  }
}

describe('Software Center: winget calls run one at a time', () => {
  test('page load (catalog + installed + updates at once) runs winget list and upgrade once each, never in parallel', async () => {
    const s = SoftwareService.getInstance()
    const ps = fakePowerShell()
    s.ps = ps
    await Promise.all([s.getCatalog(), s.getInstalledPackages(), s.getAvailableUpdates()])
    assert.equal(ps.maxRunning, 1)
    assert.equal(ps.calls.filter((c) => c.startsWith('winget list')).length, 1)
    assert.equal(ps.calls.filter((c) => c.startsWith('winget upgrade')).length, 1)
  })

  test('installs wait for running reads and for each other', async () => {
    const s = SoftwareService.getInstance()
    const ps = fakePowerShell()
    s.ps = ps
    await Promise.all([
      s.installPackage('A.A', () => {}),
      s.getInstalledPackages(),
      s.installPackage('B.B', () => {})
    ])
    assert.equal(ps.maxRunning, 1)
    assert.equal(ps.calls.length, 3)
  })

  test('a failed winget call does not block the next one', async () => {
    const s = SoftwareService.getInstance()
    const ps = fakePowerShell()
    ps.executeCommand = async () => { throw new Error('timeout') }
    s.ps = ps
    assert.deepEqual(await s.getInstalledPackages(), [])
    ps.executeCommand = async () => ({ stdout: '', stderr: '', exitCode: 0 })
    assert.deepEqual(await s.getAvailableUpdates(), [])
  })
})
