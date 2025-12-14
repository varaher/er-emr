import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function DischargeSummaryScreen({ route, navigation }) {
  const {
    caseId,
    patientType,
    patientInfo,
    vitals,
    triageData,
    investigations,
    disposition,
    doctors,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseData, setCaseData] = useState(null);

  /* ===================== DISCHARGE SPECIFIC FIELDS ===================== */
  const [dischargeMedications, setDischargeMedications] = useState("");
  const [followUpAdvice, setFollowUpAdvice] = useState("");
  const [dischargeVitals, setDischargeVitals] = useState({
    hr: "",
    bp: "",
    rr: "",
    spo2: "",
    gcs: "",
    pain_score: "",
    grbs: "",
    temp: "",
  });

  /* ===================== LOAD CASE DATA ===================== */
  useEffect(() => {
    loadCaseData();
  }, []);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_URL}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCaseData(data);
      }
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  /* ===================== SAVE DISCHARGE ===================== */
  const saveDischarge = async () => {
    if (!dischargeMedications) {
      Alert.alert("Required", "Please enter discharge medications");
      return false;
    }

    if (!followUpAdvice) {
      Alert.alert("Required", "Please enter follow-up advice");
      return false;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        discharge_summary: {
          medications: dischargeMedications,
          follow_up_advice: followUpAdvice,
          vitals_at_discharge: dischargeVitals,
          discharge_date: new Date().toISOString(),
        },
        status: "discharged",
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
        throw new Error("Failed to save discharge summary");
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

  /* ===================== GENERATE PDF ===================== */
  const generatePDF = async () => {
    const saved = await saveDischarge();
    if (!saved) return;

    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Discharge Summary",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", "PDF saved to: " + uri);
      }
    } catch (err) {
      console.error("PDF error:", err);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  /* ===================== GENERATE HTML FOR PDF ===================== */
  const generateHTML = () => {
    const gcsTotal = caseData?.vitals_at_arrival
      ? (caseData.vitals_at_arrival.gcs_e || 0) +
        (caseData.vitals_at_arrival.gcs_v || 0) +
        (caseData.vitals_at_arrival.gcs_m || 0)
      : "-";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Discharge Summary</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
          .section { margin-bottom: 12px; }
          .section-title { font-weight: bold; margin-bottom: 4px; }
          .grid { display: flex; gap: 20px; }
          .grid > div { flex: 1; }
          .row { margin-bottom: 4px; }
          .label { font-weight: bold; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature > div { width: 40%; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
          .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <h1>DISCHARGE SUMMARY</h1>
        
        <div class="section">
          <div class="grid">
            <div><span class="label">UHID:</span> ${patientInfo?.uhid || "N/A"}</div>
            <div><span class="label">Name:</span> ${patientInfo?.name || "N/A"}</div>
          </div>
          <div class="grid">
            <div><span class="label">Age/Sex:</span> ${patientInfo?.age || "N/A"} / ${patientInfo?.sex || "N/A"}</div>
            <div><span class="label">Admission Date:</span> ${new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div class="section">
          <div class="grid">
            <div><span class="label">MLC:</span> ${caseData?.patient?.mlc ? "Yes" : "No"}</div>
            <div><span class="label">Allergy:</span> ${caseData?.history?.allergies?.join(", ") || "NKDA"}</div>
          </div>
        </div>

        <div class="section">
          <span class="label">Vitals at Arrival:</span>
          HR- ${caseData?.vitals_at_arrival?.hr || "-"}, 
          BP- ${caseData?.vitals_at_arrival?.bp_systolic || "-"}/${caseData?.vitals_at_arrival?.bp_diastolic || "-"}, 
          RR- ${caseData?.vitals_at_arrival?.rr || "-"}, 
          SpO2- ${caseData?.vitals_at_arrival?.spo2 || "-"}%, 
          GCS- ${gcsTotal}, 
          Temp- ${caseData?.vitals_at_arrival?.temperature || "-"}°C
        </div>

        <div class="section">
          <div class="section-title">Presenting Complaints:</div>
          ${caseData?.presenting_complaint?.text || "N/A"}
        </div>

        <div class="section">
          <div class="section-title">History of Present Illness:</div>
          ${caseData?.history?.hpi || "N/A"}
        </div>

        <div class="section">
          <div class="section-title">Past Medical/Surgical History:</div>
          Medical: ${caseData?.history?.past_medical?.join(", ") || "None"}<br>
          Surgical: ${caseData?.history?.past_surgical || "None"}
        </div>

        <div class="section">
          <div class="section-title">Investigations:</div>
          ${investigations?.panels_selected?.join(", ") || "N/A"}<br>
          ${investigations?.results_notes || ""}
        </div>

        <div class="section">
          <div class="section-title">Diagnosis at Discharge:</div>
          ${disposition?.provisional_diagnosis || "N/A"}
        </div>

        <div class="section">
          <div class="section-title">Discharge Medications:</div>
          ${dischargeMedications.replace(/\n/g, "<br>")}
        </div>

        <div class="section">
          <div class="section-title">Disposition:</div>
          ${getDispositionLabel(disposition?.type)}
        </div>

        <div class="section">
          <span class="label">Condition at Discharge:</span> ${disposition?.condition_at_discharge || "Stable"}
        </div>

        <div class="section">
          <span class="label">Vitals at Discharge:</span>
          HR- ${dischargeVitals.hr || "-"}, 
          BP- ${dischargeVitals.bp || "-"}, 
          RR- ${dischargeVitals.rr || "-"}, 
          SpO2- ${dischargeVitals.spo2 || "-"}%
        </div>

        <div class="section">
          <div class="section-title">Follow-Up Advice:</div>
          ${followUpAdvice.replace(/\n/g, "<br>")}
        </div>

        <div class="signature">
          <div>
            <div class="section-title">ED Resident</div>
            <div class="signature-line">${doctors?.em_resident || ""}</div>
          </div>
          <div>
            <div class="section-title">ED Consultant</div>
            <div class="signature-line">${doctors?.em_consultant || ""}</div>
          </div>
        </div>

        <div class="footer">
          <p>Date: ${new Date().toLocaleDateString("en-IN")}</p>
          <p>In case of emergency, contact your nearest hospital emergency department.</p>
        </div>
      </body>
      </html>
    `;
  };

  const getDispositionLabel = (type) => {
    const labels = {
      discharge: "Normal Discharge",
      discharge_request: "Discharge at Request",
      dama: "Discharge Against Medical Advice",
      referred: "Referred",
    };
    return labels[type] || type || "N/A";
  };

  /* ===================== COMPLETE & GO HOME ===================== */
  const completeAndGoHome = async () => {
    const saved = await saveDischarge();
    if (!saved) return;

    Alert.alert(
      "✅ Discharge Complete",
      "Discharge summary has been saved successfully.",
      [
        {
          text: "Go to Dashboard",
          onPress: () => navigation.navigate("Dashboard"),
        },
      ]
    );
  };

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading case data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📄 Discharge Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Patient Info Banner */}
      <View style={styles.patientBanner}>
        <View style={styles.patientRow}>
          <View>
            <Text style={styles.patientName}>{patientInfo?.name || "Patient"}</Text>
            <Text style={styles.patientDetails}>
              {patientInfo?.age} {patientInfo?.age_unit} • {patientInfo?.sex}
            </Text>
          </View>
          <View style={[styles.dispositionBadge, { backgroundColor: getDispositionColor(disposition?.type) }]}>
            <Text style={styles.dispositionBadgeText}>{getDispositionLabel(disposition?.type)}</Text>
          </View>
        </View>
      </View>

      {/* Summary Preview */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Summary Preview</Text>
        
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Diagnosis:</Text>
          <Text style={styles.previewValue}>{disposition?.provisional_diagnosis || "Not set"}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Condition:</Text>
          <Text style={[
            styles.previewValue,
            { color: disposition?.condition_at_discharge === "Stable" ? "#22c55e" : "#ef4444" }
          ]}>
            {disposition?.condition_at_discharge || "Stable"}
          </Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>ED Resident:</Text>
          <Text style={styles.previewValue}>{doctors?.em_resident || "Not set"}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>ED Consultant:</Text>
          <Text style={styles.previewValue}>{doctors?.em_consultant || "Not set"}</Text>
        </View>
      </View>

      {/* Discharge Medications */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💊 Discharge Medications <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={dischargeMedications}
          onChangeText={setDischargeMedications}
          placeholder="Tab Paracetamol 500mg - 1 tab TID x 5 days&#10;Tab Pantoprazole 40mg - 1 tab OD x 7 days&#10;..."
          placeholderTextColor="#9ca3af"
          multiline
        />
      </View>

      {/* Vitals at Discharge */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Vitals at Discharge</Text>
        <View style={styles.vitalsGrid}>
          {[
            { key: "hr", label: "HR", placeholder: "bpm" },
            { key: "bp", label: "BP", placeholder: "120/80" },
            { key: "rr", label: "RR", placeholder: "/min" },
            { key: "spo2", label: "SpO2", placeholder: "%" },
            { key: "gcs", label: "GCS", placeholder: "15" },
            { key: "temp", label: "Temp", placeholder: "°C" },
          ].map((vital) => (
            <View key={vital.key} style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>{vital.label}</Text>
              <TextInput
                style={styles.vitalInput}
                value={dischargeVitals[vital.key]}
                onChangeText={(v) => setDischargeVitals({ ...dischargeVitals, [vital.key]: v })}
                placeholder={vital.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={vital.key === "bp" ? "default" : "numeric"}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Follow-Up Advice */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📅 Follow-Up Advice <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={followUpAdvice}
          onChangeText={setFollowUpAdvice}
          placeholder="- Review after 5 days&#10;- Return to ER if fever >101°F, severe pain, or vomiting&#10;- Continue medications as prescribed&#10;..."
          placeholderTextColor="#9ca3af"
          multiline
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.pdfBtn, saving && styles.btnDisabled]}
          onPress={generatePDF}
          disabled={saving}
        >
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.btnText}>Generate PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completeBtn, saving && styles.btnDisabled]}
          onPress={completeAndGoHome}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.btnText}>Complete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ===================== HELPERS ===================== */

const getDispositionColor = (type) => {
  const colors = {
    discharge: "#22c55e",
    discharge_request: "#eab308",
    dama: "#f97316",
    referred: "#06b6d4",
  };
  return colors[type] || "#6b7280";
};

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
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
    backgroundColor: "#fff",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  patientDetails: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  dispositionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dispositionBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
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
  required: {
    color: "#ef4444",
  },
  previewRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    width: 100,
  },
  previewValue: {
    fontSize: 13,
    color: "#1e293b",
    flex: 1,
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
    minHeight: 120,
    textAlignVertical: "top",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitalItem: {
    width: "30%",
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    textAlign: "center",
  },
  vitalInput: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "center",
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  completeBtn: {
    flex: 1,
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
    fontSize: 15,
  },
});
