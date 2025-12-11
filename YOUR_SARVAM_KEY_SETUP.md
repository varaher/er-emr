# 🔑 Your Sarvam AI Key Setup

## ✅ Your Key Information

**Key received:** `sk_yevsruqb_IeIUPAC02gq3LnNRzKXqkX9a`

**Status:** Ready to add to Render ✓

---

## 🚀 Add to Render - Step by Step

### Step 1: Open Render Dashboard
```
1. Go to: https://dashboard.render.com
2. Sign in with your account
3. Find service: er-emr-backend
4. Click on it
```

### Step 2: Navigate to Environment Tab
```
1. Look at the left sidebar
2. Click: "Environment"
3. You'll see existing variables like:
   - MONGO_URL
   - EMERGENT_LLM_KEY
   - JWT_SECRET
   etc.
```

### Step 3: Add New Variable
```
1. Click button: "Add Environment Variable"

2. In the form, enter:
   
   Key (field 1):
   SARVAM_API_KEY
   
   Value (field 2):
   sk_yevsruqb_IeIUPAC02gq3LnNRzKXqkX9a

3. Click: "Save Changes"
```

### Step 4: Wait for Redeploy
```
1. Render will automatically redeploy your service
2. Wait 5-10 minutes
3. Watch for notification: "Deploy succeeded"
4. Check logs for: "Application startup complete"
```

---

## 🧪 Verify It's Working

### After redeploy completes, test with these commands:

#### Test 1: Check Health
```bash
curl https://er-emr-backend.onrender.com/health
# Should return: {"status":"healthy",...}
```

#### Test 2: Test Hindi with Sarvam (if you have audio file)
```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@hindi_audio.m4a" \
  -F "engine=auto" \
  -F "language=hi"

# Expected response:
{
  "success": true,
  "engine_used": "sarvam",  ← This confirms Sarvam is working!
  "language": "hi",
  "transcription": "रोगी को सांस लेने में..."
}
```

#### Test 3: Test English with OpenAI
```bash
curl -X POST https://er-emr-backend.onrender.com/api/ai/voice-to-text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@english_audio.m4a" \
  -F "engine=auto" \
  -F "language=en"

# Expected response:
{
  "success": true,
  "engine_used": "openai",  ← English still uses OpenAI
  "language": "en",
  "transcription": "Patient presents with..."
}
```

---

## 📋 Verification Checklist

After adding the key, verify:

- [ ] Go to Render Dashboard
- [ ] Navigate to Environment tab
- [ ] Click "Add Environment Variable"
- [ ] Key: `SARVAM_API_KEY`
- [ ] Value: `sk_yevsruqb_IeIUPAC02gq3LnNRzKXqkX9a`
- [ ] Click "Save Changes"
- [ ] Wait for "Deploy succeeded"
- [ ] Check logs for "Application startup complete"
- [ ] Test Hindi audio → Returns `"engine_used": "sarvam"`
- [ ] Test English audio → Returns `"engine_used": "openai"`

---

## 🔒 Security Reminder

### ✅ Good Practices:
- API key now stored in Render (encrypted) ✓
- Not visible in code or GitHub ✓
- Only accessible to your backend ✓

### ⚠️ Important:
- Keep this key confidential
- Don't share it publicly again
- If compromised, regenerate it at Sarvam dashboard
- Consider rotating keys periodically

---

## 🎯 What This Enables

With this key, your app now has:

### 🇮🇳 12 Indian Languages (Perfect Transcription):
1. **Hindi** (hi) - हिन्दी
2. **Tamil** (ta) - தமிழ்
3. **Telugu** (te) - తెలుగు
4. **Malayalam** (ml) - മലയാളം
5. **Kannada** (kn) - ಕನ್ನಡ
6. **Marathi** (mr) - मराठी
7. **Bengali** (bn) - বাংলা
8. **Gujarati** (gu) - ગુજરાતી
9. **Punjabi** (pa) - ਪੰਜਾਬੀ
10. **Odia** (or) - ଓଡ଼ିଆ
11. **Assamese** (as) - অসমীয়া
12. **Urdu** (ur) - اردو

### 🌍 Plus 99+ Other Languages via OpenAI

---

## 📊 How Auto-Selection Works Now

```javascript
// User records in Hindi
transcribeAudio(audioFile, 'hi', 'auto')

Backend logic:
1. Sees language = 'hi' (Hindi)
2. Checks: Is 'hi' in Indian languages? → Yes
3. Has SARVAM_API_KEY? → Yes (you just added it!)
4. Uses: Sarvam AI ✅
5. Returns: High-quality Hindi transcription

// User records in English
transcribeAudio(audioFile, 'en', 'auto')

Backend logic:
1. Sees language = 'en' (English)
2. Checks: Is 'en' in Indian languages? → No
3. Uses: OpenAI Whisper ✅
4. Returns: High-quality English transcription
```

---

## 🚨 Troubleshooting

### If Hindi still uses OpenAI instead of Sarvam:

**Check 1: Environment Variable**
```
Render Dashboard → Environment
- Is SARVAM_API_KEY listed?
- Is the value correct?
```

**Check 2: Deployment**
```
Render Dashboard → Events
- Did latest deploy succeed?
- Any errors in logs?
```

**Check 3: Test Explicitly**
```bash
# Force Sarvam engine
curl ... -F "engine=sarvam" -F "language=hi"

# If this works but auto doesn't:
# → Check language code is exactly "hi" (lowercase)
```

### If you see "Sarvam API key not configured":
- Redeploy manually: Dashboard → Manual Deploy → Deploy
- Check key name is exactly: `SARVAM_API_KEY` (case-sensitive)
- Verify key value has no extra spaces

### If you see "Sarvam STT error: 401":
- Key might be invalid or expired
- Check Sarvam dashboard: https://www.sarvam.ai/
- Verify key is active
- Regenerate key if needed

---

## ✅ Summary

**What you need to do:**
1. Go to Render Dashboard
2. Add environment variable: `SARVAM_API_KEY` = `sk_yevsruqb_IeIUPAC02gq3LnNRzKXqkX9a`
3. Wait for redeploy (5-10 min)
4. Test with Hindi audio
5. Enjoy perfect Indian language transcription! 🎉

**Total time:** ~10 minutes (mostly waiting for redeploy)

**Result:** Your ER-EMR app will have best-in-class support for 12 Indian languages + 99 others!

---

## 📞 Need Help?

If you encounter any issues:
1. Check Render logs: Dashboard → Logs
2. Verify environment variable is set correctly
3. Test with curl commands above
4. Check Sarvam API status/limits

**Your backend code is already ready - just add the key!** 🚀
