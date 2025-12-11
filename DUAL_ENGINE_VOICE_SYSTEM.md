# 🎙️ Dual-Engine Voice Transcription System

## Overview

Production-ready dual-engine voice transcription supporting:
- ✅ **OpenAI Whisper** - Best for English and global languages
- ✅ **Sarvam AI** - Optimized for Indian languages
- ✅ **Auto-selection** - Intelligently picks the best engine based on language

---

## 🌍 Supported Languages

### OpenAI Whisper (99+ languages):
- **English** (en)
- Spanish (es), French (fr), German (de)
- Chinese (zh), Japanese (ja), Korean (ko)
- Arabic (ar), Russian (ru)
- And 90+ more languages

### Sarvam AI (12 Indian languages):
- **Hindi** (hi) - हिन्दी
- **Tamil** (ta) - தமிழ்
- **Telugu** (te) - తెలుగు
- **Kannada** (kn) - ಕನ್ನಡ
- **Malayalam** (ml) - മലയാളം
- **Marathi** (mr) - मराठी
- **Bengali** (bn) - বাংলা
- **Gujarati** (gu) - ગુજરાતી
- **Punjabi** (pa) - ਪੰਜਾਬੀ
- **Odia** (or) - ଓଡ଼ିଆ
- **Assamese** (as) - অসমীয়া
- **Urdu** (ur) - اردو

---

## 📋 API Endpoint

### Endpoint:
```
POST /api/ai/voice-to-text
```

### Request Format:
```
Content-Type: multipart/form-data
Authorization: Bearer <your-jwt-token>

Fields:
- file: Audio file (required)
- engine: "openai" | "sarvam" | "auto" (optional, default: "auto")
- language: ISO language code (optional, e.g., "hi", "en", "ta")
```

### Response Format:
```json
{
  "success": true,
  "engine_used": "sarvam",
  "language": "hi",
  "transcription": "रोगी को सांस लेने में दिक्कत है...",
  "raw": {
    // Engine-specific response details
  }
}
```

---

## 🚀 Usage Examples

### Example 1: Auto-selection (Recommended)
```javascript
// React Native
const transcribeAudio = async (audioUri, language) => {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  formData.append('engine', 'auto');  // Auto-select engine
  formData.append('language', language);  // e.g., 'hi' or 'en'

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
  console.log('Engine used:', result.engine_used);
  console.log('Transcription:', result.transcription);
  return result;
};

// Usage
const result = await transcribeAudio(audioUri, 'hi');
// Auto-selects Sarvam for Hindi
```

### Example 2: Force OpenAI Whisper
```javascript
formData.append('engine', 'openai');  // Force OpenAI
formData.append('language', 'en');
```

### Example 3: Force Sarvam AI
```javascript
formData.append('engine', 'sarvam');  // Force Sarvam
formData.append('language', 'ta');  // Tamil
```

### Example 4: cURL Test
```bash
# Test with English (will use OpenAI)
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recording.m4a" \
  -F "engine=auto" \
  -F "language=en"

# Test with Hindi (will use Sarvam)
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recording.m4a" \
  -F "engine=auto" \
  -F "language=hi"
```

---

## 🎯 Auto-Selection Logic

The `engine="auto"` mode uses this logic:

```python
if language in ["hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "as", "ur"]:
    use_engine = "sarvam"  # Indian language
else:
    use_engine = "openai"  # English or other languages
```

**Benefits:**
- ✅ Better accuracy for Indian languages with Sarvam
- ✅ Better accuracy for English/global languages with OpenAI
- ✅ Automatic fallback to OpenAI if Sarvam fails
- ✅ No manual engine selection needed

---

## ⚙️ Configuration

### Environment Variables

Add to Render Dashboard → Environment:

```env
# Existing (already configured)
EMERGENT_LLM_KEY=sk-emergent-1489bD95832530eB39

# New (for Sarvam AI support)
SARVAM_API_KEY=your_sarvam_api_key_here
```

**Getting Sarvam API Key:**
1. Go to https://www.sarvam.ai/
2. Sign up / Log in
3. Navigate to API Keys section
4. Copy your API key
5. Add to Render environment variables

