# 🎙️ Voice Transcription - Quick Reference

## 🔗 Endpoint

```
POST /api/ai/voice-to-text
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## 📝 Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | File | ✅ Yes | - | Audio file (m4a, webm, wav, mp3) |
| `engine` | String | ❌ No | `"auto"` | `"openai"` \| `"sarvam"` \| `"auto"` |
| `language` | String | ❌ No | `null` | ISO code: `"en"`, `"hi"`, `"ta"`, etc. |

---

## 🌍 Language Support

### English & Global (OpenAI):
`en`, `es`, `fr`, `de`, `zh`, `ja`, `ko`, `ar`, `ru`, etc. (99+ languages)

### Indian Languages (Sarvam):
- **Hindi** - `hi`
- **Tamil** - `ta`  
- **Telugu** - `te`
- **Malayalam** - `ml`
- **Kannada** - `kn`
- **Marathi** - `mr`
- **Bengali** - `bn`
- **Gujarati** - `gu`
- **Punjabi** - `pa`
- **Odia** - `or`
- **Assamese** - `as`
- **Urdu** - `ur`

---

## ⚡ Quick Examples

### Auto-Select Engine (Recommended):
```javascript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('engine', 'auto');  // Auto-selects best engine
formData.append('language', 'hi');  // Hindi → uses Sarvam

fetch(`${API_URL}/ai/voice-to-text`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Force OpenAI:
```javascript
formData.append('engine', 'openai');
formData.append('language', 'en');
```

### Force Sarvam:
```javascript
formData.append('engine', 'sarvam');
formData.append('language', 'ta');  // Tamil
```

---

## 📤 Response

```json
{
  "success": true,
  "engine_used": "sarvam",
  "language": "hi",
  "transcription": "रोगी को सांस लेने में दिक्कत है...",
  "raw": { /* engine details */ }
}
```

---

## 🎯 Auto-Selection Logic

```
if language in [hi, mr, bn, ta, te, kn, ml, gu, pa, or, as, ur]:
    → Use Sarvam AI (Indian languages)
else:
    → Use OpenAI Whisper (English & others)
```

---

## ⚙️ Setup

### Required Environment Variable:
```
EMERGENT_LLM_KEY=sk-emergent-... (Already configured ✅)
```

### Optional (for Sarvam support):
```
SARVAM_API_KEY=your_sarvam_key
```

**Without Sarvam key:** Falls back to OpenAI for all languages

---

## 🧪 Test Commands

```bash
# English (uses OpenAI)
curl -X POST $API_URL/ai/voice-to-text \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@english.m4a" \
  -F "engine=auto" \
  -F "language=en"

# Hindi (uses Sarvam)
curl -X POST $API_URL/ai/voice-to-text \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@hindi.m4a" \
  -F "engine=auto" \
  -F "language=hi"
```

---

## ❌ Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 500: "Sarvam API key not configured" | Missing `SARVAM_API_KEY` | Add key or use `engine=openai` |
| 502: "Sarvam STT error: 400" | Unsupported language | Use OpenAI for non-Indian languages |
| 401: "Invalid token" | Wrong/expired JWT | Get new token from `/api/auth/login` |

---

## ✅ Best Practices

1. **Always use `engine="auto"`** for best results
2. **Specify language** for better accuracy
3. **Handle errors gracefully** with fallback options
4. **Show loading state** during transcription
5. **Allow user to select language** from UI

---

## 📊 Engine Comparison

| | OpenAI | Sarvam |
|---|---|---|
| **Best for** | English | Indian languages |
| **Languages** | 99+ | 12 |
| **Medical Terms** | ✅ Excellent | ✅ Good |
| **Cost** | $0.006/min | Variable |

---

## 🚀 Production URL

```
https://er-emr-backend.onrender.com/api/ai/voice-to-text
```

**Status:** ✅ Live and working

**Documentation:** https://er-emr-backend.onrender.com/docs

---

## 📞 Quick Troubleshooting

**Issue:** Returns 404
→ Check URL has `/api` prefix

**Issue:** Always uses OpenAI
→ Check `SARVAM_API_KEY` in Render environment

**Issue:** Poor quality transcription
→ Try different engine or check audio quality

**Issue:** Slow transcription
→ Reduce audio file size or use shorter clips

---

## 🎉 Summary

**Single endpoint, dual engines, multiple languages!**

- ✅ Automatic engine selection
- ✅ 99+ languages supported
- ✅ Optimized for medical terminology
- ✅ Production-ready with error handling

**Your app now speaks the language of your users! 🌍**
