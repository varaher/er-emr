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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function CaseSheetScreen({ route, navigation }) {
  const { patientType = "adult", vitals = {}, triageData = {}, symptoms = {} } = route.params || {};

  /* ===================== LOADING STATE ===================== */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState(null);

  /* ===================== VOICE STATE ===================== */
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  /* ===================== PATIENT INFO ===================== */
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    age: vitals.age ? String(vitals.age) : "",
    age_unit: vitals.age_unit || "years",
    sex: "Male",
    phone: "",
    address: "",
    uhid: "",
    mode_of_arrival: "Walk-in",
    brought_by: "Self",
    mlc: false,
  });

  /* ===================== PRESENTING COMPLAINT ===================== */
  const [presentingComplaint, setPresentingComplaint] = useState({
    text: "",
    duration: "",
    onset_type: "Sudden",
  });

  /* ===================== VITALS (pre-filled from triage) ===================== */
  const [vitalsData, setVitalsData] = useState({
    hr: vitals.hr ? String(vitals.hr) : "",
    rr: vitals.rr ? String(vitals.rr) : "",
    bp_systolic: vitals.bp_systolic ? String(vitals.bp_systolic) : "",
    bp_diastolic: vitals.bp_diastolic ? String(vitals.bp_diastolic) : "",
    spo2: vitals.spo2 ? String(vitals.spo2) : "",
    temperature: vitals.temperature ? String(vitals.temperature) : "",
    gcs_e: vitals.gcs_e ? String(vitals.gcs_e) : "",
    gcs_v: vitals.gcs_v ? String(vitals.gcs_v) : "",
    gcs_m: vitals.gcs_m ? String(vitals.gcs_m) : "",
    pain_score: "",
    grbs: "",
  });

  /* ===================== HISTORY (SAMPLE) ===================== */
  const [history, setHistory] = useState({
    hpi: "",
    signs_and_symptoms: "",
    allergies: "",
    drug_history: "",
    past_medical: "",
    past_surgical: "",
    last_meal: "",
    events: "",
    family_history: "",
  });

  /* ===================== PRIMARY ASSESSMENT - ABCDE (Adult) ===================== */
  const [primaryAssessment, setPrimaryAssessment] = useState({
    // Airway
    airway_status: "Patent",
    airway_notes: "",
    airway_intervention: "",
    // Breathing
    breathing_status: "Normal",
    breathing_wob: [],
    breathing_air_entry: "Normal",
    breathing_notes: "",
    breathing_intervention: "",
    // Circulation
    circulation_status: "Normal",
    circulation_crt: "Normal",
    circulation_distended_neck_veins: false,
    circulation_notes: "",
    circulation_intervention: "",
    // Disability
    disability_avpu: "Alert",
    disability_pupils: "Equal, Reactive",
    disability_grbs: "",
    disability_notes: "",
    // Exposure
    exposure_temperature: vitals.temperature ? String(vitals.temperature) : "",
    exposure_trauma: false,
    exposure_long_bone_deformity: false,
    exposure_notes: "",
    // EFAST
    efast_done: false,
    efast_notes: "",
  });

  /* ===================== PAT (Pediatric Assessment Triangle) ===================== */
  const [pat, setPat] = useState({
    appearance: "Normal",
    tone: "Normal",
    interactivity: "Normal",
    consolability: "Consolable",
    look_gaze: "Normal",
    speech_cry: "Normal",
    work_of_breathing: "Normal",
    circulation_to_skin: "Normal",
    overall_impression: "Stable",
  });

  /* ===================== EXAMINATION ===================== */
  const [examination, setExamination] = useState({
    general_notes: "",
    general_pallor: false,
    general_icterus: false,
    general_cyanosis: false,
    general_clubbing: false,
    general_lymphadenopathy: false,
    general_edema: false,
    cvs_status: "Normal",
    cvs_notes: "",
    respiratory_status: "Normal",
    respiratory_notes: "",
    abdomen_status: "Normal",
    abdomen_notes: "",
    cns_status: "Normal",
    cns_notes: "",
    extremities_status: "Normal",
    extremities_notes: "",
  });

  /* ===================== TREATMENT ===================== */
  const [treatment, setTreatment] = useState({
    intervention_notes: "",
    course_in_hospital: "",
  });

  /* ===================== TRIAGE DATA (from previous screen) ===================== */
  const [triageInfo, setTriageInfo] = useState({
    priority: triageData.priority || "",
    priority_color: triageData.priority_color || "",
    priority_name: triageData.priority_name || "",
    time_to_see: triageData.time_to_see || "",
  });

  /* =========================================================
     🎤 VOICE RECORDING
     ========================================================= */

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access required");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      Alert.alert("Error", "Cannot start recording");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      uploadAudio(uri);
    } catch (err) {
      console.error("Stop recording error:", err);
      Alert.alert("Error", "Recording failed");
    }
  };

  /* =========================================================
     📤 UPLOAD AUDIO → TRANSCRIBE → PARSE → AUTO-POPULATE
     ========================================================= */

  const uploadAudio = async (uri) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Auth Error", "Please login again");
        navigation.navigate("Login");
        return;
      }

      // Step 1: Transcribe audio
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "casesheet.m4a",
        type: "audio/m4a",
      });
      formData.append("engine", "auto");
      formData.append("language", "en");

      const transcribeRes = await fetch(`${API_URL}/ai/voice-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const transcribeData = await transcribeRes.json();
      console.log("Transcription:", transcribeData);

      if (!transcribeData?.transcription) {
        throw new Error("No transcription received");
      }

      setTranscriptText(transcribeData.transcription);

      // Step 2: Parse transcript to structured data
      await parseTranscript(transcribeData.transcription, token);

    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Voice Error", err.message || "Unable to process voice");
    }
    setLoading(false);
  };

  const parseTranscript = async (text, token) => {
    try {
      const res = await fetch(`${API_URL}/ai/parse-transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          case_sheet_id: caseId || "new",
          transcript: text,
          source_language: "en",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Parsing failed");
      }

      const data = await res.json();
      console.log("Parsed data:", data);

      // Auto-populate all fields from parsed response
      autoPopulateFromParsed(data);

      Alert.alert("✅ Success", "Case sheet auto-populated from voice!");

    } catch (err) {
      console.error("Parse error:", err);
      Alert.alert("Parse Error", err.message || "Could not structure data");
    }
  };

  /* =========================================================
     🔄 AUTO-POPULATE FROM PARSED DATA
     ========================================================= */

  const autoPopulateFromParsed = (data) => {
    // Patient Info
    if (data.patient_info) {
      setPatientInfo((prev) => ({
        ...prev,
        name: data.patient_info.name || prev.name,
        age: data.patient_info.age ? String(data.patient_info.age) : prev.age,
        sex: data.patient_info.gender || prev.sex,
      }));
    }

    // Presenting Complaint
    if (data.presenting_complaint) {
      setPresentingComplaint((prev) => ({
        ...prev,
        text: data.presenting_complaint.text || prev.text,
        duration: data.presenting_complaint.duration || prev.duration,
        onset_type: data.presenting_complaint.onset_type || prev.onset_type,
      }));
    }

    // Vitals
    if (data.vitals) {
      const v = data.vitals;
      setVitalsData((prev) => ({
        ...prev,
        hr: v.hr ? String(v.hr) : prev.hr,
        rr: v.rr ? String(v.rr) : prev.rr,
        bp_systolic: v.bp_systolic ? String(v.bp_systolic) : prev.bp_systolic,
        bp_diastolic: v.bp_diastolic ? String(v.bp_diastolic) : prev.bp_diastolic,
        spo2: v.spo2 ? String(v.spo2) : prev.spo2,
        temperature: v.temperature ? String(v.temperature) : prev.temperature,
        gcs_e: v.gcs_e ? String(v.gcs_e) : prev.gcs_e,
        gcs_v: v.gcs_v ? String(v.gcs_v) : prev.gcs_v,
        gcs_m: v.gcs_m ? String(v.gcs_m) : prev.gcs_m,
      }));
    }

    // History (SAMPLE)
    if (data.history) {
      const h = data.history;
      setHistory((prev) => ({
        ...prev,
        hpi: h.hpi || prev.hpi,
        signs_and_symptoms: h.signs_and_symptoms || prev.signs_and_symptoms,
        allergies: Array.isArray(h.allergies) ? h.allergies.join(", ") : (h.allergies || prev.allergies),
        drug_history: h.drug_history || prev.drug_history,
        past_medical: Array.isArray(h.past_medical) ? h.past_medical.join(", ") : (h.past_medical || prev.past_medical),
        past_surgical: h.past_surgical || prev.past_surgical,
        events: h.events || prev.events,
      }));
    }

    // Primary Assessment (ABCDE)
    if (data.primary_assessment) {
      const pa = data.primary_assessment;
      setPrimaryAssessment((prev) => ({
        ...prev,
        airway_notes: pa.airway_additional_notes || prev.airway_notes,
        breathing_notes: pa.breathing_additional_notes || prev.breathing_notes,
        circulation_notes: pa.circulation_additional_notes || prev.circulation_notes,
        disability_notes: pa.disability_additional_notes || prev.disability_notes,
        exposure_notes: pa.exposure_additional_notes || prev.exposure_notes,
      }));
    }

    // Examination
    if (data.examination) {
      const ex = data.examination;
      setExamination((prev) => ({
        ...prev,
        general_notes: ex.general_notes || prev.general_notes,
        general_pallor: ex.general_pallor || prev.general_pallor,
        general_icterus: ex.general_icterus || prev.general_icterus,
        cvs_status: ex.cvs_status || prev.cvs_status,
        cvs_notes: ex.cvs_additional_notes || prev.cvs_notes,
        respiratory_status: ex.respiratory_status || prev.respiratory_status,
        respiratory_notes: ex.respiratory_additional_notes || prev.respiratory_notes,
        abdomen_status: ex.abdomen_status || prev.abdomen_status,
        abdomen_notes: ex.abdomen_additional_notes || prev.abdomen_notes,
        cns_status: ex.cns_status || prev.cns_status,
        cns_notes: ex.cns_additional_notes || prev.cns_notes,
      }));
    }

    // Treatment
    if (data.treatment) {
      setTreatment((prev) => ({
        ...prev,
        intervention_notes: data.treatment.intervention_notes || prev.intervention_notes,
      }));
    }
  };

  /* =========================================================
     💾 SAVE CASE SHEET
     ========================================================= */

  const saveCaseSheet = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        case_type: patientType,
        patient: patientInfo,
        presenting_complaint: presentingComplaint,
        vitals_at_arrival: {
          hr: vitalsData.hr ? Number(vitalsData.hr) : null,
          rr: vitalsData.rr ? Number(vitalsData.rr) : null,
          bp_systolic: vitalsData.bp_systolic ? Number(vitalsData.bp_systolic) : null,
          bp_diastolic: vitalsData.bp_diastolic ? Number(vitalsData.bp_diastolic) : null,
          spo2: vitalsData.spo2 ? Number(vitalsData.spo2) : null,
          temperature: vitalsData.temperature ? Number(vitalsData.temperature) : null,
          gcs_e: vitalsData.gcs_e ? Number(vitalsData.gcs_e) : null,
          gcs_v: vitalsData.gcs_v ? Number(vitalsData.gcs_v) : null,
          gcs_m: vitalsData.gcs_m ? Number(vitalsData.gcs_m) : null,
          pain_score: vitalsData.pain_score ? Number(vitalsData.pain_score) : null,
          grbs: vitalsData.grbs ? Number(vitalsData.grbs) : null,
        },
        history: {
          hpi: history.hpi,
          signs_and_symptoms: history.signs_and_symptoms,
          allergies: history.allergies.split(",").map((s) => s.trim()).filter(Boolean),
          drug_history: history.drug_history,
          past_medical: history.past_medical.split(",").map((s) => s.trim()).filter(Boolean),
          past_surgical: history.past_surgical,
          last_meal_lmp: history.last_meal,
          events_hopi: history.events,
          family_gyn_additional_notes: history.family_history,
        },
        primary_assessment: primaryAssessment,
        pat: patientType === "pediatric" ? pat : null,
        examination: examination,
        treatment: treatment,
        triage: triageInfo,
      };

      let response;
      if (caseId) {
        // Update existing case
        response = await fetch(`${API_URL}/cases/${caseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new case
        response = await fetch(`${API_URL}/cases`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save case");
      }

      const savedCase = await response.json();
      setCaseId(savedCase.id);

      Alert.alert("✅ Saved", "Case sheet saved successfully!");
      return savedCase.id;

    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Save Error", err.message || "Failed to save case sheet");
      return null;
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     ➡️ PROCEED TO NEXT SCREEN
     ========================================================= */

  const proceedToInvestigations = async () => {
    // Save first
    const savedCaseId = await saveCaseSheet();
    if (!savedCaseId) return;

    navigation.navigate("Investigations", {
      caseId: savedCaseId,
      patientType,
      patientInfo,
      vitals: vitalsData,
      triageData: triageInfo,
    });
  };

  /* =========================================================
     🧱 UI COMPONENTS
     ========================================================= */

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#1e40af" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const InputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = "default" }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );

  const SelectField = ({ label, options, value, onChange }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selectBtn, value === opt && styles.selectBtnActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.selectBtnText, value === opt && styles.selectBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SwitchField = ({ label, value, onChange }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#d1d5db", true: "#86efac" }}
        thumbColor={value ? "#22c55e" : "#f4f3f4"}
      />
    </View>
  );

  /* =========================================================
     🧱 MAIN UI
     ========================================================= */

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {patientType === "pediatric" ? "👶 Pediatric" : "👨‍⚕️ Adult"} Case Sheet
          </Text>
          {triageInfo.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(triageInfo.priority) }]}>
              <Text style={styles.priorityText}>{triageInfo.priority}</Text>
            </View>
          )}
        </View>

        {/* Voice Recording Button */}
        <TouchableOpacity
          style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={loading}
        >
          <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#fff" />
          <Text style={styles.voiceText}>
            {isRecording ? "Stop Recording" : "🎤 Dictate Full Case (Auto-Populate All)"}
          </Text>
        </TouchableOpacity>

        {/* Transcript Display */}
        {transcriptText ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>📝 Transcription:</Text>
            <Text style={styles.transcriptText}>{transcriptText}</Text>
          </View>
        ) : null}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.loadingText}>Processing voice...</Text>
          </View>
        )}

        {/* ==================== PATIENT INFO ==================== */}
        <SectionHeader title="Patient Information" icon="person" />
        <View style={styles.card}>
          <View style={styles.rowInputs}>
            <View style={{ flex: 2 }}>
              <InputField
                label="Patient Name"
                value={patientInfo.name}
                onChangeText={(v) => setPatientInfo({ ...patientInfo, name: v })}
                placeholder="Full name"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="UHID"
                value={patientInfo.uhid}
                onChangeText={(v) => setPatientInfo({ ...patientInfo, uhid: v })}
                placeholder="ID"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Age"
                value={patientInfo.age}
                onChangeText={(v) => setPatientInfo({ ...patientInfo, age: v })}
                placeholder="Age"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Sex"
                options={["Male", "Female", "Other"]}
                value={patientInfo.sex}
                onChange={(v) => setPatientInfo({ ...patientInfo, sex: v })}
              />
            </View>
          </View>

          <InputField
            label="Phone"
            value={patientInfo.phone}
            onChangeText={(v) => setPatientInfo({ ...patientInfo, phone: v })}
            placeholder="Contact number"
            keyboardType="phone-pad"
          />

          <InputField
            label="Address"
            value={patientInfo.address}
            onChangeText={(v) => setPatientInfo({ ...patientInfo, address: v })}
            placeholder="Full address"
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Mode of Arrival"
                options={["Walk-in", "Ambulance", "Referred"]}
                value={patientInfo.mode_of_arrival}
                onChange={(v) => setPatientInfo({ ...patientInfo, mode_of_arrival: v })}
              />
            </View>
          </View>

          <SwitchField
            label="MLC (Medico-Legal Case)"
            value={patientInfo.mlc}
            onChange={(v) => setPatientInfo({ ...patientInfo, mlc: v })}
          />
        </View>

        {/* ==================== PRESENTING COMPLAINT ==================== */}
        <SectionHeader title="Presenting Complaint" icon="alert-circle" />
        <View style={styles.card}>
          <InputField
            label="Chief Complaint"
            value={presentingComplaint.text}
            onChangeText={(v) => setPresentingComplaint({ ...presentingComplaint, text: v })}
            placeholder="Main complaint..."
            multiline
          />
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Duration"
                value={presentingComplaint.duration}
                onChangeText={(v) => setPresentingComplaint({ ...presentingComplaint, duration: v })}
                placeholder="e.g., 2 hours"
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Onset"
                options={["Sudden", "Gradual"]}
                value={presentingComplaint.onset_type}
                onChange={(v) => setPresentingComplaint({ ...presentingComplaint, onset_type: v })}
              />
            </View>
          </View>
        </View>

        {/* ==================== VITALS ==================== */}
        <SectionHeader title="Vitals at Arrival" icon="heart" />
        <View style={styles.card}>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>HR</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.hr}
                onChangeText={(v) => setVitalsData({ ...vitalsData, hr: v })}
                keyboardType="numeric"
                placeholder="bpm"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>RR</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.rr}
                onChangeText={(v) => setVitalsData({ ...vitalsData, rr: v })}
                keyboardType="numeric"
                placeholder="/min"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>SpO₂</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.spo2}
                onChangeText={(v) => setVitalsData({ ...vitalsData, spo2: v })}
                keyboardType="numeric"
                placeholder="%"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Temp</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.temperature}
                onChangeText={(v) => setVitalsData({ ...vitalsData, temperature: v })}
                keyboardType="numeric"
                placeholder="°C"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BP Sys</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.bp_systolic}
                onChangeText={(v) => setVitalsData({ ...vitalsData, bp_systolic: v })}
                keyboardType="numeric"
                placeholder="mmHg"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BP Dia</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.bp_diastolic}
                onChangeText={(v) => setVitalsData({ ...vitalsData, bp_diastolic: v })}
                keyboardType="numeric"
                placeholder="mmHg"
              />
            </View>
          </View>

          <Text style={styles.subSectionTitle}>GCS</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>E</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.gcs_e}
                onChangeText={(v) => setVitalsData({ ...vitalsData, gcs_e: v })}
                keyboardType="numeric"
                placeholder="1-4"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>V</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.gcs_v}
                onChangeText={(v) => setVitalsData({ ...vitalsData, gcs_v: v })}
                keyboardType="numeric"
                placeholder="1-5"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>M</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.gcs_m}
                onChangeText={(v) => setVitalsData({ ...vitalsData, gcs_m: v })}
                keyboardType="numeric"
                placeholder="1-6"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Pain</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.pain_score}
                onChangeText={(v) => setVitalsData({ ...vitalsData, pain_score: v })}
                keyboardType="numeric"
                placeholder="0-10"
              />
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>GRBS</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitalsData.grbs}
                onChangeText={(v) => setVitalsData({ ...vitalsData, grbs: v })}
                keyboardType="numeric"
                placeholder="mg/dL"
              />
            </View>
          </View>
        </View>

        {/* ==================== PEDIATRIC: PAT ==================== */}
        {patientType === "pediatric" && (
          <>
            <SectionHeader title="PAT (Pediatric Assessment Triangle)" icon="happy" />
            <View style={styles.card}>
              <SelectField
                label="Appearance"
                options={["Normal", "Abnormal"]}
                value={pat.appearance}
                onChange={(v) => setPat({ ...pat, appearance: v })}
              />
              <SelectField
                label="Tone"
                options={["Normal", "Hypotonic", "Hypertonic"]}
                value={pat.tone}
                onChange={(v) => setPat({ ...pat, tone: v })}
              />
              <SelectField
                label="Interactivity"
                options={["Normal", "Decreased", "Absent"]}
                value={pat.interactivity}
                onChange={(v) => setPat({ ...pat, interactivity: v })}
              />
              <SelectField
                label="Consolability"
                options={["Consolable", "Inconsolable"]}
                value={pat.consolability}
                onChange={(v) => setPat({ ...pat, consolability: v })}
              />
              <SelectField
                label="Work of Breathing"
                options={["Normal", "Increased"]}
                value={pat.work_of_breathing}
                onChange={(v) => setPat({ ...pat, work_of_breathing: v })}
              />
              <SelectField
                label="Circulation to Skin"
                options={["Normal", "Pale", "Mottled", "Cyanotic"]}
                value={pat.circulation_to_skin}
                onChange={(v) => setPat({ ...pat, circulation_to_skin: v })}
              />
              <SelectField
                label="Overall Impression"
                options={["Stable", "Sick", "Critical"]}
                value={pat.overall_impression}
                onChange={(v) => setPat({ ...pat, overall_impression: v })}
              />
            </View>
          </>
        )}

        {/* ==================== PRIMARY ASSESSMENT (ABCDE) ==================== */}
        <SectionHeader title="Primary Assessment (ABCDE)" icon="fitness" />
        <View style={styles.card}>
          {/* Airway */}
          <Text style={styles.subSectionTitle}>A - Airway</Text>
          <SelectField
            label="Status"
            options={["Patent", "Threatened", "Compromised"]}
            value={primaryAssessment.airway_status}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, airway_status: v })}
          />
          <InputField
            label="Notes / Intervention"
            value={primaryAssessment.airway_notes}
            onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, airway_notes: v })}
            placeholder="Airway findings..."
          />

          {/* Breathing */}
          <Text style={styles.subSectionTitle}>B - Breathing</Text>
          <SelectField
            label="Status"
            options={["Normal", "Abnormal"]}
            value={primaryAssessment.breathing_status}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, breathing_status: v })}
          />
          <SelectField
            label="Air Entry"
            options={["Normal", "Decreased", "Absent"]}
            value={primaryAssessment.breathing_air_entry}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, breathing_air_entry: v })}
          />
          <InputField
            label="Notes / Intervention"
            value={primaryAssessment.breathing_notes}
            onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, breathing_notes: v })}
            placeholder="Breathing findings..."
          />

          {/* Circulation */}
          <Text style={styles.subSectionTitle}>C - Circulation</Text>
          <SelectField
            label="CRT"
            options={["Normal (<2s)", "Delayed (>2s)"]}
            value={primaryAssessment.circulation_crt}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, circulation_crt: v })}
          />
          <SwitchField
            label="Distended Neck Veins"
            value={primaryAssessment.circulation_distended_neck_veins}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, circulation_distended_neck_veins: v })}
          />
          <InputField
            label="Notes / Intervention"
            value={primaryAssessment.circulation_notes}
            onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, circulation_notes: v })}
            placeholder="Circulation findings..."
          />

          {/* Disability */}
          <Text style={styles.subSectionTitle}>D - Disability</Text>
          <SelectField
            label="AVPU"
            options={["Alert", "Verbal", "Pain", "Unresponsive"]}
            value={primaryAssessment.disability_avpu}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, disability_avpu: v })}
          />
          <SelectField
            label="Pupils"
            options={["Equal, Reactive", "Unequal", "Fixed"]}
            value={primaryAssessment.disability_pupils}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, disability_pupils: v })}
          />
          <InputField
            label="GRBS"
            value={primaryAssessment.disability_grbs}
            onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, disability_grbs: v })}
            placeholder="mg/dL"
            keyboardType="numeric"
          />

          {/* Exposure */}
          <Text style={styles.subSectionTitle}>E - Exposure</Text>
          <SwitchField
            label="Trauma Signs"
            value={primaryAssessment.exposure_trauma}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, exposure_trauma: v })}
          />
          <SwitchField
            label="Long Bone Deformity"
            value={primaryAssessment.exposure_long_bone_deformity}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, exposure_long_bone_deformity: v })}
          />
          <InputField
            label="Exposure Notes"
            value={primaryAssessment.exposure_notes}
            onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, exposure_notes: v })}
            placeholder="Exposure findings..."
          />

          {/* EFAST */}
          <SwitchField
            label="EFAST Done"
            value={primaryAssessment.efast_done}
            onChange={(v) => setPrimaryAssessment({ ...primaryAssessment, efast_done: v })}
          />
          {primaryAssessment.efast_done && (
            <InputField
              label="EFAST Findings"
              value={primaryAssessment.efast_notes}
              onChangeText={(v) => setPrimaryAssessment({ ...primaryAssessment, efast_notes: v })}
              placeholder="EFAST results..."
            />
          )}
        </View>

        {/* ==================== HISTORY (SAMPLE) ==================== */}
        <SectionHeader title="History (SAMPLE)" icon="document-text" />
        <View style={styles.card}>
          <InputField
            label="History of Present Illness (HPI)"
            value={history.hpi}
            onChangeText={(v) => setHistory({ ...history, hpi: v })}
            placeholder="Detailed history..."
            multiline
          />
          <InputField
            label="Signs & Symptoms"
            value={history.signs_and_symptoms}
            onChangeText={(v) => setHistory({ ...history, signs_and_symptoms: v })}
            placeholder="Associated symptoms..."
          />
          <InputField
            label="Allergies"
            value={history.allergies}
            onChangeText={(v) => setHistory({ ...history, allergies: v })}
            placeholder="Comma separated (e.g., Penicillin, Peanuts)"
          />
          <InputField
            label="Medications"
            value={history.drug_history}
            onChangeText={(v) => setHistory({ ...history, drug_history: v })}
            placeholder="Current medications..."
          />
          <InputField
            label="Past Medical History"
            value={history.past_medical}
            onChangeText={(v) => setHistory({ ...history, past_medical: v })}
            placeholder="DM, HTN, Asthma, etc."
          />
          <InputField
            label="Past Surgical History"
            value={history.past_surgical}
            onChangeText={(v) => setHistory({ ...history, past_surgical: v })}
            placeholder="Previous surgeries..."
          />
          <InputField
            label="Last Meal / LMP"
            value={history.last_meal}
            onChangeText={(v) => setHistory({ ...history, last_meal: v })}
            placeholder="Time and type of last meal"
          />
          <InputField
            label="Events Leading to Presentation"
            value={history.events}
            onChangeText={(v) => setHistory({ ...history, events: v })}
            placeholder="What happened..."
            multiline
          />
        </View>

        {/* ==================== EXAMINATION ==================== */}
        <SectionHeader title="Physical Examination" icon="body" />
        <View style={styles.card}>
          <Text style={styles.subSectionTitle}>General</Text>
          <View style={styles.switchGrid}>
            <SwitchField
              label="Pallor"
              value={examination.general_pallor}
              onChange={(v) => setExamination({ ...examination, general_pallor: v })}
            />
            <SwitchField
              label="Icterus"
              value={examination.general_icterus}
              onChange={(v) => setExamination({ ...examination, general_icterus: v })}
            />
            <SwitchField
              label="Cyanosis"
              value={examination.general_cyanosis}
              onChange={(v) => setExamination({ ...examination, general_cyanosis: v })}
            />
            <SwitchField
              label="Clubbing"
              value={examination.general_clubbing}
              onChange={(v) => setExamination({ ...examination, general_clubbing: v })}
            />
            <SwitchField
              label="Lymphadenopathy"
              value={examination.general_lymphadenopathy}
              onChange={(v) => setExamination({ ...examination, general_lymphadenopathy: v })}
            />
            <SwitchField
              label="Edema"
              value={examination.general_edema}
              onChange={(v) => setExamination({ ...examination, general_edema: v })}
            />
          </View>

          {/* System-wise */}
          {["CVS", "Respiratory", "Abdomen", "CNS", "Extremities"].map((system) => {
            const key = system.toLowerCase();
            return (
              <View key={system}>
                <Text style={styles.subSectionTitle}>{system}</Text>
                <SelectField
                  label="Status"
                  options={["Normal", "Abnormal"]}
                  value={examination[`${key}_status`]}
                  onChange={(v) => setExamination({ ...examination, [`${key}_status`]: v })}
                />
                {examination[`${key}_status`] === "Abnormal" && (
                  <InputField
                    label="Findings"
                    value={examination[`${key}_notes`]}
                    onChangeText={(v) => setExamination({ ...examination, [`${key}_notes`]: v })}
                    placeholder={`${system} findings...`}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* ==================== TREATMENT ==================== */}
        <SectionHeader title="Treatment / Interventions" icon="medkit" />
        <View style={styles.card}>
          <InputField
            label="Interventions Done"
            value={treatment.intervention_notes}
            onChangeText={(v) => setTreatment({ ...treatment, intervention_notes: v })}
            placeholder="IV access, medications given, procedures..."
            multiline
          />
          <InputField
            label="Course in Hospital"
            value={treatment.course_in_hospital}
            onChangeText={(v) => setTreatment({ ...treatment, course_in_hospital: v })}
            placeholder="Patient course..."
            multiline
          />
        </View>

        {/* ==================== ACTION BUTTONS ==================== */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={saveCaseSheet}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.btnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, (loading || saving) && styles.btnDisabled]}
            onPress={proceedToInvestigations}
            disabled={loading || saving}
          >
            <Text style={styles.btnText}>Proceed to Investigations</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   🎨 HELPER FUNCTIONS
   ========================================================= */

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

/* =========================================================
   🎨 STYLES
   ========================================================= */

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
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priorityText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  voiceBtn: {
    backgroundColor: "#1976d2",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  voiceBtnRecording: {
    backgroundColor: "#dc2626",
  },
  voiceText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  transcriptBox: {
    backgroundColor: "#f0f9ff",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  transcriptLabel: {
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 4,
    fontSize: 12,
  },
  transcriptText: {
    color: "#0c4a6e",
    fontSize: 14,
    lineHeight: 20,
  },
  loadingBox: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 16,
    marginBottom: 8,
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
    fontSize: 13,
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
    fontSize: 15,
    color: "#1e293b",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  selectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  switchLabel: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
  },
  switchGrid: {
    marginBottom: 8,
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
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#64748b",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  nextBtn: {
    flex: 2,
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
