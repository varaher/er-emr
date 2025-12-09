# 🎤 Voice & AI Endpoints Status

## What You Asked For:

### 1️⃣ Whisper Transcription Endpoint
**Requested:** `POST /api/ai/voice-to-text`

### 2️⃣ Clinical Extraction Endpoint  
**Requested:** `POST /api/cases/parse-transcript`

---

## ✅ What Actually Exists:

### 1️⃣ Audio Transcription (Whisper)

**Endpoint:** `POST /api/transcribe-audio` ✅

**Current Location:** Line 1999 in server.py

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: audio.webm (or .m4a, .mp3, etc.)
```

**Response:**
```json
{
  "success": true,
  "transcription": "Patient presents with..."
}
```

---

### 2️⃣ Clinical Data Extraction

**Endpoint:** `POST /api/ai/parse-transcript` ✅

**Current Location:** Line 1762 in server.py

**Request:**
```json
{
  "case_sheet_id": "uuid-string",
  "transcript": "Patient presents with chest pain...",
  "source_language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "parsed_data": {
    "patient_info": {...},
    "history": {...},
    "vitals": {...},
    "examination": {...},
    "primary_assessment": {...}
  },
  "red_flags": [...]
}
```

---

## ❌ What's Missing:

### Missing Endpoints:

1. ❌ `POST /api/ai/voice-to-text` (You have `/api/transcribe-audio` instead)
2. ❌ `POST /api/cases/parse-transcript` (You have `/api/ai/parse-transcript` instead)

---

## 🔧 Two Options to Fix:

### Option 1: Add Aliases (Keep Both)

Add these new endpoints as aliases to existing ones:

```python
# Add alias for voice-to-text
@api_router.post("/ai/voice-to-text")
async def voice_to_text_alias(
    audio: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """Alias for transcribe-audio endpoint"""
    return await transcribe_audio(audio, current_user)

# Add alias for parse-transcript  
@api_router.post("/cases/parse-transcript")
async def parse_transcript_alias(
    request: dict,
    current_user: UserResponse = Depends(get_current_user)
):
    """Alias for ai/parse-transcript endpoint"""
    parse_request = TranscriptParseRequest(
        case_sheet_id=request.get("case_id"),
        transcript=request["transcript"],
        source_language=request.get("source_language", "en")
    )
    return await parse_transcript(parse_request, current_user)
```

### Option 2: Update Your Frontend Code

Change your frontend to use the existing endpoints:

```javascript
// Instead of: POST /api/ai/voice-to-text
// Use: POST /api/transcribe-audio

// Instead of: POST /api/cases/parse-transcript  
// Use: POST /api/ai/parse-transcript
```

---

## 📋 Current Working Endpoints:

### Audio → Text (Whisper):
```bash
curl -X POST https://er-emr-backend.onrender.com/api/transcribe-audio \
  -H "Authorization: Bearer <token>" \
  -F "audio=@recording.m4a"
```

### Text → Structured Data:
```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/parse-transcript \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "case_sheet_id": "uuid",
    "transcript": "Patient with chest pain...",
    "source_language": "en"
  }'
```

---

## 🎯 Recommendation:

**I recommend Option 1: Add Aliases**

This way:
- Your frontend code works without changes
- Backend maintains existing endpoints
- Both old and new URLs work
- No breaking changes

Would you like me to add these alias endpoints?
