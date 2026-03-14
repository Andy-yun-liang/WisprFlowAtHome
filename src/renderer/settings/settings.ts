import type { Settings } from '../../shared/types'

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

// --- DOM refs ---
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
const saveKeyBtn = document.getElementById('save-key-btn') as HTMLButtonElement
const keyStatus = document.getElementById('key-status')!

const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement
const rebindBtn = document.getElementById('rebind-btn') as HTMLButtonElement
const hotkeyStatus = document.getElementById('hotkey-status')!

const fillerToggle = document.getElementById('filler-toggle') as HTMLInputElement
const hudPositionToggle = document.getElementById('hud-position-toggle') as HTMLInputElement
const autostartToggle = document.getElementById('autostart-toggle') as HTMLInputElement

function showStatus(el: HTMLElement, msg: string, isError = false, durationMs = 2500): void {
  el.textContent = msg
  el.className = 'status-msg' + (isError ? ' error' : '')
  setTimeout(() => { el.textContent = '' }, durationMs)
}

// --- Load initial state ---
async function loadSettings(): Promise<void> {
  const [settings, apiKey] = await Promise.all([
    window.settingsApi.getSettings(),
    window.settingsApi.getApiKey()
  ])

  if (apiKey) {
    apiKeyInput.value = '●'.repeat(20)  // mask — don't expose key in DOM
    apiKeyInput.dataset.hasKey = 'true'
  }

  hotkeyInput.value = settings.hotkey
  fillerToggle.checked = settings.fillerWordRemoval
  hudPositionToggle.checked = settings.hudPosition === 'bottom'
  autostartToggle.checked = settings.autoStart
}

// --- Event handlers ---
saveKeyBtn.addEventListener('click', async () => {
  const value = apiKeyInput.value.trim()
  if (!value || value.startsWith('●')) {
    showStatus(keyStatus, 'Enter a new API key to save', true)
    return
  }
  if (!value.startsWith('sk-')) {
    showStatus(keyStatus, 'API key should start with sk-', true)
    return
  }
  try {
    await window.settingsApi.setApiKey(value)
    apiKeyInput.value = '●'.repeat(20)
    apiKeyInput.dataset.hasKey = 'true'
    showStatus(keyStatus, 'Saved securely to keychain')
  } catch {
    showStatus(keyStatus, 'Failed to save key', true)
  }
})

// Clear masked value when user starts typing
apiKeyInput.addEventListener('focus', () => {
  if (apiKeyInput.dataset.hasKey === 'true') {
    apiKeyInput.value = ''
    apiKeyInput.dataset.hasKey = 'false'
  }
})

rebindBtn.addEventListener('click', async () => {
  const hotkey = hotkeyInput.value.trim()
  if (!hotkey) {
    showStatus(hotkeyStatus, 'Enter a hotkey', true)
    return
  }
  try {
    await window.settingsApi.rebindHotkey(hotkey)
    await window.settingsApi.setSetting('hotkey', hotkey)
    showStatus(hotkeyStatus, 'Hotkey updated — takes effect now')
  } catch {
    showStatus(hotkeyStatus, 'Failed to rebind hotkey', true)
  }
})

fillerToggle.addEventListener('change', async () => {
  await window.settingsApi.setSetting('fillerWordRemoval', fillerToggle.checked)
})

hudPositionToggle.addEventListener('change', async () => {
  const pos = hudPositionToggle.checked ? 'bottom' : 'top'
  await window.settingsApi.setSetting('hudPosition', pos)
})

autostartToggle.addEventListener('change', async () => {
  await window.settingsApi.setLoginItem(autostartToggle.checked)
})

// --- Init ---
loadSettings()