**Note:** If `SARVAM_API_KEY` is not set, system will automatically fall back to OpenAI for all requests.

---

## 🔄 Complete Workflow

### Frontend Implementation:

```javascript
// 1. Language Selector Component
const LanguageSelector = ({ selectedLanguage, onSelect }) => {
  const languages = [
    { code: 'en', name: 'English', engine: 'openai' },
    { code: 'hi', name: 'हिन्दी (Hindi)', engine: 'sarvam' },
    { code: 'ta', name: 'தமிழ் (Tamil)', engine: 'sarvam' },
    { code: 'te', name: 'తెలుగు (Telugu)', engine: 'sarvam' },
    { code: 'ml', name: 'മലയാളം (Malayalam)', engine: 'sarvam' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', engine: 'sarvam' },
    { code: 'mr', name: 'मराठी (Marathi)', engine: 'sarvam' },
    { code: 'bn', name: 'বাংলা (Bengali)', engine: 'sarvam' },
  ];

  return (
    <Picker selectedValue={selectedLanguage} onValueChange={onSelect}>
      {languages.map(lang => (
        <Picker.Item 
          key={lang.code} 
          label={`${lang.name} (${lang.engine})`} 
          value={lang.code} 
        />
      ))}
    </Picker>
  );
};

// 2. Voice Recording & Transcription
const VoiceInput = () => {
  const [language, setLanguage] = useState('en');
  const [transcription, setTranscription] = useState('');
  const [engineUsed, setEngineUsed] = useState('');

  const handleRecordAndTranscribe = async () => {
    try {
      // Record audio
      const audioUri = await recordAudio();

      // Transcribe with auto engine selection
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      formData.append('engine', 'auto');
      formData.append('language', language);

      const response = await fetch(
        `${API_BASE_URL}/ai/voice-to-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        setTranscription(result.transcription);
        setEngineUsed(result.engine_used);
        console.log(`Transcribed using ${result.engine_used}`);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  return (
    <View>
      <LanguageSelector 
        selectedLanguage={language} 
        onSelect={setLanguage} 
      />
      
      <Button 
        title="Record & Transcribe" 
        onPress={handleRecordAndTranscribe} 
      />
      
      {engineUsed && (
        <Text>Engine used: {engineUsed}</Text>
      )}
      
      {transcription && (
        <TextInput 
          value={transcription} 
          multiline 
          editable 
        />
      )}
    </View>
  );
};
```

---

## 🧪 Testing

### Test Script:
```bash
#!/bin/bash

API_URL="https://er-emr-backend.onrender.com/api"
TOKEN="your_jwt_token_here"

echo "Testing Dual-Engine Voice System"
echo "=================================="

# Test 1: English with auto (should use OpenAI)
echo "Test 1: English audio with auto engine"
curl -X POST "$API_URL/ai/voice-to-text" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@english.m4a" \
  -F "engine=auto" \
  -F "language=en" \
  | jq '.engine_used, .transcription'

# Test 2: Hindi with auto (should use Sarvam)
echo "Test 2: Hindi audio with auto engine"
curl -X POST "$API_URL/ai/voice-to-text" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@hindi.m4a" \
  -F "engine=auto" \
  -F "language=hi" \
  | jq '.engine_used, .transcription'

# Test 3: Force OpenAI
echo "Test 3: Force OpenAI engine"
curl -X POST "$API_URL/ai/voice-to-text" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.m4a" \
  -F "engine=openai" \
  -F "language=en" \
  | jq '.engine_used, .transcription'

# Test 4: Force Sarvam
echo "Test 4: Force Sarvam engine"
curl -X POST "$API_URL/ai/voice-to-text" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.m4a" \
  -F "engine=sarvam" \
  -F "language=hi" \
  | jq '.engine_used, .transcription'
