import { ipcMain, app } from 'electron'
import { IPC } from '@shared/types'
import type { Settings } from '@shared/types'
import { getSettings, setSetting } from './config-store'
import { getApiKey, setApiKey } from './keychain'
import { rebindHotkey } from './hotkey'

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, (): Settings => {
    return getSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key: keyof Settings, value: Settings[keyof Settings]) => {
    setSetting(key, value as never)
  })

  // Keychain
  ipcMain.handle(IPC.KEYCHAIN_GET_API_KEY, async (): Promise<string | null> => {
    return getApiKey()
  })

  ipcMain.handle(IPC.KEYCHAIN_SET_API_KEY, async (_event, apiKey: string): Promise<void> => {
    await setApiKey(apiKey)
  })

  // Hotkey rebind
  ipcMain.handle(IPC.HOTKEY_REBIND, (_event, newHotkey: string): void => {
    rebindHotkey(newHotkey)
    setSetting('hotkey', newHotkey)
  })

  // Auto-start (login item)
  ipcMain.handle(IPC.SET_LOGIN_ITEM, (_event, enable: boolean): void => {
    app.setLoginItemSettings({ openAtLogin: enable })
    setSetting('autoStart', enable)
  })
}
