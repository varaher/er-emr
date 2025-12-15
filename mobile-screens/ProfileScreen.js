import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const getProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.log("PROFILE ERROR:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            navigation.replace("Login");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unable to load profile</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={getProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Card */}
      <View style={styles.card}>
        <Ionicons name="person-circle-outline" size={80} color="#007AFF" />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{(user.subscription_tier || "FREE").toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#22c55e" }]}>
            <Text style={styles.badgeText}>{(user.role || "Resident").toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Professional Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Details</Text>
        <DetailRow icon="call-outline" label="Mobile" value={user.mobile || "Not added"} />
        <DetailRow icon="briefcase-outline" label="Specialization" value={user.specialization || "Not added"} />
        <DetailRow icon="medkit-outline" label="License No" value={user.medical_license_number || "Not added"} />
        <DetailRow icon="id-card-outline" label="User Type" value={(user.user_type || "Individual").toUpperCase()} />
      </View>

      {/* Hospital Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hospital / Institution</Text>
        <DetailRow icon="business-outline" label="Hospital" value={user.hospital_name || "Not linked"} />
        {user.hospital_id && (
          <DetailRow icon="key-outline" label="Hospital ID" value={user.hospital_id.substring(0, 8) + "..."} />
        )}
      </View>

      {/* Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <DetailRow icon="card-outline" label="Plan" value={(user.subscription_tier || "Free").toUpperCase()} />
        <DetailRow
          icon="checkmark-circle-outline"
          label="Status"
          value={(user.subscription_status || "Active").toUpperCase()}
        />
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Ionicons name="create-outline" size={20} color="#fff" />
        <Text style={styles.btnText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={20} color="#fff" />
        <Text style={styles.btnText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.logoutBtn]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// Helper component
function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color="#007AFF" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    marginBottom: 25,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
    color: "#1e293b",
  },
  email: {
    fontSize: 15,
    color: "#64748b",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1e293b",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rowLabel: {
    flex: 1,
    marginLeft: 10,
    fontWeight: "600",
    color: "#475569",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    color: "#1e293b",
  },
  btn: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
  },
  btnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
