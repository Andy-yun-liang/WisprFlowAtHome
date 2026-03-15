import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '@shared/constants'

export interface AudioRecorder {
  start(): void
  stop(): Promise<Buffer>
}

const SOX_FALLBACKS = [
  '/opt/homebrew/bin/sox',
  '/usr/local/bin/sox',
  'sox'
]

function findSox(): string {
  // 1. Prefer bundled binary (works in packaged app without system SoX).
  //    In packaged app: extraResources copies sox-bundle → Contents/Resources/sox-bundle/
  //    In dev: fall through to system sox
  const bundledBase = app.isPackaged ? process.resourcesPath : null
  if (bundledBase) {
    const bundled = join(bundledBase, 'sox-bundle', 'sox')
    if (existsSync(bundled)) {
      return bundled
    }
  }

  // 2. Fall back to system SoX (dev mode or if bundle missing)
  const { execSync } = require('child_process')
  for (const p of SOX_FALLBACKS) {
    try {
      execSync(`"${p}" --version`, { stdio: 'ignore' })
      return p
    } catch {
      continue
    }
  }
  return SOX_FALLBACKS[0]
}

export function createAudioRecorder(onChunk: (chunk: Buffer) => void): AudioRecorder {
  let proc: ChildProcess | null = null
  const chunks: Buffer[] = []
  let stopping = false

  return {
    start() {
      stopping = false
      chunks.length = 0

      const soxPath = findSox()
      const args = [
        '--default-device',
        '--no-show-progress',
        '--rate', String(AUDIO_SAMPLE_RATE),
        '--channels', String(AUDIO_CHANNELS),
        '--encoding', 'signed-integer',
        '--bits', '16',
        '--type', 'raw',
        '-'
      ]

      console.log(`[AudioRecorder] Spawning: ${soxPath} ${args.join(' ')}`)

      proc = spawn(soxPath, args, {
        env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}` },
        stdio: ['ignore', 'pipe', 'pipe']
      })

      proc.stdout!.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        onChunk(chunk)
      })

      proc.stderr!.on('data', (data: Buffer) => {
        console.error(`[AudioRecorder] SoX stderr: ${data.toString().trim()}`)
      })

      proc.on('error', (err) => {
        console.error('[AudioRecorder] spawn error:', err)
      })

      proc.on('close', (code) => {
        if (!stopping) {
          console.error(`[AudioRecorder] SoX exited unexpectedly with code ${code}`)
        }
      })
    },

    stop(): Promise<Buffer> {
      return new Promise((resolve) => {
        if (!proc) {
          resolve(Buffer.alloc(0))
          return
        }

        stopping = true

        // Wait for stdout to close so all buffered data is collected before resolving
        proc!.stdout!.on('end', () => {
          const buf = Buffer.concat(chunks)
          console.log(`[AudioRecorder] Stopped. Collected ${chunks.length} chunks, total ${buf.length} bytes`)
          resolve(buf)
          proc = null
        })

        try {
          proc!.kill('SIGTERM')
        } catch {
          resolve(Buffer.concat(chunks))
          proc = null
        }
      })
    }
  }
}
