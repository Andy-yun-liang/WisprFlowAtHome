import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import type { AppState } from '@shared/types'
import { openSettingsWindow } from './settings-window'

let tray: Tray | null = null

function getIconPath(state: AppState): string {
  const name = state === 'recording' ? 'tray-recording' :
               state === 'processing' ? 'tray-processing' :
               state === 'error' ? 'tray-error' :
               'tray-idle'

  return join(__dirname, '../../resources', `${name}.png`)
}

function buildContextMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: 'Settings', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit WhisprAtHome', click: () => app.quit() }
  ])
}

export function createTray(): Tray {
  const icon = nativeImage.createFromPath(getIconPath('idle'))
  tray = new Tray(icon)
  tray.setToolTip('WhisprAtHome')
  tray.setContextMenu(buildContextMenu())

  // Single click on macOS also shows menu
  tray.on('click', () => {
    tray?.popUpContextMenu()
  })

  return tray
}

export function setTrayState(state: AppState): void {
  if (!tray) return
  const icon = nativeImage.createFromPath(getIconPath(state))
  tray.setImage(icon)

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
