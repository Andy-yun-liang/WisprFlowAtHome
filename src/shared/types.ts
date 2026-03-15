// App state machine
export type AppState = 'idle' | 'recording' | 'processing' | 'error'

// Settings stored via electron-store (non-sensitive)
export interface Settings {
  hotkey: string
  hudPosition: 'top' | 'bottom'
  fillerWordRemoval: boolean
  autoStart: boolean
  provider: 'openai' | 'groq'
  whisperModel: 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe'
  groqModel: 'whisper-large-v3' | 'whisper-large-v3-turbo' | 'distil-whisper-large-v3-en'
  language: string
  enabledFillerWords: string[]
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
  KEYCHAIN_GET_GROQ_KEY: 'keychain:get-groq-key',
  KEYCHAIN_SET_GROQ_KEY: 'keychain:set-groq-key',

  // Renderer → Main (hotkey rebind)
  HOTKEY_REBIND: 'hotkey:rebind',

  // Renderer → Main (auto-start)
  SET_LOGIN_ITEM: 'app:set-login-item',

  // Stats
  STATS_GET: 'stats:get',
  STATS_RESET: 'stats:reset',
  HISTORY_GET: 'stats:history',

  // Windows audio capture (renderer-based)
  AUDIO_START_CAPTURE: 'audio:start-capture',
  AUDIO_STOP_CAPTURE: 'audio:stop-capture',
  AUDIO_CAPTURE_DATA: 'audio:capture-data'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

// Payload types
export interface StateChangedPayload {
  state: AppState
  errorMessage?: string
}

export interface UsageStats {
  totalRecordings: number
  totalWords: number
  totalDurationSecs: number
  totalCostUsd: number
  lastWpm: number
}

export interface TranscriptEntry {
  text: string
  timestamp: number   // ms since epoch
  wordCount: number
  wpm: number
}

export interface TranscriptReadyPayload {
  text: string
  raw: string
  wordCount: number
  wpm: number
  durationSecs: number
}
