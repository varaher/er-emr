# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## ⚠️ IMPORTANT: Do NOT Change Basic Case Sheet Structure

The case sheet structure has been finalized. Do NOT modify:
- Tab order: Patient → Vitals → Primary → History → Exam → Treatment → Notes → Disposition
- Field groupings within each tab
- The save payload structure

---

## Latest Update: Real-Time Streaming Voice Transcription

### New Feature: Live Voice Dictation

**Architecture:**
```
Mobile App (PCM Audio)
  └─► WebSocket (/ws/stt)
         ├─► Sarvam Streaming STT (Primary - Indian languages)
         │       └─► partial text updates
         │
         └─► OpenAI Medical Cleanup (Final refinement)
                 └─► polished clinical text
```

**Features:**
- 🎙️ Continuous speech recording (no stop/start)
- 🌐 Multi-language support: English, Hindi, Malayalam
- 🏥 Medical terminology cleanup via OpenAI
- 🔐 JWT-secured WebSocket (no API keys in app)
- 📝 Real-time text preview as you speak
- ⚡ Works for 5-15 min dictation sessions

**Audio Format (Important):**
| Parameter | Value |
|-----------|-------|
| Encoding | PCM 16-bit |
| Sample Rate | 16,000 Hz |
| Channels | Mono |

**Backend Environment Variables (Render):**
```
SARVAM_API_KEY=sk_sarvam_xxxx  # Get from sarvam.ai
OPENAI_API_KEY=sk_openai_xxxx  # OR use EMERGENT_LLM_KEY
```

---

## Files to Update Before APK Rebuild

### 📱 MOBILE FILES (Copy these to VSCode):

| # | File | What Changed |
|---|------|--------------|
| 1 | `CaseSheetScreen.js` | **NEW:** Streaming voice mode, language selection, voice settings modal |
| 2 | `TriageScreen.js` | Auto Adult/Pediatric detection |
| 3 | `DischargeSummaryScreen.js` | Enhanced Course in ER + Finish button |
| 4 | `ViewCaseSheetScreen.js` | Shows procedures, drugs, exam notes |
| 5 | `StreamingVoiceInput.js` | **NEW FILE:** Reusable streaming voice component |

### 🔧 BACKEND FILES:

| File | What Changed |
|------|--------------|
| `server.py` | **NEW:** `/ws/stt` WebSocket endpoint for streaming STT |

---

## Voice Settings UI (In Case Sheet Header)

Users can toggle between:
1. **Standard Mode** (default) - Record → Stop → Transcribe
2. **Streaming Mode** - Live transcription as you speak

Language options:
- 🇬🇧 English (en-IN)
- 🇮🇳 Hindi (hi-IN)  
- 🇮🇳 Malayalam (ml-IN)

---

## How Streaming Voice Works

1. **User taps mic** → WebSocket connects → JWT authenticated
2. **App streams audio** → Binary PCM frames to backend
3. **Sarvam processes** → Partial text sent back live
4. **UI updates** → User sees text appear as they speak
5. **User taps stop** → Backend sends accumulated text to OpenAI
6. **Medical cleanup** → Drug names, vitals, abbreviations corrected
7. **Final text** → Inserted into the field

---

## API Endpoints

### REST (Existing)
- `POST /api/ai/voice-to-text` - File-based transcription
- `POST /api/ai/extract-from-voice` - AI extraction from voice

### WebSocket (NEW)
- `ws://host/ws/stt` - Streaming speech-to-text
  - Auth: `{ "token": "JWT", "language": "en-IN" }`
  - Audio: Binary PCM frames
  - Response: `{ "type": "partial|final", "text": "..." }`

---

## Test Credentials
- Email: test@test.com
- Password: Test123!

## Configuration
- Expo Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
