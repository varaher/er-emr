// App.js - ErMate Mobile App with OTA Update Support
// This file includes expo-updates for Over-the-Air updates

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  StyleSheet,
  TouchableOpacity 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

// Import Screens (from src/screens folder)
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TriageScreen from './src/screens/TriageScreen';
import CaseSheetScreen from './src/screens/CaseSheetScreen';
import InvestigationsScreen from './src/screens/InvestigationsScreen';
import TreatmentScreen from './src/screens/TreatmentScreen';
import DispositionScreen from './src/screens/DispositionScreen';
import DischargeSummaryScreen from './src/screens/DischargeSummaryScreen';
import PhysicalExamScreen from './src/screens/PhysicalExamScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LogsScreen from './src/screens/LogsScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';

const API_URL = "https://erpro-mobile.preview.emergentagent.com/api";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(true);

  // Check for OTA Updates
  const checkForUpdates = useCallback(async () => {
    if (__DEV__) {
      // Skip update check in development
      console.log('Development mode - skipping update check');
      setIsCheckingUpdate(false);
      return;
    }

    try {
      setUpdateStatus('Checking for updates...');
      console.log('Checking for updates...');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        setUpdateStatus('Downloading update...');
        console.log('Update available, downloading...');
        
        await Updates.fetchUpdateAsync();
        
        // Show alert to user
        Alert.alert(
          '🎉 Update Available',
          'A new version of ErMate has been downloaded. Restart the app to apply the update.',
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                setIsCheckingUpdate(false);
              }
            },
            {
              text: 'Restart Now',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        console.log('App is up to date');
        setUpdateStatus('');
        setIsCheckingUpdate(false);
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
      setUpdateStatus('');
      setIsCheckingUpdate(false);
    }
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (token && user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // First check for updates, then check auth
    const initialize = async () => {
      await checkForUpdates();
      await checkAuth();
    };
    
    initialize();
  }, [checkForUpdates, checkAuth]);

  // Handle login success
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  // Loading screen while checking updates and auth
  if (isLoading || isCheckingUpdate) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ErMate</Text>
          <Text style={styles.logoSubtext}>Emergency Room Assistant</Text>
        </View>
        <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />
        {updateStatus ? (
          <Text style={styles.updateText}>{updateStatus}</Text>
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        
        {/* Manual update check button */}
        {!isCheckingUpdate && (
          <TouchableOpacity 
            style={styles.checkUpdateBtn}
            onPress={checkForUpdates}
          >
            <Text style={styles.checkUpdateText}>Check for Updates</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isLoggedIn ? (
          // Auth Stack
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
            )}
          </Stack.Screen>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Dashboard">
              {(props) => (
                <DashboardScreen {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Triage" component={TriageScreen} />
            <Stack.Screen name="CaseSheet" component={CaseSheetScreen} />
            <Stack.Screen name="Investigations" component={InvestigationsScreen} />
            <Stack.Screen name="Treatment" component={TreatmentScreen} />
            <Stack.Screen name="Disposition" component={DispositionScreen} />
            <Stack.Screen name="DischargeSummary" component={DischargeSummaryScreen} />
            <Stack.Screen name="PhysicalExam" component={PhysicalExamScreen} />
            <Stack.Screen name="Profile">
              {(props) => (
                <ProfileScreen 
                  {...props} 
                  onLogout={handleLogout}
                  checkForUpdates={checkForUpdates}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Logs" component={LogsScreen} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: -1,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  updateText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  checkUpdateBtn: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  checkUpdateText: {
    color: '#3730a3',
    fontWeight: '600',
    fontSize: 14,
  },
});
