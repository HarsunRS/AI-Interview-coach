https://ai-mock-interviewer-rmh4fjmpw-nayakniki076-2451s-projects.vercel.app/

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Fixes & Changes

### Speech-to-Text (STT) — hybrid live + Whisper transcription

- **Live words as you speak:** Web Speech API is used for real-time display — words appear on screen immediately as you talk
- **Accurate final transcription:** `MediaRecorder` captures the full audio clip; when `Xenova/whisper-tiny` (local Whisper via [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js)) is ready it refines the result before submission
- **Whisper loads in the background** — the interview starts immediately without waiting; if Whisper isn't ready yet the Web Speech result is used directly
- **Whisper runs 100% locally** via WebAssembly (~150MB, downloaded once and cached by the browser — no API key, no internet required after first load)
- **Echo filter:** discards transcriptions that are just the question being read back

### Silence detection — fixed over-eager auto-pause

- **Before:** amplitude threshold of `8` (picked up breath, background noise, HVAC) + 1500ms silence = paused constantly mid-sentence
- **After:** amplitude threshold raised to `20` + must sustain for 400ms before counting as real speech + 2500ms of silence required before auto-submitting — tolerates natural pauses between thoughts
- **Words no longer disappear:** when silence fires with no captured text, the app stays in `answering` state and preserves whatever was already typed or spoken instead of wiping the input

### Mic & camera controls with live indicators

- **Microphone button** added below the video panel — click to mute/unmute. Shows 5 animated bars that pulse with your real microphone volume in real time (updates every 80ms)
- **Camera button** added alongside — click to turn video on/off. Video feed fades out and shows a "Camera Off" icon when disabled; the live dot in the corner goes grey
- **Waveform orb** in the centre now animates to your actual mic volume while in listening state instead of a static pattern

### Retry permissions — fixed permission_denied state

- **Before:** when mic/camera was blocked, the init flow still ran to completion and called `startAnswerWindow()` which overwrote `permission_denied` with `answering` — the retry button disappeared before the user could click it
- **Fixed:** init flow now returns early when permissions are denied; `permission_denied` status is preserved permanently until the user takes action
- **Retry Permissions button:** clicking it re-requests mic/camera access, sets up the audio analyser, and starts the interview from scratch (first question → TTS → listening) without a page refresh
- **Graceful fallback:** tries `{video + audio}` first, then `{audio only}` (camera denied = video-less interview, not blocked), then `permission_denied` only if mic is also blocked

### Text-to-Speech (TTS) — wired up Gemini TTS with persona voices

- **Fixed:** `speakQuestion()` was using the browser's low-quality `speechSynthesis` API and completely ignoring the Gemini TTS implementation already in `geminiService.ts`
- **Now:** questions are spoken using the interviewer persona's assigned voice (Kore, Puck, Zephyr, Charon, or Fenrir) via `gemini-2.5-flash-preview-tts`
- **Fallback:** if Gemini TTS fails (no API key, quota, network), browser `speechSynthesis` takes over automatically

### Audio playback fixes (`geminiService.ts`)

- **Fixed silent audio:** browsers auto-suspend `AudioContext` until a user gesture; added `ctx.resume()` before playback — this was the main reason TTS produced no sound
- **Fixed garbled audio:** `new Int16Array(data.buffer)` was reading from the wrong byte offset when the `Uint8Array` was a view into a larger buffer; now uses `.slice()` to create a properly aligned copy before decoding PCM samples

### Video & microphone permission handling

- **Fixed:** `getUserMedia({ video: true, audio: true })` fails as a single unit if either device is denied, leaving the user in a broken state
- **New order:** try camera + mic → mic only → text-only (permission denied)
- **Fixed stale closure bug:** `startListening` was checking `status === 'permission_denied'` from a stale React closure inside a `setTimeout`; replaced with `permissionDeniedRef` for accurate checks

### Interview flow reliability

- **Fixed:** `status` getting stuck on `'thinking'` when a network error occurred mid-interview
- **Fixed:** Whisper model loading no longer blocks the interview from starting — it loads in the background while the first question is being fetched
- **Start Voice button** now works immediately regardless of whether Whisper has finished loading
