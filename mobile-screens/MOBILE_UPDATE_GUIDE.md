# ErMate Mobile App Update Guide
## Updated: December 24, 2025

---

## ⚠️ IMPORTANT: Why Your App Isn't Working

Your current mobile app is using **OLD CODE** and hasn't received the updates. The issues you're seeing:

1. **"Failed to fetch cases: 500"** - You're logged in with a user that might not exist in our system
2. **ABCDE Missing** - Your app has old code without the detailed Primary Assessment
3. **ErMate Logo Missing** - Old code doesn't have the logo
4. **OTA Not Working** - Your app wasn't built with expo-updates

---

## 📁 Files You Need to Copy

Copy ALL these files from `/app/mobile-screens/` to your project's `src/screens/` folder:

### Required Files (Main Screens):
```
1. App.js                    → ERmateApp/App.js (root folder, NOT src/screens)
2. LoginScreen.js            → ERmateApp/src/screens/LoginScreen.js
3. DashboardScreen.js        → ERmateApp/src/screens/DashboardScreen.js
4. TriageScreen.js           → ERmateApp/src/screens/TriageScreen.js
5. CaseSheetScreen.js        → ERmateApp/src/screens/CaseSheetScreen.js
6. PhysicalExamScreen.js     → ERmateApp/src/screens/PhysicalExamScreen.js
7. InvestigationsScreen.js   → ERmateApp/src/screens/InvestigationsScreen.js
8. TreatmentScreen.js        → ERmateApp/src/screens/TreatmentScreen.js
9. DispositionScreen.js      → ERmateApp/src/screens/DispositionScreen.js
10. DischargeSummaryScreen.js → ERmateApp/src/screens/DischargeSummaryScreen.js
11. ProfileScreen.js         → ERmateApp/src/screens/ProfileScreen.js
12. LogsScreen.js            → ERmateApp/src/screens/LogsScreen.js
13. UpgradeScreen.js         → ERmateApp/src/screens/UpgradeScreen.js
```

### Your Project Structure Should Look Like:
```
ERmateApp/
├── App.js                  ← Updated App.js goes here
├── app.json
├── package.json
└── src/
    └── screens/
        ├── LoginScreen.js
        ├── DashboardScreen.js
        ├── TriageScreen.js
        ├── CaseSheetScreen.js
        ├── PhysicalExamScreen.js
        ├── InvestigationsScreen.js
        ├── TreatmentScreen.js
        ├── DispositionScreen.js
        ├── DischargeSummaryScreen.js
        ├── ProfileScreen.js
        ├── LogsScreen.js
        └── UpgradeScreen.js
```

---

## 🔧 After Copying Files

### 1. Install Dependencies (if not already installed):
```bash
cd ERmateApp
npx expo install expo-updates @react-navigation/native @react-navigation/native-stack @react-native-async-storage/async-storage expo-av expo-print expo-sharing
```

### 2. Update app.json for OTA Updates:
Make sure your `app.json` has:
```json
{
  "expo": {
    "name": "ErMate",
    "slug": "ermate",
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### 3. Build New APK:
```bash
eas build --platform android --profile preview
```

---

## 🧪 Test Credentials

After rebuilding, test login with:
- **Email:** `testnew123@test.com`
- **Password:** `password123`

---

## ✅ What's Fixed in These Updates

1. **Login Fix** - Now correctly calls `onLoginSuccess` callback
2. **ErMate Logo** - Added to Dashboard header
3. **ABCDE Primary Assessment** - Full detailed UI with:
   - Airway assessment with interventions
   - Breathing assessment with oxygen settings
   - Circulation with IV access, fluids
   - Disability with GCS, pupils, GRBS
   - Exposure with temperature, log roll
4. **"Save to Case Sheet" Button** - In Triage after voice recording
5. **Subscription System** - PDF/Word export gating
6. **Bright Theme** - Clean white/blue UI

---

## 🔴 Common Issues & Solutions

### "Failed to fetch cases: 500"
- You might be logged in with old credentials
- Try logging out and logging in with `testnew123@test.com`

### "Failed to save"
- Check your internet connection
- Verify you're using the correct API URL in the screens

### OTA Not Working
- You need to rebuild the APK with expo-updates configured
- After building, use `eas update` to push updates

---

## Need Help?

Contact support if you continue to face issues after following these steps.
