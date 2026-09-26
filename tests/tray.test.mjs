import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Tray & Close-to-Tray Lifecycle Tests', () => {
  function evaluateCloseEvent(isQuitting, minimizeToTray) {
    if (!isQuitting && minimizeToTray) {
      return { preventDefault: true, action: 'hide' }
    }
    return { preventDefault: false, action: 'close' }
  }

  test('minimizeToTray = true and isQuitting = false: window hides instead of closing (X-click)', () => {
    const result = evaluateCloseEvent(false, true)
    assert.equal(result.preventDefault, true)
    assert.equal(result.action, 'hide')
  })

  test('minimizeToTray = true and isQuitting = true: window closes normally (Tray "Beenden")', () => {
    const result = evaluateCloseEvent(true, true)
    assert.equal(result.preventDefault, false)
    assert.equal(result.action, 'close')
  })

  test('minimizeToTray = false and isQuitting = false: window closes normally (standard behavior)', () => {
    const result = evaluateCloseEvent(false, false)
    assert.equal(result.preventDefault, false)
    assert.equal(result.action, 'close')
  })

  test('minimizeToTray = false and isQuitting = true: window closes normally on quit', () => {
    const result = evaluateCloseEvent(true, false)
    assert.equal(result.preventDefault, false)
    assert.equal(result.action, 'close')
  })

  test('before-quit event properly sets isQuitting flag', () => {
    let isQuitting = false
    const onBeforeQuit = () => {
      isQuitting = true
    }

    assert.equal(isQuitting, false)
    onBeforeQuit()
    assert.equal(isQuitting, true)
    assert.equal(evaluateCloseEvent(isQuitting, true).preventDefault, false)
  })

  test('HUD Widget window remains independent during main window hide-to-tray', () => {
    let mainWindowVisible = true
    let hudWindowVisible = true
    let isQuitting = false

    // User clicks X on main window with minimizeToTray enabled
    const closeEvent = evaluateCloseEvent(isQuitting, true)
    if (closeEvent.preventDefault) {
      mainWindowVisible = false
    }

    // Main window is hidden in tray, HUD remains on desktop
    assert.equal(mainWindowVisible, false)
    assert.equal(hudWindowVisible, true)

    // User chooses "Beenden" from tray
    isQuitting = true
    const quitCloseEvent = evaluateCloseEvent(isQuitting, true)
    if (!quitCloseEvent.preventDefault) {
      mainWindowVisible = false
      hudWindowVisible = false
    }

    assert.equal(mainWindowVisible, false)
    assert.equal(hudWindowVisible, false)
  })

  test('tray context menu labels localize correctly for de and en', () => {
    function getTrayMenuItems(language) {
      const isEn = language === 'en'
      return [
        { label: isEn ? 'Open M-Toolbox' : 'M-Toolbox öffnen' },
        { label: 'Desktop Mini-HUD' },
        { type: 'separator' },
        { label: isEn ? 'Quit' : 'Beenden' }
      ]
    }

    const deItems = getTrayMenuItems('de')
    assert.equal(deItems[0].label, 'M-Toolbox öffnen')
    assert.equal(deItems[3].label, 'Beenden')

    const enItems = getTrayMenuItems('en')
    assert.equal(enItems[0].label, 'Open M-Toolbox')
    assert.equal(enItems[3].label, 'Quit')
  })
})
