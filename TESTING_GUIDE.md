# Testing Guide for Updated Case Sheet

## Features to Test

### 1. Primary Assessment Tab (ABCDE)
#### New Fields Added:
- **Airway Additional Notes** (voice-enabled)
- **Breathing Additional Notes** (voice-enabled)
- **Circulation Additional Notes** (voice-enabled)
- **Disability Additional Notes** (voice-enabled)
- **Exposure Additional Notes** (voice-enabled)

#### New Section: Adjuvants to Primary Assessment
- **ECG Findings** (voice-enabled textarea)
- **VBG Parameters:** PH, PCO2, HCO3, HB, GLU, LAC, NA, K, CR (numeric inputs)
- **Bedside Screening Echo** (voice-enabled textarea)
- **Adjuvants Additional Notes** (voice-enabled)

### 2. History Tab
#### New Fields Added:
- **HPI Additional Notes** (voice-enabled)
- **Signs and Symptoms** (voice-enabled textarea)
- **Secondary Survey Additional Notes** (voice-enabled)
- **Past Medical History Additional Notes** (voice-enabled)
- **Surgical History** (voice-enabled textarea)
- **Surgical History Additional Notes** (voice-enabled)
- **Family / Gynae History** (voice-enabled textarea)
- **Allergies Additional Notes** (voice-enabled)

#### New Section: Psychological Assessment
7 questions with input fields:
1. Feeling persistently low, worried, angry, or finding it hard to focus
2. Hearing/seeing things others don't
3. Regular use of alcohol, tobacco, or substances
4. Currently feeling confused or agitated
5. Thoughts of ending life or attempted self-harm
6. Treatment/support for mental health issues
7. Additional Observations
- **Psychological Assessment Additional Notes** (voice-enabled)

### 3. Examination Tab
#### Normal/Abnormal Pattern Implemented for All Systems

**General Examination:**
- Added **General Examination Additional Notes** (voice-enabled)

**CVS (Cardiovascular System):**
- **Status Dropdown:** Normal / Abnormal
- **If Abnormal, shows detailed fields:**
  - S1, S2
  - Pulse
  - Pulse Rate (bpm)
  - Apex Beat
  - Precordial Heave
  - Added Sounds
  - Murmurs
- **CVS Additional Notes** (voice-enabled)

**Chest / Respiratory System:**
- **Status Dropdown:** Normal / Abnormal
- **If Abnormal, shows detailed fields:**
  - Expansion
  - Percussion
  - Breath Sounds
  - Vocal Resonance
  - Added Sounds
- **Respiratory Additional Notes** (voice-enabled)

**Abdomen:**
- **Status Dropdown:** Normal / Abnormal
- **If Abnormal, shows detailed fields:**
  - Umbilical
  - Organomegaly
  - Percussion
  - Bowel Sounds
  - External Genitalia
  - Hernial Orifices
  - Per Rectal
  - Per Vaginal
- **Abdomen Additional Notes** (voice-enabled)

**CNS (Central Nervous System):**
- **Status Dropdown:** Normal / Abnormal
- **If Abnormal, shows detailed fields:**
  - Higher Mental Functions
  - Cranial Nerves
  - Sensory System
  - Motor System
  - Reflexes
  - Romberg Sign
  - Cerebellar Signs
- **CNS Additional Notes** (voice-enabled)

**Extremities and Back:**
- **Status Dropdown:** Normal / Abnormal
- **If Abnormal, shows:**
  - Findings (voice-enabled textarea)
- **Extremities Additional Notes** (voice-enabled)

### 4. Investigation Panels
#### Updated Panels:
- Acute Stroke Code 7 Panel (updated tests)
- STEMI Panel (updated tests)
- Adult Seizure Panel (updated tests)
- Pedia Febrile Seizure Panel (updated tests)

#### New Panels:
- PA Panel Pediatrics Surgery
- PA Panel Emergency

## Test Scenarios

### Scenario 1: Create New Case with All New Fields
1. Login to application
2. Create a new triage assessment
3. Create a new case sheet
4. Fill in all new "Additional Notes" fields in ABCDE section
5. Fill in VBG parameters and ECG findings
6. Test voice input on additional notes fields
7. Save and verify data persists

### Scenario 2: History Tab New Features
1. Open/create a case
2. Go to History tab
3. Fill in psychological assessment questions
4. Use voice input on various additional notes fields
5. Save and verify

### Scenario 3: Examination Normal/Abnormal Toggle
1. Open/create a case
2. Go to Examination tab
3. Test each system (CVS, Respiratory, Abdomen, CNS, Extremities):
   - Select "Normal" - detailed fields should be hidden
   - Select "Abnormal" - detailed fields should appear
   - Fill in some detailed fields
4. Test voice input on additional notes
5. Save and verify toggle state and data persist

### Scenario 4: Investigation Panels
1. Open/create a case
2. Go to Investigations tab
3. Verify new panels are visible
4. Select multiple panels
5. Save and verify

## Expected Behavior
- All voice input fields should have microphone icon
- Normal/Abnormal dropdowns should show/hide detail fields instantly
- Data should persist after save and page refresh
- No console errors
- All fields should be properly labeled
