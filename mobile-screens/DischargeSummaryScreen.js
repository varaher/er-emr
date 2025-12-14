import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Share,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function DischargeSummaryScreen({ route, navigation }) {
  const { caseId } = route.params;

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable discharge-specific fields
  const [dischargeData, setDischargeData] = useState({
    discharge_medications: "",
    disposition_type: "Normal Discharge",
    condition_at_discharge: "STABLE",
    discharge_vitals: { hr: "", bp: "", rr: "", spo2: "", gcs: "", pain_score: "", grbs: "", temp: "" },
    follow_up_advice: "",
    ed_resident: "",
    ed_consultant: "",
  });

  useEffect(() => {
    loadCaseData();
  }, []);

  const loadCaseData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      // Fetch full case data
      const res = await fetch(`${API_URL}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch case data");
      }

      const data = await res.json();
      setCaseData(data);

      // Pre-fill editable fields from case data
      setDischargeData((prev) => ({
        ...prev,
        ed_resident: data.em_resident || "",
        ed_consultant: data.em_consultant || "",
        discharge_medications: data.treatment?.medications || "",
        follow_up_advice: data.disposition?.advice || "",
        condition_at_discharge: data.disposition?.condition_at_discharge || "STABLE",
        disposition_type: mapDispositionType(data.disposition?.type),
      }));
    } catch (err) {
      console.log("DISCHARGE ERROR:", err);
      Alert.alert("Error", "Unable to load case data");
    }
    setLoading(false);
  };

  const mapDispositionType = (type) => {
    const map = {
      discharged: "Normal Discharge",
      dama: "Discharge Against Medical Advice",
      referred: "Referred",
    };
    return map[type] || "Normal Discharge";
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/discharge/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dischargeData),
      });

      if (res.ok) {
        Alert.alert("Success", "Discharge summary saved");
      } else {
        Alert.alert("Error", "Failed to save discharge summary");
      }
    } catch (err) {
      console.log("SAVE ERROR:", err);
      Alert.alert("Error", "Unable to save discharge summary");
    }
    setSaving(false);
  };

  const generatePDF = async () => {
    if (!caseData) return;

    const html = buildPrintableHTML(caseData, dischargeData);

    try {
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("PDF Generated", `File saved at: ${uri}`, [
          { text: "Share", onPress: () => Sharing.shareAsync(uri) },
          { text: "OK" },
        ]);
      }
    } catch (err) {
      console.log("PDF ERROR:", err);
      Alert.alert("Error", "Unable to generate PDF");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading discharge summary...</Text>
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load case data</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadCaseData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const patient = caseData.patient || {};
  const vitalsAtArrival = caseData.vitals_at_arrival || {};
  const history = caseData.history || {};
  const examination = caseData.examination || {};
  const treatment = caseData.treatment || {};
  const investigations = caseData.investigations || {};
  const primaryAssessment = caseData.primary_assessment || {};
  const isPediatric = caseData.case_type === "pediatric";

  // Calculate GCS total
  const gcsTotal =
    (vitalsAtArrival.gcs_e || 0) +
    (vitalsAtArrival.gcs_v || 0) +
    (vitalsAtArrival.gcs_m || 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DISCHARGE SUMMARY</Text>
        <Text style={styles.headerSubtitle}>
          {patient.name || "N/A"} - {patient.uhid || "N/A"}
        </Text>
      </View>

      {/* Patient Info */}
      <Section title="Patient Details">
        <Row label="UHID" value={patient.uhid || "N/A"} />
        <Row label="Name" value={patient.name || "N/A"} />
        <Row label="Age/Sex" value={`${patient.age || "N/A"} / ${patient.sex || "N/A"}`} />
        <Row
          label="Admission Date"
          value={
            patient.arrival_datetime
              ? new Date(patient.arrival_datetime).toLocaleDateString("en-IN")
              : "N/A"
          }
        />
        <Row label="MLC" value={patient.mlc ? "Yes" : "No"} />
        <Row
          label="Allergy"
          value={
            history.allergies?.length > 0
              ? history.allergies.join(", ")
              : "NKDA"
          }
        />
      </Section>

      {/* Vitals at Arrival */}
      <Section title="Vitals at Arrival">
        <Text style={styles.vitalsText}>
          HR: {vitalsAtArrival.hr || "-"}, BP:{" "}
          {vitalsAtArrival.bp_systolic || "-"}/{vitalsAtArrival.bp_diastolic || "-"}, RR:{" "}
          {vitalsAtArrival.rr || "-"}, SpO2: {vitalsAtArrival.spo2 || "-"}%, GCS:{" "}
          {gcsTotal || "-"}, Pain: {vitalsAtArrival.pain_score || "-"}, GRBS:{" "}
          {vitalsAtArrival.grbs || "-"}, Temp: {vitalsAtArrival.temperature || "-"}°C
        </Text>
      </Section>

      {/* Presenting Complaints */}
      <Section title="Presenting Complaints">
        <Text style={styles.text}>
          {caseData.presenting_complaint?.text || "N/A"}
        </Text>
      </Section>

      {/* History of Present Illness */}
      <Section title="History of Present Illness">
        <Text style={styles.text}>{history.hpi || "N/A"}</Text>
      </Section>

      {/* Past Medical/Surgical History */}
      <Section title="Past Medical/Surgical History">
        <Text style={styles.text}>
          Medical: {history.past_medical?.join(", ") || "None"}
        </Text>
        <Text style={styles.text}>
          Surgical: {history.past_surgical || "None"}
        </Text>
      </Section>

      {/* Family / Gynae History */}
      <Section title="Family / Gynae History">
        <Text style={styles.text}>
          {history.family_gyn_additional_notes || history.family_history || "Not significant"}
        </Text>
        <Text style={styles.text}>LMP: {history.lmp || "N/A"}</Text>
      </Section>

      {/* Primary Assessment (ABCDE) */}
      <Section title="Primary Assessment">
        <Text style={styles.text}>{buildPrimaryAssessmentText(primaryAssessment)}</Text>
      </Section>

      {/* Secondary Assessment / Examination */}
      <Section title="Systemic Examination">
        <Text style={styles.text}>{buildExaminationText(examination, isPediatric)}</Text>
      </Section>

      {/* Course in Hospital */}
      <Section title="Course in Hospital">
        <Text style={styles.text}>
          {treatment.course_in_hospital || treatment.intervention_notes || "N/A"}
        </Text>
      </Section>

      {/* Investigations */}
      <Section title="Investigations">
        <Text style={styles.text}>
          {investigations.results_notes ||
            (investigations.panels_selected?.length > 0
              ? `Ordered: ${investigations.panels_selected.join(", ")}`
              : "Pending")}
        </Text>
      </Section>

      {/* Diagnosis */}
      <Section title="Diagnosis at Discharge">
        <Text style={styles.text}>
          {treatment.differential_diagnoses?.join(", ") ||
            treatment.provisional_diagnoses?.join(", ") ||
            "N/A"}
        </Text>
      </Section>

      {/* ========== EDITABLE SECTIONS ========== */}

      {/* Discharge Medications */}
      <Section title="Discharge Medications *">
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="List all discharge medications with dosages and duration..."
          value={dischargeData.discharge_medications}
          onChangeText={(text) =>
            setDischargeData({ ...dischargeData, discharge_medications: text })
          }
        />
      </Section>

      {/* Disposition Type */}
      <Section title="Disposition *">
        <View style={styles.radioGroup}>
          {[
            "Normal Discharge",
            "Discharge at Request",
            "Discharge Against Medical Advice",
            "Referred",
          ].map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.radioOption}
              onPress={() =>
                setDischargeData({ ...dischargeData, disposition_type: type })
              }
            >
              <View
                style={[
                  styles.radio,
                  dischargeData.disposition_type === type && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioLabel}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Condition at Discharge */}
      <Section title="Condition at Discharge *">
        <View style={styles.radioGroup}>
          {["STABLE", "UNSTABLE"].map((cond) => (
            <TouchableOpacity
              key={cond}
              style={styles.radioOption}
              onPress={() =>
                setDischargeData({ ...dischargeData, condition_at_discharge: cond })
              }
            >
              <View
                style={[
                  styles.radio,
                  dischargeData.condition_at_discharge === cond && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioLabel}>{cond}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Vitals at Discharge */}
      <Section title="Vitals at Discharge *">
        <View style={styles.vitalsGrid}>
          {["hr", "bp", "rr", "spo2", "gcs", "pain_score", "grbs", "temp"].map(
            (vital) => (
              <View key={vital} style={styles.vitalInput}>
                <Text style={styles.vitalLabel}>{vital.toUpperCase().replace("_", " ")}</Text>
                <TextInput
                  style={styles.vitalField}
                  placeholder="-"
                  keyboardType="numeric"
                  value={dischargeData.discharge_vitals[vital]}
                  onChangeText={(text) =>
                    setDischargeData({
                      ...dischargeData,
                      discharge_vitals: {
                        ...dischargeData.discharge_vitals,
                        [vital]: text,
                      },
                    })
                  }
                />
              </View>
            )
          )}
        </View>
      </Section>

      {/* Follow-Up Advice */}
      <Section title="Follow-Up Advice *">
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          placeholder="Follow-up instructions, red flags to watch for, when to return to ER..."
          value={dischargeData.follow_up_advice}
          onChangeText={(text) =>
            setDischargeData({ ...dischargeData, follow_up_advice: text })
          }
        />
      </Section>

      {/* Signatures */}
      <Section title="Signatures">
        <Text style={styles.label}>ED Resident *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={dischargeData.ed_resident}
          onChangeText={(text) =>
            setDischargeData({ ...dischargeData, ed_resident: text })
          }
        />
        <Text style={[styles.label, { marginTop: 12 }]}>ED Consultant *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={dischargeData.ed_consultant}
          onChangeText={(text) =>
            setDischargeData({ ...dischargeData, ed_consultant: text })
          }
        />
      </Section>

      {/* General Instructions */}
      <Section title="General Instructions">
        <Text style={styles.instructionsText}>
          This discharge summary provides clinical information to facilitate
          continuity of patient care.
        </Text>
        <Text style={styles.instructionsText}>
          • Keep all medications as prescribed{"\n"}
          • Return to emergency department if symptoms worsen{"\n"}
          • Follow up with your doctor as advised
        </Text>
        <Text style={[styles.instructionsText, { fontWeight: "600", textAlign: "center" }]}>
          In case of emergency, contact your nearest hospital emergency department.
        </Text>
      </Section>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={generatePDF}
        >
          <Text style={styles.btnOutlineText}>Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnPrimaryText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spacing at bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ========== Helper Components ========== */

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/* ========== Helper Functions ========== */

function buildPrimaryAssessmentText(primary) {
  let text = "";
  text += `Airway: ${primary.airway_status || "Patent"}`;
  if (primary.airway_interventions?.length > 0) {
    text += ` (Intervention: ${primary.airway_interventions.join(", ")})`;
  }
  text += `\nBreathing: RR - ${primary.breathing_rr || "-"}, SpO2 - ${primary.breathing_spo2 || "-"}%, WOB - ${primary.breathing_work || "Normal"}`;
  text += `\nCirculation: HR - ${primary.circulation_hr || "-"}, BP - ${primary.circulation_bp_systolic || "-"}/${primary.circulation_bp_diastolic || "-"}, CRT - ${primary.circulation_crt || "-"}s`;
  text += `\nDisability: ${primary.disability_avpu || "Alert"}, Pupils - ${primary.disability_pupils_size || "Normal"} ${primary.disability_pupils_reaction || ""}`;
  text += `\nExposure: Temp - ${primary.exposure_temperature || "-"}°C`;
  return text;
}

function buildExaminationText(exam, isPediatric) {
  let text = "";

  // General examination
  const general = [];
  if (exam.general_pallor) general.push("Pallor");
  if (exam.general_icterus) general.push("Icterus");
  if (exam.general_clubbing) general.push("Clubbing");
  if (exam.general_lymphadenopathy) general.push("Lymphadenopathy");
  if (general.length > 0) {
    text += `General: ${general.join(", ")}\n`;
  } else {
    text += "General: No abnormality detected\n";
  }

  text += `CVS: ${exam.cvs_status || "Normal"}`;
  if (exam.cvs_status === "Abnormal" && exam.cvs_additional_notes) {
    text += ` - ${exam.cvs_additional_notes}`;
  }

  text += `\nRespiratory: ${exam.respiratory_status || "Normal"}`;
  if (exam.respiratory_status === "Abnormal" && exam.respiratory_additional_notes) {
    text += ` - ${exam.respiratory_additional_notes}`;
  }

  text += `\nAbdomen: ${exam.abdomen_status || "Normal"}`;
  if (exam.abdomen_status === "Abnormal" && exam.abdomen_additional_notes) {
    text += ` - ${exam.abdomen_additional_notes}`;
  }

  if (!isPediatric) {
    text += `\nCNS: ${exam.cns_status || "Normal"}`;
    if (exam.cns_status === "Abnormal" && exam.cns_additional_notes) {
      text += ` - ${exam.cns_additional_notes}`;
    }
  }

  text += `\nExtremities: ${exam.extremities_status || "Normal"}`;
  if (exam.extremities_status === "Abnormal" && exam.extremities_findings) {
    text += ` - ${exam.extremities_findings}`;
  }

  return text;
}

function buildPrintableHTML(caseData, dischargeData) {
  const patient = caseData.patient || {};
  const vitalsAtArrival = caseData.vitals_at_arrival || {};
  const history = caseData.history || {};
  const treatment = caseData.treatment || {};
  const investigations = caseData.investigations || {};
  const primaryAssessment = caseData.primary_assessment || {};
  const examination = caseData.examination || {};
  const isPediatric = caseData.case_type === "pediatric";

  const gcsTotal =
    (vitalsAtArrival.gcs_e || 0) +
    (vitalsAtArrival.gcs_v || 0) +
    (vitalsAtArrival.gcs_m || 0);

  const dischargeVitals = dischargeData.discharge_vitals;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Discharge Summary</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
        .section { margin-bottom: 15px; }
        .section-title { font-weight: bold; font-size: 13px; margin-bottom: 5px; border-bottom: 1px solid #ccc; }
        .row { display: flex; margin-bottom: 3px; }
        .row-label { font-weight: bold; width: 150px; }
        .row-value { flex: 1; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        .vitals-line { margin-bottom: 5px; }
        .footer { margin-top: 30px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .signature-box { text-align: center; width: 45%; }
        .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
      </style>
    </head>
    <body>
      <h1>DISCHARGE SUMMARY</h1>

      <div class="section">
        <div class="grid">
          <div class="row"><span class="row-label">UHID:</span><span class="row-value">${patient.uhid || "N/A"}</span></div>
          <div class="row"><span class="row-label">Name:</span><span class="row-value">${patient.name || "N/A"}</span></div>
          <div class="row"><span class="row-label">Age/Sex:</span><span class="row-value">${patient.age || "N/A"} / ${patient.sex || "N/A"}</span></div>
          <div class="row"><span class="row-label">Admission Date:</span><span class="row-value">${patient.arrival_datetime ? new Date(patient.arrival_datetime).toLocaleDateString("en-IN") : "N/A"}</span></div>
          <div class="row"><span class="row-label">MLC:</span><span class="row-value">${patient.mlc ? "Yes" : "No"}</span></div>
          <div class="row"><span class="row-label">Allergy:</span><span class="row-value">${history.allergies?.length > 0 ? history.allergies.join(", ") : "NKDA"}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Vitals at Arrival</div>
        <div class="vitals-line">
          HR: ${vitalsAtArrival.hr || "-"}, BP: ${vitalsAtArrival.bp_systolic || "-"}/${vitalsAtArrival.bp_diastolic || "-"}, 
          RR: ${vitalsAtArrival.rr || "-"}, SpO2: ${vitalsAtArrival.spo2 || "-"}%, GCS: ${gcsTotal || "-"}, 
          Pain: ${vitalsAtArrival.pain_score || "-"}, GRBS: ${vitalsAtArrival.grbs || "-"}, Temp: ${vitalsAtArrival.temperature || "-"}°C
        </div>
      </div>

      <div class="section">
        <div class="section-title">Presenting Complaints</div>
        <p>${caseData.presenting_complaint?.text || "N/A"}</p>
      </div>

      <div class="section">
        <div class="section-title">History of Present Illness</div>
        <p>${history.hpi || "N/A"}</p>
      </div>

      <div class="section">
        <div class="section-title">Past Medical/Surgical History</div>
        <p>Medical: ${history.past_medical?.join(", ") || "None"}</p>
        <p>Surgical: ${history.past_surgical || "None"}</p>
      </div>

      <div class="section">
        <div class="section-title">Primary Assessment</div>
        <p>${buildPrimaryAssessmentText(primaryAssessment).replace(/\n/g, "<br>")}</p>
      </div>

      <div class="section">
        <div class="section-title">Systemic Examination</div>
        <p>${buildExaminationText(examination, isPediatric).replace(/\n/g, "<br>")}</p>
      </div>

      <div class="section">
        <div class="section-title">Course in Hospital</div>
        <p>${treatment.course_in_hospital || treatment.intervention_notes || "N/A"}</p>
      </div>

      <div class="section">
        <div class="section-title">Investigations</div>
        <p>${investigations.results_notes || (investigations.panels_selected?.length > 0 ? `Ordered: ${investigations.panels_selected.join(", ")}` : "Pending")}</p>
      </div>

      <div class="section">
        <div class="section-title">Diagnosis at Discharge</div>
        <p>${treatment.differential_diagnoses?.join(", ") || treatment.provisional_diagnoses?.join(", ") || "N/A"}</p>
      </div>

      <div class="section">
        <div class="section-title">Discharge Medications</div>
        <p>${dischargeData.discharge_medications || "N/A"}</p>
      </div>

      <div class="section">
        <div class="section-title">Disposition</div>
        <p>${dischargeData.disposition_type}</p>
      </div>

      <div class="section">
        <div class="section-title">Condition at Discharge</div>
        <p><strong>${dischargeData.condition_at_discharge}</strong></p>
      </div>

      <div class="section">
        <div class="section-title">Vitals at Discharge</div>
        <div class="vitals-line">
          HR: ${dischargeVitals.hr || "-"}, BP: ${dischargeVitals.bp || "-"}, RR: ${dischargeVitals.rr || "-"}, 
          SpO2: ${dischargeVitals.spo2 || "-"}, GCS: ${dischargeVitals.gcs || "-"}, 
          Pain: ${dischargeVitals.pain_score || "-"}, GRBS: ${dischargeVitals.grbs || "-"}, Temp: ${dischargeVitals.temp || "-"}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Follow-Up Advice</div>
        <p>${dischargeData.follow_up_advice || "N/A"}</p>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line">
            <strong>ED Resident:</strong> ${dischargeData.ed_resident || "_______________"}
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            <strong>ED Consultant:</strong> ${dischargeData.ed_consultant || "_______________"}
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>General Instructions:</strong></p>
        <p>This discharge summary provides clinical information to facilitate continuity of patient care.</p>
        <ul>
          <li>Keep all medications as prescribed</li>
          <li>Return to emergency department if symptoms worsen</li>
          <li>Follow up with your doctor as advised</li>
        </ul>
        <p style="text-align: center; margin-top: 15px;">
          <strong>In case of emergency, contact your nearest hospital emergency department.</strong>
        </p>
        <p style="text-align: center; margin-top: 10px; font-size: 10px;">
          Generated on: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </p>
      </div>
    </body>
    </html>
  `;
}

/* ========== Styles ========== */

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
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  rowLabel: {
    width: 110,
    fontWeight: "600",
    color: "#475569",
    fontSize: 13,
  },
  rowValue: {
    flex: 1,
    color: "#1e293b",
    fontSize: 13,
  },
  text: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },
  vitalsText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#1e293b",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#1e293b",
    textAlignVertical: "top",
    minHeight: 80,
  },
  radioGroup: {
    marginTop: 4,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94a3b8",
    marginRight: 10,
  },
  radioSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
  },
  radioLabel: {
    fontSize: 14,
    color: "#334155",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vitalInput: {
    width: "23%",
    minWidth: 70,
  },
  vitalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  vitalField: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  instructionsText: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#007AFF",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  btnOutlineText: {
    color: "#007AFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
