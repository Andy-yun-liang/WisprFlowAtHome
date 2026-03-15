import { Tray, Menu, nativeImage, app } from 'electron'
import type { AppState } from '@shared/types'
import { openSettingsWindow } from './settings-window'

let tray: Tray | null = null

const STATE_TITLE: Record<AppState, string> = {
  idle:       '🎙',
  recording:  '🔴',
  processing: '🟡',
  error:      '⚠️'
}

function buildContextMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: 'Settings', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit WhisprAtHome', click: () => app.quit() }
  ])
}

export function createTray(): Tray {
  // Use an empty image — icon is shown as text via setTitle()
  tray = new Tray(nativeImage.createEmpty())
  tray.setTitle(STATE_TITLE['idle'])
  tray.setToolTip('WhisprAtHome')
  tray.setContextMenu(buildContextMenu())

  tray.on('click', () => {
    tray?.popUpContextMenu()
  })

  return tray
}

export function setTrayState(state: AppState): void {
  if (!tray) return
  tray.setTitle(STATE_TITLE[state])

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
