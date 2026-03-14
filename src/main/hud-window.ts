import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { HUD_WIDTH, HUD_HEIGHT } from '@shared/constants'
import type { Settings } from '@shared/types'

let hudWindow: BrowserWindow | null = null

export function createHudWindow(position: Settings['hudPosition'] = 'bottom'): BrowserWindow {
  if (hudWindow && !hudWindow.isDestroyed()) {
    return hudWindow
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const x = Math.floor((screenWidth - HUD_WIDTH) / 2)
  const y = position === 'bottom'
    ? screenHeight - HUD_HEIGHT - 20
    : 20

  hudWindow = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,       // click-through — does not steal focus
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/hud-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    hudWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/hud/index.html`)
  } else {
    hudWindow.loadFile(join(__dirname, '../renderer/hud/index.html'))
  }

  // Enable click-through on macOS
  if (process.platform === 'darwin') {
    hudWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  hudWindow.on('closed', () => {
    hudWindow = null
  })

  return hudWindow
}

export function showHud(): void {
  if (!hudWindow || hudWindow.isDestroyed()) return
  hudWindow.showInactive()
}

export function hideHud(): void {
  if (!hudWindow || hudWindow.isDestroyed()) return
  hudWindow.hide()
}

export function getHudWindow(): BrowserWindow | null {
  return hudWindow
}
