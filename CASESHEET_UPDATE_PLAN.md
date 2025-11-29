# Case Sheet Update Implementation Plan

## Summary of Changes

### 1. Backend Models (✅ COMPLETED)
- Added `additional_notes` fields to all sections in PrimaryAssessment
- Added VBG parameters, ECG findings, Bedside Echo to PrimaryAssessment
- Added `signs_and_symptoms`, psychological assessment to History
- Added `additional_notes` to all History subsections
- Implemented Normal/Abnormal pattern for Examination (cvs_status, respiratory_status, etc.)
- Added detailed examination fields for CVS, Respiratory, Abdomen, CNS, Extremities

### 2. Investigation Panels (✅ COMPLETED)
- Updated "Acute Stroke Code 7 Panel"
- Updated "STEMI Panel"
- Updated "Adult Seizure Panel"
- Updated "Pedia Febrile Seizure Panel"
- Added "PA Panel Pediatrics Surgery"
- Added "PA Panel Emergency"

### 3. Frontend State (✅ COMPLETED)
- Updated formData initial state to include all new fields

### 4. Frontend UI Updates (IN PROGRESS)
Need to add/update the following sections:

#### A. Primary Assessment Tab (ABCDE)
- Add "Additional Notes" with voice input at end of each subsection (A, B, C, D, E)
- Add new "Adjuvants to Primary" section with:
  - ECG findings (textarea with voice)
  - VBG parameters (PH, PCO2, HCO3, HB, GLU, LAC, NA, K, CR)
  - Bedside Echo findings (textarea with voice)
  - Additional Notes (textarea with voice)

#### B. History Tab
- Add "Signs and Symptoms" field after HPI
- Add "Additional Notes" with voice to: HPI, Secondary Survey, Past Medical, Past Surgical, Family/Gynae, Allergies
- Add "Psychological Assessment" section with 7 questions

#### C. Examination Tab
- **General Examination:** Add "Additional Notes" with voice
- **CVS:** Implement Normal/Abnormal dropdown
  - If Normal: show brief summary
  - If Abnormal: show detailed fields (S1/S2, Pulse, Pulse Rate, Apex Beat, Precordial Heave, Added Sounds, Murmurs)
  - Add "Additional Notes" with voice
- **Respiratory:** Same pattern
  - Detailed fields: Expansion, Percussion, Breath Sounds, Vocal Resonance, Added Sounds
- **Abdomen:** Same pattern
  - Detailed fields: Umbilical, Organomegaly, Percussion, Bowel Sounds, External Genitalia, Hernial Orifices, Per Rectal, Per Vaginal
- **CNS:** Same pattern
  - Detailed fields: Higher Mental Functions, Cranial Nerves, Sensory System, Motor System, Reflexes, Romberg Sign, Cerebellar Signs
- **Extremities:** Same pattern
  - Detailed field: Findings

## Implementation Strategy

Given the file size (1612 lines), I'll:
1. Create smaller focused update functions
2. Update UI sections one at a time
3. Test each section before moving to next
4. Use bulk file writer for efficiency when possible

## Key UI Components Needed
- VoiceTextarea for all additional notes
- Conditional rendering based on Normal/Abnormal status
- Proper layout and spacing
- Consistent styling with existing components
