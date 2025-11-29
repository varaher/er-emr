# Microphone Troubleshooting Guide for Voice Recording Feature

## Common Error: "not-allowed" or Microphone Access Denied

This error occurs when the browser doesn't have permission to access your microphone.

---

## ✅ Solution by Browser:

### **Google Chrome / Microsoft Edge:**

1. **Allow During First Use:**
   - When you click "Start Continuous Recording", browser will show a popup
   - Click **"Allow"** in the popup

2. **If Already Blocked:**
   - Look for 🔒 or ⓘ icon in the address bar (left side)
   - Click the icon
   - Find "Microphone" in the list
   - Change to **"Allow"**
   - Refresh the page

3. **Via Settings:**
   - Click 🔒 icon → "Site settings"
   - Find "Microphone" section
   - Select "Allow"
   - Refresh the page

4. **System-wide Check:**
   - Go to chrome://settings/content/microphone
   - Make sure your microphone is not blocked globally
   - Check if your site is in the "Block" list
   - Move it to "Allow" if needed

---

### **Firefox:**

1. **Allow During First Use:**
   - Click **"Allow"** when prompted for microphone access

2. **If Already Blocked:**
   - Click 🔒 icon in address bar
   - Click "More information" or connection details
   - Go to "Permissions" tab
   - Find "Use the Microphone"
   - Uncheck "Use default" 
   - Select **"Allow"**
   - Refresh the page

3. **Via Page Info:**
   - Right-click on the page → "View Page Info"
   - Go to "Permissions" tab
   - Find microphone settings
   - Change to "Allow"

---

### **Safari (Mac):**

1. **Allow During First Use:**
   - Click **"Allow"** when Safari asks for microphone permission

2. **If Already Denied:**
   - Safari → Preferences (Settings)
   - Go to "Websites" tab
   - Click "Microphone" in the left sidebar
   - Find your website in the list
   - Change to **"Allow"**
   - Refresh the page

3. **System Permissions (macOS):**
   - Apple menu → System Settings
   - Privacy & Security → Microphone
   - Make sure Safari is checked/enabled
   - Restart Safari if needed

---

## 🔍 Additional Checks:

### **1. Check Physical Microphone:**
- Make sure a microphone is connected (built-in or external)
- Test microphone in other apps (Zoom, Discord, system recorder)
- Check if microphone is muted at hardware level

### **2. System Permissions:**

**Windows:**
- Settings → Privacy → Microphone
- Ensure "Allow apps to access microphone" is ON
- Ensure "Allow desktop apps to access microphone" is ON
- Check browser is allowed

**macOS:**
- System Settings → Privacy & Security → Microphone
- Ensure your browser is checked

**Linux:**
- Check `pavucontrol` (PulseAudio Volume Control)
- Verify input device is not muted
- Check application permissions

### **3. HTTPS Requirement:**
- Microphone access requires HTTPS (secure connection)
- localhost/127.0.0.1 works without HTTPS
- Production sites MUST use HTTPS

---

## 🎤 Testing Microphone:

### **Quick Browser Test:**
1. Open new tab
2. Go to: https://www.onlinemictest.com/
3. Click "Test Microphone"
4. Grant permission
5. Speak - you should see sound waves

If this doesn't work, issue is with system/hardware, not the app.

---

## 🚨 Still Not Working?

### **Try These:**

1. **Restart Browser:**
   - Close ALL browser windows
   - Reopen and try again

2. **Clear Site Data:**
   - Chrome/Edge: Settings → Privacy → Site Settings → View permissions
   - Find your site → Clear data
   - Refresh and allow again

3. **Try Different Browser:**
   - If Chrome doesn't work, try Edge or Firefox
   - This helps identify if issue is browser-specific

4. **Check Browser Updates:**
   - Make sure browser is up to date
   - Old browsers may have bugs with Web Speech API

5. **Disable Extensions:**
   - Some extensions block microphone access
   - Try in Incognito/Private mode (with extensions disabled)

6. **Check Antivirus/Firewall:**
   - Some security software blocks microphone
   - Temporarily disable and test

---

## 📱 Mobile Devices:

### **Android Chrome:**
- Settings → Site settings → Microphone
- Find your site and set to "Allow"

### **iOS Safari:**
- Settings → Safari → Camera & Microphone Access
- Enable for the site

⚠️ **Note:** Mobile support for Web Speech API is limited and may not work on all devices.

---

## 💡 Pro Tips:

1. **Use Chrome or Edge for best compatibility**
   - These have the best Web Speech API support

2. **Wired headset microphone works better**
   - Clearer audio than laptop built-in mic
   - Reduces background noise

3. **Speak clearly and at moderate pace**
   - AI transcription works best with clear speech

4. **Quiet environment**
   - Background noise can affect recognition accuracy

5. **Internet connection required**
   - Speech recognition happens in the cloud
   - Needs active internet connection

---

## ⚙️ Developer Mode - Check Console:

If you're technical, open browser console (F12) and look for:
- `getUserMedia` errors
- `SpeechRecognition` errors
- Permission-related messages

This can help identify the exact issue.

---

## 📞 Still Need Help?

If none of these solutions work:
1. Check what error message appears in the app
2. Note your browser name and version
3. Note your operating system
4. Take a screenshot of the error
5. Contact support with these details

---

## ✅ Success Checklist:

Before reporting an issue, verify:
- [ ] Microphone is physically connected and working
- [ ] Browser has microphone permission for the site
- [ ] System allows browser to access microphone
- [ ] You're using HTTPS or localhost
- [ ] Browser is updated to latest version
- [ ] You clicked "Allow" when prompted
- [ ] You tested in another app (Zoom, etc.) - microphone works there
- [ ] You refreshed the page after changing permissions

---

## 🌐 Supported Browsers:

✅ **Fully Supported:**
- Google Chrome 25+
- Microsoft Edge 79+
- Safari 14.1+

⚠️ **Partial Support:**
- Firefox 125+ (may have limitations)
- Opera 15+

❌ **Not Supported:**
- Internet Explorer
- Older mobile browsers

---

This troubleshooting guide should resolve 99% of microphone access issues!
