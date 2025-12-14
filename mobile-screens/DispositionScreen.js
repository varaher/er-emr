import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function DispositionScreen({ route, navigation }) {
  const { caseId, patientType, patientInfo, vitals, triageData, investigations } = route.params || {};

  const [saving, setSaving] = useState(false);

  /* ===================== DIAGNOSIS ===================== */
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState("");

  /* ===================== DISPOSITION ===================== */
  const [dispositionType, setDispositionType] = useState("");
  const [destination, setDestination] = useState("");
  const [conditionAtDischarge, setConditionAtDischarge] = useState("Stable");

  /* ===================== DOCTORS ===================== */
  const [emResident, setEmResident] = useState("");
  const [emConsultant, setEmConsultant] = useState("");

  /* ===================== DISPOSITION OPTIONS ===================== */
  const dispositionOptions = [
    { id: "discharge", label: "Normal Discharge", icon: "home", color: "#22c55e" },
    { id: "discharge_request", label: "Discharge at Request", icon: "hand-left", color: "#eab308" },
    { id: "dama", label: "DAMA", icon: "warning", color: "#f97316" },
    { id: "ward", label: "Admit to Ward", icon: "bed", color: "#3b82f6" },
    { id: "icu", label: "Admit to ICU", icon: "pulse", color: "#ef4444" },
    { id: "ot", label: "Shift to OT", icon: "medical", color: "#8b5cf6" },
    { id: "referred", label: "Referred Out", icon: "arrow-redo", color: "#06b6d4" },
    { id: "expired", label: "Expired", icon: "skull", color: "#1f2937" },
  ];

  /* ===================== SAVE & COMPLETE ===================== */
  const saveDisposition = async () => {
    if (!dispositionType) {
      Alert.alert("Required", "Please select a disposition type");
      return false;
    }

    if (!provisionalDiagnosis) {
      Alert.alert("Required", "Please enter provisional diagnosis");
      return false;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        treatment: {
          differential_diagnoses: differentialDiagnoses.split(",").map(d => d.trim()).filter(Boolean),
          provisional_diagnosis: provisionalDiagnosis,
        },
        disposition: {
          type: dispositionType,
          destination: destination,
          condition_at_discharge: conditionAtDischarge,
        },
        em_resident: emResident,
        em_consultant: emConsultant,
        status: dispositionType === "discharge" ? "discharged" : "admitted",
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

      return true;
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.message || "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ===================== PROCEED TO DISCHARGE SUMMARY ===================== */
  const proceedToDischarge = async () => {
    const saved = await saveDisposition();
    if (!saved) return;

    // If patient is being discharged, go to discharge summary
    if (["discharge", "discharge_request", "dama", "referred"].includes(dispositionType)) {
      navigation.navigate("DischargeSummary", {
        caseId,
        patientType,
        patientInfo,
        vitals,
        triageData,
        investigations,
        disposition: {
          type: dispositionType,
          destination,
          condition_at_discharge: conditionAtDischarge,
          provisional_diagnosis: provisionalDiagnosis,
          differential_diagnoses: differentialDiagnoses,
        },
        doctors: {
          em_resident: emResident,
          em_consultant: emConsultant,
        },
      });
    } else {
      // If admitted, go back to dashboard
      Alert.alert(
        "✅ Case Saved",
        `Patient has been ${dispositionType === "icu" ? "admitted to ICU" : dispositionType === "ward" ? "admitted to Ward" : "shifted to OT"}.`,
        [
          {
            text: "Go to Dashboard",
            onPress: () => navigation.navigate("Dashboard"),
          },
        ]
      );
    }
  };

  /* ===================== UI ===================== */

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Disposition</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Patient Info Banner */}
      <View style={styles.patientBanner}>
        <Text style={styles.patientName}>{patientInfo?.name || "Patient"}</Text>
        <Text style={styles.patientDetails}>
          {patientInfo?.age} {patientInfo?.age_unit} • {patientInfo?.sex}
        </Text>
      </View>

      {/* Diagnosis Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🩺 Diagnosis</Text>
        
        <Text style={styles.label}>Provisional Diagnosis <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={provisionalDiagnosis}
          onChangeText={setProvisionalDiagnosis}
          placeholder="Primary diagnosis..."
          placeholderTextColor="#9ca3af"
          multiline
        />

        <Text style={styles.label}>Differential Diagnoses</Text>
        <TextInput
          style={styles.input}
          value={differentialDiagnoses}
          onChangeText={setDifferentialDiagnoses}
          placeholder="Comma separated (e.g., AMI, Angina, GERD)"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Disposition Type */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚪 Disposition <Text style={styles.required}>*</Text></Text>
        
        <View style={styles.dispositionGrid}>
          {dispositionOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.dispositionBtn,
                dispositionType === option.id && { backgroundColor: option.color, borderColor: option.color },
              ]}
              onPress={() => setDispositionType(option.id)}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={dispositionType === option.id ? "#fff" : option.color}
              />
              <Text
                style={[
                  styles.dispositionBtnText,
                  dispositionType === option.id && { color: "#fff" },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Destination (if referred or admitted) */}
      {["referred", "ward", "icu"].includes(dispositionType) && (
        <View style={styles.card}>
          <Text style={styles.label}>
            {dispositionType === "referred" ? "Referred To" : "Destination"}
          </Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder={dispositionType === "referred" ? "Hospital/Facility name" : "Ward/Unit name"}
            placeholderTextColor="#9ca3af"
          />
        </View>
      )}

      {/* Condition at Discharge */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Condition at Shift</Text>
        <View style={styles.conditionRow}>
          {["Stable", "Unstable"].map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionBtn,
                conditionAtDischarge === condition && styles.conditionBtnActive,
                condition === "Unstable" && conditionAtDischarge === condition && { backgroundColor: "#ef4444" },
              ]}
              onPress={() => setConditionAtDischarge(condition)}
            >
              <Ionicons
                name={condition === "Stable" ? "checkmark-circle" : "alert-circle"}
                size={20}
                color={conditionAtDischarge === condition ? "#fff" : "#64748b"}
              />
              <Text
                style={[
                  styles.conditionBtnText,
                  conditionAtDischarge === condition && { color: "#fff" },
                ]}
              >
                {condition}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Doctors */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👨‍⚕️ Treating Doctors</Text>
        
        <Text style={styles.label}>EM Resident</Text>
        <TextInput
          style={styles.input}
          value={emResident}
          onChangeText={setEmResident}
          placeholder="Dr. Name"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>EM Consultant</Text>
        <TextInput
          style={styles.input}
          value={emConsultant}
          onChangeText={setEmConsultant}
          placeholder="Dr. Name"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.btnDisabled]}
          onPress={proceedToDischarge}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.btnText}>
                {["discharge", "discharge_request", "dama", "referred"].includes(dispositionType)
                  ? "Generate Discharge Summary"
                  : "Complete & Save"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ===================== STYLES ===================== */

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
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
  },
  patientBanner: {
    backgroundColor: "#eff6ff",
    padding: 12,
    margin: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
  patientDetails: {
    fontSize: 13,
    color: "#3b82f6",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    color: "#1e293b",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  dispositionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dispositionBtn: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 8,
  },
  dispositionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  conditionRow: {
    flexDirection: "row",
    gap: 12,
  },
  conditionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  conditionBtnActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  conditionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  actionButtons: {
    padding: 16,
  },
  nextBtn: {
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
