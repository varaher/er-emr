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
- Adult and Pediatric pathways

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

### 3. AI Features
- VBG/ABG interpretation
- **AI Diagnosis & Red Flags** - Suggests diagnoses and highlights red flags
- Voice-to-text transcription (Sarvam/OpenAI)

### 4. Drug Management
- Pre-built adult drug formulary (35+ drugs)
- Pre-built pediatric drug formulary (14+ drugs)
- Searchable drug selection modal
- Dose options with timestamps
- Toggle between Adult/Pediatric formulary

### 5. Procedures Documentation (Notes Tab)
- 26 common ER procedures organized by category
- Individual notes for each procedure performed
- **Procedures now properly saved to database**
- Procedure summary display

### 6. Pediatric Features
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

## Recent Fixes (January 2, 2026)

### ✅ P0 Issues Fixed:
1. **"Procedures Done" removed from Treatment tab** - Now shows message directing to Notes tab
2. **"Discharge Advice" removed from Case Sheet Disposition** - Only in Discharge Summary
3. **"Normal" exam auto-fills detailed findings** - Both individual selection and Mark All Normal
4. **Procedures from Notes tab now saved to database** - Added procedures_performed field
5. **Drugs administered now saved to database** - Added drugs_administered field

### Backend Changes:
- Added `ProcedurePerformed` and `DrugAdministered` models
- Added `procedures_performed` and `drugs_administered` fields to CaseSheet models
- Updated CaseSheetCreate and CaseSheetUpdate models

### Frontend Changes:
- Replaced "Procedures Done" checkboxes with message
- Removed "Discharge Advice" card from Disposition area
- Fixed field names in Mark All Normal (uses _additional_notes)
- Fixed field names in updateNestedField (uses _additional_notes)
- Updated handleSave to include procedures_performed and drugs_administered

---

## Pending Items

### P0 - Critical
- [x] ~~Fix 5 recurring UI/UX issues~~ (COMPLETED)
- [ ] User needs to rebuild mobile APK with corrected OTA config

### P1 - High Priority
- [ ] Implement automatic Adult/Pediatric case sheet selection based on age (<16 = Pediatric)
- [ ] Mobile voice transcription engine toggle (Sarvam/OpenAI)
- [ ] Full regression testing after APK rebuild

### P2 - Future
- [ ] Link Your Device (QR code sync)
- [ ] Real-time streaming voice API
- [ ] Documentation Score
- [ ] Auto-generate Referral Letters
- [ ] ErPrana patient wellness documentation

---

## File References

### Web App Files
- `/app/frontend/src/pages/CaseSheetForm.js` - Main case sheet (fixed)
- `/app/frontend/src/pages/Triage.js` - Triage assessment
- `/app/frontend/src/pages/DischargeSummary.js` - Discharge summary
- `/app/frontend/src/data/drugFormulary.js` - Drug and procedure data

### Mobile App Files
- `/app/mobile-screens/CaseSheetScreen.js` - Main case sheet (fixed)
- `/app/mobile-screens/UPDATE_CHECKLIST.md` - User guide

### Backend Files
- `/app/backend/server.py` - API server (fixed - added procedures models)

### Test Files
- `/app/tests/test_ermate_fixes.py` - Pytest tests for bug fixes
- `/app/test_reports/iteration_3.json` - Latest test results (100% pass)

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
