/**
 * ER-EMR Mobile App Navigation Setup
 * 
 * This file shows how to set up navigation for the complete flow:
 * Login → Dashboard → Triage → CaseSheet → Investigations → Disposition → DischargeSummary
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import all screens
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import DashboardScreen from "./screens/DashboardScreen";
import TriageScreen from "./screens/TriageScreen";
import CaseSheetScreen from "./screens/CaseSheetScreen";
import PediatricCaseSheetScreen from "./screens/PediatricCaseSheetScreen"; // Optional: same as CaseSheetScreen
import InvestigationsScreen from "./screens/InvestigationsScreen";
import DispositionScreen from "./screens/DispositionScreen";
import DischargeSummaryScreen from "./screens/DischargeSummaryScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // We use custom headers
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main App Screens */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Triage" component={TriageScreen} />
        
        {/* Case Sheet Flow */}
        <Stack.Screen name="CaseSheet" component={CaseSheetScreen} />
        <Stack.Screen name="PediatricCaseSheet" component={CaseSheetScreen} /> {/* Same component, different params */}
        <Stack.Screen name="Investigations" component={InvestigationsScreen} />
        <Stack.Screen name="Disposition" component={DispositionScreen} />
        <Stack.Screen name="DischargeSummary" component={DischargeSummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * ============================================
 * NAVIGATION FLOW
 * ============================================
 * 
 * 1. LOGIN
 *    → User logs in
 *    → Navigates to Dashboard
 * 
 * 2. DASHBOARD
 *    → Shows list of cases
 *    → "Start Triage" button → Triage
 *    → Tap on existing case → CaseSheet (edit mode)
 * 
 * 3. TRIAGE
 *    → Enter vitals (manual or voice)
 *    → Select symptoms
 *    → "Analyze & Continue" → CaseSheet
 *    → Passes: { triageData, patientType, vitals, symptoms }
 * 
 * 4. CASE SHEET
 *    → Pre-filled with triage data
 *    → Voice dictation auto-populates ALL fields
 *    → "Proceed to Investigations" → Investigations
 *    → Passes: { caseId, patientType, patientInfo, vitals, triageData }
 * 
 * 5. INVESTIGATIONS
 *    → Select lab panels, imaging
 *    → Add custom tests
 *    → Document results
 *    → "Proceed to Disposition" → Disposition
 *    → Passes: { ...previous, investigations }
 * 
 * 6. DISPOSITION
 *    → Enter diagnosis
 *    → Select disposition type (Discharge, Admit, Refer, etc.)
 *    → If discharge → DischargeSummary
 *    → If admit → Dashboard (case saved)
 *    → Passes: { ...previous, disposition, doctors }
 * 
 * 7. DISCHARGE SUMMARY
 *    → Enter discharge medications
 *    → Enter discharge vitals
 *    → Enter follow-up advice
 *    → "Generate PDF" → Share/Print
 *    → "Complete" → Dashboard
 * 
 * ============================================
 * API ENDPOINTS USED
 * ============================================
 * 
 * Auth:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - GET  /api/auth/profile
 * 
 * Cases:
 * - GET  /api/cases (list all)
 * - POST /api/cases (create new)
 * - GET  /api/cases/:id (get single)
 * - PUT  /api/cases/:id (update)
 * 
 * Triage:
 * - POST /api/triage/analyze (vitals → priority)
 * - POST /api/extract-triage-data (text → vitals)
 * 
 * Voice/AI:
 * - POST /api/ai/voice-to-text (audio → text)
 * - POST /api/ai/parse-transcript (text → structured case data)
 * 
 * ============================================
 * REQUIRED PACKAGES
 * ============================================
 * 
 * yarn add @react-navigation/native @react-navigation/native-stack
 * yarn add react-native-screens react-native-safe-area-context
 * yarn add @react-native-async-storage/async-storage
 * yarn add expo-av (for audio recording)
 * yarn add expo-print expo-sharing (for PDF generation)
 * yarn add @expo/vector-icons
 * 
 * ============================================
 */
