import { clipboard, systemPreferences, dialog, shell } from 'electron'

interface NutKeyboard {
  type: (text: string) => Promise<void>
  pressKey: (...keys: unknown[]) => Promise<void>
  releaseKey: (...keys: unknown[]) => Promise<void>
}

let nutKeyboard: NutKeyboard | null = null
let Key: Record<string, unknown> | null = null

async function loadNut(): Promise<boolean> {
  if (nutKeyboard) return true
  try {
    const nut = await import('@nut-tree-fork/nut-js')
    nutKeyboard = nut.keyboard as unknown as NutKeyboard
    Key = nut.Key as Record<string, unknown>
    return true
  } catch (err) {
    console.error('[PasteService] Failed to load nut-js:', err)
    return false
  }
}

export function checkAccessibilityPermission(): boolean {
  if (process.platform !== 'darwin') return true

  const trusted = systemPreferences.isTrustedAccessibilityClient(false)
  if (!trusted) {
    const result = dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Accessibility Permission Required',
      message:
        'WhisprAtHome needs Accessibility access to paste text into other applications.\n\nPlease enable it in System Settings → Privacy & Security → Accessibility.',
      buttons: ['Open System Settings', 'Cancel'],
      defaultId: 0
    })
    if (result === 0) {
      systemPreferences.isTrustedAccessibilityClient(true)
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    }
  }
  return trusted
}

export async function pasteText(text: string): Promise<{ pasted: boolean }> {
  const previous = clipboard.readText()
  clipboard.writeText(text)

  const hasAccess = checkAccessibilityPermission()
  if (!hasAccess) {
    return { pasted: false }
  }

  const loaded = await loadNut()
  if (!loaded) {
    return { pasted: false }
  }

  try {
    await delay(150)

    if (process.platform === 'darwin') {
      await nutKeyboard!.pressKey(Key!['LeftSuper'], Key!['V'])
      await nutKeyboard!.releaseKey(Key!['LeftSuper'], Key!['V'])
    } else {
      await nutKeyboard!.pressKey(Key!['LeftControl'], Key!['V'])
      await nutKeyboard!.releaseKey(Key!['LeftControl'], Key!['V'])
    }

    await delay(200)
    clipboard.writeText(previous)

    return { pasted: true }
  } catch (err) {
    console.error('[PasteService] paste simulation failed:', err)
    return { pasted: false }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
