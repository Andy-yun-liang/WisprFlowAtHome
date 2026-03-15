import OpenAI from 'openai'
import { splitPcmIntoChunks, pcmToWav } from './chunk-splitter'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

let client: OpenAI | null = null

export function initWhisperClient(apiKey: string, provider: 'openai' | 'groq' = 'openai'): void {
  client = new OpenAI({
    apiKey,
    ...(provider === 'groq' ? { baseURL: GROQ_BASE_URL } : {})
  })
}

export interface TranscribeSettings {
  whisperModel: string
  language: string
}

/**
 * Transcribe a raw PCM16 buffer.
 * Automatically splits long recordings and parallelises chunks.
 */
export async function transcribeAudio(pcm: Buffer, settings: TranscribeSettings): Promise<string> {
  if (!client) throw new Error('Whisper client not initialized — set API key first')

  const chunks = splitPcmIntoChunks(pcm)

  if (chunks.length === 1) {
    return transcribeChunk(chunks[0], settings)
  }

  // Parallel transcription of all chunks
  const results = await Promise.all(chunks.map((chunk) => transcribeChunk(chunk, settings)))
  return results.join(' ')
}

/**
 * Transcribe a pre-encoded audio buffer (e.g. WebM from MediaRecorder on Windows).
 * Sent directly to the API without any PCM conversion.
 */
export async function transcribeAudioRaw(audio: Buffer, settings: TranscribeSettings, filename = 'audio.webm', mimeType = 'audio/webm'): Promise<string> {
  if (!client) throw new Error('Whisper client not initialized — set API key first')
  const file = new File([audio], filename, { type: mimeType })
  const response = await client.audio.transcriptions.create({
    model: settings.whisperModel,
    file,
    response_format: 'text',
    ...(settings.language !== 'auto' ? { language: settings.language } : {})
  })
  return (response as unknown as string).trim()
}

async function transcribeChunk(pcm: Buffer, settings: TranscribeSettings): Promise<string> {
  const wav = pcmToWav(pcm)

  // OpenAI SDK accepts a File-like or Node.js readable stream
  const file = new File([wav], 'audio.wav', { type: 'audio/wav' })

  const response = await client!.audio.transcriptions.create({
    model: settings.whisperModel,
    file,
    response_format: 'text',
    ...(settings.language !== 'auto' ? { language: settings.language } : {})
  })

  return (response as unknown as string).trim()
}
