// UPDATED AppNavigator.js - With persistent login and Dashboard as home
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen"; // NEW
import TriageScreen from "../screens/TriageScreen";
import CaseSheetScreen from "../screens/CaseSheetScreen";
import PhysicalExamScreen from "../screens/PhysicalExamScreen";
import InvestigationsScreen from "../screens/InvestigationsScreen";
import TreatmentScreen from "../screens/TreatmentScreen";
import DispositionScreen from "../screens/DispositionScreen";
import DischargeSummaryScreen from "../screens/DischargeSummaryScreen";
import LogsScreen from "../screens/LogsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      if (token && user) {
        // Verify token is still valid by checking expiry or making a quick API call
        // For now, we just check if token exists
        // Optionally, you can add token validation here
        
        // Simple check - if token exists, assume logged in
        // The API will return 401 if token is expired, and screens will handle that
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log("Auth check error:", error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "Dashboard" : "Login"}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main App Screens */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Triage" component={TriageScreen} />
        <Stack.Screen name="CaseSheet" component={CaseSheetScreen} />
        <Stack.Screen name="PhysicalExam" component={PhysicalExamScreen} />
        <Stack.Screen name="Investigations" component={InvestigationsScreen} />
        <Stack.Screen name="Treatment" component={TreatmentScreen} />
        <Stack.Screen name="Disposition" component={DispositionScreen} />
        <Stack.Screen name="DischargeSummary" component={DischargeSummaryScreen} />
        <Stack.Screen name="Logs" component={LogsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
});