import OpenAI from 'openai'
import { Readable } from 'stream'
import { splitPcmIntoChunks, pcmToWav } from './chunk-splitter'

let client: OpenAI | null = null

export function initWhisperClient(apiKey: string): void {
  client = new OpenAI({ apiKey })
}

export interface TranscribeSettings {
  whisperModel: 'whisper-1' | 'whisper-large-v3-turbo'
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
