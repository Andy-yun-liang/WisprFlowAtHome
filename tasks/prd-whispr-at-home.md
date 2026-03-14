# PRD: WhisprAtHome — Personal Speech-to-Text with Auto-Paste

## Introduction

WhisprAtHome is a personal, cost-optimized clone of WhisprFlow for macOS and Windows. It captures microphone audio via a push-to-talk hotkey, streams the audio to OpenAI's Whisper API for transcription, cleans up the result (filler word removal, punctuation, capitalization), and auto-pastes the final text into whichever application the user has focused. The goal is a frictionless voice-to-text experience with minimal UI and low running costs.

---

## Goals

- Capture microphone audio via a configurable push-to-talk (PTT) hotkey
- Stream audio chunks to OpenAI Whisper API and display transcription in real time
- Automatically remove filler words and apply punctuation/capitalization
- Auto-paste cleaned text into the currently focused application when PTT is released
- Ship as a cross-platform Electron app (macOS + Windows)
- Keep API costs low by using Whisper API (not Claude or GPT-4o) for transcription in v1

---

## User Stories

### US-001: Global Push-to-Talk Hotkey
**Description:** As a user, I want to hold a hotkey to start recording so that I can trigger transcription from any application without switching windows.

**Acceptance Criteria:**
- [ ] Default PTT hotkey is `Ctrl+Option` (macOS) / `Ctrl+Alt` (Windows) — hold to record, release to transcribe
- [ ] Audio capture stops when the hotkey is released
- [ ] Hotkey works system-wide regardless of which app is focused
- [ ] Hotkey is configurable in settings

---

### US-002: Real-Time Audio Capture
**Description:** As a user, I want the app to capture microphone input while I hold the PTT key so that my speech is recorded accurately.

**Acceptance Criteria:**
- [ ] App requests and handles microphone permission on first launch
- [ ] Audio is captured at 16kHz mono (optimal for Whisper)
- [ ] Capture starts within 200ms of hotkey press
- [ ] No audio is captured when PTT is not held
- [ ] If microphone permission is denied, user sees a clear error message

---

### US-003: Streaming Transcription via OpenAI Whisper API
**Description:** As a user, I want my speech transcribed in near real time so that I can see what's being captured before I release the hotkey.

**Acceptance Criteria:**
- [ ] Audio chunks are sent to OpenAI Whisper API (`whisper-1`) during or immediately after recording
- [ ] Partial/final transcription text is displayed in the HUD overlay
- [ ] API key is read from app settings (not hardcoded)
- [ ] If the API call fails, an error is shown in the HUD and no paste occurs
- [ ] Transcription completes within 3 seconds of PTT release for clips under 30 seconds

---

### US-004: Filler Word Removal and Text Cleanup
**Description:** As a user, I want filler words removed and punctuation applied automatically so that the pasted text is clean without manual editing.

**Acceptance Criteria:**
- [ ] Common filler words are stripped: "um", "uh", "like", "you know", "basically", "literally", "so", "right" (when used as fillers)
- [ ] Sentence-initial capitalization is applied
- [ ] Basic punctuation (periods, commas) is preserved or inferred from Whisper output
- [ ] Cleanup runs locally before paste — no extra API call in v1
- [ ] Cleanup can be toggled off in settings

---

### US-005: Auto-Paste to Focused Application
**Description:** As a user, I want the transcribed text automatically pasted wherever my cursor is so that I don't have to manually copy-paste.

**Acceptance Criteria:**
- [ ] After transcription completes, text is written to the system clipboard
- [ ] App simulates `Cmd+V` (macOS) or `Ctrl+V` (Windows) to paste into the focused window
- [ ] Paste happens within 500ms of transcription completion
- [ ] Original clipboard contents are restored after paste
- [ ] If paste fails (no focused text field), text remains in clipboard and HUD shows a warning

---

### US-006: Minimal Tray Icon UI
**Description:** As a user, I want the app to live in the system tray so that it doesn't clutter my taskbar or dock.

**Acceptance Criteria:**
- [ ] App starts minimized to tray (no main window on launch)
- [ ] Tray icon shows three states: idle (grey), recording (red), processing (yellow)
- [ ] Right-clicking tray icon shows menu: Settings, Quit
- [ ] App starts automatically on login (configurable)

---

