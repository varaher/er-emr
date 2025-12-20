# ER-EMR APK Build & OTA Update Guide

## 📱 Prerequisites

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure your project (run once)
eas build:configure
```

## 🔧 First-Time Setup

### Step 1: Update app.json
Replace these placeholders in `app.json`:
- `your-project-id-here` → Your actual Expo project ID
- `your-expo-username` → Your Expo username
- `com.yourcompany.eremr` → Your actual package name

### Step 2: Link to Expo Project
```bash
# This creates/links your project on Expo servers
eas init
```

---

## 🏗️ Building APK

### Option A: Preview APK (Recommended for Testing)
```bash
# Build APK with OTA updates enabled
eas build --platform android --profile preview
```

### Option B: Production APK
```bash
# Build production APK
eas build --platform android --profile production
```

### Option C: Local APK Build (No Expo Account)
```bash
# Build locally (requires Android SDK)
eas build --platform android --profile preview --local
```

### Download APK
After build completes:
1. Check your terminal for the download link
2. Or go to: https://expo.dev/accounts/YOUR_USERNAME/projects/er-emr/builds

---

## 🔄 OTA (Over-The-Air) Updates

OTA updates let you push JavaScript changes WITHOUT rebuilding the APK!

### How It Works:
1. User opens app → App checks for updates
2. If update found → Downloads in background
3. Next app launch → New code is active

### Push an OTA Update:
```bash
# After making code changes, push to preview channel
eas update --branch preview --message "Fixed typing lag, added Dashboard"

# For production channel
eas update --branch production --message "Version 1.1 - AI features"
```

### Check Update Status:
```bash
# List all updates
eas update:list

# View update details
eas update:view
```

---

## 📋 Quick Commands Reference

| Action | Command |
|--------|--------|
| Login to Expo | `eas login` |
| Build Preview APK | `eas build -p android --profile preview` |
| Build Production APK | `eas build -p android --profile production` |
| Push OTA Update | `eas update --branch preview --message "Your message"` |
| List Builds | `eas build:list` |
| List Updates | `eas update:list` |
| Check Config | `eas build:inspect` |

---

## ⚠️ Important Notes

### OTA Updates CAN update:
- ✅ JavaScript code changes
- ✅ Style changes
- ✅ New screens/components
- ✅ API endpoint changes
- ✅ Bug fixes in JS code

### OTA Updates CANNOT update:
- ❌ Native code changes
- ❌ New native modules/plugins
- ❌ app.json changes (name, icon, permissions)
- ❌ Expo SDK version upgrades

**If you change native stuff → You need a new APK build!**

---

## 🔄 Typical Workflow

```bash
# 1. Make code changes in VSCode

# 2. Test locally
npx expo start --clear

# 3. Push OTA update (no rebuild needed!)
eas update --branch preview --message "Added 4hr warning feature"

# 4. Users get update automatically on next app open!
```

---

## 🐛 Troubleshooting

### "runtimeVersion" error
Make sure `app.json` has:
```json
"runtimeVersion": {
  "policy": "sdkVersion"
}
```

### Update not showing
1. Force close the app completely
2. Reopen the app
3. Wait 5-10 seconds for update check
4. Close and reopen again

### Build failing
```bash
# Clear cache and rebuild
eas build --platform android --profile preview --clear-cache
```

---

## 📞 Support

For issues with EAS Build:
- Expo Forums: https://forums.expo.dev
- EAS Docs: https://docs.expo.dev/build/introduction/
