# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## Overview
ErMate is a mobile-first emergency room documentation application designed for medical professionals. It streamlines patient triage, case documentation, and discharge workflows with AI-assisted features.

---

## Core Features

### 1. Patient Triage
- Voice-enabled data capture
- Regular textarea for continuous typing + voice option
- Auto-fill from voice transcription
- Priority calculation (Red/Orange/Yellow/Green/Blue)
- **Automatic Adult/Pediatric Detection** - Based on age input (<16 = Pediatric)
- Visual badge showing detected patient type

### 2. Case Sheet Documentation
- **Patient Info**: Demographics, UHID, MLC fields
- **Vitals**: HR, RR, BP, SpO2, Temp, GCS, Pain Score (with age-specific pediatric alerts)
- **Primary Assessment**: ABCDE approach with interventions
- **Secondary Survey**: Patient history and assessment (SAMPLE format)
- **Examination**: General, CVS, Respiratory, Abdomen, CNS, Extremities
  - **Normal exam auto-fill**: Selecting "Normal" auto-fills detailed findings
  - **Mark All Normal**: One-click to set all systems as normal with detailed text
- **Treatment**: Investigations, VBG interpretation, Diagnosis, Medications
- **Notes Tab**: Dedicated procedure documentation with individual notes
- **Disposition**: Discharge, Admit, Refer, LAMA, Death

### 3. Discharge Summary
- **Auto-populated from Case Sheet**: All relevant data flows automatically
- **Course in ER**: AI-generated comprehensive summary of the entire case
- **Editable fields**: Doctor can modify any auto-filled data
- **Regenerate button**: Regenerate Course in ER from case sheet anytime
- **Finish & Dashboard**: One-click save and navigate to dashboard
- **Print/PDF/Word export**: Export options for documentation

### 4. AI Features
- VBG/ABG interpretation
- **AI Diagnosis & Red Flags** - Suggests diagnoses and highlights red flags
- Voice-to-text transcription (Sarvam/OpenAI)
- **Auto Course in ER Generation** - Summarizes entire case sheet

### 5. Drug Management
- Pre-built adult drug formulary (35+ drugs)
- Pre-built pediatric drug formulary (14+ drugs)
- Searchable drug selection modal
- Dose options with timestamps
- Toggle between Adult/Pediatric formulary (auto-set based on patient age)

### 6. Procedures Documentation (Notes Tab)
- 26 common ER procedures organized by category
- Individual notes for each procedure performed
- **Procedures now properly saved to database**
- Procedure summary display

### 7. Pediatric Features (Enabled for age < 16)
- **Pediatric Assessment Triangle (PAT)**: Appearance, Work of Breathing, Circulation
- **HEENT Examination**: Head, Eyes, Ears, Nose, Throat
- **EFAST Exam**: For trauma cases
- **Age-Specific Vital Alerts**: Automated warnings for abnormal pediatric vitals

---

## Recent Updates (January 2, 2026)

### ✅ Session Fixes Complete

#### 1. P0 Bug Fixes (5/5)
- ✅ "Procedures Done" removed from Treatment tab
- ✅ "Discharge Advice/Follow-up" removed from Case Sheet Disposition
- ✅ "Normal" exam auto-fills detailed findings
- ✅ Procedures from Notes tab saved to database
- ✅ Drugs administered saved to database

#### 2. Automatic Adult/Pediatric Detection
- ✅ Triage: Enter age → Auto-detect (<16 = Pediatric)
- ✅ Visual badge (pink Pediatric / blue Adult)
- ✅ Case Sheet: Pink banner for pediatric patients
- ✅ Dynamic detection when editing age

#### 3. Discharge Summary Enhancements
- ✅ Comprehensive auto-population from case sheet
- ✅ Enhanced generateCourseInER function (both web & mobile)
- ✅ "Finish & Go to Dashboard" button
- ✅ Regenerate Course in ER button
- ✅ All case sheet data flows correctly

#### 4. Navigation Fixes
- ✅ "Finish" button navigates to Dashboard (both web & mobile)
- ✅ Save button errors fixed

---

## Files to Update Before APK Rebuild

### 📱 MOBILE FILES (Copy these to your VSCode project):

1. **`/app/mobile-screens/CaseSheetScreen.js`** (159 KB)
   - All P0 bug fixes
   - Normal exam auto-fill
   - Procedures/drugs saving
   - "Finish" → Dashboard navigation

2. **`/app/mobile-screens/TriageScreen.js`** (48 KB)
   - Auto Adult/Pediatric detection
   - Age input with auto-detection
   - Visual patient type badge

3. **`/app/mobile-screens/DischargeSummaryScreen.js`** (49 KB)
   - Enhanced generateCourseInER function
   - "Finish & Dashboard" button
   - Comprehensive case data capture

### 🌐 WEB FILES (Already deployed):

1. **`/app/frontend/src/pages/CaseSheetForm.js`**
   - All P0 bug fixes
   - Pediatric detection & banner
   - Procedures/drugs in save payload

2. **`/app/frontend/src/pages/Triage.js`**
   - Auto Adult/Pediatric detection
   - Age input with badge

3. **`/app/frontend/src/pages/DischargeSummary.js`**
   - Complete rewrite
   - All case sheet data captured
   - Course in ER generation
   - Edit/Save/Print/Finish buttons

### 🔧 BACKEND FILES:

1. **`/app/backend/server.py`**
   - ProcedurePerformed model
   - DrugAdministered model
   - Updated CaseSheet models

---

## APK Rebuild Steps

1. **Copy the 3 mobile files** to your local project:
   - `CaseSheetScreen.js`
   - `TriageScreen.js`
   - `DischargeSummaryScreen.js`

2. **Run build command**:
   ```bash
   cd mobile-screens
   eas build --profile preview --platform android
   ```

3. **Download and install** the new APK

4. **Test the following**:
   - Enter age 5 → should show Pediatric badge
   - Mark exam as Normal → should auto-fill detailed text
   - Select procedures in Notes tab → should save
   - Click Finish → should go to Dashboard
   - Check Discharge Summary → should show full case data

---

## Pending Items

### P1 - High Priority
- [ ] Mobile voice transcription engine toggle (Sarvam/OpenAI)
- [ ] Full regression testing after APK rebuild

### P2 - Future
- [ ] Link Your Device (QR code sync)
- [ ] Real-time streaming voice API
- [ ] Documentation Score
- [ ] Auto-generate Referral Letters
- [ ] ErPrana patient wellness documentation

---

## Test Credentials
- Email: test@test.com
- Password: Test123!

## Configuration
- Expo Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
- OTA Branch: `preview`