### US-007: Settings Panel
**Description:** As a user, I want a settings panel to configure the app so that I can customize hotkeys, API key, and behavior.

**Acceptance Criteria:**
- [ ] Settings panel opens from tray menu
- [ ] Configurable options: OpenAI API key, PTT hotkey, filler word removal toggle, auto-start on login
- [ ] Settings are persisted to a local config file
- [ ] Settings changes take effect immediately without restart (except hotkey rebinding)
- [ ] API key is stored securely using OS keychain (not plain text config file)

---

### US-008: Floating HUD Overlay
**Description:** As a user, I want a small overlay to appear while I'm speaking so that I can see the transcription in progress.

**Acceptance Criteria:**
- [ ] A small floating window appears near the bottom-center of the screen when PTT is held
- [ ] HUD shows: live audio waveform visualizer while recording, switches to processing spinner after PTT release
- [ ] HUD dismisses automatically 1.5 seconds after paste completes
- [ ] HUD is non-interactive (click-through) so it doesn't steal focus
- [ ] HUD position is configurable (top/bottom of screen)

---

## Functional Requirements

- FR-1: The app must register a global hotkey that works system-wide on macOS and Windows
- FR-2: Audio must be captured from the default microphone at 16kHz mono PCM
- FR-3: Audio must be sent to OpenAI Whisper API (`whisper-1` model) for transcription
- FR-3a: If a recording exceeds 25 seconds, audio must be automatically split at silence points into ≤25s chunks, each chunk transcribed in parallel, and results concatenated in order before cleanup and paste
- FR-4: Filler words ("um", "uh", "like", "you know", "basically", "literally") must be stripped from the transcript before paste
- FR-5: Transcribed text must be written to the clipboard and auto-pasted via keyboard simulation
- FR-6: The app must restore the previous clipboard contents after pasting
- FR-7: The app must run as a system tray application with no persistent main window
- FR-8: The tray icon must reflect app state: idle / recording / processing
- FR-9: All user configuration must be persisted locally; API key stored in OS keychain
- FR-10: The app must be packaged as an installable binary for macOS (.dmg) and Windows (.exe)

---

## Non-Goals (Out of Scope for v1)

- No LLM-based rewriting or contextual cleanup (GPT-4o deferred to v2)
- No custom vocabulary or speaker profiles
- No offline/local Whisper model support (planned for v2)
- No multi-language support (English only in v1)
- No iOS/Android/Linux support
- No recording history or transcript log
- No team or multi-user features
- No custom wake word (always PTT)

---

## Technical Considerations

- **Framework:** Electron (latest stable) with TypeScript
- **Audio capture:** `node-record-lpcm16` or `naudiodon` for cross-platform mic access
- **Global hotkeys:** `electron-globalaccelerator` or `iohook`
- **Clipboard + paste simulation:** `clipboardy` + `robotjs` or `@nut-tree/nut-js`
- **API:** OpenAI Whisper (`whisper-1`) via `openai` npm package
- **Secure storage:** `keytar` for OS keychain integration
- **Packaging:** `electron-builder` for .dmg and .exe installers
- **Streaming note:** Whisper API does not support true streaming — audio is sent as a complete file after PTT release. The HUD "streaming" effect will be simulated or shown as a processing spinner until the full result returns.

---

## Success Metrics

- PTT to paste completes in under 4 seconds for a 10-second clip
- Filler words removed in 95%+ of test utterances
- App uses under 150MB RAM at idle
- Monthly API cost under $2 for typical personal use (~30 min speech/day at $0.006/min)

---

## Open Questions

None.

## Resolved Decisions

- **PTT hotkey:** `Ctrl+Option` (macOS) / `Ctrl+Alt` (Windows). Single mode only in v1.
- **Long clips (>25s):** Auto-split at silence points, parallel transcription, concatenate results.
- **Accessibility permissions (macOS):** User will be prompted to enable in System Settings. Required for paste simulation.
- **Local Whisper:** Deferred to v2. v1 uses OpenAI Whisper API for simplicity.
- **LLM rewriting (GPT-4o):** Deferred to v2.
- **HUD:** Shows a live waveform visualizer during recording.
- **Auto-start:** Implemented via Electron's `app.setLoginItemSettings()` — handles macOS Login Items and Windows registry automatically.
