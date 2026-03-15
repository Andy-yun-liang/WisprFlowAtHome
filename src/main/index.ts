import { app, BrowserWindow, systemPreferences } from 'electron'
import { createTray, setTrayState } from './tray'
import { createHudWindow, showHud, hideHud, getHudWindow, onHudReady, sendToHud } from './hud-window'
import { startHotkeyListener } from './hotkey'
import { createAudioRecorder } from './audio-recorder'
import { transcribeAudio } from './whisper-client'
import { initWhisperClient } from './whisper-client'
import { cleanTranscript } from './text-cleaner'
import { pasteText, checkAccessibilityPermission } from './paste-service'
import { getSettings } from './config-store'
import { recordTranscription } from './stats-store'
import { getApiKey } from './keychain'
import { registerIpcHandlers } from './ipc-handlers'
import { openSettingsWindow } from './settings-window'
import { IPC } from '@shared/types'
import type { AppState } from '@shared/types'
import { HUD_DISMISS_DELAY_MS } from '@shared/constants'

// Hide dock icon before app is ready (most reliable way on macOS)
if (process.platform === 'darwin') {
  app.dock.hide()
}

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Prevent garbage collection of tray
let tray: Electron.Tray | null = null

let currentState: AppState = 'idle'
let activeRecorder: ReturnType<typeof createAudioRecorder> | null = null
let recordingStartTime = 0

function setState(state: AppState, errorMessage?: string): void {
  currentState = state
  setTrayState(state)
  sendToHud(IPC.APP_STATE_CHANGED, { state, errorMessage })
}

async function onPttPress(): Promise<void> {
  if (currentState !== 'idle') return

  // Verify API key is available before starting
  const apiKey = await getApiKey()
  if (!apiKey) {
    setState('error', 'No OpenAI API key set. Open Settings to add your key.')
    showHud()
    setTimeout(() => {
      setState('idle')
      hideHud()
    }, 3000)
    return
  }

  initWhisperClient(apiKey)

  recordingStartTime = Date.now()
  setState('recording')
  showHud()

  activeRecorder = createAudioRecorder((chunk: Buffer) => {
    const int16 = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }
    sendToHud(IPC.AUDIO_CHUNK, Array.from(float32))
  })

  activeRecorder.start()
}

async function onPttRelease(): Promise<void> {
  if (currentState !== 'recording' || !activeRecorder) return

  setState('processing')

  let pcm: Buffer
  try {
    pcm = await activeRecorder.stop()
    activeRecorder = null
  } catch (err) {
    console.error('[Main] audio stop error:', err)
    setState('error', 'Failed to stop recording.')
    setTimeout(() => { setState('idle'); hideHud() }, 3000)
    return
  }

  if (pcm.length < 1000) {
    // Too short — either accidental press or mic permission denied
    console.error(`[Main] PCM buffer too small: ${pcm.length} bytes — mic permission may be denied`)
    setState('error', `No audio captured (${pcm.length} bytes). Check Microphone permission in System Settings.`)
    showHud()
    setTimeout(() => { setState('idle'); hideHud() }, 4000)
    return
  }

  try {
    const transcribeSettings = getSettings()
    const raw = await transcribeAudio(pcm, {
      whisperModel: transcribeSettings.whisperModel,
      language: transcribeSettings.language
    })

    if (!raw.trim()) {
      setState('idle')
      hideHud()
      return
    }

    const settings = getSettings()
    const text = settings.fillerWordRemoval ? cleanTranscript(raw) : raw.trim()

    const durationSecs = (Date.now() - recordingStartTime) / 1000
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const wpm = durationSecs > 0 ? Math.round((wordCount / durationSecs) * 60) : 0
    // Whisper pricing: $0.006 per minute
    const costUsd = (durationSecs / 60) * 0.006

    recordTranscription(text, wordCount, wpm, durationSecs)
    console.log(`[Transcript] "${text}"`)
    console.log(`[Stats] ${wordCount} words | ${wpm} WPM | ${durationSecs.toFixed(1)}s | $${costUsd.toFixed(4)}`)

    sendToHud(IPC.TRANSCRIPT_READY, { text, raw, wordCount, wpm, durationSecs })

    const { pasted } = await pasteText(text)

    if (!pasted) {
      sendToHud(IPC.APP_STATE_CHANGED, {
        state: 'error',
        errorMessage: 'Paste failed — text copied to clipboard'
      })
    }

    setState('idle')
    setTimeout(() => hideHud(), HUD_DISMISS_DELAY_MS)
  } catch (err: unknown) {
    console.error('[Main] transcription error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    setState('error', `Transcription failed: ${msg}`)
    sendToHud(IPC.TRANSCRIPT_ERROR, msg)
    setTimeout(() => { setState('idle'); hideHud() }, 4000)
  }
}

app.on('ready', async () => {
  // Hide dock icon — tray-only app
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  // Don't quit when all windows are closed (tray app)
  app.on('window-all-closed', () => { /* tray app — never quit on window close */ })

  // Register IPC handlers
  registerIpcHandlers()

  // Create tray
  tray = createTray()

  // Create HUD (hidden initially)
  const settings = getSettings()
  createHudWindow(settings.hudPosition)

  // Request microphone permission (macOS)
  if (process.platform === 'darwin') {
    const micStatus = await systemPreferences.askForMediaAccess('microphone')
    if (!micStatus) {
      console.error('[Main] Microphone permission denied')
    }
  }

  // Check accessibility permission (macOS) — non-blocking
  if (process.platform === 'darwin') {
    checkAccessibilityPermission()
  }

  // Start PTT hotkey listener
  startHotkeyListener(settings.hotkey, async (event) => {
    if (event === 'press') {
      await onPttPress()
    } else {
      await onPttRelease()
    }
  })

  // Always open Settings on launch so users know the app is running
  const apiKey = await getApiKey()
  console.log('[Main] Startup API key check:', apiKey ? `found (${apiKey.length} chars)` : 'not found')
  openSettingsWindow()

  console.log('[Main] WhisprAtHome ready. PTT hotkey:', settings.hotkey)
})

app.on('will-quit', () => {
  // uiohook is stopped automatically on process exit
})