```

---

## 📊 Engine Comparison

| Feature | OpenAI Whisper | Sarvam AI |
|---------|----------------|-----------|
| **Languages** | 99+ | 12 Indian |
| **Accuracy (English)** | Excellent | Good |
| **Accuracy (Indian)** | Good | Excellent |
| **Cost** | $0.006/min | Variable |
| **Medical Terms** | Excellent | Good |
| **Speed** | Fast | Fast |
| **Max Audio Length** | 25 MB | Check docs |

---

## 🚨 Error Handling

### Common Errors:

**1. Sarvam API Key Not Configured:**
```json
{
  "detail": "Sarvam AI API key not configured..."
}
```
**Fix:** Add `SARVAM_API_KEY` to Render environment variables

**2. Unsupported Language for Sarvam:**
```json
{
  "detail": "Sarvam STT error: 400 - Unsupported language"
}
```
**Fix:** Use OpenAI for non-Indian languages

**3. Audio File Too Large:**
```json
{
  "detail": "File too large"
}
```
**Fix:** Split audio into smaller chunks (< 25 MB)

---

## 🔧 Troubleshooting

### Issue: Always using OpenAI even for Hindi

**Cause:** Sarvam API key not configured or incorrect

**Fix:**
1. Check environment variable: `SARVAM_API_KEY`
2. Verify key is correct
3. Check Render logs for Sarvam API errors
4. Test with `engine=sarvam` explicitly

### Issue: Poor transcription quality

**Solutions:**
1. **Check audio quality** - Use good microphone
2. **Reduce background noise**
3. **Use correct language code**
4. **Try different engine** if one doesn't work well

### Issue: Slow transcription

**Causes:**
- Large audio files
- Network latency
- API rate limits

**Solutions:**
- Compress audio before upload
- Use shorter recording chunks
- Show loading indicator to user

---

## 📝 Best Practices

### 1. Language Selection
- Always let users select their preferred language
- Default to user's device language
- Save user's language preference

### 2. Engine Selection
- Use `engine="auto"` for best results
- Only force specific engine if needed
- Monitor which engine is used for analytics

### 3. Error Handling
- Always handle transcription failures gracefully
- Provide option to retry with different engine
- Show user-friendly error messages

### 4. User Experience
- Show which engine is being used
- Display transcription progress
- Allow manual editing of transcription

---

## 🎉 Benefits

### For Users:
- ✅ Better accuracy in their native language
- ✅ Seamless experience regardless of language
- ✅ Faster transcription for Indian languages

### For Developers:
- ✅ Single endpoint for multiple engines
- ✅ Automatic engine selection
- ✅ Fallback mechanism for reliability
- ✅ Easy to add more engines in future

### For Business:
- ✅ Support for multilingual users
- ✅ Better transcription quality
- ✅ Cost optimization (use best engine for each language)
- ✅ Competitive advantage in Indian market

---

## 🚀 Deployment Checklist

- [ ] Add `SARVAM_API_KEY` to Render environment
- [ ] Push code to GitHub
- [ ] Wait for Render auto-deploy (5-10 min)
- [ ] Test health endpoint
- [ ] Test `/docs` to see new endpoint
- [ ] Test English transcription (OpenAI)
- [ ] Test Hindi transcription (Sarvam)
- [ ] Update frontend to use new endpoint
- [ ] Test in production
- [ ] Monitor logs for errors

---

## 📞 Support

**Backend Issues:**
- Check Render logs: Dashboard → Service → Logs
- Test with cURL commands above
- Verify environment variables

**Sarvam AI Issues:**
- Verify API key is correct
- Check Sarvam API documentation
- Contact Sarvam support

**OpenAI Issues:**
- Check EMERGENT_LLM_KEY is set
- Verify API quota/limits
- Check OpenAI status page

---

## ✅ Summary

You now have a **production-ready dual-engine voice transcription system** that:

- ✅ Supports 99+ languages (OpenAI) + 12 Indian languages (Sarvam)
- ✅ Automatically selects the best engine based on language
- ✅ Falls back to OpenAI if Sarvam unavailable
- ✅ Single endpoint for easy integration
- ✅ Comprehensive error handling
- ✅ Medical terminology optimized

**Your ER-EMR app now speaks multiple languages! 🌍🎙️**
