# 🎤 Voice & AI Endpoints - Complete Reference

## ✅ ALL ENDPOINTS NOW AVAILABLE!

---

## 1️⃣ Audio Transcription (Whisper)

### Primary Endpoint:
```
POST /api/transcribe-audio
```

### Alias Endpoint (NEW):
```
POST /api/ai/voice-to-text
```

**Both work identically!**

### Request:
```
Content-Type: multipart/form-data
Authorization: Bearer <your-jwt-token>

file: audio.m4a (or .webm, .mp3, .wav, etc.)
```

### Response:
```json
{
  "success": true,
  "transcription": "Patient presents with chest pain for the past 2 hours..."
}
```

### cURL Example:
```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recording.m4a"
```

---

## 2️⃣ Clinical Data Extraction

### Primary Endpoint:
```
POST /api/ai/parse-transcript
```

### Alias Endpoint (NEW):
```
POST /api/cases/parse-transcript
```

**Both work identically!**

### Request Format for Alias:
```json
{
  "case_id": "uuid-string",
  "transcript": "Full transcription text...",
  "source_language": "en"
}
```

### Request Format for Primary:
```json
{
  "case_sheet_id": "uuid-string",
  "transcript": "Full transcription text...",
  "source_language": "en"
}
```

### Response:
```json
{
  "success": true,
  "parsed_data": {
    "patient_info": {
      "name": "John Doe",
      "age": 45,
      "gender": "male"
    },
    "vitals": {
      "hr": 88,
      "bp_systolic": 140,
      "bp_diastolic": 90,
      "rr": 18,
      "spo2": 98,
      "temperature": 37.2,
      "gcs_e": 4,
      "gcs_v": 5,
      "gcs_m": 6
    },
    "history": {
      "signs_and_symptoms": "Chest pain, shortness of breath",
      "past_medical": ["Hypertension", "Diabetes"],
      "allergies": ["Penicillin"],
      "drug_history": "Metformin 500mg BD",
      "past_surgical": "None",
      "family_history": "Father had MI at 60"
    },
    "examination": {
      "general_notes": "Alert, in mild distress",
      "general_pallor": false,
      "general_icterus": false,
      "cvs_additional_notes": "S1 S2 heard, no murmurs",
      "respiratory_additional_notes": "Clear bilateral breath sounds",
      "abdomen_additional_notes": "Soft, non-tender",
      "cns_additional_notes": "GCS 15/15"
    },
    "primary_assessment": {
      "airway_additional_notes": "Patent",
      "breathing_additional_notes": "SpO2 98% on room air",
      "circulation_additional_notes": "BP 140/90, HR 88",
      "disability_additional_notes": "GCS 15, Alert",
      "exposure_additional_notes": "No obvious injuries"
    }
  },
  "red_flags": [
    "⚠️ Mild hypertension (SBP 140) - Monitor"
  ],
  "message": "Transcript parsed successfully. ABCDE assessment and red flags auto-calculated. Review and save."
}
```

### cURL Example:
```bash
curl -X POST https://er-emr-backend.onrender.com/api/cases/parse-transcript \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "your-case-uuid",
    "transcript": "Patient presents with chest pain...",
    "source_language": "en"
  }'
```

---

## 🔄 Complete Workflow

### Step 1: Record Audio
```javascript
// React Native code
const recordAudio = async () => {
  const recording = await Audio.Recording.createAsync(...);
  // Record audio
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  return uri;
};
```

### Step 2: Transcribe Audio
```javascript
const transcribeAudio = async (audioUri) => {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });

  const response = await fetch(
    'https://er-emr-backend.onrender.com/api/ai/voice-to-text',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const result = await response.json();
  return result.transcription;
};
```

### Step 3: Extract Clinical Data
```javascript
const extractClinicalData = async (caseId, transcript) => {
  const response = await fetch(
    'https://er-emr-backend.onrender.com/api/cases/parse-transcript',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        case_id: caseId,
        transcript: transcript,
        source_language: 'en',
      }),
    }
  );

  const result = await response.json();
  return result.parsed_data;
};
```

