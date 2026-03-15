import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { StateChangedPayload, TranscriptReadyPayload } from '../shared/types'

contextBridge.exposeInMainWorld('hudApi', {
  onStateChanged: (cb: (payload: StateChangedPayload) => void) => {
    ipcRenderer.on(IPC.APP_STATE_CHANGED, (_event, payload: StateChangedPayload) => cb(payload))
  },
  onAudioChunk: (cb: (samples: number[]) => void) => {
    ipcRenderer.on(IPC.AUDIO_CHUNK, (_event, samples: number[]) => cb(samples))
  },
  onTranscriptReady: (cb: (payload: TranscriptReadyPayload) => void) => {
    ipcRenderer.on(IPC.TRANSCRIPT_READY, (_event, payload: TranscriptReadyPayload) => cb(payload))
  },
  onTranscriptError: (cb: (message: string) => void) => {
    ipcRenderer.on(IPC.TRANSCRIPT_ERROR, (_event, message: string) => cb(message))
  },
  onShow: (cb: () => void) => {
    ipcRenderer.on('hud:show', () => cb())
  },
  onHide: (cb: () => void) => {
    ipcRenderer.on('hud:hide', () => cb())
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners(IPC.APP_STATE_CHANGED)
    ipcRenderer.removeAllListeners(IPC.AUDIO_CHUNK)
    ipcRenderer.removeAllListeners(IPC.TRANSCRIPT_READY)
    ipcRenderer.removeAllListeners(IPC.TRANSCRIPT_ERROR)
    ipcRenderer.removeAllListeners('hud:show')
    ipcRenderer.removeAllListeners('hud:hide')
  }
})
