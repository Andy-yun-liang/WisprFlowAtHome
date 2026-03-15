import type { StateChangedPayload, TranscriptReadyPayload } from '../../shared/types'

declare global {
  interface Window {
    hudApi: {
      onStateChanged: (cb: (payload: StateChangedPayload) => void) => void
      onAudioChunk: (cb: (samples: number[]) => void) => void
      onTranscriptReady: (cb: (payload: TranscriptReadyPayload) => void) => void
      onTranscriptError: (cb: (message: string) => void) => void
      onShow: (cb: () => void) => void
      onHide: (cb: () => void) => void
      onStartCapture: (cb: () => void) => void
      onStopCapture: (cb: () => void) => void
      sendAudioData: (data: Uint8Array) => void
      removeAllListeners: () => void
    }
  }
}

// --- DOM refs ---
const hud = document.getElementById('hud')!
const indicator = document.getElementById('indicator')!
const canvasContainer = document.getElementById('canvas-container')!
const canvas = document.getElementById('waveform') as HTMLCanvasElement
const spinner = document.getElementById('spinner')!
const transcriptWrap = document.getElementById('transcript-wrap')!
const transcriptEl = document.getElementById('transcript')!
const errorEl = document.getElementById('error-msg')!

const ctx = canvas.getContext('2d')!

// --- Waveform state ---
const HISTORY_LENGTH = 120  // number of RMS values to keep
const rmsHistory: number[] = new Array(HISTORY_LENGTH).fill(0)
let animFrameId = 0

function pushRms(samples: number[]): void {
  const rms = Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length)
  rmsHistory.push(rms)
  if (rmsHistory.length > HISTORY_LENGTH) rmsHistory.shift()
}

function drawWaveform(): void {
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  const barWidth = w / HISTORY_LENGTH
  const maxRms = 0.5  // normalize against this

  ctx.fillStyle = '#ff3b30'

  for (let i = 0; i < rmsHistory.length; i++) {
    const norm = Math.min(rmsHistory[i] / maxRms, 1)
    const barH = Math.max(2, norm * h * 0.85)
    const x = i * barWidth
    const y = (h - barH) / 2
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barH)
  }

  if (animFrameId) animFrameId = requestAnimationFrame(drawWaveform)
}

function startWaveform(): void {
  canvas.width = canvasContainer.clientWidth || 280
  canvas.height = canvasContainer.clientHeight || 40
  animFrameId = requestAnimationFrame(drawWaveform)
}

function stopWaveform(): void {
  cancelAnimationFrame(animFrameId)
  animFrameId = 0
}

// --- UI helpers ---
function setMode(mode: 'recording' | 'processing' | 'transcript' | 'error' | 'idle'): void {
  indicator.className = 'indicator ' + (mode !== 'idle' ? mode : '')

  canvasContainer.className = 'canvas-container' + (mode === 'recording' ? ' visible' : '')
  spinner.className = 'spinner' + (mode === 'processing' ? ' visible' : '')
  transcriptWrap.className = 'transcript-wrap' + (mode === 'transcript' ? ' visible' : '')
  errorEl.className = mode === 'error' ? 'visible' : ''

  if (mode === 'recording') {
    startWaveform()
  } else {
    stopWaveform()
  }
}

function show(): void {
  hud.classList.add('visible')
}

function hide(): void {
  hud.classList.remove('visible')
  setMode('idle')
  transcriptEl.textContent = ''
  errorEl.textContent = ''
  rmsHistory.fill(0)
}

// --- IPC ---
window.hudApi.onShow(() => { hud.classList.remove('hidden') })
window.hudApi.onHide(() => {
  hud.classList.add('hidden')
  setMode('idle')
  transcriptEl.textContent = ''
  errorEl.textContent = ''
  rmsHistory.fill(0)
})

window.hudApi.onStateChanged((payload) => {
  const { state, errorMessage } = payload

  if (state === 'recording') {
    setMode('recording')
  } else if (state === 'processing') {
    setMode('processing')
  } else if (state === 'error') {
    setMode('error')
    errorEl.textContent = errorMessage ?? 'An error occurred'
  }
})

window.hudApi.onAudioChunk((samples) => {
  pushRms(samples)
})

// ── Windows audio capture via MediaRecorder ───────────────────────────────────

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let analyserRafId = 0

window.hudApi.onStartCapture(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    audioChunks = []

    // Use Web Audio AnalyserNode to feed the waveform visualizer
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const dataArray = new Float32Array(analyser.fftSize)

    function pollAnalyser() {
      if (!mediaRecorder || mediaRecorder.state !== 'recording') return
      analyser.getFloatTimeDomainData(dataArray)
      pushRms(Array.from(dataArray))
      analyserRafId = requestAnimationFrame(pollAnalyser)
    }
    analyserRafId = requestAnimationFrame(pollAnalyser)

    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.start(100)
  } catch (err) {
    console.error('[HUD] getUserMedia failed:', err)
    window.hudApi.sendAudioData(new Uint8Array(0))
  }
})

window.hudApi.onStopCapture(() => {
  cancelAnimationFrame(analyserRafId)
  if (!mediaRecorder) {
    window.hudApi.sendAudioData(new Uint8Array(0))
    return
  }
  mediaRecorder.onstop = async () => {
    const mimeType = mediaRecorder?.mimeType ?? 'audio/webm'
    const blob = new Blob(audioChunks, { type: mimeType })
    const arrayBuffer = await blob.arrayBuffer()
    window.hudApi.sendAudioData(new Uint8Array(arrayBuffer))
    audioChunks = []
    mediaRecorder = null
  }
  mediaRecorder.stream.getTracks().forEach(t => t.stop())
  mediaRecorder.stop()
})

window.hudApi.onTranscriptReady((payload) => {
  transcriptEl.textContent = payload.text
  setMode('transcript')
})

window.hudApi.onTranscriptError((message) => {
  errorEl.textContent = message
  setMode('error')
})
