# PRD: WhisprAtHome — Settings UI Polish & macOS Packaging

## Introduction

Redesign the WhisprAtHome settings window to match macOS System Settings aesthetic (sidebar navigation, icon + label nav items, content panel on the right). Add additional user-configurable options including language, Whisper model, and filler word toggles. Generate a proper app icon programmatically. Wire up and produce a working macOS `.dmg` installer via electron-builder.

---

## Goals

- Replace the current flat settings page with a macOS System Settings-style sidebar layout
- Expose all meaningful configuration options in an organized, intuitive UI
- Generate a proper `.icns` app icon programmatically (no external tools)
- Produce a signed/unsigned `.dmg` installer via `npm run make`
- Settings changes take effect immediately where possible

---

## User Stories

### US-001: Sidebar Navigation Shell
**Description:** As a user, I want a settings window that looks and feels like macOS System Settings so that it feels native and familiar.

**Acceptance Criteria:**
- [ ] Window is 700×480px, non-resizable
- [ ] Left sidebar (200px) lists nav items with SF Symbol-style emoji icons + labels
- [ ] Selected item is highlighted with a rounded blue pill
- [ ] Right content panel renders the selected section
- [ ] Sections: General, Transcription, Text Cleanup, About
- [ ] Sidebar background is slightly darker than content area
- [ ] Smooth section switching (no page reload)

### US-002: General Section
**Description:** As a user, I want to configure hotkey, HUD position, and auto-start in one place.

**Acceptance Criteria:**
- [ ] Displays current PTT hotkey with an "Edit" button that enters a capture mode
- [ ] HUD position toggle: Top / Bottom (segmented control style)
- [ ] "Launch at login" toggle
- [ ] All changes persist immediately via existing IPC handlers
- [ ] Hotkey capture mode shows a "Press your hotkey…" prompt and records the next keycombo

### US-003: Transcription Section
**Description:** As a user, I want to set my API key, Whisper model, and language in one section.

**Acceptance Criteria:**
- [ ] OpenAI API key field (password masked, "Save" button, shows "Saved ✓" on success)
- [ ] Whisper model selector: dropdown with options `whisper-1` (default), `whisper-large-v3-turbo`
- [ ] Language selector: dropdown with common options — Auto-detect, English, Spanish, French, German, Portuguese, Japanese, Chinese
- [ ] Model and language settings persisted via electron-store
- [ ] API key stored in OS keychain (existing keychain.ts)

### US-004: Text Cleanup Section
**Description:** As a user, I want to control which filler words are removed so I can tune the cleanup to my speech patterns.

**Acceptance Criteria:**
- [ ] Master toggle: "Enable filler word removal" (on/off)
- [ ] When enabled, shows a grid of individual word toggles for each preset filler word: um, uh, umm, uhh, hmm, like, you know, basically, literally, actually, right
- [ ] Each word toggle independently enables/disables that specific word
- [ ] Active filler word set persisted in electron-store
- [ ] When master toggle is off, word grid is visually dimmed/disabled

### US-005: About Section
**Description:** As a user, I want to see app version and useful links in an About screen.

**Acceptance Criteria:**
- [ ] Displays app icon (same as dock/tray icon, 64×64px)
- [ ] Shows app name "WhisprAtHome" and version from package.json
- [ ] Shows "Whisper API cost: $0.006 / min" as a helpful reference
- [ ] "Check for updates" placeholder button (logs to console, no-op for now)

### US-006: App Icon Generation
**Description:** As a developer, I need a proper app icon so the packaged .dmg looks professional.

**Acceptance Criteria:**
- [ ] `scripts/generate-icons.mjs` generates icon assets using only Node.js built-ins + `canvas` npm package (or pure raw PNG if canvas unavailable)
- [ ] Generates `build/icon.icns` for macOS (with 16, 32, 64, 128, 256, 512px layers)
- [ ] Generates `build/icon.ico` for Windows (16, 32, 48, 256px layers)
- [ ] Generates `resources/tray-idle.png`, `tray-recording.png`, `tray-processing.png`, `tray-error.png` at 22×22px (macOS menu bar size)
- [ ] Icon design: dark rounded square, white microphone shape, subtle waveform arc — all drawn with canvas 2D API
- [ ] Script runs as part of `npm run build` via a `prebuild` script entry

### US-007: electron-builder macOS DMG
**Description:** As a developer, I want `npm run make` to produce a working `.dmg` installer for macOS.

**Acceptance Criteria:**
- [ ] `electron-builder.config.ts` is fully configured for macOS arm64 + x64 universal build
- [ ] `asarUnpack` includes all native addon paths
- [ ] DMG opens, drags to /Applications, launches, shows tray icon
- [ ] App bundle is named "WhisprAtHome.app"
- [ ] `npm run make` completes without error on macOS (unsigned — no Apple Developer account required)
- [ ] Output DMG is in `dist/` folder

---

## Functional Requirements

- FR-1: Settings window uses a two-panel layout: 200px sidebar + flexible content area
- FR-2: Nav items have icon (emoji) + label; selected state uses rounded blue highlight
- FR-3: `Settings` type in `shared/types.ts` extended with: `whisperModel`, `language`, `enabledFillerWords` (string[])
- FR-4: Whisper client uses the model from settings (not hardcoded `whisper-1`)
- FR-5: Whisper client passes language to API when not "auto"
- FR-6: IPC handlers updated to support new settings keys
- FR-7: `scripts/generate-icons.mjs` is standalone and idempotent
- FR-8: `package.json` `prebuild` script runs icon generation before electron-vite build
- FR-9: electron-builder produces unsigned DMG (skip notarization)
- FR-10: Tray icons regenerated at 22×22px (current placeholder may be wrong size)

---

## Non-Goals

- No sound feedback (deferred)
- No custom user-defined filler words (preset list only)
- No Windows `.exe` packaging in this iteration
- No auto-update mechanism
- No Apple Developer signing / notarization
- No dark/light mode switching (always dark UI)

---

## Technical Considerations

- Settings window renderer is a pure HTML/TS/CSS file — no React, no framework
- Sidebar nav switching: hide/show `<section>` divs by id, no routing library needed
- `icns` file format: can be generated with a pure-Node script using the ICNS binary format spec (4-byte type + 4-byte length + PNG data for each size)
- `ico` file format: similarly, pure-Node binary construction
- The `canvas` npm package provides a Node.js Canvas API — add it as a devDependency
- electron-builder reads `electron-builder.config.ts` automatically when `electron-builder` CLI is run
- For unsigned DMG: set `"mac": { "identity": null }` in electron-builder config

---

## Success Metrics

- Settings window is visually indistinguishable from a native macOS preference pane at a glance
- `npm run make` produces a `.dmg` in under 2 minutes on Apple Silicon
- All existing PTT → transcribe → paste flow continues to work after settings changes

---

## Open Questions

None — all decisions resolved by user.
