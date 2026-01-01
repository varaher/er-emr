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
- **Procedures**: Documented procedures with notes
- **Disposition**: Discharge, Admit, Refer, LAMA, Death

### 3. AI Features
- VBG/ABG interpretation
- **AI Diagnosis & Red Flags** (NEW)
- Voice-to-text transcription (Sarvam/OpenAI)

### 4. Drug Management (NEW)
- Pre-built adult drug formulary (35+ drugs)
- Pre-built pediatric drug formulary (14+ drugs)
- Searchable drug selection
- Dose options with timestamps

### 5. Procedures Documentation (NEW)
- 26 common ER procedures
- Organized by category (Resuscitation, Airway, Vascular, etc.)
- Individual notes for each procedure

### 6. Addendum Notes (NEW)
- 2-hour automatic reminder popup
- Manual addendum entry
- Timestamped progress notes

---

## Tech Stack

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

### December 2024
- [x] Core mobile app screens (Login, Dashboard, Triage, CaseSheet, Profile)
- [x] Voice-to-text transcription
- [x] Triage priority calculation
- [x] VBG interpretation
- [x] OTA update configuration
- [x] Backend 500 error fix (vitals sanitization)
- [x] **AI Diagnosis & Red Flags feature**
- [x] **Drug dropdowns (Adult/Pediatric)**
- [x] **Procedures Notes tab**
- [x] **Addendum Notes popup (2-hour reminder)**

---

## Pending Items

### P0 - Critical
- [ ] User needs to rebuild APK with corrected OTA config
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

### Mobile App Files
- `/app/mobile-screens/CaseSheetScreen.js` - Main case sheet with all new features
- `/app/mobile-screens/App.js` - OTA configuration
- `/app/mobile-screens/app.json` - Expo project config
- `/app/mobile-screens/eas.json` - EAS build config
- `/app/mobile-screens/UPDATE_CHECKLIST.md` - User guide

### Backend Files
- `/app/backend/server.py` - API server with sanitization fix

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

### Expo Project
- Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
- OTA Branch: `preview`

### Backend
- URL: `https://er-emr-backend.onrender.com/api`
