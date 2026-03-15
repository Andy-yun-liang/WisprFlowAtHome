import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { Settings, UsageStats, TranscriptEntry } from '../shared/types'

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSetting: (key: keyof Settings, value: Settings[keyof Settings]): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  getApiKey: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.KEYCHAIN_GET_API_KEY),

  setApiKey: (apiKey: string): Promise<void> =>
    ipcRenderer.invoke(IPC.KEYCHAIN_SET_API_KEY, apiKey),

  getGroqApiKey: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.KEYCHAIN_GET_GROQ_KEY),

  setGroqApiKey: (apiKey: string): Promise<void> =>
    ipcRenderer.invoke(IPC.KEYCHAIN_SET_GROQ_KEY, apiKey),

  rebindHotkey: (hotkey: string): Promise<void> =>
    ipcRenderer.invoke(IPC.HOTKEY_REBIND, hotkey),

  setLoginItem: (enable: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_LOGIN_ITEM, enable),

  getStats: (): Promise<UsageStats> =>
    ipcRenderer.invoke(IPC.STATS_GET),

  resetStats: (): Promise<void> =>
    ipcRenderer.invoke(IPC.STATS_RESET),

  getHistory: (): Promise<TranscriptEntry[]> =>
    ipcRenderer.invoke(IPC.HISTORY_GET)
})
