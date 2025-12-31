# 📋 ERMATE MOBILE APP - COMPLETE UPDATE CHECKLIST
## Generated: December 25, 2024

---

## 🎯 GOAL: Make OTA Updates Work + Apply All Bug Fixes

---

## 📁 FILES TO COPY TO YOUR PROJECT

### ROOT FOLDER (ERmateApp/)
Copy these files to your project ROOT folder:

| File | Copy To | Purpose |
|------|---------|---------|
| `App.js` | `ERmateApp/App.js` | Main app with OTA update logic |
| `app.json` | `ERmateApp/app.json` | **CRITICAL** - Correct project ID & OTA config |
| `eas.json` | `ERmateApp/eas.json` | Build & channel configuration |

### SCREENS FOLDER (ERmateApp/src/screens/)
Copy ALL these files to `ERmateApp/src/screens/`:

| File | What's Fixed |
|------|--------------|
| `LoginScreen.js` | Login callback, branding |
| `DashboardScreen.js` | ErMate logo, View button, error handling |
| `TriageScreen.js` | Voice auto-populate, state sync, error handling |
| `CaseSheetScreen.js` | Tab navigation, save payload, MLC fields, VBG |
| `PhysicalExamScreen.js` | Examination forms |
| `InvestigationsScreen.js` | Labs & imaging |
| `TreatmentScreen.js` | Treatment forms |
| `DispositionScreen.js` | Disposition forms |
| `DischargeSummaryScreen.js` | Correct API endpoint, edit mode, data loading |
| `ProfileScreen.js` | Working logout, edit, upgrade button |
| `LogsScreen.js` | Activity logs |
| `UpgradeScreen.js` | Subscription plans |
| `ViewCaseSheetScreen.js` | **NEW** - Full case sheet view |

---

## ⚠️ CRITICAL: DO NOT COPY THESE (Keep Your Own):
- `assets/` folder (your icons, splash screens)
- `node_modules/`
- `package.json` (just ensure dependencies are installed)

---

## 🔧 AFTER COPYING FILES:

### Step 1: Install Dependencies (if needed)
```bash
cd ERmateApp
npx expo install expo-updates expo-av @react-native-async-storage/async-storage
```

### Step 2: Verify app.json is Correct
Open `app.json` and confirm:
- `"projectId": "44c665c9-fa62-4ace-b08a-e797df5feac1"` ✓
- `"owner": "varah"` ✓
- `"runtimeVersion": { "policy": "appVersion" }` ✓

### Step 3: Build NEW APK (One Last Time)
```bash
eas build --platform android --profile preview
```

### Step 4: Install New APK on Phone
- Download from EAS dashboard or Expo.dev
- Install on your Android phone

### Step 5: Test OTA Works
After installing new APK:
```bash
# Make a small visible change (e.g., change "ErMate" to "ErMate v2" in LoginScreen)
# Then push update:
eas update --branch preview --message "Test OTA"
```
- Close app completely
- Reopen app
- Should see "UPDATE AVAILABLE!" popup
- Tap "Update Now"
- App should reload with new change

---

## 📱 FROM NOW ON (After OTA Works):

### For Code Changes:
```bash
eas update --branch preview --message "Description of changes"
```
NO APK rebuild needed!

### Only Rebuild APK When:
- Adding new native modules
- Changing permissions
- Changing `app.json` native config
- Upgrading Expo SDK

---

## ✅ VERIFICATION CHECKLIST

After copying files and rebuilding:

- [ ] App opens without crash
- [ ] Login works
- [ ] Dashboard shows cases
- [ ] Voice recording works in Triage
- [ ] Voice data auto-populates form
- [ ] Can navigate through all tabs (Patient → Vitals → Primary → History → Exam → Treatment → Disposition)
- [ ] Save button works on each section
- [ ] Discharge Summary loads saved data
- [ ] Profile page - Logout works
- [ ] OTA update popup appears when update is available

---

## 🔴 COMMON ISSUES & FIXES

### "Invalid UUID appId"
→ Your `app.json` has wrong projectId. Use: `44c665c9-fa62-4ace-b08a-e797df5feac1`

### OTA says "Updated" but nothing changes
→ APK was built before fixing app.json. Rebuild APK with correct config.

### "Failed to save" errors
→ Check if you're logged in. Token might be expired.

### Voice records but form stays empty
→ Make sure you copied the latest `TriageScreen.js` with state sync fixes.

### [object Object] errors
→ Make sure you copied screens with fixed error handling.

---

## 📞 QUICK REFERENCE

**Your Expo Project ID:** `44c665c9-fa62-4ace-b08a-e797df5feac1`
**Your Owner:** `varah`
**Your Package:** `com.ermate.app`
**OTA Branch:** `preview`
**Backend URL:** `https://er-emr-backend.onrender.com/api`

---

## 🚀 COMMANDS CHEAT SHEET

```bash
# Build APK
eas build --platform android --profile preview

# Push OTA Update
eas update --branch preview --message "Your message"

# Check update status
eas update:list --branch preview

# Install dependencies
npx expo install [package-name]
```
