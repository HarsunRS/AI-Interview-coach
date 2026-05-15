# AI Mock Interviewer — Architecture

## System Overview

```mermaid
flowchart TB
    User(["👤 User"])

    subgraph Browser["Browser"]
        subgraph UI["React UI  ·  TypeScript + Vite"]
            Auth["Auth\n─────────────\nLogin / Register\nEmail normalisation\nlocalStorage persistence"]
            Layout["Layout\n─────────────\nSticky header\nTheme toggle\nAPI Key settings modal"]
            Dashboard["Dashboard\n─────────────\nSession history\nScore trend chart\nExtracted skills\nBest-fit roles"]
            Setup["SetupForm\n─────────────\nStep 1 – Basic info\nStep 2 – Resume + JD\nPersonalise toggle\nStep 3 – Session format\nStep 4 – Confirm & launch"]
            Chat["ChatInterface\n─────────────\nLive interview session\nPause / resume\nVoice + text input\nSilence detection\nSession timer"]
            Report["ReportView\n─────────────\nOverall score\nMetric radar\nQuestion breakdown\nImprovement plan"]
            Analyzer["ResumeAnalyzer\n─────────────\nATS + resume score\nStrengths / weaknesses\nSkill gaps\nJob role matches"]
        end

        App["App.tsx\n─────────────\nView router\nShared state\n(profile, history, report)\nlocalStorage sync"]

        subgraph STT["Speech-to-Text  (hybrid)"]
            WebSpeech["Web Speech API\n(real-time display)"]
            Whisper["Whisper Tiny\n(HuggingFace Transformers)\nfinal transcription\nvia MediaRecorder"]
        end

        subgraph BrowserAPIs["Browser APIs"]
            LS[("localStorage\n users · session\n history · API key")]
            AudioAPI["Web Audio API\nPCM 24 kHz playback"]
            MediaAPI["getUserMedia\ncamera + microphone"]
        end
    end

    subgraph Service["InterviewService  ·  geminiService.ts"]
        direction TB
        subgraph Primary["Primary — Google Gemini"]
            GemChat["gemini-2.5-flash\nChat  ·  initInterview\nsendMessage"]
            GemJSON["gemini-2.5-flash\nStructured JSON\ngenerateReport\nanalyzeResume\nparseResumeIntelligence"]
            GemTTS["gemini-2.5-flash-preview-tts\nVoice synthesis\n5 persona voices\n(Kore · Puck · Zephyr …)"]
        end
        subgraph Fallback["Fallback chain"]
            Ollama["Ollama  (localhost:11434)\nauto-detects best model\nQwen 2.5 → Llama 3.2\n→ Mistral → first available"]
            LocalFB["Local heuristics\nScripted questions\nbuildLocalResumeProfile\nbuildFallbackReport"]
        end
        Adaptive["Adaptive Signal\n─────────────\nevaluateAnswerLocally()\nWEAK · MODERATE · STRONG\nprepended to every message"]
    end

    subgraph External["External Services"]
        GeminiAPI["Google Gemini API\naistudio.google.com"]
        OllamaRuntime["Ollama Runtime\nlocalhost:11434"]
        HFHub["HuggingFace Hub\nXenova/whisper-tiny\n(downloaded once)"]
        DiceAPI["DiceBear API\navatar generation"]
    end

    %% ── User entry ──────────────────────────────────────────
    User -->|"open app"| Browser

    %% ── Auth ────────────────────────────────────────────────
    Auth <-->|"read/write"| LS
    Auth -->|"login"| App

    %% ── App routing ─────────────────────────────────────────
    App --> Layout
    Layout --> Dashboard
    Layout --> Setup
    Layout --> Chat
    Layout --> Report
    Layout --> Analyzer
    App <-->|"sync profile + history"| LS

    %% ── Setup → interview ───────────────────────────────────
    Setup -->|"profile + resumeProfile"| App
    App -->|"profile"| Chat

    %% ── Interview session ───────────────────────────────────
    Chat -->|"initInterview · sendMessage"| Service
    Chat -->|"generateSpeech"| GemTTS
    GemTTS -->|"base64 PCM audio"| AudioAPI
    Chat -->|"live transcript"| WebSpeech
    Chat -->|"final transcription"| Whisper
    Chat -->|"camera + mic stream"| MediaAPI
    Whisper -->|"model download"| HFHub

    %% ── Adaptive signal ─────────────────────────────────────
    Adaptive -->|"injected into every sendMessage"| GemChat

    %% ── Report ──────────────────────────────────────────────
    Chat -->|"full transcript"| App
    App -->|"generateReport"| GemJSON
    GemJSON --> App
    App --> Report

    %% ── Resume Analyzer ─────────────────────────────────────
    Analyzer -->|"analyzeResume"| GemJSON
    Analyzer -->|"parseResumeIntelligence"| GemJSON

    %% ── Gemini fallback chain ───────────────────────────────
    GemChat & GemJSON -->|"API failure"| Ollama
    GemTTS -->|"failure"| WebSpeech
    Ollama -->|"not running"| LocalFB

    %% ── External wiring ─────────────────────────────────────
    GemChat & GemJSON & GemTTS -->|"HTTPS"| GeminiAPI
    Ollama -->|"HTTP"| OllamaRuntime
    Dashboard -->|"avatar seed"| DiceAPI

    %% ── API key resolution ──────────────────────────────────
    LS -->|"ip_gemini_key override"| Service
```

