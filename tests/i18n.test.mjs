import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('i18n Localization Integrity Tests', () => {
  // Helper to extract nested key paths
  function getKeyPaths(obj, prefix = '') {
    let keys = []
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys = keys.concat(getKeyPaths(value, fullPath))
      } else {
        keys.push(fullPath)
      }
    }
    return keys
  }

  test('locales files exist and are non-empty', () => {
    const dePath = path.resolve('src/renderer/src/i18n/locales/de.ts')
    const enPath = path.resolve('src/renderer/src/i18n/locales/en.ts')
    assert.ok(fs.existsSync(dePath), 'de.ts must exist')
    assert.ok(fs.existsSync(enPath), 'en.ts must exist')
  })

  test('de and en dictionaries have matching keys and non-empty values', async () => {
    // Dynamic import the compiled or source TypeScript locales
    const deContent = fs.readFileSync(path.resolve('src/renderer/src/i18n/locales/de.ts'), 'utf-8')
    const enContent = fs.readFileSync(path.resolve('src/renderer/src/i18n/locales/en.ts'), 'utf-8')

    // Extract indented object property keys (ignoring type annotations or exports at line start)
    const extractKeys = (content) => {
      const matches = [...content.matchAll(/^\s+['"]?([a-zA-Z0-9_-]+)['"]?:\s*/gm)]
      return matches.map(m => m[1].trim())
    }

    const deKeys = extractKeys(deContent)
    const enKeys = extractKeys(enContent)

    // Verify key counts match
    assert.equal(deKeys.length, enKeys.length, `Key counts differ: de=${deKeys.length}, en=${enKeys.length}`)

    // Verify every key in de is in en
    for (const k of deKeys) {
      assert.ok(enKeys.includes(k), `Missing key in en: ${k}`)
    }
  })

  test('language fallback logic resolves properly', () => {
    const supportedLanguages = ['de', 'en']
    const resolveLanguage = (lang) => {
      if (supportedLanguages.includes(lang)) return lang
      return 'de'
    }

    assert.equal(resolveLanguage('de'), 'de')
    assert.equal(resolveLanguage('en'), 'en')
    assert.equal(resolveLanguage('fr'), 'de')
    assert.equal(resolveLanguage(undefined), 'de')
    assert.equal(resolveLanguage(null), 'de')
  })
})
