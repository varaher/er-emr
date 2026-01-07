# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## 🔧 Latest Update: December 2025

### New Features Implemented:

#### 1. Hospital-Specific Triage System (Priority I-V)
**File:** `TriageScreen.js` (Complete Rewrite - Updated)

Based on hospital's TRIAGE.pdf protocol, implementing 5-level priority system:

| Priority | Color | Name | Timeframe | Examples |
|----------|-------|------|-----------|----------|
| I | Red | IMMEDIATE | 0 min | Cardiac arrest, GCS <8, SpO2 <90% |
| II | Orange | VERY URGENT | 5 min | Chest pain, stroke, DKA, open fractures |
| III | Yellow | URGENT | 30 min | Moderate trauma, dehydration, UTI |
| IV | Green | STANDARD | 60 min | Minor injuries, fever, cough/cold |
| V | Blue | NON-URGENT | 120 min | Elective procedures, BP checking |

**Features:**
- Separate Adult and Pediatric condition lists (auto-detected by age)
- Interactive condition checkboxes that auto-calculate priority
- Real-time vital signs analysis with automatic priority escalation
- Pediatric-specific criteria: CRT, fever thresholds by age, GRBS in infants
- Voice input with AI-powered extraction (uses `/api/ai/extract-triage-data`)
- **Triage result card shown at BOTTOM** (not top)
- **"Go to Case Sheet" button** (auto-creates case and navigates directly)
- Auto-fills patient info from voice (name, age, sex, vitals, chief complaint)

#### 2. Comprehensive Discharge Summary Export
**File:** `DischargeSummaryScreen.js`

Enhanced PDF/Word export includes ALL case sheet sections:
- Patient Information (UHID, demographics, MLC status)
- Allergy Status
- Vitals at Arrival (complete with GCS breakdown, GRBS, Pain Score)
- Presenting Complaints with duration and onset
- Full HOPI (History of Present Illness)
- Past Medical/Surgical/Drug/Family History
- Primary Assessment (ABCDE with detailed findings)
- Systemic Examination (General, CVS, Respiratory, Abdomen, CNS, Extremities)
- Investigations ordered and results
- Medications Administered in ER
- Procedures Performed
- Course in Emergency Department (auto-generated or manual)
- Diagnosis at Discharge
- Discharge Medications
- Disposition and Condition at Discharge
- Vitals at Discharge
- Follow-up Advice
- General Instructions (warning signs)
- Signatures (ED Resident and Consultant)

#### 3. Subscription-Based Edit Limits
**Backend:** `server.py`

New endpoints:
- `GET /api/cases/{case_id}/edit-status` - Check if case can be edited
- Edit count tracking on each case update

Rules:
- Free users: **2 free edits per case sheet**
- After limit: Upgrade required for unlimited edits
- Locked cases cannot be edited (legal/audit compliance)

---

## 🔧 Previous Fix: Mobile Save Bug (January 4, 2025)

### Issue Fixed: Data Type Mismatch in Case Sheet Save

**Problem:** Mobile app was sending incorrect data types to backend:
- Boolean fields (general_pallor, general_icterus, etc.) sent as string "Absent" instead of `false`
- Integer field (cvs_pulse_rate) sent as empty string `""` instead of `null`
- String field (cvs_precordial_heave) sent as boolean `false` instead of `"Normal"`

**Solution:** Added type conversion helper functions in `CaseSheetScreen.js`:
```javascript
toBoolean(value)      // Converts "Absent"/"Present"/etc to true/false
toIntOrNull(value)    // Converts "" to null, "72" to 72
toFloatOrNull(value)  // For decimal values
toStringOrEmpty(value) // For string fields, handles booleans
```

**Files Modified:**
| File | Changes |
|------|---------|
| `CaseSheetScreen.js` | Added type helpers (lines 1169-1213), Applied conversions throughout payload builder |

**Test Results:** All 12 backend tests passed - see `/app/test_reports/iteration_5.json`

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
