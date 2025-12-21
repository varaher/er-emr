// TriageScreen.js - Complete with Symptoms Section + useRef for performance
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function TriageScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  /* ===================== useRef for text inputs (prevents lag) ===================== */
  const formDataRef = useRef({
    // Patient Info
    name: "",
    age: "",
    sex: "Male",
    phone: "",
    address: "",
    brought_by: "",
    mode_of_arrival: "Walk-in",
    chief_complaint: "",
    
    // Vitals
    hr: "",
    bp_systolic: "",
    bp_diastolic: "",
    rr: "",
    spo2: "",
    temperature: "",
    gcs_e: "",
    gcs_v: "",
    gcs_m: "",
    grbs: "",
  });

  /* ===================== useState for UI elements that need re-render ===================== */
  const [patientType, setPatientType] = useState("adult");
  const [ageUnit, setAgeUnit] = useState("years");
  const [sex, setSex] = useState("Male");
  const [modeOfArrival, setModeOfArrival] = useState("Walk-in");
  const [mlc, setMlc] = useState(false);
  
  // Symptoms checkboxes
  const [symptoms, setSymptoms] = useState({
    // Normal option
    normal_no_symptoms: false,
    
    // Airway
    obstructed_airway: false,
    stridor: false,
    
    // Breathing
    severe_respiratory_distress: false,
    moderate_respiratory_distress: false,
    cyanosis: false,
    
    // Circulation
    shock: false,
    severe_bleeding: false,
    chest_pain: false,
    
    // Neurological
    seizure_ongoing: false,
    confusion: false,
    lethargic_unconscious: false,
    focal_deficits: false,
    
    // Trauma
    major_trauma: false,
    moderate_trauma: false,
    minor_injury: false,
    
    // Other
    fever: false,
    abdominal_pain: false,
    vomiting_diarrhea: false,
    allergic_reaction: false,
  });

  // Triage result
  const [triageResult, setTriageResult] = useState(null);

  const updateTextField = useCallback((field, value) => {
    formDataRef.current[field] = value;
  }, []);

  const toggleSymptom = (symptom) => {
    if (symptom === "normal_no_symptoms") {
      // If selecting "Normal", clear all other symptoms
      const clearedSymptoms = {};
      Object.keys(symptoms).forEach(key => {
        clearedSymptoms[key] = key === "normal_no_symptoms" ? !symptoms[key] : false;
      });
      setSymptoms(clearedSymptoms);
    } else {
      // If selecting any symptom, uncheck "Normal"
      setSymptoms(prev => ({
        ...prev,
        [symptom]: !prev[symptom],
        normal_no_symptoms: false,
      }));
    }
  };

  /* ===================== ANALYZE TRIAGE ===================== */
  const analyzeTriage = async () => {
    const fd = formDataRef.current;
    
    if (!fd.age) {
      Alert.alert("Required", "Please enter patient age");
      return;
    }

    setAnalyzing(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        age: parseFloat(fd.age) || 0,
        age_unit: ageUnit,
        hr: fd.hr ? parseFloat(fd.hr) : null,
        rr: fd.rr ? parseFloat(fd.rr) : null,
        bp_systolic: fd.bp_systolic ? parseFloat(fd.bp_systolic) : null,
        bp_diastolic: fd.bp_diastolic ? parseFloat(fd.bp_diastolic) : null,
        spo2: fd.spo2 ? parseFloat(fd.spo2) : null,
        temperature: fd.temperature ? parseFloat(fd.temperature) : null,
        gcs_e: fd.gcs_e ? parseInt(fd.gcs_e) : null,
        gcs_v: fd.gcs_v ? parseInt(fd.gcs_v) : null,
        gcs_m: fd.gcs_m ? parseInt(fd.gcs_m) : null,
      };

      const response = await fetch(`${API_URL}/triage/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Triage analysis failed");
      }

      const result = await response.json();
      setTriageResult(result);

      Alert.alert(
        `Priority: ${result.priority}`,
        result.comment || "Triage completed",
        [{ text: "OK" }]
      );
    } catch (err) {
      console.error("Triage error:", err);
      Alert.alert("Error", err.message || "Failed to analyze triage");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ===================== CREATE CASE ===================== */
  const createCase = async () => {
    const fd = formDataRef.current;

    if (!fd.name || !fd.age) {
      Alert.alert("Required", "Please enter patient name and age");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");

      const payload = {
        patient: {
          name: fd.name,
          age: fd.age,
          sex: sex,
          phone: fd.phone || "",
          address: fd.address || "",
          arrival_datetime: new Date().toISOString(),
          mode_of_arrival: modeOfArrival,
          brought_by: fd.brought_by || "",
          informant_name: "",
          informant_reliability: "Reliable",
          identification_mark: "",
          mlc: mlc,
        },
        vitals_at_arrival: {
          hr: fd.hr ? parseFloat(fd.hr) : null,
          bp_systolic: fd.bp_systolic ? parseFloat(fd.bp_systolic) : null,
          bp_diastolic: fd.bp_diastolic ? parseFloat(fd.bp_diastolic) : null,
          rr: fd.rr ? parseFloat(fd.rr) : null,
          spo2: fd.spo2 ? parseFloat(fd.spo2) : null,
          temperature: fd.temperature ? parseFloat(fd.temperature) : null,
          gcs_e: fd.gcs_e ? parseInt(fd.gcs_e) : null,
          gcs_v: fd.gcs_v ? parseInt(fd.gcs_v) : null,
          gcs_m: fd.gcs_m ? parseInt(fd.gcs_m) : null,
          grbs: fd.grbs ? parseFloat(fd.grbs) : null,
        },
        presenting_complaint: {
          text: fd.chief_complaint || "",
          duration: "",
          onset_type: "Sudden",
          course: "Progressive",
        },
        triage_priority: triageResult?.priority_level || 4,
        triage_color: triageResult?.priority_color || "green",
        em_resident: user.name || "",
        case_type: patientType,
      };

      const response = await fetch(`${API_URL}/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create case");
      }

      const newCase = await response.json();

      Alert.alert("✅ Case Created", "Proceed to Case Sheet?", [
        {
          text: "Yes",
          onPress: () => navigation.navigate("CaseSheet", {
            caseId: newCase.id,
            patientType,
            patient: payload.patient,
            vitals: payload.vitals_at_arrival,
            triageData: triageResult,
          }),
        },
        { text: "Dashboard", onPress: () => navigation.navigate("Dashboard") },
      ]);
    } catch (err) {
      console.error("Create case error:", err);
      Alert.alert("Error", err.message || "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== UI COMPONENTS ===================== */
  const SectionTitle = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#1e40af" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const InputField = ({ label, field, placeholder, keyboardType = "default", maxLength }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        defaultValue={formDataRef.current[field]}
        onChangeText={(text) => updateTextField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );

  const SymptomChip = ({ label, symptom, color = "#ef4444" }) => (
    <TouchableOpacity
      style={[
        styles.symptomChip,
        symptoms[symptom] && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => toggleSymptom(symptom)}
    >
      <Ionicons
        name={symptoms[symptom] ? "checkbox" : "square-outline"}
        size={18}
        color={symptoms[symptom] ? "#fff" : "#64748b"}
      />
      <Text style={[styles.symptomText, symptoms[symptom] && { color: "#fff" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "RED": return "#ef4444";
      case "ORANGE": return "#f97316";
      case "YELLOW": return "#eab308";
      case "GREEN": return "#22c55e";
      case "BLUE": return "#3b82f6";
      default: return "#6b7280";
    }
  };

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
          <Text style={styles.headerTitle}>🚑 Triage Assessment</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Patient Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, patientType === "adult" && styles.toggleBtnActive]}
            onPress={() => setPatientType("adult")}
          >
            <Text style={[styles.toggleText, patientType === "adult" && styles.toggleTextActive]}>
              👨 Adult
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, patientType === "pediatric" && styles.toggleBtnActive]}
            onPress={() => setPatientType("pediatric")}
          >
            <Text style={[styles.toggleText, patientType === "pediatric" && styles.toggleTextActive]}>
              👶 Pediatric
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patient Info */}
        <SectionTitle icon="person" title="Patient Information" />
        <View style={styles.card}>
          <InputField label="Name *" field="name" placeholder="Patient name" />
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField label="Age *" field="age" placeholder="Age" keyboardType="numeric" />
            </View>
            <View style={styles.ageUnitContainer}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.miniToggle}>
                {["years", "months", "days"].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.miniToggleBtn, ageUnit === unit && styles.miniToggleBtnActive]}
                    onPress={() => setAgeUnit(unit)}
                  >
                    <Text style={[styles.miniToggleText, ageUnit === unit && styles.miniToggleTextActive]}>
                      {unit.charAt(0).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Sex</Text>
          <View style={styles.selectRow}>
            {["Male", "Female", "Other"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.selectBtn, sex === s && styles.selectBtnActive]}
                onPress={() => setSex(s)}
              >
                <Text style={[styles.selectBtnText, sex === s && styles.selectBtnTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField label="Phone" field="phone" placeholder="Contact number" keyboardType="phone-pad" />
          <InputField label="Brought By" field="brought_by" placeholder="Self / Family / Ambulance" />
          
          <Text style={styles.label}>Mode of Arrival</Text>
          <View style={styles.selectRow}>
            {["Walk-in", "Ambulance", "Referred"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.selectBtn, modeOfArrival === mode && styles.selectBtnActive]}
                onPress={() => setModeOfArrival(mode)}
              >
                <Text style={[styles.selectBtnText, modeOfArrival === mode && styles.selectBtnTextActive]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.mlcToggle, mlc && styles.mlcToggleActive]}
            onPress={() => setMlc(!mlc)}
          >
            <Ionicons name={mlc ? "checkbox" : "square-outline"} size={20} color={mlc ? "#dc2626" : "#64748b"} />
            <Text style={[styles.mlcText, mlc && styles.mlcTextActive]}>MLC Case</Text>
          </TouchableOpacity>
        </View>

        {/* Chief Complaint */}
        <SectionTitle icon="chatbubble" title="Chief Complaint" />
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.textArea]}
            defaultValue={formDataRef.current.chief_complaint}
            onChangeText={(text) => updateTextField("chief_complaint", text)}
            placeholder="Main complaint / reason for visit..."
            placeholderTextColor="#9ca3af"
            multiline
          />
        </View>

        {/* Vitals */}
        <SectionTitle icon="pulse" title="Vitals" />
        <View style={styles.card}>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>HR</Text>
              <TextInput
                style={styles.vitalInput}
                defaultValue={formDataRef.current.hr}
                onChangeText={(text) => updateTextField("hr", text)}
                placeholder="--"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.vitalUnit}>/min</Text>
            </View>

            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BP</Text>
              <View style={styles.bpContainer}>
                <TextInput
                  style={[styles.vitalInput, { width: 50 }]}
                  defaultValue={formDataRef.current.bp_systolic}
                  onChangeText={(text) => updateTextField("bp_systolic", text)}
                  placeholder="Sys"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.bpSlash}>/</Text>
                <TextInput
                  style={[styles.vitalInput, { width: 50 }]}
                  defaultValue={formDataRef.current.bp_diastolic}
                  onChangeText={(text) => updateTextField("bp_diastolic", text)}
                  placeholder="Dia"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>RR</Text>
              <TextInput
                style={styles.vitalInput}
                defaultValue={formDataRef.current.rr}
                onChangeText={(text) => updateTextField("rr", text)}
                placeholder="--"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.vitalUnit}>/min</Text>
            </View>

            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>SpO2</Text>
              <TextInput
                style={styles.vitalInput}
                defaultValue={formDataRef.current.spo2}
                onChangeText={(text) => updateTextField("spo2", text)}
                placeholder="--"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.vitalUnit}>%</Text>
            </View>

            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Temp</Text>
              <TextInput
                style={styles.vitalInput}
                defaultValue={formDataRef.current.temperature}
                onChangeText={(text) => updateTextField("temperature", text)}
                placeholder="--"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.vitalUnit}>°C</Text>
            </View>

            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>GRBS</Text>
              <TextInput
                style={styles.vitalInput}
                defaultValue={formDataRef.current.grbs}
                onChangeText={(text) => updateTextField("grbs", text)}
                placeholder="--"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.vitalUnit}>mg/dL</Text>
            </View>
          </View>

          {/* GCS */}
          <Text style={[styles.label, { marginTop: 16 }]}>GCS (E + V + M)</Text>
          <View style={styles.gcsContainer}>
            <View style={styles.gcsItem}>
              <Text style={styles.gcsLabel}>E</Text>
              <TextInput
                style={styles.gcsInput}
                defaultValue={formDataRef.current.gcs_e}
                onChangeText={(text) => updateTextField("gcs_e", text)}
                placeholder="4"
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.gcsItem}>
              <Text style={styles.gcsLabel}>V</Text>
              <TextInput
                style={styles.gcsInput}
                defaultValue={formDataRef.current.gcs_v}
                onChangeText={(text) => updateTextField("gcs_v", text)}
                placeholder="5"
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.gcsItem}>
              <Text style={styles.gcsLabel}>M</Text>
              <TextInput
                style={styles.gcsInput}
                defaultValue={formDataRef.current.gcs_m}
                onChangeText={(text) => updateTextField("gcs_m", text)}
                placeholder="6"
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        </View>

        {/* ===================== SYMPTOMS SECTION ===================== */}
        <SectionTitle icon="warning" title="Symptoms / Red Flags" />
        <View style={styles.card}>
          {/* Normal Option - at the top in green */}
          <View style={styles.normalOptionContainer}>
            <TouchableOpacity
              style={[
                styles.normalOption,
                symptoms.normal_no_symptoms && styles.normalOptionActive,
              ]}
              onPress={() => toggleSymptom("normal_no_symptoms")}
            >
              <Ionicons
                name={symptoms.normal_no_symptoms ? "checkbox" : "square-outline"}
                size={22}
                color={symptoms.normal_no_symptoms ? "#fff" : "#22c55e"}
              />
              <Text style={[
                styles.normalOptionText,
                symptoms.normal_no_symptoms && { color: "#fff" }
              ]}>
                ✅ Normal / No Critical Symptoms
              </Text>
            </TouchableOpacity>
          </View>

          {/* Airway */}
          <Text style={styles.symptomCategory}>Airway</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Obstructed Airway" symptom="obstructed_airway" />
            <SymptomChip label="Stridor" symptom="stridor" />
          </View>

          {/* Breathing */}
          <Text style={styles.symptomCategory}>Breathing</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Severe Resp. Distress" symptom="severe_respiratory_distress" />
            <SymptomChip label="Moderate Resp. Distress" symptom="moderate_respiratory_distress" color="#f97316" />
            <SymptomChip label="Cyanosis" symptom="cyanosis" />
          </View>

          {/* Circulation */}
          <Text style={styles.symptomCategory}>Circulation</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Shock" symptom="shock" />
            <SymptomChip label="Severe Bleeding" symptom="severe_bleeding" />
            <SymptomChip label="Chest Pain" symptom="chest_pain" color="#f97316" />
          </View>

          {/* Neurological */}
          <Text style={styles.symptomCategory}>Neurological</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Seizure (Ongoing)" symptom="seizure_ongoing" />
            <SymptomChip label="Confusion" symptom="confusion" color="#f97316" />
            <SymptomChip label="Unconscious/Lethargic" symptom="lethargic_unconscious" />
            <SymptomChip label="Focal Deficits" symptom="focal_deficits" color="#f97316" />
          </View>

          {/* Trauma */}
          <Text style={styles.symptomCategory}>Trauma</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Major Trauma" symptom="major_trauma" />
            <SymptomChip label="Moderate Trauma" symptom="moderate_trauma" color="#f97316" />
            <SymptomChip label="Minor Injury" symptom="minor_injury" color="#eab308" />
          </View>

          {/* Other */}
          <Text style={styles.symptomCategory}>Other</Text>
          <View style={styles.symptomGrid}>
            <SymptomChip label="Fever" symptom="fever" color="#f97316" />
            <SymptomChip label="Abdominal Pain" symptom="abdominal_pain" color="#eab308" />
            <SymptomChip label="Vomiting/Diarrhea" symptom="vomiting_diarrhea" color="#eab308" />
            <SymptomChip label="Allergic Reaction" symptom="allergic_reaction" color="#f97316" />
          </View>
        </View>

        {/* Triage Result */}
        {triageResult && (
          <View style={[styles.triageResultCard, { borderLeftColor: getPriorityColor(triageResult.priority) }]}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(triageResult.priority) }]}>
              <Text style={styles.priorityText}>{triageResult.priority}</Text>
            </View>
            <View style={styles.triageInfo}>
              <Text style={styles.triageLabel}>{triageResult.priority_name}</Text>
              <Text style={styles.triageTime}>Time to see: {triageResult.time_to_see}</Text>
              {triageResult.comment && (
                <Text style={styles.triageComment}>{triageResult.comment}</Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.analyzeBtn, analyzing && styles.btnDisabled]}
            onPress={analyzeTriage}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="#fff" />
                <Text style={styles.btnText}>Analyze Triage</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.btnDisabled]}
            onPress={createCase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Create Case</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
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
  toggleContainer: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: "#2563eb",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  toggleTextActive: {
    color: "#fff",
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  ageUnitContainer: {
    width: 100,
  },
  miniToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
  },
  miniToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  miniToggleBtnActive: {
    backgroundColor: "#2563eb",
  },
  miniToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  miniToggleTextActive: {
    color: "#fff",
  },
  selectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  selectBtn: {
    flex: 1,
    paddingVertical: 10,
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
  mlcToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  mlcToggleActive: {
    backgroundColor: "#fee2e2",
    borderColor: "#f87171",
  },
  mlcText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  mlcTextActive: {
    color: "#dc2626",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalItem: {
    alignItems: "center",
    minWidth: 80,
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  vitalInput: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    width: 60,
  },
  vitalUnit: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  bpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bpSlash: {
    fontSize: 18,
    color: "#94a3b8",
    marginHorizontal: 2,
  },
  gcsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  gcsItem: {
    alignItems: "center",
  },
  gcsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  gcsInput: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    width: 50,
  },
  // Symptoms styles
  normalOptionContainer: {
    marginBottom: 16,
  },
  normalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  normalOptionActive: {
    backgroundColor: "#22c55e",
  },
  normalOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22c55e",
  },
  symptomCategory: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
    marginBottom: 8,
  },
  symptomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  symptomText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  // Triage result
  triageResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    gap: 12,
  },
  priorityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  priorityText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  triageInfo: {
    flex: 1,
  },
  triageLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  triageTime: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  triageComment: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    fontStyle: "italic",
  },
  // Action buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    marginTop: 8,
  },
  analyzeBtn: {
    flex: 1,
    backgroundColor: "#f97316",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  createBtn: {
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