### Step 4: Use Extracted Data
```javascript
const handleVoiceInput = async (audioUri, caseId) => {
  try {
    // Step 1: Transcribe
    const transcript = await transcribeAudio(audioUri);
    console.log('Transcription:', transcript);

    // Step 2: Extract structured data
    const clinicalData = await extractClinicalData(caseId, transcript);
    console.log('Extracted data:', clinicalData);

    // Step 3: Update form fields
    setPatientName(clinicalData.patient_info.name);
    setAge(clinicalData.patient_info.age);
    setVitals(clinicalData.vitals);
    setHistory(clinicalData.history);
    // ... etc

    // Step 4: Show red flags if any
    if (result.red_flags && result.red_flags.length > 0) {
      alert('Red Flags: ' + result.red_flags.join('\n'));
    }
  } catch (error) {
    console.error('Voice input error:', error);
  }
};
```

---

## 📋 All Available Endpoints Summary

| Feature | Primary Endpoint | Alias Endpoint | Status |
|---------|-----------------|----------------|--------|
| Audio → Text | `/api/transcribe-audio` | `/api/ai/voice-to-text` | ✅ Both work |
| Text → Structured | `/api/ai/parse-transcript` | `/api/cases/parse-transcript` | ✅ Both work |

---

## 🎯 Key Features

### Transcription Features:
- ✅ Supports multiple audio formats (m4a, webm, mp3, wav)
- ✅ Optimized for medical terminology
- ✅ Real-time transcription
- ✅ Uses OpenAI Whisper-1 model
- ✅ Medical context prompt for better accuracy

### Extraction Features:
- ✅ 3-stage AI processing (Clean → Extract → Structure)
- ✅ Removes filler words and noise
- ✅ Extracts patient demographics
- ✅ Extracts complete vitals
- ✅ Extracts history (medical, surgical, allergies, medications)
- ✅ Extracts physical examination findings
- ✅ Auto-calculates ABCDE assessment
- ✅ Auto-generates red flag warnings
- ✅ Structured JSON output

---

## 🧪 Testing Your Endpoints

### Test 1: Voice-to-Text
```bash
# Create a test audio file or use existing one
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-audio.m4a"

# Expected: {"success": true, "transcription": "..."}
```

### Test 2: Parse Transcript
```bash
curl -X POST https://er-emr-backend.onrender.com/api/cases/parse-transcript \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "test-case-123",
    "transcript": "Patient is a 45 year old male presenting with chest pain. Heart rate 88, blood pressure 140 over 90, respiratory rate 18, SpO2 98 percent. Past medical history of hypertension and diabetes. Allergic to penicillin.",
    "source_language": "en"
  }'

# Expected: Structured JSON with patient_info, vitals, history, etc.
```

---

## ⚠️ Important Notes

1. **Authentication Required:**
   - Both endpoints require Bearer token
   - Get token from `/api/auth/login`

2. **File Size Limits:**
   - Maximum audio file size: ~25MB (Whisper limit)
   - For longer recordings, split into chunks

3. **Supported Languages:**
   - Primary: English (`en`)
   - Transcript can be in any language, AI will translate to English

4. **Red Flags:**
   - Automatically calculated based on vital signs
   - Categories: Critical (🚨) and Warning (⚠️)
   - Examples: Hypotension, severe hypoxia, altered consciousness

5. **Rate Limits:**
   - Depends on your Emergent LLM Key quota
   - Each transcription + extraction = 2 API calls

---

## 🚀 Production Deployment

Both alias endpoints are now live on your backend:

```
Base URL: https://er-emr-backend.onrender.com

Voice to Text: 
  - /api/ai/voice-to-text ✅
  - /api/transcribe-audio ✅

Parse Transcript:
  - /api/cases/parse-transcript ✅
  - /api/ai/parse-transcript ✅
```

**Your frontend code should work without any changes!** 🎉

---

## 📞 Need Help?

If endpoints not working:
1. Check health: `curl https://er-emr-backend.onrender.com/health`
2. Check docs: `https://er-emr-backend.onrender.com/docs`
3. Verify token: Test with `/api/auth/me`
4. Check logs on Render Dashboard

---

## ✅ Summary

**You now have 4 working endpoints:**

1. ✅ `POST /api/transcribe-audio` - Original transcription endpoint
2. ✅ `POST /api/ai/voice-to-text` - **NEW ALIAS** for transcription
3. ✅ `POST /api/ai/parse-transcript` - Original parsing endpoint  
4. ✅ `POST /api/cases/parse-transcript` - **NEW ALIAS** for parsing

**Both aliases work exactly as you requested!** 🚀
