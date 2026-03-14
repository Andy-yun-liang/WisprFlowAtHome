import { uIOhook, UiohookKey } from 'uiohook-napi'
import { PTT_DEBOUNCE_MS } from '@shared/constants'

export type PttCallback = (event: 'press' | 'release') => void

// Map our hotkey string to uiohook key codes
// Default: Ctrl+Alt (matches Ctrl+Option on macOS)
const MODIFIER_CODES: Record<string, number[]> = {
  Ctrl: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Alt: [UiohookKey.Alt, UiohookKey.AltRight],
  Shift: [UiohookKey.Shift, UiohookKey.ShiftRight],
  Meta: [UiohookKey.Meta, UiohookKey.MetaRight]
}

interface HotkeyState {
  requiredKeys: Set<number>
  pressedKeys: Set<number>
  isActive: boolean
  debounceTimer: ReturnType<typeof setTimeout> | null
  lastEventTime: number
}

let state: HotkeyState | null = null
let callback: PttCallback | null = null
let started = false

/**
 * Parse a hotkey string like "Ctrl+Alt" into a set of uiohook key codes.
 * Each modifier expands to its left+right variants.
 */
function parseHotkey(hotkey: string): Set<number> {
  const codes = new Set<number>()
  const parts = hotkey.split('+').map(p => p.trim())
  for (const part of parts) {
    const mapped = MODIFIER_CODES[part]
    if (mapped) {
      mapped.forEach(c => codes.add(c))
    } else {
      console.warn(`[Hotkey] Unknown key part: ${part}`)
    }
  }
  return codes
}

/**
 * Returns true if all required modifiers have at least one pressed representative.
 */
function isHotkeyActive(requiredKeys: Set<number>, pressedKeys: Set<number>): boolean {
  // For Ctrl: either CtrlLeft or CtrlRight must be pressed
  // We stored both variants in requiredKeys — at least one from each original modifier group
  const modGroups = Object.values(MODIFIER_CODES)
  for (const group of modGroups) {
    const groupRequired = group.filter(c => requiredKeys.has(c))
    if (groupRequired.length === 0) continue // not a required modifier
    const groupPressed = group.some(c => pressedKeys.has(c))
    if (!groupPressed) return false
  }
  return true
}

export function startHotkeyListener(hotkey: string, cb: PttCallback): void {
  callback = cb

  state = {
    requiredKeys: parseHotkey(hotkey),
    pressedKeys: new Set(),
    isActive: false,
    debounceTimer: null,
    lastEventTime: 0
  }

  if (!started) {
    uIOhook.on('keydown', (e) => {
      if (!state) return
      state.pressedKeys.add(e.keycode)

      if (!state.isActive && isHotkeyActive(state.requiredKeys, state.pressedKeys)) {
        const now = Date.now()
        if (now - state.lastEventTime < PTT_DEBOUNCE_MS) return // debounce key-repeat
        state.lastEventTime = now
        state.isActive = true
        callback?.('press')
      }
    })

    uIOhook.on('keyup', (e) => {
      if (!state) return
      state.pressedKeys.delete(e.keycode)

      if (state.isActive && !isHotkeyActive(state.requiredKeys, state.pressedKeys)) {
        state.isActive = false
        callback?.('release')
      }
    })

    uIOhook.start()
    started = true
  }
}

export function rebindHotkey(newHotkey: string): void {
  if (!state) return
  state.requiredKeys = parseHotkey(newHotkey)
  state.pressedKeys.clear()
  state.isActive = false
}

export function stopHotkeyListener(): void {
  if (started) {
    uIOhook.stop()
    started = false
  }
  state = null
  callback = null
}
