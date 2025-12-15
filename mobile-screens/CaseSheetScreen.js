import React, { useState, useEffect, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function CaseSheetScreen({ route, navigation }) {
  const { patientType = "adult", vitals = {}, triageData = {}, caseId: existingCaseId } = route.params || {};
  const isPediatric = patientType === "pediatric";

  /* ===================== LOADING & CASE ID ===================== */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState(existingCaseId || null);

  /* ===================== VOICE STATE ===================== */
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  /* ===================== FORM DATA (Single State Object) ===================== */
  const [formData, setFormData] = useState({
    // Patient Info
    patient_name: "",
    patient_age: vitals.age ? String(vitals.age) : "",
    patient_age_unit: vitals.age_unit || "years",
    patient_sex: "Male",
    patient_phone: "",
    patient_address: "",
    patient_uhid: "",
    patient_mode_of_arrival: "Walk-in",
    patient_brought_by: "Self",
    patient_mlc: false,

    // Presenting Complaint
    complaint_text: "",
    complaint_duration: "",
    complaint_onset: "Sudden",

    // Vitals
    vitals_hr: vitals.hr ? String(vitals.hr) : "",
    vitals_rr: vitals.rr ? String(vitals.rr) : "",
    vitals_bp_systolic: vitals.bp_systolic ? String(vitals.bp_systolic) : "",
    vitals_bp_diastolic: vitals.bp_diastolic ? String(vitals.bp_diastolic) : "",
    vitals_spo2: vitals.spo2 ? String(vitals.spo2) : "",
    vitals_temperature: vitals.temperature ? String(vitals.temperature) : "",
    vitals_gcs_e: vitals.gcs_e ? String(vitals.gcs_e) : "",
    vitals_gcs_v: vitals.gcs_v ? String(vitals.gcs_v) : "",
    vitals_gcs_m: vitals.gcs_m ? String(vitals.gcs_m) : "",
    vitals_pain_score: "",
    vitals_grbs: "",
    vitals_capillary_refill: vitals.capillary_refill ? String(vitals.capillary_refill) : "",

    // ABCDE
    airway_status: "Patent",
    airway_notes: "",
    breathing_wob: "Normal",
    breathing_air_entry: "Normal",
    breathing_notes: "",
    circulation_crt: "Normal",
    circulation_skin_color: "Pink",
    circulation_distended_neck_veins: false,
    circulation_notes: "",
    disability_avpu: "Alert",
    disability_pupils: "Equal, Reactive",
    disability_grbs: "",
    exposure_trauma: false,
    exposure_long_bone_deformity: false,
    efast_done: false,
    efast_notes: "",

    // PAT (Pediatric)
    pat_appearance: "Normal",
    pat_tone: "Normal",
    pat_interactivity: "Normal",
    pat_consolability: "Consolable",
    pat_work_of_breathing: "Normal",
    pat_circulation_to_skin: "Normal",
    pat_overall_impression: "Stable",

    // History
    history_hpi: "",
    history_signs_symptoms: "",
    history_allergies: "",
    history_medications: "",
    history_past_medical: "",
    history_past_surgical: "",
    history_last_meal: "",
    history_events: "",
    history_family: "",

    // Examination
    exam_general_pallor: false,
    exam_general_icterus: false,
    exam_general_cyanosis: false,
    exam_general_clubbing: false,
    exam_general_lymphadenopathy: false,
    exam_general_edema: false,
    exam_general_notes: "",
    exam_cvs_status: "Normal",
    exam_cvs_notes: "",
    exam_respiratory_status: "Normal",
    exam_respiratory_notes: "",
    exam_abdomen_status: "Normal",
    exam_abdomen_notes: "",
    exam_cns_status: "Normal",
    exam_cns_notes: "",
    exam_extremities_status: "Normal",
    exam_extremities_notes: "",

    // Treatment
    treatment_interventions: "",
    treatment_course: "",
  });

  /* ===================== TRIAGE INFO ===================== */
  const triage = {
    priority: triageData.priority || "",
    priority_color: triageData.priority_color || "",
    priority_name: triageData.priority_name || "",
  };

  /* ===================== OPTIMIZED FIELD UPDATE ===================== */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /* ===================== LOAD EXISTING CASE ===================== */
  useEffect(() => {
    if (existingCaseId) {
      loadExistingCase(existingCaseId);
    }
  }, [existingCaseId]);

  const loadExistingCase = async (id) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load case");

      const data = await res.json();
      populateFromCaseData(data);
    } catch (err) {
      console.error("Load case error:", err);
    }
    setLoading(false);
  };

  const populateFromCaseData = (data) => {
    const p = data.patient || {};
    const c = data.presenting_complaint || {};
    const v = data.vitals_at_arrival || {};
    const h = data.history || {};
    const pa = data.primary_assessment || {};
    const ex = data.examination || {};
    const tr = data.treatment || {};

    setFormData(prev => ({
      ...prev,
      patient_name: p.name || "",
      patient_age: p.age ? String(p.age) : "",
      patient_sex: p.sex || "Male",
      patient_phone: p.phone || "",
      patient_uhid: p.uhid || "",
      patient_mode_of_arrival: p.mode_of_arrival || "Walk-in",
      patient_mlc: p.mlc || false,

      complaint_text: c.text || "",
      complaint_duration: c.duration || "",
      complaint_onset: c.onset_type || "Sudden",

      vitals_hr: v.hr ? String(v.hr) : "",
      vitals_rr: v.rr ? String(v.rr) : "",
      vitals_bp_systolic: v.bp_systolic ? String(v.bp_systolic) : "",
      vitals_bp_diastolic: v.bp_diastolic ? String(v.bp_diastolic) : "",
      vitals_spo2: v.spo2 ? String(v.spo2) : "",
      vitals_temperature: v.temperature ? String(v.temperature) : "",
      vitals_gcs_e: v.gcs_e ? String(v.gcs_e) : "",
      vitals_gcs_v: v.gcs_v ? String(v.gcs_v) : "",
      vitals_gcs_m: v.gcs_m ? String(v.gcs_m) : "",
      vitals_pain_score: v.pain_score ? String(v.pain_score) : "",
      vitals_grbs: v.grbs ? String(v.grbs) : "",

      history_hpi: h.hpi || "",
      history_allergies: Array.isArray(h.allergies) ? h.allergies.join(", ") : (h.allergies || ""),
      history_medications: h.drug_history || "",
      history_past_medical: Array.isArray(h.past_medical) ? h.past_medical.join(", ") : (h.past_medical || ""),
      history_past_surgical: h.past_surgical || "",

      airway_status: pa.airway_status || "Patent",
      airway_notes: pa.airway_additional_notes || "",
      breathing_wob: pa.breathing_work || "Normal",
      breathing_air_entry: pa.breathing_air_entry?.[0] || "Normal",
      circulation_crt: pa.circulation_crt ? "Delayed" : "Normal",
      disability_avpu: pa.disability_avpu || "Alert",

      exam_cvs_status: ex.cvs_status || "Normal",
      exam_respiratory_status: ex.respiratory_status || "Normal",
      exam_abdomen_status: ex.abdomen_status || "Normal",
      exam_cns_status: ex.cns_status || "Normal",

      treatment_interventions: tr.intervention_notes || "",
      treatment_course: tr.course_in_hospital || "",
    }));
  };

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
     📤 UPLOAD AUDIO → TRANSCRIBE → AUTO-POPULATE
     ========================================================= */

  const uploadAudio = async (uri) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Auth Error", "Please login again");
        return;
      }

      // Step 1: Transcribe
      const formDataUpload = new FormData();
      formDataUpload.append("file", {
        uri,
        name: "casesheet.m4a",
        type: "audio/m4a",
      });
      formDataUpload.append("engine", "auto");
      formDataUpload.append("language", "en");

      const transcribeRes = await fetch(`${API_URL}/ai/voice-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });

      if (!transcribeRes.ok) throw new Error("Transcription failed");

      const transcribeData = await transcribeRes.json();
      if (!transcribeData?.transcription) throw new Error("No transcription");

      setTranscriptText(transcribeData.transcription);

      // Step 2: Parse & Auto-populate
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

      if (!res.ok) throw new Error("Parsing failed");

      const data = await res.json();
      console.log("Parsed data:", JSON.stringify(data, null, 2));

      // Auto-populate all fields
      autoPopulate(data);

      Alert.alert("✅ Success", "Case sheet auto-populated from voice!");
    } catch (err) {
      console.error("Parse error:", err);
      Alert.alert("Parse Error", err.message || "Could not structure data");
    }
  };

  /* =========================================================
     🔄 AUTO-POPULATE FROM PARSED DATA (FIXED)
     ========================================================= */

  const autoPopulate = (data) => {
    setFormData(prev => {
      const updated = { ...prev };

      // Patient Info
      if (data.patient_info) {
        const pi = data.patient_info;
        if (pi.name) updated.patient_name = pi.name;
        if (pi.age) updated.patient_age = String(pi.age);
        if (pi.gender) updated.patient_sex = pi.gender;
        if (pi.sex) updated.patient_sex = pi.sex;
      }

      // Presenting Complaint
      if (data.presenting_complaint) {
        const pc = data.presenting_complaint;
        if (pc.text) updated.complaint_text = pc.text;
        if (pc.chief_complaint) updated.complaint_text = pc.chief_complaint;
        if (pc.duration) updated.complaint_duration = pc.duration;
        if (pc.onset_type) updated.complaint_onset = pc.onset_type;
      }

      // Vitals
      if (data.vitals) {
        const v = data.vitals;
        if (v.hr) updated.vitals_hr = String(v.hr);
        if (v.rr) updated.vitals_rr = String(v.rr);
        if (v.bp_systolic) updated.vitals_bp_systolic = String(v.bp_systolic);
        if (v.bp_diastolic) updated.vitals_bp_diastolic = String(v.bp_diastolic);
        if (v.spo2) updated.vitals_spo2 = String(v.spo2);
        if (v.temperature) updated.vitals_temperature = String(v.temperature);
        if (v.gcs_e) updated.vitals_gcs_e = String(v.gcs_e);
        if (v.gcs_v) updated.vitals_gcs_v = String(v.gcs_v);
        if (v.gcs_m) updated.vitals_gcs_m = String(v.gcs_m);
        if (v.grbs) updated.vitals_grbs = String(v.grbs);
      }

      // History (SAMPLE)
      if (data.history) {
        const h = data.history;
        if (h.hpi) updated.history_hpi = h.hpi;
        if (h.signs_and_symptoms) updated.history_signs_symptoms = h.signs_and_symptoms;
        if (h.allergies) {
          updated.history_allergies = Array.isArray(h.allergies) ? h.allergies.join(", ") : h.allergies;
        }
        if (h.drug_history) updated.history_medications = h.drug_history;
        if (h.medications) updated.history_medications = h.medications;
        if (h.past_medical) {
          updated.history_past_medical = Array.isArray(h.past_medical) ? h.past_medical.join(", ") : h.past_medical;
        }
        if (h.past_surgical) updated.history_past_surgical = h.past_surgical;
        if (h.events) updated.history_events = h.events;
        if (h.events_hopi) updated.history_events = h.events_hopi;
      }

      // Primary Assessment
      if (data.primary_assessment) {
        const pa = data.primary_assessment;
        if (pa.airway_status) updated.airway_status = pa.airway_status;
        if (pa.airway_additional_notes) updated.airway_notes = pa.airway_additional_notes;
        if (pa.breathing_additional_notes) updated.breathing_notes = pa.breathing_additional_notes;
        if (pa.circulation_additional_notes) updated.circulation_notes = pa.circulation_additional_notes;
        if (pa.disability_avpu) updated.disability_avpu = pa.disability_avpu;
      }

      // Examination
      if (data.examination) {
        const ex = data.examination;
        if (ex.general_notes) updated.exam_general_notes = ex.general_notes;
        if (ex.general_pallor !== undefined) updated.exam_general_pallor = ex.general_pallor;
        if (ex.general_icterus !== undefined) updated.exam_general_icterus = ex.general_icterus;
        if (ex.cvs_status) updated.exam_cvs_status = ex.cvs_status;
        if (ex.cvs_additional_notes) updated.exam_cvs_notes = ex.cvs_additional_notes;
        if (ex.respiratory_status) updated.exam_respiratory_status = ex.respiratory_status;
        if (ex.respiratory_additional_notes) updated.exam_respiratory_notes = ex.respiratory_additional_notes;
        if (ex.abdomen_status) updated.exam_abdomen_status = ex.abdomen_status;
        if (ex.abdomen_additional_notes) updated.exam_abdomen_notes = ex.abdomen_additional_notes;
        if (ex.cns_status) updated.exam_cns_status = ex.cns_status;
        if (ex.cns_additional_notes) updated.exam_cns_notes = ex.cns_additional_notes;
      }

      // Treatment
      if (data.treatment) {
        if (data.treatment.intervention_notes) updated.treatment_interventions = data.treatment.intervention_notes;
        if (data.treatment.interventions) {
          updated.treatment_interventions = Array.isArray(data.treatment.interventions)
            ? data.treatment.interventions.join(", ")
            : data.treatment.interventions;
        }
      }

      return updated;
    });
  };

  /* =========================================================
     💾 SAVE CASE SHEET
     ========================================================= */

  const saveCaseSheet = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");

      const payload = {
        case_type: patientType,
        patient: {
          name: formData.patient_name,
          age: formData.patient_age,
          age_unit: formData.patient_age_unit,
          sex: formData.patient_sex,
          phone: formData.patient_phone,
          address: formData.patient_address,
          uhid: formData.patient_uhid,
          mode_of_arrival: formData.patient_mode_of_arrival,
          brought_by: formData.patient_brought_by,
          mlc: formData.patient_mlc,
          arrival_datetime: new Date().toISOString(),
          informant_name: "",
          informant_reliability: "Reliable",
          identification_mark: "",
          nature_of_accident: [],
          mechanism_of_injury: [],
        },
        presenting_complaint: {
          text: formData.complaint_text,
          duration: formData.complaint_duration,
          onset_type: formData.complaint_onset,
          course: "Progressive",
        },
        vitals_at_arrival: {
          hr: formData.vitals_hr ? Number(formData.vitals_hr) : null,
          rr: formData.vitals_rr ? Number(formData.vitals_rr) : null,
          bp_systolic: formData.vitals_bp_systolic ? Number(formData.vitals_bp_systolic) : null,
          bp_diastolic: formData.vitals_bp_diastolic ? Number(formData.vitals_bp_diastolic) : null,
          spo2: formData.vitals_spo2 ? Number(formData.vitals_spo2) : null,
          temperature: formData.vitals_temperature ? Number(formData.vitals_temperature) : null,
          gcs_e: formData.vitals_gcs_e ? Number(formData.vitals_gcs_e) : null,
          gcs_v: formData.vitals_gcs_v ? Number(formData.vitals_gcs_v) : null,
          gcs_m: formData.vitals_gcs_m ? Number(formData.vitals_gcs_m) : null,
          pain_score: formData.vitals_pain_score ? Number(formData.vitals_pain_score) : null,
          grbs: formData.vitals_grbs ? Number(formData.vitals_grbs) : null,
        },
        primary_assessment: {
          airway_status: formData.airway_status,
          airway_additional_notes: formData.airway_notes,
          breathing_work: formData.breathing_wob,
          breathing_air_entry: [formData.breathing_air_entry],
          breathing_additional_notes: formData.breathing_notes,
          circulation_crt: formData.circulation_crt === "Delayed" ? 3 : 2,
          circulation_additional_notes: formData.circulation_notes,
          disability_avpu: formData.disability_avpu,
          disability_pupils_size: formData.disability_pupils,
          disability_grbs: formData.disability_grbs ? Number(formData.disability_grbs) : null,
          exposure_temperature: formData.vitals_temperature ? Number(formData.vitals_temperature) : null,
        },
        pat: isPediatric ? {
          appearance_tone: formData.pat_appearance,
          work_of_breathing: formData.pat_work_of_breathing,
          circulation_to_skin: formData.pat_circulation_to_skin,
        } : null,
        history: {
          hpi: formData.history_hpi,
          signs_and_symptoms: formData.history_signs_symptoms,
          allergies: formData.history_allergies.split(",").map(s => s.trim()).filter(Boolean),
          drug_history: formData.history_medications,
          past_medical: formData.history_past_medical.split(",").map(s => s.trim()).filter(Boolean),
          past_surgical: formData.history_past_surgical,
          last_meal_lmp: formData.history_last_meal,
          events_hopi: formData.history_events,
          family_gyn_additional_notes: formData.history_family,
        },
        examination: {
          general_pallor: formData.exam_general_pallor,
          general_icterus: formData.exam_general_icterus,
          general_cyanosis: formData.exam_general_cyanosis,
          general_clubbing: formData.exam_general_clubbing,
          general_lymphadenopathy: formData.exam_general_lymphadenopathy,
          general_additional_notes: formData.exam_general_notes,
          cvs_status: formData.exam_cvs_status,
          cvs_additional_notes: formData.exam_cvs_notes,
          respiratory_status: formData.exam_respiratory_status,
          respiratory_additional_notes: formData.exam_respiratory_notes,
          abdomen_status: formData.exam_abdomen_status,
          abdomen_additional_notes: formData.exam_abdomen_notes,
          cns_status: formData.exam_cns_status,
          cns_additional_notes: formData.exam_cns_notes,
          extremities_status: formData.exam_extremities_status,
          extremities_additional_notes: formData.exam_extremities_notes,
        },
        treatment: {
          intervention_notes: formData.treatment_interventions,
          course_in_hospital: formData.treatment_course,
          interventions: formData.treatment_interventions.split(",").map(s => s.trim()).filter(Boolean),
        },
        triage_priority: triage.priority ? getPriorityLevel(triage.priority) : null,
        triage_color: triage.priority_color || null,
        em_resident: user.name || "",
        em_consultant: "",
      };

      let response;
      if (caseId) {
        response = await fetch(`${API_URL}/cases/${caseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
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
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to save case");
      }

      const savedCase = await response.json();
      setCaseId(savedCase.id);
      Alert.alert("✅ Saved", "Case sheet saved successfully!");
      return savedCase.id;
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.message || "Failed to save");
      return null;
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     ➡️ PROCEED TO NEXT SCREEN (No mandatory save)
     ========================================================= */

  const proceedToInvestigations = async () => {
    let id = caseId;

    // Auto-save if patient name is filled
    if (formData.patient_name && !caseId) {
      id = await saveCaseSheet();
    }

    navigation.navigate("Investigations", {
      caseId: id,
      patientType,
      patientName: formData.patient_name,
      triageData: triage,
    });
  };

  /* =========================================================
     🧱 UI COMPONENTS (OPTIMIZED)
     ========================================================= */

  const SectionTitle = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#1e40af" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Optimized Input - uses onEndEditing for better performance
  const InputField = ({ label, field, placeholder, multiline, keyboardType }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        defaultValue={formData[field]}
        onChangeText={(text) => updateField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );

  const SelectButtons = ({ label, options, field }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selectBtn, formData[field] === opt && styles.selectBtnActive]}
            onPress={() => updateField(field, opt)}
          >
            <Text style={[styles.selectBtnText, formData[field] === opt && styles.selectBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SwitchRow = ({ label, field }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={formData[field]}
        onValueChange={(v) => updateField(field, v)}
        trackColor={{ false: "#d1d5db", true: "#86efac" }}
        thumbColor={formData[field] ? "#22c55e" : "#f4f3f4"}
      />
    </View>
  );

  const VitalInput = ({ label, field, placeholder }) => (
    <View style={styles.vitalItem}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <TextInput
        style={styles.vitalInput}
        defaultValue={formData[field]}
        onChangeText={(text) => updateField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPediatric ? "👶 Pediatric" : "🏥 Adult"} Case Sheet
          </Text>
          {triage.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(triage.priority) }]}>
              <Text style={styles.priorityText}>{triage.priority}</Text>
            </View>
          )}
        </View>

        {/* Voice Recording */}
        <TouchableOpacity
          style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={loading}
        >
          <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#fff" />
          <Text style={styles.voiceText}>
            {isRecording ? "Stop Recording" : "🎤 Dictate Full Case (Auto-Populate)"}
          </Text>
        </TouchableOpacity>

        {transcriptText ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>📝 Transcript:</Text>
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
        <SectionTitle icon="person" title="Patient Information" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <InputField label="Name" field="patient_name" placeholder="Patient name" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="UHID" field="patient_uhid" placeholder="ID" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField label="Age" field="patient_age" placeholder="Age" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <SelectButtons label="Sex" options={["Male", "Female"]} field="patient_sex" />
            </View>
          </View>

          <InputField label="Phone" field="patient_phone" placeholder="Contact number" keyboardType="phone-pad" />

          <SelectButtons
            label="Mode of Arrival"
            options={["Walk-in", "Ambulance", "Referred"]}
            field="patient_mode_of_arrival"
          />

          <SwitchRow label="MLC (Medico-Legal Case)" field="patient_mlc" />
        </View>

        {/* ==================== PRESENTING COMPLAINT ==================== */}
        <SectionTitle icon="alert-circle" title="Presenting Complaint" />
        <View style={styles.card}>
          <InputField label="Chief Complaint" field="complaint_text" placeholder="Main complaint..." multiline />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField label="Duration" field="complaint_duration" placeholder="e.g., 2 hours" />
            </View>
            <View style={{ flex: 1 }}>
              <SelectButtons label="Onset" options={["Sudden", "Gradual"]} field="complaint_onset" />
            </View>
          </View>
        </View>

        {/* ==================== VITALS ==================== */}
        <SectionTitle icon="heart" title="Vitals at Arrival" />
        <View style={styles.card}>
          <View style={styles.vitalsGrid}>
            <VitalInput label="HR" field="vitals_hr" placeholder="bpm" />
            <VitalInput label="RR" field="vitals_rr" placeholder="/min" />
            <VitalInput label="SpO₂" field="vitals_spo2" placeholder="%" />
            <VitalInput label="Temp" field="vitals_temperature" placeholder="°C" />
            <VitalInput label="BP Sys" field="vitals_bp_systolic" placeholder="mmHg" />
            <VitalInput label="BP Dia" field="vitals_bp_diastolic" placeholder="mmHg" />
          </View>

          <Text style={styles.subSection}>GCS</Text>
          <View style={styles.vitalsGrid}>
            <VitalInput label="E" field="vitals_gcs_e" placeholder="1-4" />
            <VitalInput label="V" field="vitals_gcs_v" placeholder="1-5" />
            <VitalInput label="M" field="vitals_gcs_m" placeholder="1-6" />
            <VitalInput label="Pain" field="vitals_pain_score" placeholder="0-10" />
            <VitalInput label="GRBS" field="vitals_grbs" placeholder="mg/dL" />
            <VitalInput label="CRT" field="vitals_capillary_refill" placeholder="sec" />
          </View>
        </View>

        {/* ==================== PAT (Pediatric Only) ==================== */}
        {isPediatric && (
          <>
            <SectionTitle icon="happy" title="PAT (Pediatric Assessment Triangle)" />
            <View style={styles.card}>
              <SelectButtons label="Appearance" options={["Normal", "Abnormal"]} field="pat_appearance" />
              <SelectButtons label="Tone" options={["Normal", "Hypotonic", "Hypertonic"]} field="pat_tone" />
              <SelectButtons label="Interactivity" options={["Normal", "Decreased", "Absent"]} field="pat_interactivity" />
              <SelectButtons label="Consolability" options={["Consolable", "Inconsolable"]} field="pat_consolability" />
              <SelectButtons label="Work of Breathing" options={["Normal", "Increased"]} field="pat_work_of_breathing" />
              <SelectButtons label="Circulation to Skin" options={["Normal", "Pale", "Mottled", "Cyanotic"]} field="pat_circulation_to_skin" />
              <SelectButtons label="Overall Impression" options={["Stable", "Sick", "Critical"]} field="pat_overall_impression" />
            </View>
          </>
        )}

        {/* ==================== PRIMARY ASSESSMENT (ABCDE) ==================== */}
        <SectionTitle icon="fitness" title="Primary Assessment (ABCDE)" />
        <View style={styles.card}>
          <Text style={styles.subSection}>A - Airway</Text>
          <SelectButtons label="Status" options={["Patent", "Threatened", "Compromised"]} field="airway_status" />
          <InputField label="Notes" field="airway_notes" placeholder="Airway findings..." />

          <Text style={styles.subSection}>B - Breathing</Text>
          <SelectButtons label="Work of Breathing" options={["Normal", "Increased"]} field="breathing_wob" />
          <SelectButtons label="Air Entry" options={["Normal", "Decreased", "Absent"]} field="breathing_air_entry" />
          <InputField label="Notes" field="breathing_notes" placeholder="Breathing findings..." />

          <Text style={styles.subSection}>C - Circulation</Text>
          <SelectButtons label="CRT" options={["Normal", "Delayed"]} field="circulation_crt" />
          <SelectButtons label="Skin Color" options={["Pink", "Pale", "Mottled", "Cyanosed"]} field="circulation_skin_color" />
          <SwitchRow label="Distended Neck Veins" field="circulation_distended_neck_veins" />
          <InputField label="Notes" field="circulation_notes" placeholder="Circulation findings..." />

          <Text style={styles.subSection}>D - Disability</Text>
          <SelectButtons label="AVPU" options={["Alert", "Verbal", "Pain", "Unresponsive"]} field="disability_avpu" />
          <SelectButtons label="Pupils" options={["Equal, Reactive", "Unequal", "Fixed"]} field="disability_pupils" />
          <InputField label="GRBS" field="disability_grbs" placeholder="mg/dL" keyboardType="numeric" />

          <Text style={styles.subSection}>E - Exposure</Text>
          <SwitchRow label="Trauma Signs" field="exposure_trauma" />
          <SwitchRow label="Long Bone Deformity" field="exposure_long_bone_deformity" />
          <SwitchRow label="EFAST Done" field="efast_done" />
          {formData.efast_done && (
            <InputField label="EFAST Findings" field="efast_notes" placeholder="EFAST results..." />
          )}
        </View>

        {/* ==================== HISTORY (SAMPLE) ==================== */}
        <SectionTitle icon="document-text" title="History (SAMPLE)" />
        <View style={styles.card}>
          <InputField label="History of Present Illness" field="history_hpi" placeholder="Detailed history..." multiline />
          <InputField label="Signs & Symptoms" field="history_signs_symptoms" placeholder="Associated symptoms..." />
          <InputField label="Allergies" field="history_allergies" placeholder="NKDA or list allergies" />
          <InputField label="Medications" field="history_medications" placeholder="Current medications..." />
          <InputField label="Past Medical History" field="history_past_medical" placeholder="DM, HTN, Asthma..." />
          <InputField label="Past Surgical History" field="history_past_surgical" placeholder="Previous surgeries..." />
          <InputField label="Last Meal / LMP" field="history_last_meal" placeholder="Time of last meal" />
          <InputField label="Events" field="history_events" placeholder="Events leading to presentation..." multiline />
        </View>

        {/* ==================== TREATMENT ==================== */}
        <SectionTitle icon="medkit" title="Treatment / Interventions" />
        <View style={styles.card}>
          <InputField label="Interventions Done" field="treatment_interventions" placeholder="IV access, medications, procedures..." multiline />
        </View>

        {/* ==================== ACTION BUTTONS ==================== */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={saveCaseSheet}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.btnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, loading && styles.btnDisabled]}
            onPress={proceedToInvestigations}
            disabled={loading}
          >
            <Text style={styles.btnText}>Investigations</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   🎨 HELPERS
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

const getPriorityLevel = (priority) => {
  switch (priority) {
    case "RED": return 1;
    case "ORANGE": return 2;
    case "YELLOW": return 3;
    case "GREEN": return 4;
    case "BLUE": return 5;
    default: return 4;
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
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
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
  },
  voiceBtnRecording: {
    backgroundColor: "#dc2626",
  },
  voiceText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
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
  },
  transcriptText: {
    color: "#0c4a6e",
    fontSize: 13,
  },
  loadingBox: {
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    color: "#64748b",
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
  subSection: {
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
  row: {
    flexDirection: "row",
    gap: 12,
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
    fontSize: 12,
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
  },
  switchLabel: {
    fontSize: 13,
    color: "#475569",
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
    fontSize: 15,
    fontWeight: "600",
  },
  actionRow: {
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
