// App state machine
export type AppState = 'idle' | 'recording' | 'processing' | 'error'

// Settings stored via electron-store (non-sensitive)
export interface Settings {
  hotkey: string
  hudPosition: 'top' | 'bottom'
  fillerWordRemoval: boolean
  autoStart: boolean
}

// IPC channel constants
export const IPC = {
  // Main → Renderer
  APP_STATE_CHANGED: 'app:state-changed',
  AUDIO_CHUNK: 'app:audio-chunk',
  TRANSCRIPT_READY: 'app:transcript-ready',
  TRANSCRIPT_ERROR: 'app:transcript-error',

  // Renderer ↔ Main (settings)
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Renderer ↔ Main (keychain)
  KEYCHAIN_GET_API_KEY: 'keychain:get-api-key',
  KEYCHAIN_SET_API_KEY: 'keychain:set-api-key',

  // Renderer → Main (hotkey rebind)
  HOTKEY_REBIND: 'hotkey:rebind',

  // Renderer → Main (auto-start)
  SET_LOGIN_ITEM: 'app:set-login-item'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

// Payload types
export interface StateChangedPayload {
  state: AppState
  errorMessage?: string
}

export interface TranscriptReadyPayload {
  text: string
  raw: string
}
