// FIXED DispositionScreen.js - Navigation corrected for your AppNavigator structure
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";

// ⚠️ PRODUCTION API URL
const API_URL = "https://er-emr-backend.onrender.com/api";

export default function DispositionScreen({ route, navigation }) {
  const { caseId, patientType = "adult", patientName = "", triageData = {} } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    disposition_type: "",
    destination: "",
    condition_at_discharge: "Stable",
    advice: "",
    followup: "",
    medications_at_discharge: "",
    warning_signs: "",
    em_resident: "",
    em_consultant: "",
  });

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const dispositionOptions = [
    { value: "discharged", label: "🏠 Discharged", color: "#22c55e" },
    { value: "admitted-ward", label: "🏥 Admitted (Ward)", color: "#3b82f6" },
    { value: "admitted-hdu", label: "🔶 Admitted (HDU)", color: "#f97316" },
    { value: "admitted-icu", label: "🔴 Admitted (ICU)", color: "#ef4444" },
    { value: "referred", label: "↗️ Referred", color: "#8b5cf6" },
    { value: "dama", label: "⚠️ DAMA", color: "#eab308" },
    { value: "death", label: "🖤 Death", color: "#1f2937" },
  ];

  const saveDisposition = async () => {
    if (!caseId) {
      Alert.alert("Error", "No case ID");
      return;
    }

    if (!formData.disposition_type) {
      Alert.alert("Required", "Please select a disposition type");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        disposition: {
          type: formData.disposition_type,
          destination: formData.destination,
          advice: formData.advice,
          condition_at_discharge: formData.condition_at_discharge,
        },
        em_resident: formData.em_resident,
        em_consultant: formData.em_consultant,
        status: "completed",
      };

      const response = await fetch(`${API_URL}/cases/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save disposition");
      }

      Alert.alert(
        "✅ Case Completed",
        "Disposition saved successfully!",
        [
          {
            text: "View Discharge Summary",
            onPress: () => navigation.navigate("DischargeSummary", { caseId, patientName }),
          },
          {
            text: "Go to Dashboard",
            onPress: goToDashboard,
          },
        ]
      );
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     🔧 FIXED NAVIGATION - Works with Stack Navigator
     ========================================================= */
  
  const goToDashboard = () => {
    // Option 1: Reset to Login (which will then show Triage after login)
    // This works with your current AppNavigator which only has Stack screens
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });

    // Alternative: If you add a Home screen to your Stack Navigator later:
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: "Home" }],
    // });
  };

  const goToTriage = () => {
    // Navigate to start a new case
    navigation.reset({
      index: 0,
      routes: [{ name: "Triage" }],
    });
  };

  const SectionTitle = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#1e40af" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const InputField = ({ label, field, placeholder, multiline }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        defaultValue={formData[field]}
        onChangeText={(text) => updateField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📋 Disposition</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Patient Banner */}
        {patientName && (
          <View style={styles.patientBanner}>
            <Ionicons name="person" size={18} color="#1e40af" />
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
        )}

        {/* Disposition Type */}
        <SectionTitle icon="exit" title="Disposition Type" />
        <View style={styles.card}>
          <View style={styles.dispositionGrid}>
            {dispositionOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dispositionBtn,
                  formData.disposition_type === opt.value && {
                    backgroundColor: opt.color,
                    borderColor: opt.color,
                  },
                ]}
                onPress={() => updateField("disposition_type", opt.value)}
              >
                <Text
                  style={[
                    styles.dispositionBtnText,
                    formData.disposition_type === opt.value && { color: "#fff" },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination */}
        {(formData.disposition_type === "admitted-ward" ||
          formData.disposition_type === "admitted-hdu" ||
          formData.disposition_type === "admitted-icu" ||
          formData.disposition_type === "referred") && (
          <>
            <SectionTitle icon="location" title="Destination" />
            <View style={styles.card}>
              <InputField
                label="Ward/ICU/Referral Hospital"
                field="destination"
                placeholder="Specify destination..."
              />
            </View>
          </>
        )}

        {/* Condition at Discharge */}
        <SectionTitle icon="pulse" title="Condition at Discharge" />
        <View style={styles.card}>
          <View style={styles.selectRow}>
            {["Stable", "Unstable", "Critical"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.selectBtn,
                  formData.condition_at_discharge === opt && styles.selectBtnActive,
                ]}
                onPress={() => updateField("condition_at_discharge", opt)}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    formData.condition_at_discharge === opt && styles.selectBtnTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Discharge Advice */}
        {formData.disposition_type === "discharged" && (
          <>
            <SectionTitle icon="document-text" title="Discharge Advice" />
            <View style={styles.card}>
              <InputField
                label="Advice"
                field="advice"
                placeholder="Discharge instructions..."
                multiline
              />
              <InputField
                label="Follow-up"
                field="followup"
                placeholder="Follow-up instructions..."
              />
              <InputField
                label="Medications"
                field="medications_at_discharge"
                placeholder="Prescription..."
                multiline
              />
              <InputField
                label="Warning Signs"
                field="warning_signs"
                placeholder="When to return..."
                multiline
              />
            </View>
          </>
        )}

        {/* Attending Doctors */}
        <SectionTitle icon="medkit" title="Attending Doctors" />
        <View style={styles.card}>
          <InputField
            label="EM Resident"
            field="em_resident"
            placeholder="Name of resident..."
          />
          <InputField
            label="EM Consultant"
            field="em_consultant"
            placeholder="Name of consultant..."
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={saveDisposition}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Complete Case</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={goToTriage}>
            <Ionicons name="add-circle" size={20} color="#2563eb" />
            <Text style={styles.quickBtnText}>New Case</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={goToDashboard}>
            <Ionicons name="home" size={20} color="#2563eb" />
            <Text style={styles.quickBtnText}>Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  patientBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    gap: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e40af",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dispositionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dispositionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minWidth: "45%",
    alignItems: "center",
  },
  dispositionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  selectRow: {
    flexDirection: "row",
    gap: 10,
  },
  selectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  selectBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  selectBtnTextActive: {
    color: "#fff",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 14,
    color: "#1e293b",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actionRow: {
    padding: 16,
  },
  saveBtn: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 16,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
  },
  quickBtnText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 14,
  },
});
