// Default PTT hotkey (uiohook-napi key codes)
// Ctrl+Option on macOS, Ctrl+Alt on Windows
export const DEFAULT_HOTKEY = 'Ctrl+Alt'

// Filler words to strip (whole-word match, case-insensitive)
export const FILLER_WORDS = [
  'um',
  'uh',
  'umm',
  'uhh',
  'hmm',
  'like',
  'you know',
  'basically',
  'literally',
  'actually',
  'right'
]

// Audio capture settings
export const AUDIO_SAMPLE_RATE = 16000
export const AUDIO_CHANNELS = 1
export const AUDIO_BIT_DEPTH = 16

// Silence detection for chunk splitting
export const SILENCE_THRESHOLD_RMS = 0.01   // RMS amplitude below this = silence
export const SILENCE_WINDOW_MS = 20          // RMS analysis window in ms
export const MIN_SILENCE_DURATION_MS = 300   // Minimum silence length to split on
export const MAX_CHUNK_DURATION_S = 24       // Max chunk length before forced split
export const CHUNK_PREROLL_MS = 200          // Pre-roll before silence point
export const CHUNK_POSTROLL_MS = 200         // Post-roll after silence point

// HUD
export const HUD_DISMISS_DELAY_MS = 1500     // Auto-dismiss after paste
export const HUD_WIDTH = 400
export const HUD_HEIGHT = 100

// PTT debounce
export const PTT_DEBOUNCE_MS = 10
