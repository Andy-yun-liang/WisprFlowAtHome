import Store from 'electron-store'
import type { UsageStats, TranscriptEntry } from '@shared/types'

const HISTORY_LIMIT = 20

const DEFAULT_STATS: UsageStats = {
  totalRecordings: 0,
  totalWords: 0,
  totalDurationSecs: 0,
  totalCostUsd: 0,
  lastWpm: 0
}

interface StoreSchema extends UsageStats {
  history: TranscriptEntry[]
}

const store = new Store<StoreSchema>({
  name: 'stats',
  defaults: { ...DEFAULT_STATS, history: [] }
})

export function getStats(): UsageStats {
  return {
    totalRecordings: store.get('totalRecordings'),
    totalWords: store.get('totalWords'),
    totalDurationSecs: store.get('totalDurationSecs'),
    totalCostUsd: store.get('totalCostUsd'),
    lastWpm: store.get('lastWpm')
  }
}

export function getHistory(): TranscriptEntry[] {
  return store.get('history') ?? []
}

export function recordTranscription(text: string, wordCount: number, wpm: number, durationSecs: number): void {
  const costUsd = (durationSecs / 60) * 0.006
  store.set('totalRecordings', store.get('totalRecordings') + 1)
  store.set('totalWords', store.get('totalWords') + wordCount)
  store.set('totalDurationSecs', store.get('totalDurationSecs') + durationSecs)
  store.set('totalCostUsd', store.get('totalCostUsd') + costUsd)
  store.set('lastWpm', wpm)

  const entry: TranscriptEntry = { text, timestamp: Date.now(), wordCount, wpm }
  const history = store.get('history') ?? []
  store.set('history', [entry, ...history].slice(0, HISTORY_LIMIT))
}

export function resetStats(): void {
  store.store = { ...DEFAULT_STATS, history: [] }
}
