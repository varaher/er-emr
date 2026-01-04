# ErMate - Emergency Room Documentation App
## Product Requirements Document

---

## ⚠️ IMPORTANT: Do NOT Change Basic Case Sheet Structure

The case sheet structure has been finalized. Do NOT modify:
- Tab order: Patient → Vitals → Primary → History → Exam → Treatment → Notes → Disposition
- Field groupings within each tab
- The save payload structure

---

## Files to Update Before APK Rebuild

### 📱 MOBILE FILES (Copy these to VSCode):

| # | File | What Changed |
|---|------|--------------|
| 1 | `CaseSheetScreen.js` | Save function fixed - added all required patient fields |
| 2 | `TriageScreen.js` | Auto Adult/Pediatric detection based on age |
| 3 | `DischargeSummaryScreen.js` | Enhanced Course in ER + Finish button |
| 4 | `ViewCaseSheetScreen.js` | NEW: Shows procedures, drugs, exam notes, ER observation |

---

## Recent Fixes (Session 2)

### ✅ Save Button Fix
- Added all required fields to patient object:
  - `phone`, `address`, `brought_by`, `informant_name`, `informant_reliability`, `identification_mark`
- Added `course` to presenting_complaint
- All fields now have fallback defaults to prevent validation errors

### ✅ ViewCaseSheet Now Shows:
1. **Procedures Performed** - With notes for each procedure
2. **Drugs Administered** - Drug name, dose, and time
3. **Examination Detailed Notes** - Shows `cvs_additional_notes`, etc.
4. **ER Observation** - Notes and duration
5. **Addendum Notes** - Timestamp and content

### ✅ Discharge Summary
- Comprehensive `generateCourseInER()` function
- Auto-populates from case sheet
- "Finish & Dashboard" button

---

## Core Architecture (DO NOT CHANGE)

### Case Sheet Tabs
1. **Patient** - Demographics, UHID, MLC
2. **Vitals** - HR, BP, RR, SpO2, Temp, GCS
3. **Primary** - ABCDE assessment
4. **History** - HOPI, PMH, PSH, Allergies
5. **Exam** - General, CVS, RS, Abdomen, CNS, Extremities
6. **Treatment** - Investigations, Diagnosis, Medications
7. **Notes** - Procedures with individual notes
8. **Disposition** - Discharge/Admit/Refer/LAMA

### Required Fields for Save
```javascript
patient: {
  name, age, sex, phone, address, 
  arrival_datetime, mode_of_arrival,
  brought_by, informant_name, 
  informant_reliability, identification_mark
}
presenting_complaint: {
  text, duration, onset_type, course
}
em_resident: "Dr. Name"
```

---

## Test Credentials
- Email: test@test.com
- Password: Test123!

## Configuration
- Expo Project ID: `44c665c9-fa62-4ace-b08a-e797df5feac1`
- Owner: `varah`
- Package: `com.ermate.app`
