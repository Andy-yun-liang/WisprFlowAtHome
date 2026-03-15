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
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/hud-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  hudWindow.once('ready-to-show', () => {
    hudWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    hudWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/hud/index.html`)
  } else {
    hudWindow.loadFile(join(__dirname, '../renderer/hud/index.html'))
  }

  // Show on all workspaces and above everything including full-screen apps
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  hudWindow.setAlwaysOnTop(true, 'screen-saver')

  // Enable click-through on macOS
  if (process.platform === 'darwin') {
    hudWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  hudWindow.webContents.on('did-finish-load', () => {
    onHudReady()
  })

  hudWindow.on('closed', () => {
    hudWindow = null
    hudReady = false
  })

  return hudWindow
}

let hudReady = false
const pendingMessages: Array<{ channel: string; args: unknown[] }> = []

export function onHudReady(): void {
  hudReady = true
  for (const { channel, args } of pendingMessages) {
    hudWindow?.webContents.send(channel, ...args)
  }
  pendingMessages.length = 0
}

export function sendToHud(channel: string, ...args: unknown[]): void {
  if (!hudWindow || hudWindow.isDestroyed()) return
  if (hudReady) {
    hudWindow.webContents.send(channel, ...args)
  } else {
    pendingMessages.push({ channel, args })
  }
}

// Window stays open always — visibility controlled by CSS opacity in the renderer
export function showHud(): void {
  sendToHud('hud:show')
}

export function hideHud(): void {
  sendToHud('hud:hide')
}

export function getHudWindow(): BrowserWindow | null {
  return hudWindow
}
