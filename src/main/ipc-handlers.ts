import { ipcMain, app } from 'electron'
import { IPC } from '@shared/types'
import type { Settings } from '@shared/types'
import { getSettings, setSetting } from './config-store'
import { getApiKey, setApiKey } from './keychain'
import { rebindHotkey } from './hotkey'
import { getStats, resetStats, getHistory } from './stats-store'
import type { UsageStats, TranscriptEntry } from '@shared/types'

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
    const key = await getApiKey()
    console.log('[Keychain] getApiKey:', key ? `found (${key.length} chars)` : 'null')
    return key
  })

  ipcMain.handle(IPC.KEYCHAIN_SET_API_KEY, async (_event, apiKey: string): Promise<void> => {
    try {
      await setApiKey(apiKey)
      console.log('[Keychain] setApiKey: saved successfully')
    } catch (err) {
      console.error('[Keychain] setApiKey error:', err)
    }
  })

  // Hotkey rebind
  ipcMain.handle(IPC.HOTKEY_REBIND, (_event, newHotkey: string): void => {
    rebindHotkey(newHotkey)
    setSetting('hotkey', newHotkey)
  })

  // Stats
  ipcMain.handle(IPC.STATS_GET, (): UsageStats => getStats())
  ipcMain.handle(IPC.STATS_RESET, (): void => resetStats())
  ipcMain.handle(IPC.HISTORY_GET, (): TranscriptEntry[] => getHistory())

  // Auto-start (login item)
  ipcMain.handle(IPC.SET_LOGIN_ITEM, (_event, enable: boolean): void => {
    app.setLoginItemSettings({ openAtLogin: enable })
    setSetting('autoStart', enable)
  })
}