---

## Component Responsibility Map

| Component | Owns | Receives from |
|---|---|---|
| **App.tsx** | View state, `profile`, `history`, `report` | Auth (user), Chat (transcript), Setup (profile) |
| **Auth** | Login / register logic | — |
| **Layout** | Theme, API key settings modal | App (theme toggle) |
| **Dashboard** | History list, score chart, skill tags, role matches | App (history, profile) |
| **SetupForm** | Multi-step profile builder, Personalise toggle | App (onStart) |
| **ChatInterface** | Full interview session lifecycle | App (profile, onComplete) |
| **ReportView** | Score display, question breakdown, improvement plan | App (report) |
| **ResumeAnalyzer** | Standalone ATS/job analysis page | App (theme) |

---

## Data Flow — Interview Session

```
User answers question
       │
       ▼
Web Speech API ──► live transcript shown in UI
       │
       ▼
MediaRecorder captures audio blob
       │
       ▼
Whisper Tiny (local) ──► final accurate transcription
       │
       ▼
evaluateAnswerLocally() ──► WEAK / MODERATE / STRONG signal
       │
       ▼
[ADAPTIVE SIGNAL] + answer text ──► Gemini chat (or Ollama)
       │
       ▼
Interviewer reply text
       │
       ▼
Gemini TTS ──► PCM audio ──► Web Audio API playback
(or browser speechSynthesis fallback)
```

---

## Fallback Chain (3 tiers)

```
Gemini API  ──────►  Ollama (localhost)  ──────►  Local heuristics
   (cloud)           (auto-detect model)          (scripted / regex)
   
Interview chat:   Gemini chat  →  Ollama chat (full history)  →  scripted questions
Report:           Gemini JSON  →  Ollama JSON                 →  buildFallbackReport()
Resume analysis:  Gemini JSON  →  Ollama JSON                 →  throws (shown in UI)
Personalise:      Gemini JSON  →  Ollama JSON                 →  buildLocalResumeProfile()
TTS:              Gemini TTS   →  browser speechSynthesis
```

---

## State Persistence (localStorage)

| Key | Contents |
|---|---|
| `ip_users` | Array of `UserAccount` (email, hashed-ish password, profile, history) |
| `ip_session` | Currently logged-in `UserAccount` (auto-login on refresh) |
| `ip_gemini_key` | User-entered Gemini API key (overrides `.env.local`) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS (utility-first) |
| Charts | Recharts |
| AI — cloud | Google Gemini 2.5 Flash + TTS Preview (`@google/genai`) |
| AI — local | Ollama (any installed model, auto-detected) |
| STT — realtime | Web Speech API (browser native) |
| STT — accurate | Whisper Tiny via `@huggingface/transformers` (WASM, runs in-browser) |
| Audio output | Web Audio API (PCM decode + playback) |
| Persistence | localStorage (no backend) |
