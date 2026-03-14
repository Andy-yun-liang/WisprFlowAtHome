import OpenAI from 'openai'
import { Readable } from 'stream'
import { splitPcmIntoChunks, pcmToWav } from './chunk-splitter'

let client: OpenAI | null = null

export function initWhisperClient(apiKey: string): void {
  client = new OpenAI({ apiKey })
}

/**
 * Transcribe a raw PCM16 buffer.
 * Automatically splits long recordings and parallelises chunks.
 */
export async function transcribeAudio(pcm: Buffer): Promise<string> {
  if (!client) throw new Error('Whisper client not initialized — set API key first')

  const chunks = splitPcmIntoChunks(pcm)

  if (chunks.length === 1) {
    return transcribeChunk(chunks[0])
  }

  // Parallel transcription of all chunks
  const results = await Promise.all(chunks.map(transcribeChunk))
  return results.join(' ')
}

async function transcribeChunk(pcm: Buffer): Promise<string> {
  const wav = pcmToWav(pcm)

  // OpenAI SDK accepts a File-like or Node.js readable stream
  const file = new File([wav], 'audio.wav', { type: 'audio/wav' })

  const response = await client!.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'text',
    language: 'en'
  })

  return (response as unknown as string).trim()
}
