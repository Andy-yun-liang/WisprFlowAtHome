import type { Settings } from '../../shared/types'
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
    }
  }
}

// ── Sidebar navigation ────────────────────────────────────────────────────────

const navItems = document.querySelectorAll<HTMLElement>('.nav-item')
const sections = document.querySelectorAll<HTMLElement>('.section')

function switchSection(sectionId: string): void {
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId)
  })
  sections.forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${sectionId}`)
  })
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const id = item.dataset.section
    if (id) switchSection(id)
  })
})

// ── General section ───────────────────────────────────────────────────────────

const hotKeyBadge = document.getElementById('hotkey-badge')!
const hotkeyEditBtn = document.getElementById('hotkey-edit-btn') as HTMLButtonElement
const hotkeyCaptureHint = document.getElementById('hotkey-capture-hint')!

const hudPosTop = document.getElementById('hud-pos-top') as HTMLButtonElement
const hudPosBottom = document.getElementById('hud-pos-bottom') as HTMLButtonElement

const autostartToggle = document.getElementById('autostart-toggle') as HTMLInputElement

// Hotkey capture
let capturingHotkey = false

hotkeyEditBtn.addEventListener('click', () => {
  if (capturingHotkey) {
    // Cancel capture
    capturingHotkey = false
    hotkeyEditBtn.textContent = 'Edit'
    hotkeyCaptureHint.style.display = 'none'
    return
  }
  capturingHotkey = true
  hotkeyEditBtn.textContent = 'Cancel'
  hotkeyCaptureHint.style.display = 'inline'
})

window.addEventListener('keydown', async (e) => {
  if (!capturingHotkey) return

  if (e.key === 'Escape') {
    capturingHotkey = false
    hotkeyEditBtn.textContent = 'Edit'
    hotkeyCaptureHint.style.display = 'none'
    return
  }

  // Build modifier combo string
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')

  if (parts.length === 0) return  // require at least one modifier

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

autostartToggle.addEventListener('change', async () => {
  await window.settingsApi.setLoginItem(autostartToggle.checked)
})

// ── Transcription section ─────────────────────────────────────────────────────

const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
const saveKeyBtn = document.getElementById('save-key-btn') as HTMLButtonElement
const keyStatus = document.getElementById('key-status')!
const modelSelect = document.getElementById('model-select') as HTMLSelectElement
const languageSelect = document.getElementById('language-select') as HTMLSelectElement

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

modelSelect.addEventListener('change', async () => {
  const val = modelSelect.value as Settings['whisperModel']
  await window.settingsApi.setSetting('whisperModel', val)
})

languageSelect.addEventListener('change', async () => {
  await window.settingsApi.setSetting('language', languageSelect.value)
})

// ── Text Cleanup section ──────────────────────────────────────────────────────

const fillerToggle = document.getElementById('filler-toggle') as HTMLInputElement
const wordGrid = document.getElementById('word-grid')!

let enabledWords: string[] = []

function renderWordGrid(): void {
  wordGrid.innerHTML = ''
  for (const word of FILLER_WORDS) {
    const chip = document.createElement('button')
    chip.className = 'word-chip' + (enabledWords.includes(word) ? ' active' : '')
    chip.textContent = word
    chip.addEventListener('click', async () => {
      if (enabledWords.includes(word)) {
        enabledWords = enabledWords.filter(w => w !== word)
      } else {
        enabledWords = [...enabledWords, word]
      }
      chip.classList.toggle('active', enabledWords.includes(word))
      await window.settingsApi.setSetting('enabledFillerWords', enabledWords)
    })
    wordGrid.appendChild(chip)
  }
}

function updateWordGridState(): void {
  wordGrid.classList.toggle('disabled', !fillerToggle.checked)
}

fillerToggle.addEventListener('change', async () => {
  await window.settingsApi.setSetting('fillerWordRemoval', fillerToggle.checked)
  updateWordGridState()
})

// ── About section ─────────────────────────────────────────────────────────────

const checkUpdatesBtn = document.getElementById('check-updates-btn') as HTMLButtonElement
checkUpdatesBtn.addEventListener('click', () => {
  console.log('Check for updates clicked')
})

// ── Init ──────────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
  const [settings, apiKey] = await Promise.all([
    window.settingsApi.getSettings(),
    window.settingsApi.getApiKey()
  ])

  // General
  hotKeyBadge.textContent = settings.hotkey
  setHudPosition(settings.hudPosition)
  autostartToggle.checked = settings.autoStart

  // Transcription
  if (apiKey) {
    apiKeyInput.value = '●'.repeat(20)
    apiKeyInput.dataset.hasKey = 'true'
  }
  modelSelect.value = settings.whisperModel
  languageSelect.value = settings.language

  // Text Cleanup
  fillerToggle.checked = settings.fillerWordRemoval
  enabledWords = settings.enabledFillerWords ? [...settings.enabledFillerWords] : [...FILLER_WORDS]
  renderWordGrid()
  updateWordGridState()
}

loadSettings()
