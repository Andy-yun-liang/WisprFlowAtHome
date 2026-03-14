import { app, BrowserWindow, systemPreferences } from 'electron'
import { createTray, setTrayState } from './tray'
import { createHudWindow, showHud, hideHud, getHudWindow } from './hud-window'
import { startHotkeyListener } from './hotkey'
import { createAudioRecorder } from './audio-recorder'
import { transcribeAudio } from './whisper-client'
import { initWhisperClient } from './whisper-client'
import { cleanTranscript } from './text-cleaner'
import { pasteText, checkAccessibilityPermission } from './paste-service'
import { getSettings } from './config-store'
import { getApiKey } from './keychain'
import { registerIpcHandlers } from './ipc-handlers'
import { IPC } from '@shared/types'
import type { AppState } from '@shared/types'
import { HUD_DISMISS_DELAY_MS } from '@shared/constants'

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Prevent garbage collection of tray
let tray: Electron.Tray | null = null

let currentState: AppState = 'idle'
let activeRecorder: ReturnType<typeof createAudioRecorder> | null = null

function setState(state: AppState, errorMessage?: string): void {
  currentState = state
  setTrayState(state)

  const hud = getHudWindow()
  if (hud && !hud.isDestroyed()) {
    hud.webContents.send(IPC.APP_STATE_CHANGED, { state, errorMessage })
  }
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

  setState('recording')
  showHud()

  activeRecorder = createAudioRecorder((chunk: Buffer) => {
    // Forward audio chunks to HUD for waveform visualization
    const hud = getHudWindow()
    if (hud && !hud.isDestroyed()) {
      // Convert Buffer to Float32Array for waveform rendering
      const int16 = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
      const float32 = new Float32Array(int16.length)
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768
      }
      hud.webContents.send(IPC.AUDIO_CHUNK, Array.from(float32))
    }
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
    // Too short — likely accidental press
    setState('idle')
    hideHud()
    return
  }

  try {
    const raw = await transcribeAudio(pcm)

    if (!raw.trim()) {
      setState('idle')
      hideHud()
      return
    }

    const settings = getSettings()
    const text = settings.fillerWordRemoval ? cleanTranscript(raw) : raw.trim()

    // Send transcript to HUD
    const hud = getHudWindow()
    if (hud && !hud.isDestroyed()) {
      hud.webContents.send(IPC.TRANSCRIPT_READY, { text, raw })
    }

    // Paste
    const { pasted } = await pasteText(text)

    if (!pasted) {
      // Text is in clipboard, but paste sim failed — show warning in HUD
      const hud2 = getHudWindow()
      if (hud2 && !hud2.isDestroyed()) {
        hud2.webContents.send(IPC.APP_STATE_CHANGED, {
          state: 'error',
          errorMessage: 'Paste failed — text copied to clipboard'
        })
      }
    }

    setState('idle')
    setTimeout(() => hideHud(), HUD_DISMISS_DELAY_MS)
  } catch (err: unknown) {
    console.error('[Main] transcription error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    setState('error', `Transcription failed: ${msg}`)
    const hud = getHudWindow()
    if (hud && !hud.isDestroyed()) {
      hud.webContents.send(IPC.TRANSCRIPT_ERROR, msg)
    }
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

  console.log('[Main] WhisprAtHome ready. PTT hotkey:', settings.hotkey)
})

app.on('will-quit', () => {
  // uiohook is stopped automatically on process exit
})
