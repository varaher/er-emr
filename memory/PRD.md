# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## Overview
ErMate is a mobile-first emergency room documentation application designed for medical professionals. It streamlines patient triage, case documentation, and discharge workflows with AI-assisted features.

---

## Core Features

### 1. Patient Triage
- Voice-enabled data capture
- Auto-fill from voice transcription
- Priority calculation (Red/Orange/Yellow/Green/Blue)
- Adult and Pediatric pathways

### 2. Case Sheet Documentation
- **Patient Info**: Demographics, UHID, MLC fields
- **Vitals**: HR, RR, BP, SpO2, Temp, GCS, Pain Score
- **Primary Assessment**: ABCDE approach with interventions
- **History**: SAMPLE history, allergies, medications
- **Examination**: General, CVS, Respiratory, Abdomen, CNS, Extremities
- **Treatment**: Investigations, VBG interpretation, Diagnosis, Medications
- **Notes**: Documented procedures with individual notes (NEW TAB)
- **Disposition**: Discharge, Admit, Refer, LAMA, Death

### 3. AI Features
- VBG/ABG interpretation
- **AI Diagnosis & Red Flags** - Suggests diagnoses and highlights red flags based on clinical context
- Voice-to-text transcription (Sarvam/OpenAI)

### 4. Drug Management (NEW)
- Pre-built adult drug formulary (35+ drugs)
- Pre-built pediatric drug formulary (14+ drugs)
- Searchable drug selection modal
- Dose options with timestamps
- Toggle between Adult/Pediatric formulary

### 5. Procedures Documentation (NEW)
- 26 common ER procedures
- Organized by category (Resuscitation, Airway, Vascular, Chest, Neuro, GU, GI, Wound, Ortho, Cardiac, Monitoring)
- Individual notes field for each procedure
- Summary view of selected procedures

### 6. Addendum Notes
- 2-hour automatic reminder popup (mobile)
- Manual addendum entry button
- Timestamped progress notes
- Saved with case data

---

## Tech Stack

### Frontend (Web)
- React with Tailwind CSS
- Shadcn/UI components
- Voice input enabled

### Frontend (Mobile)
- React Native / Expo
- Expo Updates for OTA
- AsyncStorage for local state

### Backend
- FastAPI (Python)
- MongoDB
- OpenAI/Sarvam AI integrations

---

## What's Been Implemented

### December 2024 - Session Updates
**Mobile App (CaseSheetScreen.js):**
- [x] AI Diagnosis & Red Flags feature
- [x] Drug dropdowns (35+ Adult, 14+ Pediatric drugs)
- [x] Notes tab for Procedures (26 procedures)
- [x] Addendum Notes popup (2-hour timer)

**Web App (CaseSheetForm.js):**
- [x] AI Suggest Diagnosis & Red Flags button (purple)
- [x] Drug selection modal with searchable formulary
- [x] Adult/Pediatric toggle for drug list
- [x] Notes tab with procedures by category
- [x] Individual notes for each procedure

**New Data File:**
- [x] `/app/frontend/src/data/drugFormulary.js` - Emergency drug database

---

## Pending Items

### P0 - Critical
- [ ] User needs to rebuild mobile APK with corrected OTA config
- [ ] User needs to deploy backend fix to Render.com

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

## File References

### Web App Files
- `/app/frontend/src/pages/CaseSheetForm.js` - Main case sheet (4400+ lines)
- `/app/frontend/src/data/drugFormulary.js` - Drug and procedure data

### Mobile App Files
- `/app/mobile-screens/CaseSheetScreen.js` - Main case sheet (~3100 lines)
- `/app/mobile-screens/UPDATE_CHECKLIST.md` - User guide

### Backend Files
- `/app/backend/server.py` - API server

---

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register
- GET `/api/auth/me` - Current user

### Cases
- POST `/api/cases` - Create case
- PUT `/api/cases/{id}` - Update case
- GET `/api/cases/{id}` - Get case
- GET `/api/cases` - List cases

### AI
- POST `/api/ai/generate` - AI text generation (diagnosis, red flags)
- POST `/api/ai/voice-to-text` - Speech transcription
- POST `/api/ai/interpretation` - VBG interpretation

---

## Configuration

### Expo Project (Mobile)
- Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
- OTA Branch: `preview`

### Backend
- URL: `https://er-emr-backend.onrender.com/api`
