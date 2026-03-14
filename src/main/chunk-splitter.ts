import {
  AUDIO_SAMPLE_RATE,
  AUDIO_CHANNELS,
  AUDIO_BIT_DEPTH,
  SILENCE_THRESHOLD_RMS,
  SILENCE_WINDOW_MS,
  MIN_SILENCE_DURATION_MS,
  MAX_CHUNK_DURATION_S,
  CHUNK_PREROLL_MS,
  CHUNK_POSTROLL_MS
} from '@shared/constants'

const BYTES_PER_SAMPLE = AUDIO_BIT_DEPTH / 8
const SAMPLES_PER_WINDOW = Math.floor((AUDIO_SAMPLE_RATE * SILENCE_WINDOW_MS) / 1000)
const WINDOW_BYTES = SAMPLES_PER_WINDOW * BYTES_PER_SAMPLE * AUDIO_CHANNELS

/**
 * Compute RMS energy of a PCM16 buffer window.
 */
function windowRms(buf: Buffer, offset: number, length: number): number {
  let sumSq = 0
  for (let i = offset; i < offset + length - 1; i += 2) {
    const sample = buf.readInt16LE(i) / 32768
    sumSq += sample * sample
  }
  return Math.sqrt(sumSq / (length / 2))
}

/**
 * Find silence regions in a PCM16 buffer.
 * Returns array of { start, end } byte offsets of silent regions.
 */
function findSilenceRegions(pcm: Buffer): Array<{ start: number; end: number }> {
  const regions: Array<{ start: number; end: number }> = []
  const minSilenceSamples = Math.floor((AUDIO_SAMPLE_RATE * MIN_SILENCE_DURATION_MS) / 1000)
  const minSilenceBytes = minSilenceSamples * BYTES_PER_SAMPLE * AUDIO_CHANNELS

  let silenceStart = -1

  for (let offset = 0; offset + WINDOW_BYTES <= pcm.length; offset += WINDOW_BYTES) {
    const rms = windowRms(pcm, offset, WINDOW_BYTES)
    if (rms < SILENCE_THRESHOLD_RMS) {
      if (silenceStart === -1) silenceStart = offset
    } else {
      if (silenceStart !== -1) {
        const silenceLength = offset - silenceStart
        if (silenceLength >= minSilenceBytes) {
          regions.push({ start: silenceStart, end: offset })
        }
        silenceStart = -1
      }
    }
  }

  return regions
}

/**
 * Convert sample rate + duration to byte count.
 */
function durationToBytes(seconds: number): number {
  return Math.floor(seconds * AUDIO_SAMPLE_RATE * BYTES_PER_SAMPLE * AUDIO_CHANNELS)
}

/**
 * Split a raw PCM16 buffer into chunks of at most MAX_CHUNK_DURATION_S seconds,
 * preferring silence boundaries. Returns array of PCM Buffers.
 */
export function splitPcmIntoChunks(pcm: Buffer): Buffer[] {
  const maxBytes = durationToBytes(MAX_CHUNK_DURATION_S)

  if (pcm.length <= maxBytes) {
    return [pcm]
  }

  const silenceRegions = findSilenceRegions(pcm)
  const prerollBytes = durationToBytes(CHUNK_PREROLL_MS / 1000)
  const postrollBytes = durationToBytes(CHUNK_POSTROLL_MS / 1000)

  const chunks: Buffer[] = []
  let chunkStart = 0

  while (chunkStart < pcm.length) {
    const maxEnd = chunkStart + maxBytes

    if (maxEnd >= pcm.length) {
      // Last chunk — take the rest
      chunks.push(pcm.slice(chunkStart))
      break
    }

    // Find the latest silence region that ends before maxEnd
    const splitPoint = silenceRegions
      .filter(r => r.start > chunkStart && r.end <= maxEnd)
      .reduce<number | null>((best, r) => {
        const mid = Math.floor((r.start + r.end) / 2)
        return best === null || mid > best ? mid : best
      }, null)

    let chunkEnd: number
    if (splitPoint !== null) {
      chunkEnd = Math.min(splitPoint + postrollBytes, pcm.length)
      const adjustedStart = Math.max(chunkStart, splitPoint - prerollBytes)
      chunks.push(pcm.slice(chunkStart, chunkEnd))
      chunkStart = adjustedStart + prerollBytes // next chunk starts after split point
    } else {
      // No silence found — hard cut at maxEnd aligned to sample boundary
      const aligned = Math.floor(maxEnd / (BYTES_PER_SAMPLE * AUDIO_CHANNELS)) * (BYTES_PER_SAMPLE * AUDIO_CHANNELS)
      chunks.push(pcm.slice(chunkStart, aligned))
      chunkStart = aligned
    }
  }

  return chunks
}

/**
 * Wrap a raw PCM16 buffer in a minimal WAV header so Whisper can parse it.
 */
export function pcmToWav(pcm: Buffer): Buffer {
  const byteRate = AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * BYTES_PER_SAMPLE
  const blockAlign = AUDIO_CHANNELS * BYTES_PER_SAMPLE
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)             // PCM chunk size
  header.writeUInt16LE(1, 20)              // PCM format
  header.writeUInt16LE(AUDIO_CHANNELS, 22)
  header.writeUInt32LE(AUDIO_SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(AUDIO_BIT_DEPTH, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)

  return Buffer.concat([header, pcm])
}
