// ProfileScreen.js - Fixed with working buttons and dashboard access
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function ProfileScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [editData, setEditData] = useState({
    name: "",
    mobile: "",
    specialization: "",
    hospital_name: "",
  });

  // Fetch user profile
  const getProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        handleLogout();
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
      setEditData({
        name: data.name || "",
        mobile: data.mobile || "",
        specialization: data.specialization || "",
        hospital_name: data.hospital_name || "",
      });
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
            if (onLogout) {
              onLogout();
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser({ ...user, ...updatedUser });
        setEditMode(false);
        Alert.alert("Success", "Profile updated successfully");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err) {
      console.log("Save error:", err);
      Alert.alert("Error", "Failed to save profile");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
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
    <View style={styles.container}>
      {/* Header with Dashboard Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Ionicons name={editMode ? "close" : "create-outline"} size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#2563eb" />
          </View>
          
          {editMode ? (
            <TextInput
              style={styles.editInput}
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              placeholder="Your Name"
            />
          ) : (
            <Text style={styles.name}>{user.name}</Text>
          )}
          
          <Text style={styles.email}>{user.email}</Text>
          
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: getPlanColor(user.subscription_tier) }]}>
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
          {editMode ? (
            <>
              <EditableRow 
                icon="call-outline" 
                label="Mobile" 
                value={editData.mobile}
                onChangeText={(text) => setEditData({ ...editData, mobile: text })}
                placeholder="Your mobile number"
              />
              <EditableRow 
                icon="briefcase-outline" 
                label="Specialization" 
                value={editData.specialization}
                onChangeText={(text) => setEditData({ ...editData, specialization: text })}
                placeholder="Your specialization"
              />
            </>
          ) : (
            <>
              <DetailRow icon="call-outline" label="Mobile" value={user.mobile || "Not added"} />
              <DetailRow icon="briefcase-outline" label="Specialization" value={user.specialization || "Not added"} />
              <DetailRow icon="medkit-outline" label="License No" value={user.medical_license_number || "Not added"} />
              <DetailRow icon="id-card-outline" label="User Type" value={(user.user_type || "Individual").toUpperCase()} />
            </>
          )}
        </View>

        {/* Hospital Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital / Institution</Text>
          {editMode ? (
            <EditableRow 
              icon="business-outline" 
              label="Hospital" 
              value={editData.hospital_name}
              onChangeText={(text) => setEditData({ ...editData, hospital_name: text })}
              placeholder="Hospital name"
            />
          ) : (
            <>
              <DetailRow icon="business-outline" label="Hospital" value={user.hospital_name || "Not linked"} />
              {user.hospital_id && (
                <DetailRow icon="key-outline" label="Hospital ID" value={user.hospital_id.substring(0, 8) + "..."} />
              )}
            </>
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
          <DetailRow
            icon="analytics-outline"
            label="AI Credits"
            value={`${user.ai_credits || 0} remaining`}
          />
        </View>

        {/* Upgrade Button */}
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate("Upgrade")}
        >
          <Ionicons name="star" size={20} color="#fff" />
          <Text style={styles.upgradeBtnText}>Upgrade Plan / Buy Credits</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        {editMode ? (
          <TouchableOpacity
            style={[styles.btn, styles.saveBtn]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.btnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => navigation.navigate("Dashboard")}
            >
              <Ionicons name="home-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.btn, styles.logoutBtn]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// Helper components
function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color="#2563eb" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function EditableRow({ icon, label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.editRow}>
      <View style={styles.editRowLabel}>
        <Ionicons name={icon} size={20} color="#2563eb" />
        <Text style={styles.editRowLabelText}>{label}</Text>
      </View>
      <TextInput
        style={styles.editRowInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    </View>
  );
}

function getPlanColor(tier) {
  const colors = {
    free: "#64748b",
    pro_monthly: "#2563eb",
    pro_yearly: "#7c3aed",
    hospital: "#059669",
  };
  return colors[tier?.toLowerCase()] || "#64748b";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    backgroundColor: "#2563eb",
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
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
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
    marginLeft: 12,
    fontSize: 14,
    color: "#64748b",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  editInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    width: "80%",
  },
  editRow: {
    marginBottom: 12,
  },
  editRowLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  editRowLabelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  editRowInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  saveBtn: {
    backgroundColor: "#22c55e",
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
