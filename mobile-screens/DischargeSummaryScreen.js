// FIXED DischargeSummaryScreen.js - useRef for text inputs to prevent lag
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
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
  const [editMode, setEditMode] = useState(false); // NEW: Edit mode toggle

  // useRef for text inputs to prevent lag
  const dischargeDataRef = useRef({
    discharge_medications: "",
    follow_up_advice: "",
    ed_resident: "",
    ed_consultant: "",
    discharge_vitals: { hr: "", bp: "", rr: "", spo2: "", gcs: "", pain_score: "", grbs: "", temp: "" },
  });

  // Editable auto-populated fields
  const editableFieldsRef = useRef({
    presenting_complaint: "",
    hopi: "",
    past_medical: "",
    past_surgical: "",
    primary_assessment: "",
    examination: "",
    course_in_hospital: "",
    investigations: "",
    diagnosis: "",
  });

  // useState only for radio buttons that need visual feedback
  const [radioStates, setRadioStates] = useState({
    disposition_type: "Normal Discharge",
    condition_at_discharge: "STABLE",
  });

  // Force re-render after data load
  const [dataLoaded, setDataLoaded] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    loadCaseData();
  }, []);

  const loadCaseData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch case data");
      }

      const data = await res.json();
      setCaseData(data);

      // Pre-fill ref values from case data
      dischargeDataRef.current = {
        ...dischargeDataRef.current,
        ed_resident: data.em_resident || "",
        ed_consultant: data.em_consultant || "",
        discharge_medications: data.treatment?.medications || "",
        follow_up_advice: data.disposition?.advice || "",
      };

      // Pre-fill editable auto-populated fields
      const history = data.history || {};
      const treatment = data.treatment || {};
      const investigations = data.investigations || {};
      const primaryAssessment = data.primary_assessment || {};
      const examination = data.examination || {};
      const isPediatric = data.case_type === "pediatric";

      editableFieldsRef.current = {
        presenting_complaint: data.presenting_complaint?.text || "",
        hopi: history.hpi || history.events_hopi || "",
        past_medical: history.past_medical?.join(", ") || "None",
        past_surgical: history.past_surgical || "None",
        primary_assessment: buildPrimaryAssessmentText(primaryAssessment),
        examination: buildExaminationText(examination, isPediatric),
        course_in_hospital: treatment.course_in_hospital || treatment.intervention_notes || generateCourseInER(data),
        investigations: investigations.results_notes || 
          (investigations.panels_selected?.length > 0 ? `Ordered: ${investigations.panels_selected.join(", ")}` : "Pending"),
        diagnosis: treatment.differential_diagnoses?.join(", ") || treatment.provisional_diagnoses?.join(", ") || "",
      };

      // Update radio states
      setRadioStates({
        disposition_type: mapDispositionType(data.disposition?.type),
        condition_at_discharge: data.disposition?.condition_at_discharge || "STABLE",
      });

      setDataLoaded(true);
      setRenderKey(prev => prev + 1); // Force re-render to show loaded data
    } catch (err) {
      console.log("DISCHARGE ERROR:", err);
      // Properly format error message
      let errorMsg = "Unable to load case data";
      if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      Alert.alert("Error", errorMsg);
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

  const updateTextField = useCallback((field, value) => {
    dischargeDataRef.current[field] = value;
  }, []);

  const updateEditableField = useCallback((field, value) => {
    editableFieldsRef.current[field] = value;
  }, []);

  const updateVitalField = useCallback((vital, value) => {
    dischargeDataRef.current.discharge_vitals[vital] = value;
  }, []);

  const updateRadioState = useCallback((field, value) => {
    setRadioStates(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      // Build payload matching backend schema
      const payload = {
        disposition: {
          type: mapDispositionTypeToBackend(radioStates.disposition_type),
          destination: dischargeDataRef.current.discharge_ward || "",
          advice: dischargeDataRef.current.follow_up_advice || "",
          condition_at_discharge: radioStates.condition_at_discharge.toLowerCase(),
          discharge_vitals: {
            hr: parseFloatOrNull(dischargeDataRef.current.discharge_vitals.hr),
            bp: dischargeDataRef.current.discharge_vitals.bp || "",
            rr: parseFloatOrNull(dischargeDataRef.current.discharge_vitals.rr),
            spo2: parseFloatOrNull(dischargeDataRef.current.discharge_vitals.spo2),
            gcs: dischargeDataRef.current.discharge_vitals.gcs || "",
            pain_score: parseIntOrNull(dischargeDataRef.current.discharge_vitals.pain_score),
            grbs: parseFloatOrNull(dischargeDataRef.current.discharge_vitals.grbs),
            temperature: parseFloatOrNull(dischargeDataRef.current.discharge_vitals.temp),
          },
        },
        treatment: {
          ...caseData?.treatment,
          medications: dischargeDataRef.current.discharge_medications,
        },
        em_resident: dischargeDataRef.current.ed_resident,
        em_consultant: dischargeDataRef.current.ed_consultant,
        status: radioStates.disposition_type === "Normal Discharge" ? "discharged" : "completed",
      };

      // Use the correct endpoint: PUT /cases/{caseId}
      const res = await fetch(`${API_URL}/cases/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Success", "Discharge summary saved");
      } else {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.detail || errData.message || "Failed to save discharge summary";
        Alert.alert("Error", errorMsg);
      }
    } catch (err) {
      console.log("SAVE ERROR:", err);
      // Properly format error message
      let errorMsg = "Unable to save discharge summary";
      if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      Alert.alert("Error", errorMsg);
    }
    setSaving(false);
  };

  // Helper functions
  function parseFloatOrNull(val) {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  
  function parseIntOrNull(val) {
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }
  
  function mapDispositionTypeToBackend(type) {
    const map = {
      "Normal Discharge": "discharged",
      "Admitted ICU": "admitted-icu",
      "Admitted HDU": "admitted-hdu",
      "Admitted Ward": "admitted-ward",
      "Referred": "referred",
      "DAMA/LAMA": "dama",
      "Death": "death",
    };
    return map[type] || "discharged";
  }

  // Generate comprehensive Course in ER summary automatically
  // Template: "The patient presented to the Emergency Department with the above complaints. 
  // Initial triage and assessment were performed. Necessary investigations were initiated, 
  // and appropriate treatment was given. The patient was monitored in the ER, showed clinical 
  // improvement, and remained stable throughout the stay."
  const generateCourseInER = (data) => {
    if (!data) return "The patient presented to the Emergency Department with the above complaints. Initial triage and assessment were performed. Necessary investigations were initiated, and appropriate treatment was given. The patient was monitored in the ER, showed clinical improvement, and remained stable throughout the stay.";
    
    const { treatment, disposition, er_observation, investigations } = data;
    const parts = [];

    // 1. Opening - Chief complaint
    if (data.presenting_complaint?.text) {
      parts.push(`The patient presented to the Emergency Department with ${data.presenting_complaint.text}.`);
    } else {
      parts.push("The patient presented to the Emergency Department with the above complaints.");
    }

    // 2. Triage and Assessment
    parts.push("Initial triage and assessment were performed.");

    // 3. Investigations
    const inv = investigations;
    if (inv?.panels_selected?.length || inv?.imaging?.length) {
      const invList = [...(inv.panels_selected || []), ...(inv.imaging || [])].join(', ');
      parts.push(`Necessary investigations (${invList}) were initiated.`);
    } else {
      parts.push("Necessary investigations were initiated.");
    }

    // 4. Treatment
    if (treatment?.intervention_notes) {
      parts.push(`Appropriate treatment was given: ${treatment.intervention_notes}.`);
    } else {
      parts.push("Appropriate treatment was given.");
    }

    // 5. Drugs administered
    const drugs = data.drugs_administered || [];
    if (drugs.length) {
      const drugList = drugs.map(d => `${d.name} ${d.dose}`).join(', ');
      parts.push(`Medications administered: ${drugList}.`);
    }

    // 6. Procedures
    const procs = data.procedures_performed || [];
    if (procs.length) {
      const procList = procs.map(p => p.name).join(', ');
      parts.push(`Procedures performed: ${procList}.`);
    }

    // 7. ER observation
    if (er_observation?.duration) {
      parts.push(`The patient was monitored in the ER for ${er_observation.duration}.`);
    } else {
      parts.push("The patient was monitored in the ER.");
    }

    // 8. Outcome based on disposition
    const dispositionOutcome = {
      "discharged": "Patient showed clinical improvement and remained stable throughout the stay.",
      "admitted-icu": "Patient required ICU admission for further monitoring and management.",
      "admitted-hdu": "Patient required HDU admission for close monitoring.",
      "admitted-ward": "Patient was stabilized and admitted to ward for further care.",
      "referred": "Patient was stabilized and referred to a higher center for specialized care.",
      "dama": "Patient opted to leave against medical advice after being counseled about risks.",
      "death": "Despite resuscitative efforts, the patient could not be revived."
    };
    
    if (disposition?.type && dispositionOutcome[disposition.type]) {
      parts.push(dispositionOutcome[disposition.type]);
    } else {
      parts.push("Patient showed clinical improvement and remained stable throughout the stay.");
    }

    // 9. Diagnosis (if available)
    if (treatment?.provisional_diagnoses?.length) {
      parts.push(`Final diagnosis: ${treatment.provisional_diagnoses.join(', ')}.`);
    }

    return parts.join(' ');
  };

  const generatePDF = async () => {
    if (!caseData) return;

    try {
      // Check export access first
      const token = await AsyncStorage.getItem("token");
      const accessRes = await fetch(`${API_URL}/export/check-access?export_type=pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const access = await accessRes.json();
      
      if (!access.allowed) {
        Alert.alert(
          "Export Limit Reached",
          access.message || "Please upgrade to continue exporting.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade", onPress: () => navigation.navigate("Upgrade") }
          ]
        );
        return;
      }

      const html = buildPrintableHTML(caseData, {
        ...dischargeDataRef.current,
        disposition_type: radioStates.disposition_type,
        condition_at_discharge: radioStates.condition_at_discharge,
      }, access.watermark);

      const { uri } = await Print.printToFileAsync({ html });

      // Log export on backend
      await fetch(`${API_URL}/export/discharge-summary/${caseId}?export_type=pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("PDF Generated", "Discharge summary ready!", [
          { text: "Share", onPress: () => Sharing.shareAsync(uri) },
          { text: "OK" },
        ]);
      }
    } catch (err) {
      console.log("PDF ERROR:", err);
      Alert.alert("Error", "Unable to generate PDF");
    }
  };

  const generateWord = async () => {
    if (!caseData) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const accessRes = await fetch(`${API_URL}/export/check-access?export_type=word`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const access = await accessRes.json();
      
      if (!access.allowed) {
        Alert.alert(
          "🔒 Premium Feature",
          "Word export is available with:\n\n• Hospital Premium Plan\n• Or purchase at ₹25/document\n\nWould you like to upgrade?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Buy Credits", onPress: () => navigation.navigate("Upgrade", { tab: "credits" }) },
            { text: "View Plans", onPress: () => navigation.navigate("Upgrade") }
          ]
        );
        return;
      }

      // For now, generate HTML that can be opened in Word
      const html = buildPrintableHTML(caseData, {
        ...dischargeDataRef.current,
        disposition_type: radioStates.disposition_type,
        condition_at_discharge: radioStates.condition_at_discharge,
      }, false);

      const { uri } = await Print.printToFileAsync({ 
        html,
        // Word-compatible format hint
      });

      // Log export on backend
      await fetch(`${API_URL}/export/discharge-summary/${caseId}?export_type=word`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Word Export", "Document ready for sharing!", [
        { text: "Share", onPress: () => Sharing.shareAsync(uri) },
        { text: "OK" },
      ]);
    } catch (err) {
      console.log("WORD ERROR:", err);
      Alert.alert("Error", "Unable to generate Word document");
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
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={3}
            defaultValue={editableFieldsRef.current.presenting_complaint}
            onChangeText={(text) => updateEditableField("presenting_complaint", text)}
            placeholder="Presenting complaints..."
          />
        ) : (
          <Text style={styles.text}>
            {editableFieldsRef.current.presenting_complaint || caseData.presenting_complaint?.text || "N/A"}
          </Text>
        )}
      </Section>

      {/* History of Present Illness / Events */}
      <Section title="Events / HOPI">
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={4}
            defaultValue={editableFieldsRef.current.hopi}
            onChangeText={(text) => updateEditableField("hopi", text)}
            placeholder="History of present illness..."
          />
        ) : (
          <Text style={styles.text}>{editableFieldsRef.current.hopi || history.hpi || history.events_hopi || "N/A"}</Text>
        )}
      </Section>

      {/* Past Medical/Surgical History */}
      <Section title="Past Medical/Surgical History">
        {editMode ? (
          <>
            <Text style={styles.editLabel}>Medical:</Text>
            <TextInput
              style={styles.editableInput}
              defaultValue={editableFieldsRef.current.past_medical}
              onChangeText={(text) => updateEditableField("past_medical", text)}
              placeholder="Past medical history..."
            />
            <Text style={styles.editLabel}>Surgical:</Text>
            <TextInput
              style={styles.editableInput}
              defaultValue={editableFieldsRef.current.past_surgical}
              onChangeText={(text) => updateEditableField("past_surgical", text)}
              placeholder="Past surgical history..."
            />
          </>
        ) : (
          <>
            <Text style={styles.text}>
              Medical: {editableFieldsRef.current.past_medical || history.past_medical?.join(", ") || "None"}
            </Text>
            <Text style={styles.text}>
              Surgical: {editableFieldsRef.current.past_surgical || history.past_surgical || "None"}
            </Text>
          </>
        )}
      </Section>

      {/* Primary Assessment */}
      <Section title="Primary Assessment">
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={4}
            defaultValue={editableFieldsRef.current.primary_assessment}
            onChangeText={(text) => updateEditableField("primary_assessment", text)}
            placeholder="Primary assessment findings..."
          />
        ) : (
          <Text style={styles.text}>{editableFieldsRef.current.primary_assessment || buildPrimaryAssessmentText(primaryAssessment)}</Text>
        )}
      </Section>

      {/* Systemic Examination */}
      <Section title="Systemic Examination">
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={4}
            defaultValue={editableFieldsRef.current.examination}
            onChangeText={(text) => updateEditableField("examination", text)}
            placeholder="Examination findings..."
          />
        ) : (
          <Text style={styles.text}>{editableFieldsRef.current.examination || buildExaminationText(examination, isPediatric)}</Text>
        )}
      </Section>

      {/* Course in Hospital */}
      <Section title="Course in Hospital">
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={4}
            defaultValue={editableFieldsRef.current.course_in_hospital}
            onChangeText={(text) => updateEditableField("course_in_hospital", text)}
            placeholder="Course in hospital..."
          />
        ) : (
          <Text style={styles.text}>
            {editableFieldsRef.current.course_in_hospital || treatment.course_in_hospital || treatment.intervention_notes || "N/A"}
          </Text>
        )}
      </Section>

      {/* Investigations */}
      <Section title="Investigations">
        {editMode ? (
          <TextInput
            style={styles.editableTextArea}
            multiline
            numberOfLines={3}
            defaultValue={editableFieldsRef.current.investigations}
            onChangeText={(text) => updateEditableField("investigations", text)}
            placeholder="Investigation results..."
          />
        ) : (
          <Text style={styles.text}>
            {editableFieldsRef.current.investigations ||
              investigations.results_notes ||
              (investigations.panels_selected?.length > 0
                ? `Ordered: ${investigations.panels_selected.join(", ")}`
                : "Pending")}
          </Text>
        )}
      </Section>

      {/* Diagnosis */}
      <Section title="Diagnosis at Discharge">
        {editMode ? (
          <TextInput
            style={styles.editableInput}
            defaultValue={editableFieldsRef.current.diagnosis}
            onChangeText={(text) => updateEditableField("diagnosis", text)}
            placeholder="Final diagnosis..."
          />
        ) : (
          <Text style={styles.text}>
            {editableFieldsRef.current.diagnosis ||
              treatment.differential_diagnoses?.join(", ") ||
              treatment.provisional_diagnoses?.join(", ") ||
              "N/A"}
          </Text>
        )}
      </Section>

      {/* ========== EDITABLE SECTIONS ========== */}

      {/* Discharge Medications */}
      <Section title="Discharge Medications *">
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="List all discharge medications with dosages and duration..."
          defaultValue={dischargeDataRef.current.discharge_medications}
          onChangeText={(text) => updateTextField("discharge_medications", text)}
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
              onPress={() => updateRadioState("disposition_type", type)}
            >
              <View
                style={[
                  styles.radio,
                  radioStates.disposition_type === type && styles.radioSelected,
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
              onPress={() => updateRadioState("condition_at_discharge", cond)}
            >
              <View
                style={[
                  styles.radio,
                  radioStates.condition_at_discharge === cond && styles.radioSelected,
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
                  defaultValue={dischargeDataRef.current.discharge_vitals[vital]}
                  onChangeText={(text) => updateVitalField(vital, text)}
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
          defaultValue={dischargeDataRef.current.follow_up_advice}
          onChangeText={(text) => updateTextField("follow_up_advice", text)}
        />
      </Section>

      {/* Signatures */}
      <Section title="Signatures">
        <Text style={styles.label}>ED Resident *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          defaultValue={dischargeDataRef.current.ed_resident}
          onChangeText={(text) => updateTextField("ed_resident", text)}
        />
        <Text style={[styles.label, { marginTop: 12 }]}>ED Consultant *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          defaultValue={dischargeDataRef.current.ed_consultant}
          onChangeText={(text) => updateTextField("ed_consultant", text)}
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
      <View style={styles.exportSection}>
        <Text style={styles.exportTitle}>📄 Export Options</Text>
        
        {/* PDF Export */}
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnPdf]}
          onPress={generatePDF}
        >
          <View style={styles.exportBtnContent}>
            <Text style={styles.exportBtnIcon}>📄</Text>
            <View style={styles.exportBtnInfo}>
              <Text style={styles.exportBtnTitle}>Export PDF</Text>
              <Text style={styles.exportBtnSubtitle}>Standard medical format</Text>
            </View>
          </View>
          <Text style={styles.exportBtnBadge}>FREE</Text>
        </TouchableOpacity>
        
        {/* Word Export (Premium) */}
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnWord]}
          onPress={generateWord}
        >
          <View style={styles.exportBtnContent}>
            <Text style={styles.exportBtnIcon}>📝</Text>
            <View style={styles.exportBtnInfo}>
              <Text style={styles.exportBtnTitle}>Export Word</Text>
              <Text style={styles.exportBtnSubtitle}>Editable document</Text>
            </View>
          </View>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeIcon}>🔒</Text>
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.exportNote}>
          Word export available with Hospital Premium or ₹25/document
        </Text>
      </View>
      
      {/* Edit Mode Toggle - At Bottom */}
      <View style={styles.editSection}>
        <TouchableOpacity 
          style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
          onPress={() => setEditMode(!editMode)}
        >
          <Text style={[styles.editToggleBtnText, editMode && styles.editToggleBtnTextActive]}>
            {editMode ? "✓ Done Editing" : "✏️ Edit Discharge Summary"}
          </Text>
        </TouchableOpacity>
        {editMode && (
          <Text style={styles.editHint}>
            Yellow fields are editable. Tap "Done Editing" when finished.
          </Text>
        )}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnPrimaryText}>
            {saving ? "Saving..." : "💾 Save"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.btn, styles.btnFinish]}
          onPress={async () => {
            await handleSave();
            navigation.navigate("Dashboard");
          }}
          disabled={saving}
        >
          <Text style={styles.btnPrimaryText}>
            ✅ Finish & Dashboard
          </Text>
        </TouchableOpacity>
      </View>

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

function buildPrintableHTML(caseData, dischargeData, showWatermark = false) {
  const patient = caseData.patient || {};
  const vitalsAtArrival = caseData.vitals_at_arrival || {};
  const history = caseData.history || {};
  const treatment = caseData.treatment || {};
  const investigations = caseData.investigations || {};
  const primaryAssessment = caseData.primary_assessment || {};
  const examination = caseData.examination || {};
  const drugs = caseData.drugs_administered || [];
  const procedures = caseData.procedures_performed || [];
  const isPediatric = caseData.case_type === "pediatric";
  const erObservation = caseData.er_observation || {};
  
  const watermarkCSS = showWatermark ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 48px;
      color: rgba(0, 0, 0, 0.08);
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
    }
    .watermark-footer {
      text-align: center;
      font-size: 10px;
      color: #666;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
    }
  ` : '';
  
  const watermarkHTML = showWatermark ? `
    <div class="watermark">Generated using ERmate</div>
  ` : '';
  
  const watermarkFooter = showWatermark ? `
    <div class="watermark-footer">
      Generated using ERmate - AI Assisted ER Documentation | www.ermate.app
    </div>
  ` : '';

  const gcsTotal =
    (vitalsAtArrival.gcs_e || 0) +
    (vitalsAtArrival.gcs_v || 0) +
    (vitalsAtArrival.gcs_m || 0);

  const dischargeVitals = dischargeData.discharge_vitals || {};
  
  // Build Primary Assessment Text
  const buildPrimaryText = () => {
    let text = "";
    text += `Airway: ${primaryAssessment.airway_status || "Patent"}`;
    if (primaryAssessment.airway_interventions?.length > 0) {
      text += ` (${primaryAssessment.airway_interventions.join(", ")})`;
    }
    if (primaryAssessment.airway_additional_notes) {
      text += ` - ${primaryAssessment.airway_additional_notes}`;
    }
    text += `<br/>Breathing: RR - ${primaryAssessment.breathing_rr || vitalsAtArrival.rr || "-"}/min, SpO2 - ${primaryAssessment.breathing_spo2 || vitalsAtArrival.spo2 || "-"}%, WOB - ${primaryAssessment.breathing_work || "Normal"}`;
    if (primaryAssessment.breathing_additional_notes) {
      text += ` - ${primaryAssessment.breathing_additional_notes}`;
    }
    text += `<br/>Circulation: HR - ${primaryAssessment.circulation_hr || vitalsAtArrival.hr || "-"}/min, BP - ${primaryAssessment.circulation_bp_systolic || vitalsAtArrival.bp_systolic || "-"}/${primaryAssessment.circulation_bp_diastolic || vitalsAtArrival.bp_diastolic || "-"} mmHg, CRT - ${primaryAssessment.circulation_crt || "-"}s`;
    if (primaryAssessment.circulation_additional_notes) {
      text += ` - ${primaryAssessment.circulation_additional_notes}`;
    }
    text += `<br/>Disability: ${primaryAssessment.disability_avpu || "Alert"}, GCS - E${primaryAssessment.disability_gcs_e || vitalsAtArrival.gcs_e || "-"}V${primaryAssessment.disability_gcs_v || vitalsAtArrival.gcs_v || "-"}M${primaryAssessment.disability_gcs_m || vitalsAtArrival.gcs_m || "-"}, Pupils - ${primaryAssessment.disability_pupils_size || "Normal"} ${primaryAssessment.disability_pupils_reaction || "Reactive"}, GRBS - ${primaryAssessment.disability_grbs || vitalsAtArrival.grbs || "-"} mg/dL`;
    if (primaryAssessment.disability_additional_notes) {
      text += ` - ${primaryAssessment.disability_additional_notes}`;
    }
    text += `<br/>Exposure: Temp - ${primaryAssessment.exposure_temperature || vitalsAtArrival.temperature || "-"}°C`;
    if (primaryAssessment.exposure_additional_notes) {
      text += ` - ${primaryAssessment.exposure_additional_notes}`;
    }
    return text;
  };
  
  // Build Examination Text
  const buildExamText = () => {
    let text = "";
    
    // General Examination
    const generalFindings = [];
    if (examination.general_pallor) generalFindings.push("Pallor +");
    if (examination.general_icterus) generalFindings.push("Icterus +");
    if (examination.general_clubbing) generalFindings.push("Clubbing +");
    if (examination.general_lymphadenopathy) generalFindings.push("Lymphadenopathy +");
    if (examination.general_varicose_veins) generalFindings.push("Varicose veins +");
    
    if (generalFindings.length > 0) {
      text += `<strong>General:</strong> ${generalFindings.join(", ")}`;
    } else {
      text += `<strong>General:</strong> No pallor, icterus, clubbing, lymphadenopathy`;
    }
    if (examination.general_additional_notes) {
      text += ` - ${examination.general_additional_notes}`;
    }
    
    // CVS
    text += `<br/><strong>CVS:</strong> ${examination.cvs_status || "Normal"}`;
    if (examination.cvs_status === "Abnormal") {
      const cvsDetails = [];
      if (examination.cvs_s1_s2) cvsDetails.push(`S1S2: ${examination.cvs_s1_s2}`);
      if (examination.cvs_pulse) cvsDetails.push(`Pulse: ${examination.cvs_pulse}`);
      if (examination.cvs_murmurs) cvsDetails.push(`Murmurs: ${examination.cvs_murmurs}`);
      if (cvsDetails.length > 0) text += ` - ${cvsDetails.join(", ")}`;
    }
    if (examination.cvs_additional_notes) {
      text += ` - ${examination.cvs_additional_notes}`;
    }
    
    // Respiratory
    text += `<br/><strong>Respiratory:</strong> ${examination.respiratory_status || "Normal"}`;
    if (examination.respiratory_status === "Abnormal") {
      const respDetails = [];
      if (examination.respiratory_breath_sounds) respDetails.push(`Breath sounds: ${examination.respiratory_breath_sounds}`);
      if (examination.respiratory_added_sounds) respDetails.push(`Added sounds: ${examination.respiratory_added_sounds}`);
      if (respDetails.length > 0) text += ` - ${respDetails.join(", ")}`;
    }
    if (examination.respiratory_additional_notes) {
      text += ` - ${examination.respiratory_additional_notes}`;
    }
    
    // Abdomen
    text += `<br/><strong>Abdomen:</strong> ${examination.abdomen_status || "Normal"}`;
    if (examination.abdomen_status === "Abnormal") {
      const abdDetails = [];
      if (examination.abdomen_organomegaly) abdDetails.push(`Organomegaly: ${examination.abdomen_organomegaly}`);
      if (examination.abdomen_bowel_sounds) abdDetails.push(`Bowel sounds: ${examination.abdomen_bowel_sounds}`);
      if (abdDetails.length > 0) text += ` - ${abdDetails.join(", ")}`;
    }
    if (examination.abdomen_additional_notes) {
      text += ` - ${examination.abdomen_additional_notes}`;
    }
    
    // CNS (only for adults)
    if (!isPediatric) {
      text += `<br/><strong>CNS:</strong> ${examination.cns_status || "Normal"}`;
      if (examination.cns_status === "Abnormal") {
        const cnsDetails = [];
        if (examination.cns_higher_mental) cnsDetails.push(`Higher mental: ${examination.cns_higher_mental}`);
        if (examination.cns_motor_system) cnsDetails.push(`Motor: ${examination.cns_motor_system}`);
        if (examination.cns_sensory_system) cnsDetails.push(`Sensory: ${examination.cns_sensory_system}`);
        if (cnsDetails.length > 0) text += ` - ${cnsDetails.join(", ")}`;
      }
      if (examination.cns_additional_notes) {
        text += ` - ${examination.cns_additional_notes}`;
      }
    }
    
    // Extremities
    text += `<br/><strong>Extremities:</strong> ${examination.extremities_status || "Normal"}`;
    if (examination.extremities_findings) {
      text += ` - ${examination.extremities_findings}`;
    }
    if (examination.extremities_additional_notes) {
      text += ` - ${examination.extremities_additional_notes}`;
    }
    
    return text;
  };
  
  // Build Drug List
  const buildDrugList = () => {
    if (drugs.length === 0) return "Nil";
    return drugs.map(d => `${d.name} ${d.dose || ""} ${d.time ? `@ ${d.time}` : ""}`).join("<br/>");
  };
  
  // Build Procedure List
  const buildProcedureList = () => {
    if (procedures.length === 0) return "Nil";
    return procedures.map(p => `${p.name}${p.notes ? ` - ${p.notes}` : ""}`).join("<br/>");
  };
  
  // Build Course in ER
  const buildCourseInER = () => {
    const parts = [];
    
    // Opening
    if (caseData.presenting_complaint?.text) {
      parts.push(`Patient presented to the Emergency Department with ${caseData.presenting_complaint.text}.`);
    } else {
      parts.push("Patient presented to the Emergency Department with the above complaints.");
    }
    
    // Triage
    if (caseData.triage_priority) {
      const priorityNames = { 1: "Priority I (Immediate)", 2: "Priority II (Very Urgent)", 3: "Priority III (Urgent)", 4: "Priority IV (Standard)", 5: "Priority V (Non-Urgent)" };
      parts.push(`Triage: ${priorityNames[caseData.triage_priority] || "Standard"}.`);
    }
    
    // Assessment
    parts.push("Initial assessment and primary survey were performed.");
    
    // Investigations
    if (investigations.panels_selected?.length > 0 || investigations.individual_tests?.length > 0) {
      const invList = [...(investigations.panels_selected || []), ...(investigations.individual_tests || [])].join(", ");
      parts.push(`Investigations ordered: ${invList}.`);
    }
    
    // Treatment
    if (treatment.intervention_notes) {
      parts.push(`Treatment: ${treatment.intervention_notes}.`);
    } else if (treatment.interventions?.length > 0) {
      parts.push(`Interventions: ${treatment.interventions.join(", ")}.`);
    }
    
    // Drugs
    if (drugs.length > 0) {
      const drugList = drugs.map(d => `${d.name} ${d.dose}`).join(", ");
      parts.push(`Medications administered: ${drugList}.`);
    }
    
    // Procedures
    if (procedures.length > 0) {
      const procList = procedures.map(p => p.name).join(", ");
      parts.push(`Procedures performed: ${procList}.`);
    }
    
    // Monitoring
    if (erObservation.duration) {
      parts.push(`Patient was monitored in ER for ${erObservation.duration}.`);
    } else {
      parts.push("Patient was monitored in the ER.");
    }
    
    // Outcome
    const disposition = caseData.disposition;
    if (disposition?.type) {
      const outcomes = {
        "discharged": "Patient showed clinical improvement and is being discharged in stable condition.",
        "admitted-icu": "Patient required ICU admission for further monitoring and management.",
        "admitted-hdu": "Patient required HDU admission for close monitoring.",
        "admitted-ward": "Patient was stabilized and admitted to ward for further care.",
        "referred": "Patient was stabilized and referred to higher center for specialized care.",
        "dama": "Patient opted to leave against medical advice after counseling about risks.",
        "death": "Despite resuscitative efforts, patient could not be revived. Death declared."
      };
      parts.push(outcomes[disposition.type] || "Patient condition stabilized.");
    } else {
      parts.push("Patient showed clinical improvement.");
    }
    
    return parts.join(" ");
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Discharge Summary - ${patient.name || "Patient"}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5; padding: 15px; position: relative; margin: 0; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header-info { text-align: center; font-size: 10px; color: #666; margin-bottom: 5px; }
        .section { margin-bottom: 10px; page-break-inside: avoid; }
        .section-title { font-weight: bold; font-size: 12px; margin-bottom: 4px; background: #f0f0f0; padding: 4px 8px; border-left: 3px solid #333; }
        .section-content { padding: 4px 8px; }
        .row { display: flex; margin-bottom: 2px; }
        .row-label { font-weight: bold; width: 140px; }
        .row-value { flex: 1; }
        .two-col { display: flex; gap: 20px; }
        .two-col > div { flex: 1; }
        .vitals-line { margin-bottom: 3px; }
        .vitals-box { background: #f8f8f8; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .footer { margin-top: 20px; font-size: 10px; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
        .signature-box { text-align: center; width: 45%; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
        .mlc-badge { background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; }
        .triage-badge { padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; color: white; }
        .instructions { background: #fff3cd; border: 1px solid #ffc107; padding: 8px; border-radius: 4px; margin-top: 10px; }
        .instructions-title { font-weight: bold; margin-bottom: 5px; }
        @media print { 
          body { padding: 10px; } 
          .section { page-break-inside: avoid; }
        }
        ${watermarkCSS}
      </style>
    </head>
    <body>
      ${watermarkHTML}
      
      <h1>DISCHARGE SUMMARY</h1>
      <div class="header-info">(Print on Hospital Letterhead)</div>

      <!-- Patient Information -->
      <div class="section">
        <div class="section-title">PATIENT INFORMATION</div>
        <div class="section-content">
          <div class="two-col">
            <div>
              <div class="row"><span class="row-label">UHID:</span><span class="row-value">${patient.uhid || "N/A"}</span></div>
              <div class="row"><span class="row-label">Name:</span><span class="row-value"><strong>${patient.name || "N/A"}</strong></span></div>
              <div class="row"><span class="row-label">Age / Sex:</span><span class="row-value">${patient.age || "N/A"} / ${patient.sex || "N/A"}</span></div>
              <div class="row"><span class="row-label">Phone:</span><span class="row-value">${patient.phone || "N/A"}</span></div>
            </div>
            <div>
              <div class="row"><span class="row-label">Admission Date:</span><span class="row-value">${patient.arrival_datetime ? new Date(patient.arrival_datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A"}</span></div>
              <div class="row"><span class="row-label">Mode of Arrival:</span><span class="row-value">${patient.mode_of_arrival || "N/A"}</span></div>
              <div class="row"><span class="row-label">Brought By:</span><span class="row-value">${patient.brought_by || "Self"}</span></div>
              <div class="row"><span class="row-label">MLC Case:</span><span class="row-value">${patient.mlc ? '<span class="mlc-badge">YES</span>' : "No"}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Allergy -->
      <div class="section">
        <div class="section-title">ALLERGY STATUS</div>
        <div class="section-content">
          <strong>${history.allergies?.length > 0 ? history.allergies.join(", ") : "No Known Drug Allergies (NKDA)"}</strong>
        </div>
      </div>

      <!-- Vitals at Arrival -->
      <div class="section">
        <div class="section-title">VITALS AT ARRIVAL</div>
        <div class="section-content vitals-box">
          <div class="vitals-line">
            <strong>HR:</strong> ${vitalsAtArrival.hr || "-"} bpm | 
            <strong>BP:</strong> ${vitalsAtArrival.bp_systolic || "-"}/${vitalsAtArrival.bp_diastolic || "-"} mmHg | 
            <strong>RR:</strong> ${vitalsAtArrival.rr || "-"}/min | 
            <strong>SpO2:</strong> ${vitalsAtArrival.spo2 || "-"}% | 
            <strong>Temp:</strong> ${vitalsAtArrival.temperature || "-"}°C
          </div>
          <div class="vitals-line">
            <strong>GCS:</strong> E${vitalsAtArrival.gcs_e || "-"} V${vitalsAtArrival.gcs_v || "-"} M${vitalsAtArrival.gcs_m || "-"} (Total: ${gcsTotal || "-"}/15) | 
            <strong>GRBS:</strong> ${vitalsAtArrival.grbs || "-"} mg/dL | 
            <strong>Pain Score:</strong> ${vitalsAtArrival.pain_score || "-"}/10
          </div>
        </div>
      </div>

      <!-- Presenting Complaints -->
      <div class="section">
        <div class="section-title">PRESENTING COMPLAINTS</div>
        <div class="section-content">
          ${caseData.presenting_complaint?.text || "N/A"}
          ${caseData.presenting_complaint?.duration ? `<br/><strong>Duration:</strong> ${caseData.presenting_complaint.duration}` : ""}
          ${caseData.presenting_complaint?.onset_type ? ` | <strong>Onset:</strong> ${caseData.presenting_complaint.onset_type}` : ""}
        </div>
      </div>

      <!-- History of Present Illness -->
      <div class="section">
        <div class="section-title">HISTORY OF PRESENT ILLNESS (HOPI)</div>
        <div class="section-content">
          ${history.hpi || history.events_hopi || history.hpi_additional_notes || "Not documented"}
        </div>
      </div>

      <!-- Past History -->
      <div class="section">
        <div class="section-title">PAST MEDICAL / SURGICAL HISTORY</div>
        <div class="section-content">
          <div class="row"><span class="row-label">Medical History:</span><span class="row-value">${history.past_medical?.length > 0 ? history.past_medical.join(", ") : "None"}</span></div>
          <div class="row"><span class="row-label">Surgical History:</span><span class="row-value">${history.past_surgical || "None"}</span></div>
          <div class="row"><span class="row-label">Drug History:</span><span class="row-value">${history.drug_history || "None"}</span></div>
          <div class="row"><span class="row-label">Family History:</span><span class="row-value">${history.family_history || "Not significant"}</span></div>
          ${!isPediatric && history.gyn_history ? `<div class="row"><span class="row-label">Gynae History:</span><span class="row-value">${history.gyn_history}${history.lmp ? ` | LMP: ${history.lmp}` : ""}</span></div>` : ""}
        </div>
      </div>

      <!-- Primary Assessment (ABCDE) -->
      <div class="section">
        <div class="section-title">PRIMARY ASSESSMENT (ABCDE)</div>
        <div class="section-content">
          ${buildPrimaryText()}
        </div>
      </div>

      <!-- Systemic Examination -->
      <div class="section">
        <div class="section-title">SYSTEMIC EXAMINATION</div>
        <div class="section-content">
          ${buildExamText()}
        </div>
      </div>

      <!-- Investigations -->
      <div class="section">
        <div class="section-title">INVESTIGATIONS</div>
        <div class="section-content">
          ${investigations.panels_selected?.length > 0 ? `<strong>Panels Ordered:</strong> ${investigations.panels_selected.join(", ")}<br/>` : ""}
          ${investigations.individual_tests?.length > 0 ? `<strong>Individual Tests:</strong> ${investigations.individual_tests.join(", ")}<br/>` : ""}
          ${investigations.results_notes ? `<strong>Results:</strong> ${investigations.results_notes}` : "Results: Pending / Not available"}
        </div>
      </div>

      <!-- Medications Administered in ER -->
      <div class="section">
        <div class="section-title">MEDICATIONS ADMINISTERED IN ER</div>
        <div class="section-content">
          ${buildDrugList()}
        </div>
      </div>

      <!-- Procedures Performed -->
      <div class="section">
        <div class="section-title">PROCEDURES PERFORMED</div>
        <div class="section-content">
          ${buildProcedureList()}
        </div>
      </div>

      <!-- Course in Hospital -->
      <div class="section">
        <div class="section-title">COURSE IN EMERGENCY DEPARTMENT</div>
        <div class="section-content">
          ${treatment.course_in_hospital || erObservation.notes || buildCourseInER()}
        </div>
      </div>

      <!-- Diagnosis -->
      <div class="section">
        <div class="section-title">DIAGNOSIS AT DISCHARGE</div>
        <div class="section-content">
          <strong>${treatment.provisional_diagnoses?.join(", ") || treatment.differential_diagnoses?.join(", ") || "To be determined"}</strong>
        </div>
      </div>

      <!-- Discharge Medications -->
      <div class="section">
        <div class="section-title">DISCHARGE MEDICATIONS</div>
        <div class="section-content">
          <pre style="font-family: Arial; white-space: pre-wrap; margin: 0;">${dischargeData.discharge_medications || "Nil"}</pre>
        </div>
      </div>

      <!-- Disposition -->
      <div class="section">
        <div class="section-title">DISPOSITION</div>
        <div class="section-content">
          <div class="row"><span class="row-label">Disposition Type:</span><span class="row-value"><strong>${dischargeData.disposition_type || "Normal Discharge"}</strong></span></div>
          <div class="row"><span class="row-label">Condition at Discharge:</span><span class="row-value"><strong>${dischargeData.condition_at_discharge || "STABLE"}</strong></span></div>
        </div>
      </div>

      <!-- Vitals at Discharge -->
      <div class="section">
        <div class="section-title">VITALS AT DISCHARGE</div>
        <div class="section-content vitals-box">
          <strong>HR:</strong> ${dischargeVitals.hr || "-"} | 
          <strong>BP:</strong> ${dischargeVitals.bp || "-"} | 
          <strong>RR:</strong> ${dischargeVitals.rr || "-"} | 
          <strong>SpO2:</strong> ${dischargeVitals.spo2 || "-"}% | 
          <strong>GCS:</strong> ${dischargeVitals.gcs || "-"} | 
          <strong>GRBS:</strong> ${dischargeVitals.grbs || "-"} | 
          <strong>Temp:</strong> ${dischargeVitals.temp || "-"}°C
        </div>
      </div>

      <!-- Follow-Up Advice -->
      <div class="section">
        <div class="section-title">FOLLOW-UP ADVICE</div>
        <div class="section-content">
          <pre style="font-family: Arial; white-space: pre-wrap; margin: 0;">${dischargeData.follow_up_advice || "Follow up with treating physician as advised."}</pre>
        </div>
      </div>

      <!-- General Instructions -->
      <div class="instructions">
        <div class="instructions-title">⚠️ GENERAL INSTRUCTIONS</div>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li>Take all medications as prescribed</li>
          <li>Return to Emergency Department immediately if symptoms worsen</li>
          <li>Watch for warning signs: high fever, difficulty breathing, chest pain, severe headache, altered consciousness</li>
          <li>Follow up with your doctor as advised</li>
          <li>Bring this summary for all future consultations</li>
        </ul>
      </div>

      <!-- Signatures -->
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
        <p style="text-align: center;">
          <strong>In case of emergency, contact your nearest hospital emergency department.</strong>
        </p>
        <p style="text-align: center; font-size: 9px;">
          Discharge Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
        </p>
        ${watermarkFooter}
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
  editToggle: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editToggleActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  editToggleTextActive: {
    color: "#fff",
  },
  editSection: {
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  editToggleBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  editToggleBtnActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  editToggleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  editToggleBtnTextActive: {
    color: "#fff",
  },
  editHint: {
    fontSize: 12,
    color: "#f59e0b",
    textAlign: "center",
    marginTop: 8,
  },
  editableTextArea: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
  },
  editableInput: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#1e293b",
    marginBottom: 8,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 8,
    marginBottom: 4,
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
  btnFinish: {
    backgroundColor: "#10b981",
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
  // Export Section Styles
  exportSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  exportBtnPdf: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
  },
  exportBtnWord: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  exportBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exportBtnIcon: {
    fontSize: 24,
  },
  exportBtnInfo: {
    flex: 1,
  },
  exportBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  exportBtnSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  exportBtnBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  premiumBadgeIcon: {
    fontSize: 12,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  exportNote: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});