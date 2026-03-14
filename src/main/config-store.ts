import Store from 'electron-store'
import type { Settings } from '@shared/types'
import { DEFAULT_HOTKEY } from '@shared/constants'

const DEFAULT_SETTINGS: Settings = {
  hotkey: DEFAULT_HOTKEY,
  hudPosition: 'bottom',
  fillerWordRemoval: true,
  autoStart: false
}

// electron-store typed wrapper
const store = new Store<Settings>({
  name: 'config',
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): Settings {
  return {
    hotkey: store.get('hotkey'),
    hudPosition: store.get('hudPosition'),
    fillerWordRemoval: store.get('fillerWordRemoval'),
    autoStart: store.get('autoStart')
  }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  store.set(key, value)
}

export function getHotkey(): string {
  return store.get('hotkey')
}
