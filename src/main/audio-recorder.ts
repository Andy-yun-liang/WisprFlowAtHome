import record from 'node-record-lpcm16'
import { Readable } from 'stream'
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS, AUDIO_BIT_DEPTH } from '@shared/constants'

export interface AudioRecorder {
  start(): void
  stop(): Promise<Buffer>
}

/**
 * Creates a new audio recorder instance.
 * Each call returns a fresh recorder — do not reuse across sessions.
 */
export function createAudioRecorder(onChunk: (chunk: Buffer) => void): AudioRecorder {
  let recording: ReturnType<typeof record.record> | null = null
  const chunks: Buffer[] = []
  let stopping = false

  return {
    start() {
      stopping = false
      recording = record.record({
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: AUDIO_CHANNELS,
        audioType: 'raw',
        recorder: 'sox',
        verbose: false
      })

      const stream = recording.stream() as Readable

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        onChunk(chunk)
      })

      stream.on('error', (err: Error) => {
        // Suppress the expected "exit code null" error that fires when we kill SoX on stop()
        if (!stopping) {
          console.error('[AudioRecorder] stream error:', err)
        }
      })
    },

    stop(): Promise<Buffer> {
      return new Promise((resolve) => {
        if (!recording) {
          resolve(Buffer.alloc(0))
          return
        }

        // Give the stream a tick to flush any last chunk
        setImmediate(() => {
          stopping = true
          try {
            recording!.stop()
          } catch {
            // ignore stop errors
          }
          resolve(Buffer.concat(chunks))
        })
      })
    }
  }
}
