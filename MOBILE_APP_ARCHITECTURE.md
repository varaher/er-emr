# ER-EMR Mobile App Architecture (ERmateApp)

## Project Structure

```
EREMR/
└── ERmateApp/
    └── src/
        ├── navigation/
        │   ├── AppNavigator.js      # Main navigation setup
        │   ├── BottomTabs.js        # Bottom tab navigation
        │   └── MainTabs.js          # Main tab configuration
        │
        └── screens/
            ├── CaseSheetScreen.js        # Full case sheet (adult & pediatric)
            ├── DischargeSummaryScreen.js # Discharge summary with PDF export
            ├── DispositionScreen.js      # Patient disposition/outcome
            ├── EditProfileScreen.js      # Edit user profile
            ├── HomeScreen.js             # Dashboard/Home
            ├── InvestigationsScreen.js   # Lab tests & investigations
            ├── LoginScreen.js            # User login
            ├── LogsScreen.js             # Activity/case logs
            ├── PhysicalExamScreen.js     # Physical examination
            ├── ProfileScreen.js          # View user profile
            ├── RegisterScreen.js         # User registration
            ├── SettingsScreen.js         # App settings
            ├── TreatmentScreen.js        # Treatment & medications
            └── TriageScreen.js           # Triage assessment
```

## Backend API

- **Base URL**: `https://er-emr-backend.onrender.com/api`
- **Authentication**: JWT Bearer Token stored in AsyncStorage

## Screen Flow

```
Login/Register
      │
      ▼
   HomeScreen (Dashboard)
      │
      ├── TriageScreen ──► CaseSheetScreen ──► PhysicalExamScreen
      │                          │
      │                          ▼
      │                   InvestigationsScreen
      │                          │
      │                          ▼
      │                   TreatmentScreen
      │                          │
      │                          ▼
      │                   DispositionScreen
      │                          │
      │                          ▼
      │                   DischargeSummaryScreen ──► PDF Export
      │
      ├── LogsScreen (View all cases)
      │
      ├── ProfileScreen ──► EditProfileScreen
      │
      └── SettingsScreen
```

## Key API Endpoints Used

| Screen | Endpoint | Method |
|--------|----------|--------|
| Login | `/api/auth/login` | POST |
| Register | `/api/auth/register` | POST |
| Triage | `/api/triage/analyze` | POST |
| Triage | `/api/triage/create` | POST |
| Case Sheet | `/api/cases` | POST (create) |
| Case Sheet | `/api/cases/{id}` | GET/PUT |
| Investigations | `/api/cases/{id}` | PUT |
| Treatment | `/api/cases/{id}` | PUT |
| Disposition | `/api/cases/{id}` | PUT |
| Discharge | `/api/discharge/{id}` | GET/PUT |
| Profile | `/api/auth/me` | GET |
| Profile | `/api/auth/profile` | PUT |

## Dependencies Required

```bash
# Core
expo install @react-native-async-storage/async-storage
expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# PDF Export
expo install expo-print expo-sharing

# UI Components
expo install react-native-safe-area-context
expo install react-native-screens
expo install react-native-gesture-handler
```

## Data Flow: Triage → Case Sheet → Discharge

1. **TriageScreen**: Enter vitals → Get priority color → Navigate to CaseSheet
2. **CaseSheetScreen**: Auto-populated from triage, add patient details
3. **PhysicalExamScreen**: ABCDE assessment, systemic examination
4. **InvestigationsScreen**: Order labs, add results
5. **TreatmentScreen**: Add medications, interventions
6. **DispositionScreen**: Decide outcome (discharge/admit/refer)
7. **DischargeSummaryScreen**: View all data, add discharge meds, export PDF

## Navigation Parameters

```javascript
// Triage → CaseSheet
navigation.navigate("CaseSheet", { 
  triageData: { priority, vitals, ageGroup },
  patientType: "adult" | "pediatric"
});

// CaseSheet → Investigations
navigation.navigate("Investigations", { caseId: "uuid" });

// Any Screen → Discharge
navigation.navigate("DischargeSummary", { caseId: "uuid" });
```

---

**Last Updated**: December 2025
**Backend Deployment**: Render (https://er-emr-backend.onrender.com)
**Web App**: Emergent Platform
