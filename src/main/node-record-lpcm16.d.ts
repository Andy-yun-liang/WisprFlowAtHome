declare module 'node-record-lpcm16' {
  import { Readable } from 'stream'
  interface RecordOptions {
    sampleRate?: number
    channels?: number
    audioType?: string
    recorder?: string
    verbose?: boolean
    [key: string]: unknown
  }
  interface Recording {
    stream(): Readable
    stop(): void
  }
  export function record(options?: RecordOptions): Recording
}
