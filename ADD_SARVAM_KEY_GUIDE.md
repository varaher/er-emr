# 🔑 Adding Sarvam AI Key to Your Backend

## Why Add Sarvam Key?

### Without Sarvam Key:
- ❌ All languages use OpenAI Whisper (including Hindi, Tamil, etc.)
- ⚠️ Decent accuracy for Indian languages, but not optimal
- ❌ Missing specialized Indian language optimization

### With Sarvam Key:
- ✅ Indian languages use Sarvam AI (optimized engine)
- ✅ **Much better accuracy** for Hindi, Tamil, Telugu, Malayalam, etc.
- ✅ Better handling of Indian names, places, and medical terms
- ✅ Full 12 Indian language support
- ✅ OpenAI still used for English and other languages

**Bottom line: Add the key for best Indian language support!**

---

## 🚀 How to Add Sarvam Key to Render

### Step 1: Go to Render Dashboard

1. Open: https://dashboard.render.com
2. Find your service: **er-emr-backend**
3. Click on it to open

### Step 2: Navigate to Environment Tab

1. In the left sidebar, click **"Environment"**
2. You'll see your existing environment variables

### Step 3: Add New Variable

1. Click **"Add Environment Variable"** button
2. Fill in:
   ```
   Key:   SARVAM_API_KEY
   Value: [Paste your Sarvam API key here]
   ```
3. Click **"Save Changes"**

### Step 4: Redeploy

After adding the key, Render will automatically redeploy your service:
1. Wait for "Deploy Complete" notification (5-10 minutes)
2. Check logs to confirm successful restart

---

## 📋 Step-by-Step with Screenshots

### Visual Guide:

```
1. Render Dashboard
   └─ Select "er-emr-backend"
      └─ Click "Environment" tab
         └─ Click "Add Environment Variable"
            └─ Enter:
               Key: SARVAM_API_KEY
               Value: your_actual_sarvam_key_here
            └─ Click "Save Changes"
            └─ Wait for auto-redeploy
```

---

## 🧪 Testing After Adding Key

### Test 1: Verify Key is Set

```bash
# Check if environment variable exists (from Render Shell or logs)
echo $SARVAM_API_KEY | head -c 20
# Should show first 20 chars of your key
```

### Test 2: Test Hindi Transcription

```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@hindi_audio.m4a" \
  -F "engine=auto" \
  -F "language=hi"

# Response should show:
# "engine_used": "sarvam"  ← Confirms Sarvam is working!
```

### Test 3: Test English (Should Still Use OpenAI)

```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@english_audio.m4a" \
  -F "engine=auto" \
  -F "language=en"

# Response should show:
# "engine_used": "openai"  ← Confirms OpenAI still works!
```

---

## ✅ Verification Checklist

After adding the key:

- [ ] Key added to Render Environment tab
- [ ] Service redeployed successfully
- [ ] Logs show "Application startup complete"
- [ ] Test Hindi audio → Returns `"engine_used": "sarvam"`
- [ ] Test English audio → Returns `"engine_used": "openai"`
- [ ] No errors in Render logs

---

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Add key to Render Environment Variables (secure)
- ✅ Keep key confidential
- ✅ Use different keys for dev/staging/prod if available
- ✅ Rotate keys periodically

### ❌ DON'T:
- ❌ Never commit key to GitHub
- ❌ Never share key in public forums
- ❌ Never hardcode key in source code
- ❌ Never log full key value

---

## 🎯 What Happens After Adding Key

### 1. Auto Engine Selection Works Perfectly

```javascript
// User selects Hindi
transcribe(audio, 'hi')  
// → Backend auto-selects Sarvam AI ✅

// User selects English
transcribe(audio, 'en')  
// → Backend auto-selects OpenAI ✅
```

### 2. Better Transcription Quality

**Before (OpenAI for Hindi):**
```
"Patient ko sans lene me dikkat hai"  ← Latin script
```

**After (Sarvam for Hindi):**
```
"रोगी को सांस लेने में दिक्कत है"  ← Proper Devanagari
```

### 3. Support for All 12 Indian Languages

Once key is added, these work perfectly:
- Hindi (hi) - हिन्दी
- Tamil (ta) - தமிழ்
- Telugu (te) - తెలుగు
- Malayalam (ml) - മലയാളം
- Kannada (kn) - ಕನ್ನಡ
- Marathi (mr) - मराठी
- Bengali (bn) - বাংলা
- Gujarati (gu) - ગુજરાતી
- Punjabi (pa) - ਪੰਜਾਬੀ
- Odia (or) - ଓଡ଼ିଆ
- Assamese (as) - অসমীয়া
- Urdu (ur) - اردو

---

## 📊 Expected Behavior

| Scenario | Without Sarvam Key | With Sarvam Key |
|----------|-------------------|-----------------|
| Hindi audio | OpenAI (decent) | **Sarvam (excellent)** |
| Tamil audio | OpenAI (decent) | **Sarvam (excellent)** |
| English audio | OpenAI (excellent) | OpenAI (excellent) |
| Auto-select Hindi | OpenAI | **Sarvam** |
| Force OpenAI | OpenAI | OpenAI |
| Force Sarvam | Error (no key) | **Sarvam** |

---

## 🚨 Troubleshooting

### Issue: Key added but still using OpenAI for Hindi

**Possible causes:**
1. Service didn't redeploy after adding key
2. Key name spelled wrong (should be `SARVAM_API_KEY`)
3. Key is invalid/expired

**Fix:**
1. Check Environment tab - key name correct?
2. Manual redeploy: Dashboard → Manual Deploy → Deploy
3. Check logs for Sarvam-related errors
4. Verify key with Sarvam support

### Issue: "Sarvam STT error: 401"

**Cause:** Invalid API key

**Fix:**
1. Double-check key value (copy-paste again)
2. Verify key is active in Sarvam dashboard
3. Contact Sarvam support if needed

### Issue: "Sarvam STT error: 429"

**Cause:** Rate limit exceeded

**Fix:**
1. Check your Sarvam plan limits
2. Upgrade plan if needed
3. Implement request throttling in frontend

---

## 💰 Cost Considerations

### Sarvam AI Pricing:
- Check current pricing at: https://www.sarvam.ai/pricing
- Usually charged per minute or per API call
- May have free tier or trial credits

### Cost Optimization:
- Use `engine="auto"` to only use Sarvam when needed
- OpenAI used for English → Lower overall costs
- Monitor usage in Sarvam dashboard

---

## 📞 Support

### Sarvam AI Support:
- Website: https://www.sarvam.ai/
- Docs: Check their API documentation
- Support: Contact via their support channel

### Your Backend Support:
- Check Render logs for errors
- Test with curl commands
- Verify environment variable is set

---

## ✅ Quick Command Reference

```bash
# Test Sarvam is working (Hindi)
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.m4a" \
  -F "engine=sarvam" \
  -F "language=hi"

# Test auto-selection
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.m4a" \
  -F "engine=auto" \
  -F "language=hi"

# Check which engine is used
curl ... | jq '.engine_used'
# Should return: "sarvam"
```

---

## 🎉 Summary

**Adding your Sarvam AI key will:**

✅ Enable best-in-class Indian language transcription
✅ Support all 12 Indian languages perfectly
✅ Automatically route Indian languages to Sarvam
✅ Keep English on OpenAI (best for medical terms)
✅ Give your users the best possible experience

**Steps:**
1. Go to Render → Environment
2. Add `SARVAM_API_KEY` with your key
3. Wait for redeploy
4. Test and enjoy! 🎊

**Your ER-EMR app will speak Indian languages beautifully!** 🇮🇳
