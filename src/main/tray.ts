import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import type { AppState } from '@shared/types'
import { openSettingsWindow } from './settings-window'

let tray: Tray | null = null

const STATE_TITLE: Record<AppState, string> = {
  idle:       '🎙',
  recording:  '🔴',
  processing: '🟡',
  error:      '⚠️'
}

const STATE_ICON: Record<AppState, string> = {
  idle:       'tray-idle.png',
  recording:  'tray-recording.png',
  processing: 'tray-processing.png',
  error:      'tray-error.png'
}

function getTrayIcon(state: AppState): Electron.NativeImage {
  if (process.platform !== 'win32') return nativeImage.createEmpty()
  const resourcesPath = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return nativeImage.createFromPath(join(resourcesPath, STATE_ICON[state]))
}

function buildContextMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: 'Settings', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit WhisprAtHome', click: () => app.quit() }
  ])
}

export function createTray(): Tray {
  tray = new Tray(getTrayIcon('idle'))
  if (process.platform !== 'win32') tray.setTitle(STATE_TITLE['idle'])
  tray.setToolTip('WhisprAtHome')
  tray.setContextMenu(buildContextMenu())

  tray.on('click', () => {
    tray?.popUpContextMenu()
  })

  return tray
}

export function setTrayState(state: AppState): void {
  if (!tray) return
  tray.setImage(getTrayIcon(state))
  if (process.platform !== 'win32') tray.setTitle(STATE_TITLE[state])

  const tooltip =
    state === 'recording' ? 'WhisprAtHome — Recording…' :
    state === 'processing' ? 'WhisprAtHome — Processing…' :
    state === 'error' ? 'WhisprAtHome — Error' :
    'WhisprAtHome'

  tray.setToolTip(tooltip)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
