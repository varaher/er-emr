# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## Overview
ErMate is a mobile-first emergency room documentation application designed for medical professionals. It streamlines patient triage, case documentation, and discharge workflows with AI-assisted features.

---

## Core Features

### 1. Patient Triage
- Voice-enabled data capture
- **Regular textarea for continuous typing** + voice option
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

### 3. Automatic Pediatric Detection
- **Triage**: Enter age (e.g., "5", "6 months", "5m") → Auto-detect Adult/Pediatric
- **Visual Badge**: Shows "👶 Pediatric" (pink) or "🧑 Adult" (blue) badge
- **Case Sheet**: Pink banner "PEDIATRIC CASE SHEET ACTIVE" appears for pediatric patients
- **Dynamic Update**: Changing age in case sheet updates pediatric status with toast notification
- **Features Enabled**: PAT (Pediatric Assessment Triangle), HEENT, EFAST, age-specific vital alerts

### 4. AI Features
- VBG/ABG interpretation
- **AI Diagnosis & Red Flags** - Suggests diagnoses and highlights red flags
- Voice-to-text transcription (Sarvam/OpenAI)

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

## Tech Stack
- **Frontend (Web)**: React + Tailwind CSS + shadcn/ui
- **Mobile**: React Native (Expo)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT (via Emergent LLM Key)

---

## Recent Updates (January 2, 2026)

### ✅ Automatic Adult/Pediatric Detection (NEW)
- **Triage Page**:
  - Added patient age input field with auto-detection
  - Entering age < 16 years auto-sets "Pediatric" mode
  - Days/weeks/months always detected as Pediatric
  - Visual badge (pink for Pediatric, blue for Adult)
  - Manual override option available
- **Case Sheet**:
  - Pink "PEDIATRIC CASE SHEET ACTIVE" banner for pediatric patients
  - Patient age auto-populated from triage
  - Editing age dynamically updates pediatric status
  - Toast notification when pediatric mode changes
- **Mobile App**:
  - Same auto-detection in TriageScreen
  - Header shows detected patient type badge

### ✅ P0 Bug Fixes (5/5 Completed)
1. "Procedures Done" removed from Treatment tab
2. "Discharge Advice/Follow-up" removed from Case Sheet Disposition
3. "Normal" exam auto-fills detailed findings
4. Procedures from Notes tab now saved to database
5. Drugs administered now saved to database

### Backend Changes:
- Added `ProcedurePerformed` and `DrugAdministered` models
- Added `procedures_performed` and `drugs_administered` fields to CaseSheet models
- Updated CaseSheetCreate and CaseSheetUpdate models

### Frontend Changes:
- Added Badge component import (fixed by testing agent)
- Added checkIfPediatric helper function
- Added pediatric mode banner UI
- Enhanced updateNestedField for auto-detection on age change

---

## File References

### Web App Files
- `/app/frontend/src/pages/CaseSheetForm.js` - Main case sheet with pediatric detection
- `/app/frontend/src/pages/Triage.js` - Triage with auto age detection
- `/app/frontend/src/pages/DischargeSummary.js` - Discharge summary
- `/app/frontend/src/data/drugFormulary.js` - Drug and procedure data

### Mobile App Files
- `/app/mobile-screens/CaseSheetScreen.js` - Main case sheet
- `/app/mobile-screens/TriageScreen.js` - Triage with auto detection
- `/app/mobile-screens/UPDATE_CHECKLIST.md` - User guide

### Backend Files
- `/app/backend/server.py` - API server with procedures models

### Test Files
- `/app/test_reports/iteration_4.json` - Latest test results (100% pass)

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

## Configuration

### Expo Project (Mobile)
- Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
- OTA Branch: `preview`

### Backend
- URL: `https://er-emr-backend.onrender.com/api`

---

## Test Credentials
- Email: test@test.com
- Password: Test123!
