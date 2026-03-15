import type { Settings, UsageStats, TranscriptEntry } from '../../shared/types'
import { FILLER_WORDS } from '../../shared/constants'

declare global {
  interface Window {
    settingsApi: {
      getSettings: () => Promise<Settings>
      setSetting: (key: keyof Settings, value: Settings[keyof Settings]) => Promise<void>
      getApiKey: () => Promise<string | null>
      setApiKey: (apiKey: string) => Promise<void>
      rebindHotkey: (hotkey: string) => Promise<void>
      setLoginItem: (enable: boolean) => Promise<void>
      getStats: () => Promise<UsageStats>
      resetStats: () => Promise<void>
      getHistory: () => Promise<TranscriptEntry[]>
    }
  }
}

// ── Sidebar navigation ────────────────────────────────────────────────────────

const navItems = document.querySelectorAll<HTMLElement>('.nav-item')
const sections = document.querySelectorAll<HTMLElement>('.section')

function switchSection(sectionId: string): void {
  navItems.forEach(item => item.classList.toggle('active', item.dataset.section === sectionId))
  sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${sectionId}`))
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const id = item.dataset.section
    if (id) switchSection(id)
    if (id === 'home') refreshHome()
  })
})

// ── Home section ──────────────────────────────────────────────────────────────

const statRecordings = document.getElementById('stat-recordings')!
const statWords = document.getElementById('stat-words')!
const statWpm = document.getElementById('stat-wpm')!
const statCost = document.getElementById('stat-cost')!
const historyList = document.getElementById('history-list')!
const resetStatsBtn = document.getElementById('reset-stats-btn') as HTMLButtonElement

function renderStats(s: UsageStats): void {
  statRecordings.textContent = s.totalRecordings.toLocaleString()
  statWords.textContent = s.totalWords.toLocaleString()
  statWpm.textContent = s.lastWpm > 0 ? String(s.lastWpm) : '—'
  statCost.textContent = `$${s.totalCostUsd.toFixed(4)}`
}

function renderHistory(entries: TranscriptEntry[]): void {
  if (entries.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No transcripts yet</div>'
    return
  }
  historyList.innerHTML = entries.map(e => {
    const d = new Date(e.timestamp)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    return `
      <div class="history-item">
        <div class="history-text">${escHtml(e.text)}</div>
        <div class="history-meta">
          <span>${date} ${time}</span>
          <span>${e.wordCount} words</span>
          ${e.wpm > 0 ? `<span>${e.wpm} WPM</span>` : ''}
        </div>
      </div>`
  }).join('')
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function refreshHome(): Promise<void> {
  const [stats, history] = await Promise.all([
    window.settingsApi.getStats(),
    window.settingsApi.getHistory()
  ])
  renderStats(stats)
  renderHistory(history)
}

resetStatsBtn.addEventListener('click', async () => {
  await window.settingsApi.resetStats()
  renderStats({ totalRecordings: 0, totalWords: 0, totalDurationSecs: 0, totalCostUsd: 0, lastWpm: 0 })
  renderHistory([])
})

// ── Settings section ──────────────────────────────────────────────────────────

// API Key
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
const saveKeyBtn = document.getElementById('save-key-btn') as HTMLButtonElement
const keyStatus = document.getElementById('key-status')!

function showStatus(el: HTMLElement, msg: string, isError = false): void {
  el.textContent = msg
  el.className = 'status-msg' + (isError ? ' error' : '')
  setTimeout(() => { el.textContent = '' }, 2000)
}

apiKeyInput.addEventListener('focus', () => {
  if (apiKeyInput.dataset.hasKey === 'true') {
    apiKeyInput.value = ''
    apiKeyInput.dataset.hasKey = 'false'
  }
})

saveKeyBtn.addEventListener('click', async () => {
  const value = apiKeyInput.value.trim()
  if (!value || value.startsWith('●')) {
    showStatus(keyStatus, 'Enter a new API key to save', true)
    return
  }
  try {
    await window.settingsApi.setApiKey(value)
    apiKeyInput.value = '●'.repeat(20)
    apiKeyInput.dataset.hasKey = 'true'
    showStatus(keyStatus, 'Saved ✓')
  } catch {
    showStatus(keyStatus, 'Failed to save key', true)
  }
})

const modelSelect = document.getElementById('model-select') as HTMLSelectElement
modelSelect.addEventListener('change', async () => {
  await window.settingsApi.setSetting('whisperModel', modelSelect.value as Settings['whisperModel'])
})

const languageSelect = document.getElementById('language-select') as HTMLSelectElement
languageSelect.addEventListener('change', async () => {
  await window.settingsApi.setSetting('language', languageSelect.value)
})

// Hotkey
const hotKeyBadge = document.getElementById('hotkey-badge')!
const hotkeyEditBtn = document.getElementById('hotkey-edit-btn') as HTMLButtonElement
const hotkeyCaptureHint = document.getElementById('hotkey-capture-hint')!

let capturingHotkey = false

hotkeyEditBtn.addEventListener('click', () => {
  capturingHotkey = !capturingHotkey
  hotkeyEditBtn.textContent = capturingHotkey ? 'Cancel' : 'Edit'
  hotkeyCaptureHint.style.display = capturingHotkey ? 'inline' : 'none'
})

window.addEventListener('keydown', async (e) => {
  if (!capturingHotkey) return
  if (e.key === 'Escape') {
    capturingHotkey = false
    hotkeyEditBtn.textContent = 'Edit'
    hotkeyCaptureHint.style.display = 'none'
    return
  }
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')
  if (parts.length === 0) return
  const hotkey = parts.join('+')
  e.preventDefault()
  capturingHotkey = false
  hotkeyEditBtn.textContent = 'Edit'
  hotkeyCaptureHint.style.display = 'none'
  hotKeyBadge.textContent = hotkey
  try {
    await window.settingsApi.rebindHotkey(hotkey)
  } catch (err) {
    console.error('Failed to rebind hotkey:', err)
  }
})

// HUD position
const hudPosTop = document.getElementById('hud-pos-top') as HTMLButtonElement
const hudPosBottom = document.getElementById('hud-pos-bottom') as HTMLButtonElement

function setHudPosition(pos: 'top' | 'bottom'): void {
  hudPosTop.classList.toggle('active', pos === 'top')
  hudPosBottom.classList.toggle('active', pos === 'bottom')
}

hudPosTop.addEventListener('click', async () => {
  setHudPosition('top')
  await window.settingsApi.setSetting('hudPosition', 'top')
})

hudPosBottom.addEventListener('click', async () => {
  setHudPosition('bottom')
  await window.settingsApi.setSetting('hudPosition', 'bottom')
})

// Autostart
const autostartToggle = document.getElementById('autostart-toggle') as HTMLInputElement
autostartToggle.addEventListener('change', async () => {
  await window.settingsApi.setLoginItem(autostartToggle.checked)
})

// Filler words
const fillerToggle = document.getElementById('filler-toggle') as HTMLInputElement
fillerToggle.addEventListener('change', async () => {
  await window.settingsApi.setSetting('fillerWordRemoval', fillerToggle.checked)
})

// ── Init ──────────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
  const [settings, apiKey] = await Promise.all([
    window.settingsApi.getSettings(),
    window.settingsApi.getApiKey()
  ])

  hotKeyBadge.textContent = settings.hotkey
  setHudPosition(settings.hudPosition)
  autostartToggle.checked = settings.autoStart

  if (apiKey) {
    apiKeyInput.value = '●'.repeat(20)
    apiKeyInput.dataset.hasKey = 'true'
  }
  modelSelect.value = settings.whisperModel
  languageSelect.value = settings.language

  fillerToggle.checked = settings.fillerWordRemoval
}

loadSettings()
refreshHome()
