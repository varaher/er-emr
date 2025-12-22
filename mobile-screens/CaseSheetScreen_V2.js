// CaseSheetScreen_V2.js - Enhanced UI with Dropdowns, Collapsible Sections, Voice Input
// Features: ABCDE with notes, VBG with AI, Examination dropdowns, Psychological Assessment

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function CaseSheetScreen({ route, navigation }) {
  const { patientType = "adult", vitals = {}, triageData = {}, caseId: existingCaseId } = route.params || {};
  const isPediatric = patientType === "pediatric";

  /* ===================== STATE ===================== */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState(existingCaseId || null);
  const [activeTab, setActiveTab] = useState("patient");
  
  // Collapsed sections
  const [collapsed, setCollapsed] = useState({
    airway: false,
    breathing: false,
    circulation: false,
    disability: false,
    exposure: false,
    adjuvants: true,
    generalExam: false,
    cvs: true,
    respiratory: true,
    abdomen: true,
    cns: true,
    extremities: true,
    psychological: true,
  });

  // Examination status (Normal/Abnormal)
  const [examStatus, setExamStatus] = useState({
    cvs: "Normal",
    respiratory: "Normal",
    abdomen: "Normal",
    cns: "Normal",
    extremities: "Normal",
  });

  /* ===================== VOICE STATE ===================== */
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);
  const [transcribing, setTranscribing] = useState(false);

  /* ===================== FORM DATA REF ===================== */
  const formDataRef = useRef({
    // Patient Info
    patient_name: "",
    patient_age: vitals.age ? String(vitals.age) : "",
    patient_sex: "Male",
    patient_phone: "",
    patient_uhid: "",
    patient_mode_of_arrival: "Walk-in",
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
    vitals_gcs_e: "",
    vitals_gcs_v: "",
    vitals_gcs_m: "",
    vitals_pain_score: "",
    vitals_grbs: "",

    // Primary Assessment (ABCDE) with Notes
    airway_status: "Patent",
    airway_interventions: [],
    airway_notes: "",
    
    breathing_wob: "Normal",
    breathing_air_entry: "Equal",
    breathing_breath_sounds: "Normal",
    breathing_notes: "",
    
    circulation_crt: "Normal",
    circulation_skin: "Warm, Dry",
    circulation_pulse: "Regular",
    circulation_jvp: "Normal",
    circulation_notes: "",
    
    disability_avpu: "Alert",
    disability_pupils: "Equal, Reactive",
    disability_motor: "Normal",
    disability_notes: "",
    
    exposure_findings: "",
    exposure_notes: "",

    // Adjuvants to Primary
    ecg_findings: "",
    vbg_ph: "",
    vbg_pco2: "",
    vbg_hco3: "",
    vbg_hb: "",
    vbg_glu: "",
    vbg_lac: "",
    vbg_na: "",
    vbg_k: "",
    vbg_cr: "",
    vbg_ai_interpretation: "",
    bedside_echo: "",
    adjuvants_notes: "",

    // History (SAMPLE)
    history_hpi: "",
    history_signs_symptoms: "",
    history_secondary_survey: "",
    history_allergies: "",
    history_medications: "",
    history_past_medical: "",
    history_past_surgical: "",
    history_last_meal: "",
    history_family_gynae: "",
    history_additional_notes: "",

    // Psychological Assessment
    psych_suicidal_ideation: false,
    psych_self_harm: false,
    psych_harm_others: false,
    psych_substance_abuse: false,
    psych_psychiatric_history: false,
    psych_current_treatment: false,
    psych_support_system: true,
    psych_notes: "",

    // Examination - General
    general_appearance: "Well",
    general_pallor: false,
    general_icterus: false,
    general_cyanosis: false,
    general_clubbing: false,
    general_lymphadenopathy: false,
    general_edema: false,
    general_notes: "",

    // Examination - CVS
    cvs_s1_s2: "Normal",
    cvs_pulse: "Regular",
    cvs_pulse_rate: "",
    cvs_apex_beat: "Normal",
    cvs_precordial_heave: false,
    cvs_added_sounds: "",
    cvs_murmurs: "",
    cvs_notes: "",

    // Examination - Respiratory
    resp_expansion: "Equal",
    resp_percussion: "Resonant",
    resp_breath_sounds: "Vesicular",
    resp_vocal_resonance: "Normal",
    resp_added_sounds: "",
    resp_notes: "",

    // Examination - Abdomen
    abd_umbilical: "Normal",
    abd_organomegaly: "",
    abd_percussion: "Tympanic",
    abd_bowel_sounds: "Present",
    abd_external_genitalia: "Normal",
    abd_hernial_orifices: "Normal",
    abd_per_rectal: "",
    abd_per_vaginal: "",
    abd_notes: "",

    // Examination - CNS
    cns_higher_mental: "Intact",
    cns_cranial_nerves: "Intact",
    cns_sensory: "Intact",
    cns_motor: "Normal",
    cns_reflexes: "Normal",
    cns_romberg: "Negative",
    cns_cerebellar: "Normal",
    cns_notes: "",

    // Examination - Extremities
    ext_findings: "",
    ext_notes: "",

    // Treatment
    treatment_interventions: "",
  });

  // Select states for UI
  const [selectStates, setSelectStates] = useState({
    patient_sex: "Male",
    patient_mode_of_arrival: "Walk-in",
    complaint_onset: "Sudden",
    airway_status: "Patent",
    breathing_wob: "Normal",
    breathing_air_entry: "Equal",
    circulation_crt: "Normal",
    circulation_pulse: "Regular",
    disability_avpu: "Alert",
    disability_pupils: "Equal, Reactive",
    patient_mlc: false,
  });

  /* ===================== HELPERS ===================== */
  const [, setForceRender] = useState(0);
  const forceUpdate = () => setForceRender(prev => prev + 1);

  const toggleCollapse = (section) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateTextField = useCallback((field, value) => {
    formDataRef.current[field] = value;
  }, []);

  const updateSelectField = useCallback((field, value) => {
    formDataRef.current[field] = value;
    setSelectStates(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateExamStatus = (exam, status) => {
    setExamStatus(prev => ({ ...prev, [exam]: status }));
  };

  // Toggle intervention in array field
  const toggleIntervention = (field, item) => {
    const current = formDataRef.current[field] || [];
    if (current.includes(item)) {
      formDataRef.current[field] = current.filter(i => i !== item);
    } else {
      formDataRef.current[field] = [...current, item];
    }
    forceUpdate();
  };

  /* ===================== VOICE RECORDING ===================== */
  const startVoiceInput = async (field) => {
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
      setActiveVoiceField(field);
    } catch (err) {
      console.error("Recording error:", err);
      Alert.alert("Error", "Cannot start recording");
    }
  };

  const stopVoiceInput = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      // Transcribe
      setTranscribing(true);
      const token = await AsyncStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("file", { uri, name: "voice.m4a", type: "audio/m4a" });
      formData.append("engine", "auto");
      formData.append("language", "en");

      const res = await fetch(`${API_URL}/ai/voice-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription && activeVoiceField) {
          const currentValue = formDataRef.current[activeVoiceField] || "";
          formDataRef.current[activeVoiceField] = currentValue 
            ? `${currentValue}\n${data.transcription}` 
            : data.transcription;
          // Force re-render
          setSelectStates(prev => ({ ...prev }));
        }
      }
      setTranscribing(false);
      setActiveVoiceField(null);
    } catch (err) {
      console.error("Voice error:", err);
      setTranscribing(false);
      setActiveVoiceField(null);
    }
  };

  /* ===================== VBG AI INTERPRETATION ===================== */
  const getVBGInterpretation = async () => {
    const fd = formDataRef.current;
    
    if (!fd.vbg_ph && !fd.vbg_pco2 && !fd.vbg_hco3) {
      Alert.alert("Required", "Please enter VBG values first");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      
      const vbgData = {
        ph: fd.vbg_ph,
        pco2: fd.vbg_pco2,
        hco3: fd.vbg_hco3,
        hb: fd.vbg_hb,
        glucose: fd.vbg_glu,
        lactate: fd.vbg_lac,
        sodium: fd.vbg_na,
        potassium: fd.vbg_k,
        creatinine: fd.vbg_cr,
      };

      const res = await fetch(`${API_URL}/ai/interpretation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          case_sheet_id: caseId || "new",
          type: "vbg",
          data: vbgData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        formDataRef.current.vbg_ai_interpretation = data.interpretation || data.response || "";
        setSelectStates(prev => ({ ...prev }));
        Alert.alert("✅ AI Interpretation", formDataRef.current.vbg_ai_interpretation);
      } else {
        throw new Error("Failed to get interpretation");
      }
    } catch (err) {
      console.error("VBG interpretation error:", err);
      Alert.alert("Error", "Failed to get AI interpretation");
    }
    setLoading(false);
  };

  /* ===================== SAVE ===================== */
  const saveCaseSheet = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");
      const fd = formDataRef.current;

      const payload = {
        case_type: patientType,
        patient: {
          name: fd.patient_name,
          age: fd.patient_age,
          sex: fd.patient_sex,
          phone: fd.patient_phone,
          uhid: fd.patient_uhid,
          mode_of_arrival: fd.patient_mode_of_arrival,
          mlc: fd.patient_mlc,
          arrival_datetime: new Date().toISOString(),
        },
        presenting_complaint: {
          text: fd.complaint_text,
          duration: fd.complaint_duration,
          onset_type: fd.complaint_onset,
        },
        vitals_at_arrival: {
          hr: fd.vitals_hr ? Number(fd.vitals_hr) : null,
          rr: fd.vitals_rr ? Number(fd.vitals_rr) : null,
          bp_systolic: fd.vitals_bp_systolic ? Number(fd.vitals_bp_systolic) : null,
          bp_diastolic: fd.vitals_bp_diastolic ? Number(fd.vitals_bp_diastolic) : null,
          spo2: fd.vitals_spo2 ? Number(fd.vitals_spo2) : null,
          temperature: fd.vitals_temperature ? Number(fd.vitals_temperature) : null,
          gcs_e: fd.vitals_gcs_e ? Number(fd.vitals_gcs_e) : null,
          gcs_v: fd.vitals_gcs_v ? Number(fd.vitals_gcs_v) : null,
          gcs_m: fd.vitals_gcs_m ? Number(fd.vitals_gcs_m) : null,
          pain_score: fd.vitals_pain_score ? Number(fd.vitals_pain_score) : null,
          grbs: fd.vitals_grbs ? Number(fd.vitals_grbs) : null,
        },
        primary_assessment: {
          airway_status: fd.airway_status,
          airway_interventions: fd.airway_interventions,
          airway_additional_notes: fd.airway_notes,
          breathing_work: fd.breathing_wob,
          breathing_air_entry: [fd.breathing_air_entry],
          breathing_additional_notes: fd.breathing_notes,
          circulation_crt: fd.circulation_crt === "Delayed" ? 3 : 2,
          circulation_additional_notes: fd.circulation_notes,
          disability_avpu: fd.disability_avpu,
          disability_pupils_size: fd.disability_pupils,
          disability_additional_notes: fd.disability_notes,
          exposure_additional_notes: fd.exposure_notes,
        },
        adjuvants: {
          ecg_findings: fd.ecg_findings,
          vbg: {
            ph: fd.vbg_ph,
            pco2: fd.vbg_pco2,
            hco3: fd.vbg_hco3,
            hb: fd.vbg_hb,
            glucose: fd.vbg_glu,
            lactate: fd.vbg_lac,
            sodium: fd.vbg_na,
            potassium: fd.vbg_k,
            creatinine: fd.vbg_cr,
            ai_interpretation: fd.vbg_ai_interpretation,
          },
          bedside_echo: fd.bedside_echo,
          additional_notes: fd.adjuvants_notes,
        },
        history: {
          hpi: fd.history_hpi,
          signs_and_symptoms: fd.history_signs_symptoms,
          secondary_survey: fd.history_secondary_survey,
          allergies: fd.history_allergies.split(",").map(s => s.trim()).filter(Boolean),
          drug_history: fd.history_medications,
          past_medical: fd.history_past_medical.split(",").map(s => s.trim()).filter(Boolean),
          past_surgical: fd.history_past_surgical,
          last_meal_lmp: fd.history_last_meal,
          family_gyn_additional_notes: fd.history_family_gynae,
          additional_notes: fd.history_additional_notes,
        },
        psychological_assessment: {
          suicidal_ideation: fd.psych_suicidal_ideation,
          self_harm: fd.psych_self_harm,
          harm_others: fd.psych_harm_others,
          substance_abuse: fd.psych_substance_abuse,
          psychiatric_history: fd.psych_psychiatric_history,
          current_treatment: fd.psych_current_treatment,
          support_system: fd.psych_support_system,
          notes: fd.psych_notes,
        },
        examination: {
          general_appearance: fd.general_appearance,
          general_pallor: fd.general_pallor,
          general_icterus: fd.general_icterus,
          general_cyanosis: fd.general_cyanosis,
          general_clubbing: fd.general_clubbing,
          general_lymphadenopathy: fd.general_lymphadenopathy,
          general_edema: fd.general_edema,
          general_notes: fd.general_notes,
          cvs_status: examStatus.cvs,
          cvs_s1_s2: fd.cvs_s1_s2,
          cvs_pulse: fd.cvs_pulse,
          cvs_pulse_rate: fd.cvs_pulse_rate,
          cvs_apex_beat: fd.cvs_apex_beat,
          cvs_precordial_heave: fd.cvs_precordial_heave,
          cvs_added_sounds: fd.cvs_added_sounds,
          cvs_murmurs: fd.cvs_murmurs,
          cvs_additional_notes: fd.cvs_notes,
          respiratory_status: examStatus.respiratory,
          respiratory_expansion: fd.resp_expansion,
          respiratory_percussion: fd.resp_percussion,
          respiratory_breath_sounds: fd.resp_breath_sounds,
          respiratory_vocal_resonance: fd.resp_vocal_resonance,
          respiratory_added_sounds: fd.resp_added_sounds,
          respiratory_additional_notes: fd.resp_notes,
          abdomen_status: examStatus.abdomen,
          abdomen_umbilical: fd.abd_umbilical,
          abdomen_organomegaly: fd.abd_organomegaly,
          abdomen_percussion: fd.abd_percussion,
          abdomen_bowel_sounds: fd.abd_bowel_sounds,
          abdomen_external_genitalia: fd.abd_external_genitalia,
          abdomen_hernial_orifices: fd.abd_hernial_orifices,
          abdomen_per_rectal: fd.abd_per_rectal,
          abdomen_per_vaginal: fd.abd_per_vaginal,
          abdomen_additional_notes: fd.abd_notes,
          cns_status: examStatus.cns,
          cns_higher_mental: fd.cns_higher_mental,
          cns_cranial_nerves: fd.cns_cranial_nerves,
          cns_sensory: fd.cns_sensory,
          cns_motor: fd.cns_motor,
          cns_reflexes: fd.cns_reflexes,
          cns_romberg: fd.cns_romberg,
          cns_cerebellar: fd.cns_cerebellar,
          cns_additional_notes: fd.cns_notes,
          extremities_status: examStatus.extremities,
          extremities_findings: fd.ext_findings,
          extremities_additional_notes: fd.ext_notes,
        },
        treatment: {
          intervention_notes: fd.treatment_interventions,
        },
        em_resident: user.name || "",
      };

      let response;
      if (caseId) {
        response = await fetch(`${API_URL}/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_URL}/cases`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error("Failed to save");

      const savedCase = await response.json();
      setCaseId(savedCase.id);
      Alert.alert("✅ Saved", "Case sheet saved!");
      return savedCase.id;
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const proceedNext = async () => {
    let id = caseId;
    if (formDataRef.current.patient_name && !caseId) {
      id = await saveCaseSheet();
    }
    navigation.navigate("PhysicalExam", {
      caseId: id,
      patientType,
      patientName: formDataRef.current.patient_name,
    });
  };

  /* ===================== UI COMPONENTS ===================== */

  // Collapsible Section Header
  const CollapsibleHeader = ({ title, icon, section, color = "#1e40af" }) => (
    <TouchableOpacity 
      style={styles.collapsibleHeader} 
      onPress={() => toggleCollapse(section)}
    >
      <View style={styles.collapsibleLeft}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.collapsibleTitle, { color }]}>{title}</Text>
      </View>
      <Ionicons 
        name={collapsed[section] ? "chevron-down" : "chevron-up"} 
        size={20} 
        color="#64748b" 
      />
    </TouchableOpacity>
  );

  // Voice Input Button
  const VoiceButton = ({ field }) => (
    <TouchableOpacity
      style={[
        styles.voiceBtn,
        isRecording && activeVoiceField === field && styles.voiceBtnRecording,
      ]}
      onPress={() => {
        if (isRecording && activeVoiceField === field) {
          stopVoiceInput();
        } else if (!isRecording) {
          startVoiceInput(field);
        }
      }}
      disabled={transcribing || (isRecording && activeVoiceField !== field)}
    >
      {transcribing && activeVoiceField === field ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons 
          name={isRecording && activeVoiceField === field ? "stop" : "mic"} 
          size={16} 
          color="#fff" 
        />
      )}
    </TouchableOpacity>
  );

  // Text Input with Voice
  const InputWithVoice = ({ label, field, placeholder, multiline = false }) => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <VoiceButton field={field} />
      </View>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        defaultValue={formDataRef.current[field]}
        onChangeText={(text) => updateTextField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
      />
    </View>
  );

  // Simple Input
  const InputField = ({ label, field, placeholder, keyboardType = "default" }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        defaultValue={formDataRef.current[field]}
        onChangeText={(text) => updateTextField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
      />
    </View>
  );

  // Select Buttons
  const SelectButtons = ({ label, options, field }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selectBtn, selectStates[field] === opt && styles.selectBtnActive]}
            onPress={() => updateSelectField(field, opt)}
          >
            <Text style={[styles.selectBtnText, selectStates[field] === opt && styles.selectBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Normal/Abnormal Dropdown
  const ExamDropdown = ({ exam, label }) => (
    <View style={styles.examDropdown}>
      <Text style={styles.examLabel}>{label}</Text>
      <View style={styles.examToggle}>
        <TouchableOpacity
          style={[styles.examToggleBtn, examStatus[exam] === "Normal" && styles.examToggleNormal]}
          onPress={() => updateExamStatus(exam, "Normal")}
        >
          <Text style={[styles.examToggleText, examStatus[exam] === "Normal" && styles.examToggleTextActive]}>
            Normal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.examToggleBtn, examStatus[exam] === "Abnormal" && styles.examToggleAbnormal]}
          onPress={() => updateExamStatus(exam, "Abnormal")}
        >
          <Text style={[styles.examToggleText, examStatus[exam] === "Abnormal" && styles.examToggleTextActive]}>
            Abnormal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Switch Row
  const SwitchRow = ({ label, field }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={formDataRef.current[field]}
        onValueChange={(v) => {
          formDataRef.current[field] = v;
          setSelectStates(prev => ({ ...prev }));
        }}
        trackColor={{ false: "#d1d5db", true: "#86efac" }}
        thumbColor={formDataRef.current[field] ? "#22c55e" : "#f4f3f4"}
      />
    </View>
  );

  // Vital Input
  const VitalInput = ({ label, field, placeholder }) => (
    <View style={styles.vitalItem}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <TextInput
        style={styles.vitalInput}
        defaultValue={formDataRef.current[field]}
        onChangeText={(text) => updateTextField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
      />
    </View>
  );

  // Tab Button
  const TabButton = ({ id, label, icon }) => (
    <TouchableOpacity
      style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]}
      onPress={() => setActiveTab(id)}
    >
      <Ionicons name={icon} size={18} color={activeTab === id ? "#fff" : "#64748b"} />
      <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  /* ===================== RENDER ===================== */
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPediatric ? "👶 Pediatric" : "🏥 Adult"} Case Sheet
          </Text>
          <TouchableOpacity onPress={saveCaseSheet} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name="save" size={24} color="#2563eb" />
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TabButton id="patient" label="Patient" icon="person" />
            <TabButton id="vitals" label="Vitals" icon="heart" />
            <TabButton id="primary" label="Primary" icon="fitness" />
            <TabButton id="history" label="History" icon="document-text" />
            <TabButton id="exam" label="Exam" icon="body" />
          </ScrollView>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          
          {/* ==================== PATIENT TAB ==================== */}
          {activeTab === "patient" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <InputField label="Name *" field="patient_name" placeholder="Patient name" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField label="Age *" field="patient_age" placeholder="Age" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectButtons label="Sex" options={["Male", "Female"]} field="patient_sex" />
                  </View>
                </View>
                <InputField label="UHID" field="patient_uhid" placeholder="Hospital ID" />
                <InputField label="Phone" field="patient_phone" placeholder="Contact" keyboardType="phone-pad" />
                <SelectButtons label="Mode of Arrival" options={["Walk-in", "Ambulance", "Referred"]} field="patient_mode_of_arrival" />
                <SwitchRow label="MLC Case" field="patient_mlc" />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Presenting Complaint</Text>
                <InputWithVoice label="Chief Complaint" field="complaint_text" placeholder="Describe complaint..." multiline />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField label="Duration" field="complaint_duration" placeholder="e.g., 2 hours" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectButtons label="Onset" options={["Sudden", "Gradual"]} field="complaint_onset" />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ==================== VITALS TAB ==================== */}
          {activeTab === "vitals" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Vitals at Arrival</Text>
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
                </View>
              </View>
            </View>
          )}

          {/* ==================== PRIMARY ASSESSMENT TAB ==================== */}
          {activeTab === "primary" && (
            <View style={styles.tabContent}>
              {/* A - Airway */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
                <CollapsibleHeader title="A - AIRWAY" icon="medical" section="airway" color="#ef4444" />
                {!collapsed.airway && (
                  <View style={styles.collapsibleContent}>
                    {/* Normal/Abnormal Toggle */}
                    <View style={styles.statusToggleRow}>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.airway_status === 'Patent' && styles.statusToggleNormalActive]}
                        onPress={() => { updateTextField('airway_status', 'Patent'); forceUpdate(); }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={formDataRef.current.airway_status === 'Patent' ? '#fff' : '#22c55e'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.airway_status === 'Patent' && styles.statusToggleTextActive]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.airway_status !== 'Patent' && styles.statusToggleAbnormalActive]}
                        onPress={() => { updateTextField('airway_status', 'Compromised'); forceUpdate(); }}
                      >
                        <Ionicons name="alert-circle" size={16} color={formDataRef.current.airway_status !== 'Patent' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.airway_status !== 'Patent' && styles.statusToggleTextActive]}>Abnormal</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Expanded options when Abnormal */}
                    {formDataRef.current.airway_status !== 'Patent' && (
                      <View style={styles.abnormalDetails}>
                        <SelectButtons label="Position" options={["Self-maintained", "Head tilt/Chin lift", "Jaw thrust"]} field="airway_position" />
                        <SelectButtons label="Patency" options={["Partial obstruction", "Complete obstruction"]} field="airway_patency" />
                        <SelectButtons label="Cause" options={["Tongue fall", "Secretions", "Blood/Vomitus", "Foreign body", "Edema"]} field="airway_obstruction_cause" />
                        <SelectButtons label="Speech" options={["Hoarse", "Stridor", "Gurgling", "Unable to speak"]} field="airway_speech" />
                        <Text style={styles.checkboxLabel}>Interventions Done:</Text>
                        <View style={styles.checkboxGrid}>
                          {['Suction', 'OPA', 'NPA', 'LMA', 'ETT', 'Cricothyrotomy'].map(item => (
                            <TouchableOpacity key={item} style={styles.checkboxItem} onPress={() => toggleIntervention('airway_interventions', item)}>
                              <Ionicons name={formDataRef.current.airway_interventions?.includes(item) ? 'checkbox' : 'square-outline'} size={20} color="#ef4444" />
                              <Text style={styles.checkboxText}>{item}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <InputWithVoice label="Notes" field="airway_notes" placeholder="Additional airway observations..." multiline />
                  </View>
                )}
              </View>

              {/* B - Breathing */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#f97316' }]}>
                <CollapsibleHeader title="B - BREATHING" icon="fitness" section="breathing" color="#f97316" />
                {!collapsed.breathing && (
                  <View style={styles.collapsibleContent}>
                    {/* Normal/Abnormal Toggle */}
                    <View style={styles.statusToggleRow}>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.breathing_wob === 'Normal' && styles.statusToggleNormalActive]}
                        onPress={() => { updateTextField('breathing_wob', 'Normal'); forceUpdate(); }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={formDataRef.current.breathing_wob === 'Normal' ? '#fff' : '#22c55e'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.breathing_wob === 'Normal' && styles.statusToggleTextActive]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.breathing_wob !== 'Normal' && styles.statusToggleAbnormalActive]}
                        onPress={() => { updateTextField('breathing_wob', 'Increased'); forceUpdate(); }}
                      >
                        <Ionicons name="alert-circle" size={16} color={formDataRef.current.breathing_wob !== 'Normal' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.breathing_wob !== 'Normal' && styles.statusToggleTextActive]}>Abnormal</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Vitals Row */}
                    <View style={styles.vitalsRowCompact}>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>RR</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.breathing_rr} onChangeText={(t) => updateTextField('breathing_rr', t)} placeholder="/min" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>SpO2</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.breathing_spo2} onChangeText={(t) => updateTextField('breathing_spo2', t)} placeholder="%" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>O2 Flow</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.breathing_o2_flow} onChangeText={(t) => updateTextField('breathing_o2_flow', t)} placeholder="L/min" keyboardType="numeric" />
                      </View>
                    </View>
                    
                    {/* Expanded options when Abnormal */}
                    {formDataRef.current.breathing_wob !== 'Normal' && (
                      <View style={styles.abnormalDetails}>
                        <SelectButtons label="Effort" options={["Mild ↑", "Moderate ↑", "Severe ↑", "Exhaustion"]} field="breathing_effort" />
                        <SelectButtons label="O2 Device" options={["Room air", "Nasal prongs", "Face mask", "NRM", "NIV", "Ventilator"]} field="breathing_o2_device" />
                        <SelectButtons label="Pattern" options={["Tachypneic", "Bradypneic", "Kussmaul", "Cheyne-Stokes"]} field="breathing_pattern" />
                        <SelectButtons label="Chest Expansion" options={["Equal", "Reduced L", "Reduced R", "Reduced both"]} field="breathing_expansion" />
                        <SelectButtons label="Air Entry" options={["Reduced L", "Reduced R", "Reduced both", "Absent L", "Absent R"]} field="breathing_air_entry" />
                        <SelectButtons label="Added Sounds" options={["Wheeze", "Crackles", "Rhonchi", "Stridor"]} field="breathing_added_sounds" />
                        <Text style={styles.checkboxLabel}>Interventions:</Text>
                        <View style={styles.checkboxGrid}>
                          {['Nebulization', 'ICD', 'Needle decomp', 'BVM', 'Intubation'].map(item => (
                            <TouchableOpacity key={item} style={styles.checkboxItem} onPress={() => toggleIntervention('breathing_interventions', item)}>
                              <Ionicons name={formDataRef.current.breathing_interventions?.includes(item) ? 'checkbox' : 'square-outline'} size={20} color="#f97316" />
                              <Text style={styles.checkboxText}>{item}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <InputWithVoice label="Notes" field="breathing_notes" placeholder="Additional breathing observations..." multiline />
                  </View>
                )}
              </View>

              {/* C - Circulation */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#eab308' }]}>
                <CollapsibleHeader title="C - CIRCULATION" icon="heart" section="circulation" color="#eab308" />
                {!collapsed.circulation && (
                  <View style={styles.collapsibleContent}>
                    {/* Normal/Abnormal Toggle */}
                    <View style={styles.statusToggleRow}>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.circulation_status === 'Normal' && styles.statusToggleNormalActive]}
                        onPress={() => { updateTextField('circulation_status', 'Normal'); forceUpdate(); }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={formDataRef.current.circulation_status === 'Normal' ? '#fff' : '#22c55e'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.circulation_status === 'Normal' && styles.statusToggleTextActive]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.circulation_status !== 'Normal' && styles.statusToggleAbnormalActive]}
                        onPress={() => { updateTextField('circulation_status', 'Abnormal'); forceUpdate(); }}
                      >
                        <Ionicons name="alert-circle" size={16} color={formDataRef.current.circulation_status !== 'Normal' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.circulation_status !== 'Normal' && styles.statusToggleTextActive]}>Abnormal</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Vitals Row */}
                    <View style={styles.vitalsRowCompact}>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>HR</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.circulation_hr} onChangeText={(t) => updateTextField('circulation_hr', t)} placeholder="bpm" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>BP</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.circulation_bp} onChangeText={(t) => updateTextField('circulation_bp', t)} placeholder="Sys/Dia" />
                      </View>
                    </View>
                    
                    {/* Expanded options when Abnormal */}
                    {formDataRef.current.circulation_status !== 'Normal' && (
                      <View style={styles.abnormalDetails}>
                        <SelectButtons label="Rhythm" options={["Regular", "Irregular", "Irreg irregular"]} field="circulation_rhythm" />
                        <SelectButtons label="CRT" options={["<2 sec", "2-3 sec", ">3 sec"]} field="circulation_crt" />
                        <SelectButtons label="Skin" options={["Warm dry", "Cool dry", "Cool clammy", "Mottled"]} field="circulation_skin" />
                        <SelectButtons label="Pulses" options={["Present", "Weak", "Absent", "Asymmetric"]} field="circulation_pulse" />
                        <SelectButtons label="JVP" options={["Normal", "Raised", "Flat"]} field="circulation_jvp" />
                        <View style={styles.checkboxGrid}>
                          <TouchableOpacity style={styles.checkboxItem} onPress={() => { formDataRef.current.circulation_external_bleed = !formDataRef.current.circulation_external_bleed; forceUpdate(); }}>
                            <Ionicons name={formDataRef.current.circulation_external_bleed ? 'checkbox' : 'square-outline'} size={20} color="#eab308" />
                            <Text style={styles.checkboxText}>External Bleeding</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.checkboxItem} onPress={() => { formDataRef.current.circulation_long_bone = !formDataRef.current.circulation_long_bone; forceUpdate(); }}>
                            <Ionicons name={formDataRef.current.circulation_long_bone ? 'checkbox' : 'square-outline'} size={20} color="#eab308" />
                            <Text style={styles.checkboxText}>Long Bone Deformity</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.checkboxLabel}>Interventions:</Text>
                        <View style={styles.checkboxGrid}>
                          {['IV access', 'IO access', 'Fluid bolus', 'Blood', 'Vasopressors', 'CPR'].map(item => (
                            <TouchableOpacity key={item} style={styles.checkboxItem} onPress={() => toggleIntervention('circulation_interventions', item)}>
                              <Ionicons name={formDataRef.current.circulation_interventions?.includes(item) ? 'checkbox' : 'square-outline'} size={20} color="#eab308" />
                              <Text style={styles.checkboxText}>{item}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <InputWithVoice label="Notes" field="circulation_notes" placeholder="Additional circulation observations..." multiline />
                  </View>
                )}
              </View>

              {/* D - Disability */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#22c55e' }]}>
                <CollapsibleHeader title="D - DISABILITY (Neuro)" icon="brain" section="disability" color="#22c55e" />
                {!collapsed.disability && (
                  <View style={styles.collapsibleContent}>
                    {/* Normal/Abnormal Toggle */}
                    <View style={styles.statusToggleRow}>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.disability_avpu === 'Alert' && styles.statusToggleNormalActive]}
                        onPress={() => { updateTextField('disability_avpu', 'Alert'); forceUpdate(); }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={formDataRef.current.disability_avpu === 'Alert' ? '#fff' : '#22c55e'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.disability_avpu === 'Alert' && styles.statusToggleTextActive]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.disability_avpu !== 'Alert' && styles.statusToggleAbnormalActive]}
                        onPress={() => { updateTextField('disability_avpu', 'Verbal'); forceUpdate(); }}
                      >
                        <Ionicons name="alert-circle" size={16} color={formDataRef.current.disability_avpu !== 'Alert' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.disability_avpu !== 'Alert' && styles.statusToggleTextActive]}>Abnormal</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* GCS Row */}
                    <View style={styles.vitalsRowCompact}>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>GCS E</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.disability_gcs_e} onChangeText={(t) => updateTextField('disability_gcs_e', t)} placeholder="1-4" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>V</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.disability_gcs_v} onChangeText={(t) => updateTextField('disability_gcs_v', t)} placeholder="1-5" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>M</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.disability_gcs_m} onChangeText={(t) => updateTextField('disability_gcs_m', t)} placeholder="1-6" keyboardType="numeric" />
                      </View>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>GRBS</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.disability_grbs} onChangeText={(t) => updateTextField('disability_grbs', t)} placeholder="mg/dL" keyboardType="numeric" />
                      </View>
                    </View>
                    
                    {/* Expanded options when Abnormal */}
                    {formDataRef.current.disability_avpu !== 'Alert' && (
                      <View style={styles.abnormalDetails}>
                        <SelectButtons label="AVPU" options={["Verbal", "Pain", "Unresponsive"]} field="disability_avpu" />
                        <SelectButtons label="Pupils Size" options={["Equal", "Unequal", "Dilated", "Constricted"]} field="disability_pupils_size" />
                        <SelectButtons label="Pupils Reaction" options={["Brisk", "Sluggish", "Non-reactive", "Fixed"]} field="disability_pupils_reaction" />
                        <SelectButtons label="Lateralizing" options={["None", "Left hemiparesis", "Right hemiparesis", "Facial droop"]} field="disability_lateralizing" />
                        <TouchableOpacity style={styles.checkboxItem} onPress={() => { formDataRef.current.disability_seizure = !formDataRef.current.disability_seizure; forceUpdate(); }}>
                          <Ionicons name={formDataRef.current.disability_seizure ? 'checkbox' : 'square-outline'} size={20} color="#22c55e" />
                          <Text style={styles.checkboxText}>Seizure Observed</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <InputWithVoice label="Notes" field="disability_notes" placeholder="Additional neuro observations..." multiline />
                  </View>
                )}
              </View>

              {/* E - Exposure */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
                <CollapsibleHeader title="E - EXPOSURE" icon="body" section="exposure" color="#3b82f6" />
                {!collapsed.exposure && (
                  <View style={styles.collapsibleContent}>
                    {/* Normal/Abnormal Toggle */}
                    <View style={styles.statusToggleRow}>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.exposure_status === 'Normal' && styles.statusToggleNormalActive]}
                        onPress={() => { updateTextField('exposure_status', 'Normal'); forceUpdate(); }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={formDataRef.current.exposure_status === 'Normal' ? '#fff' : '#22c55e'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.exposure_status === 'Normal' && styles.statusToggleTextActive]}>Normal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggle, formDataRef.current.exposure_status !== 'Normal' && styles.statusToggleAbnormalActive]}
                        onPress={() => { updateTextField('exposure_status', 'Abnormal'); forceUpdate(); }}
                      >
                        <Ionicons name="alert-circle" size={16} color={formDataRef.current.exposure_status !== 'Normal' ? '#fff' : '#ef4444'} />
                        <Text style={[styles.statusToggleText, formDataRef.current.exposure_status !== 'Normal' && styles.statusToggleTextActive]}>Abnormal</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Temperature */}
                    <View style={styles.vitalsRowCompact}>
                      <View style={styles.vitalItemCompact}>
                        <Text style={styles.vitalLabelCompact}>Temp</Text>
                        <TextInput style={styles.vitalInputCompact} defaultValue={formDataRef.current.exposure_temperature} onChangeText={(t) => updateTextField('exposure_temperature', t)} placeholder="°C" keyboardType="decimal-pad" />
                      </View>
                    </View>
                    
                    {/* Expanded options when Abnormal */}
                    {formDataRef.current.exposure_status !== 'Normal' && (
                      <View style={styles.abnormalDetails}>
                        <SelectButtons label="Rashes" options={["None", "Petechiae", "Purpura", "Urticaria", "Vesicular"]} field="exposure_rashes" />
                        <SelectButtons label="Bruises" options={["None", "Head/Face", "Chest", "Abdomen", "Extremities", "Multiple"]} field="exposure_bruises" />
                        <Text style={styles.checkboxLabel}>Logroll Findings:</Text>
                        <View style={styles.checkboxGrid}>
                          {['Spinal tenderness', 'Deformity', 'Sacral edema', 'Pressure sores'].map(item => (
                            <TouchableOpacity key={item} style={styles.checkboxItem} onPress={() => toggleIntervention('exposure_logroll', item)}>
                              <Ionicons name={formDataRef.current.exposure_logroll?.includes(item) ? 'checkbox' : 'square-outline'} size={20} color="#3b82f6" />
                              <Text style={styles.checkboxText}>{item}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <InputWithVoice label="Local Exam / Notes" field="exposure_notes" placeholder="Local examination findings..." multiline />
                  </View>
                )}
              </View>

              {/* R - Reassessment */}
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#8b5cf6' }]}>
                <CollapsibleHeader title="R - REASSESSMENT" icon="refresh" section="reassessment" color="#8b5cf6" />
                {!collapsed.reassessment && (
                  <View style={styles.collapsibleContent}>
                    <SelectButtons label="Status After Resuscitation" options={["Improving", "Stable", "Deteriorating", "Critical"]} field="reassessment_status" />
                    <InputWithVoice label="Reassessment Notes" field="reassessment_notes" placeholder="Response to interventions..." multiline />
                  </View>
                )}
              </View>

              {/* Adjuvants to Primary */}
              <View style={styles.card}>
                <CollapsibleHeader title="Adjuvants to Primary" icon="analytics" section="adjuvants" color="#6b7280" />
                {!collapsed.adjuvants && (
                  <View style={styles.collapsibleContent}>
                    <InputWithVoice label="ECG Findings" field="ecg_findings" placeholder="ECG interpretation..." multiline />
                    
                    <Text style={styles.subSection}>VBG Parameters</Text>
                    <View style={styles.vbgGrid}>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>pH</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_ph} onChangeText={(t) => updateTextField("vbg_ph", t)} placeholder="7.35-7.45" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>PCO2</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_pco2} onChangeText={(t) => updateTextField("vbg_pco2", t)} placeholder="35-45" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>HCO3</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_hco3} onChangeText={(t) => updateTextField("vbg_hco3", t)} placeholder="22-26" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>Hb</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_hb} onChangeText={(t) => updateTextField("vbg_hb", t)} placeholder="12-16" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>Glucose</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_glu} onChangeText={(t) => updateTextField("vbg_glu", t)} placeholder="70-110" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>Lactate</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_lac} onChangeText={(t) => updateTextField("vbg_lac", t)} placeholder="0.5-2" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>Na</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_na} onChangeText={(t) => updateTextField("vbg_na", t)} placeholder="135-145" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>K</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_k} onChangeText={(t) => updateTextField("vbg_k", t)} placeholder="3.5-5" keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.vbgItem}>
                        <Text style={styles.vbgLabel}>Cr</Text>
                        <TextInput style={styles.vbgInput} defaultValue={formDataRef.current.vbg_cr} onChangeText={(t) => updateTextField("vbg_cr", t)} placeholder="0.7-1.3" keyboardType="decimal-pad" />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.aiBtn} onPress={getVBGInterpretation} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Ionicons name="sparkles" size={18} color="#fff" />
                          <Text style={styles.aiBtnText}>AI Interpretation</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {formDataRef.current.vbg_ai_interpretation ? (
                      <View style={styles.aiResult}>
                        <Text style={styles.aiResultTitle}>🤖 AI Interpretation:</Text>
                        <Text style={styles.aiResultText}>{formDataRef.current.vbg_ai_interpretation}</Text>
                      </View>
                    ) : null}

                    <InputWithVoice label="Bedside Echo" field="bedside_echo" placeholder="Echo findings..." multiline />
                    <InputWithVoice label="Additional Notes" field="adjuvants_notes" placeholder="Other adjuvant notes..." multiline />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ==================== HISTORY TAB ==================== */}
          {activeTab === "history" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>History (SAMPLE)</Text>
                <InputWithVoice label="Signs & Symptoms" field="history_signs_symptoms" placeholder="Associated symptoms..." multiline />
                <InputWithVoice label="Secondary Survey" field="history_secondary_survey" placeholder="Head-to-toe assessment..." multiline />
                <InputWithVoice label="Allergies" field="history_allergies" placeholder="NKDA or list allergies" />
                <InputWithVoice label="Medications" field="history_medications" placeholder="Current medications..." />
                <InputWithVoice label="Past Medical History" field="history_past_medical" placeholder="DM, HTN, Asthma..." />
                <InputWithVoice label="Past Surgical History" field="history_past_surgical" placeholder="Previous surgeries..." />
                <InputField label="Last Meal / LMP" field="history_last_meal" placeholder="Time of last meal/LMP date" />
                {/* Events / HOPI - Now placed after Last Meal/LMP */}
                <View style={[styles.highlightedField, { borderLeftColor: '#8b5cf6' }]}>
                  <InputWithVoice label="Events / HOPI" field="history_hpi" placeholder="Events and history of present illness..." multiline />
                </View>
                <InputWithVoice label="Family / Gynae History" field="history_family_gynae" placeholder="Family history..." multiline />
                <InputWithVoice label="Additional Notes" field="history_additional_notes" placeholder="Any other relevant history..." multiline />
              </View>

              {/* Psychological Assessment */}
              <View style={styles.card}>
                <CollapsibleHeader title="Psychological Assessment" icon="happy" section="psychological" color="#ec4899" />
                {!collapsed.psychological && (
                  <View style={styles.collapsibleContent}>
                    <SwitchRow label="Suicidal Ideation" field="psych_suicidal_ideation" />
                    <SwitchRow label="Self-Harm History" field="psych_self_harm" />
                    <SwitchRow label="Intent to Harm Others" field="psych_harm_others" />
                    <SwitchRow label="Substance Abuse" field="psych_substance_abuse" />
                    <SwitchRow label="Psychiatric History" field="psych_psychiatric_history" />
                    <SwitchRow label="Currently on Psychiatric Treatment" field="psych_current_treatment" />
                    <SwitchRow label="Has Support System" field="psych_support_system" />
                    <InputWithVoice label="Notes" field="psych_notes" placeholder="Additional psychological notes..." multiline />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ==================== EXAMINATION TAB ==================== */}
          {activeTab === "exam" && (
            <View style={styles.tabContent}>
              {/* General Examination */}
              <View style={styles.card}>
                <CollapsibleHeader title="General Examination" icon="person" section="generalExam" color="#0ea5e9" />
                {!collapsed.generalExam && (
                  <View style={styles.collapsibleContent}>
                    <View style={styles.checkboxGrid}>
                      <SwitchRow label="Pallor" field="general_pallor" />
                      <SwitchRow label="Icterus" field="general_icterus" />
                      <SwitchRow label="Cyanosis" field="general_cyanosis" />
                      <SwitchRow label="Clubbing" field="general_clubbing" />
                      <SwitchRow label="Lymphadenopathy" field="general_lymphadenopathy" />
                      <SwitchRow label="Edema" field="general_edema" />
                    </View>
                    <InputWithVoice label="Additional Notes" field="general_notes" placeholder="General exam notes..." multiline />
                  </View>
                )}
              </View>

              {/* CVS */}
              <View style={styles.card}>
                <CollapsibleHeader title="Cardiovascular System" icon="heart" section="cvs" color="#ef4444" />
                {!collapsed.cvs && (
                  <View style={styles.collapsibleContent}>
                    <ExamDropdown exam="cvs" label="CVS Status" />
                    {examStatus.cvs === "Normal" ? (
                      <Text style={styles.normalSummary}>S1S2 heard, no murmurs, regular rhythm</Text>
                    ) : (
                      <>
                        <SelectButtons label="S1/S2" options={["Normal", "Soft", "Loud"]} field="cvs_s1_s2" />
                        <SelectButtons label="Pulse" options={["Regular", "Irregular"]} field="cvs_pulse" />
                        <InputField label="Pulse Rate" field="cvs_pulse_rate" placeholder="/min" keyboardType="numeric" />
                        <SelectButtons label="Apex Beat" options={["Normal", "Displaced"]} field="cvs_apex_beat" />
                        <SwitchRow label="Precordial Heave" field="cvs_precordial_heave" />
                        <InputField label="Added Sounds" field="cvs_added_sounds" placeholder="S3, S4..." />
                        <InputField label="Murmurs" field="cvs_murmurs" placeholder="Describe murmurs..." />
                      </>
                    )}
                    <InputWithVoice label="Additional Notes" field="cvs_notes" placeholder="CVS notes..." multiline />
                  </View>
                )}
              </View>

              {/* Respiratory */}
              <View style={styles.card}>
                <CollapsibleHeader title="Respiratory System" icon="fitness" section="respiratory" color="#f97316" />
                {!collapsed.respiratory && (
                  <View style={styles.collapsibleContent}>
                    <ExamDropdown exam="respiratory" label="Respiratory Status" />
                    {examStatus.respiratory === "Normal" ? (
                      <Text style={styles.normalSummary}>Equal air entry, vesicular breath sounds, no added sounds</Text>
                    ) : (
                      <>
                        <SelectButtons label="Expansion" options={["Equal", "Reduced"]} field="resp_expansion" />
                        <SelectButtons label="Percussion" options={["Resonant", "Dull", "Hyper-resonant"]} field="resp_percussion" />
                        <SelectButtons label="Breath Sounds" options={["Vesicular", "Bronchial", "Diminished"]} field="resp_breath_sounds" />
                        <SelectButtons label="Vocal Resonance" options={["Normal", "Increased", "Decreased"]} field="resp_vocal_resonance" />
                        <InputField label="Added Sounds" field="resp_added_sounds" placeholder="Crackles, wheezes..." />
                      </>
                    )}
                    <InputWithVoice label="Additional Notes" field="resp_notes" placeholder="Respiratory notes..." multiline />
                  </View>
                )}
              </View>

              {/* Abdomen */}
              <View style={styles.card}>
                <CollapsibleHeader title="Abdomen" icon="body" section="abdomen" color="#22c55e" />
                {!collapsed.abdomen && (
                  <View style={styles.collapsibleContent}>
                    <ExamDropdown exam="abdomen" label="Abdomen Status" />
                    {examStatus.abdomen === "Normal" ? (
                      <Text style={styles.normalSummary}>Soft, non-tender, no organomegaly, bowel sounds present</Text>
                    ) : (
                      <>
                        <SelectButtons label="Umbilical" options={["Normal", "Herniated"]} field="abd_umbilical" />
                        <InputField label="Organomegaly" field="abd_organomegaly" placeholder="Hepatomegaly, splenomegaly..." />
                        <SelectButtons label="Percussion" options={["Tympanic", "Dull", "Shifting"]} field="abd_percussion" />
                        <SelectButtons label="Bowel Sounds" options={["Present", "Absent", "Hyperactive"]} field="abd_bowel_sounds" />
                        <SelectButtons label="External Genitalia" options={["Normal", "Abnormal"]} field="abd_external_genitalia" />
                        <SelectButtons label="Hernial Orifices" options={["Normal", "Hernia present"]} field="abd_hernial_orifices" />
                        <InputField label="Per Rectal" field="abd_per_rectal" placeholder="If done..." />
                        <InputField label="Per Vaginal" field="abd_per_vaginal" placeholder="If done..." />
                      </>
                    )}
                    <InputWithVoice label="Additional Notes" field="abd_notes" placeholder="Abdomen notes..." multiline />
                  </View>
                )}
              </View>

              {/* CNS */}
              <View style={styles.card}>
                <CollapsibleHeader title="Central Nervous System" icon="brain" section="cns" color="#8b5cf6" />
                {!collapsed.cns && (
                  <View style={styles.collapsibleContent}>
                    <ExamDropdown exam="cns" label="CNS Status" />
                    {examStatus.cns === "Normal" ? (
                      <Text style={styles.normalSummary}>Alert, oriented, cranial nerves intact, no focal deficits</Text>
                    ) : (
                      <>
                        <SelectButtons label="Higher Mental Functions" options={["Intact", "Impaired"]} field="cns_higher_mental" />
                        <SelectButtons label="Cranial Nerves" options={["Intact", "Deficit"]} field="cns_cranial_nerves" />
                        <SelectButtons label="Sensory System" options={["Intact", "Impaired"]} field="cns_sensory" />
                        <SelectButtons label="Motor System" options={["Normal", "Weakness"]} field="cns_motor" />
                        <SelectButtons label="Reflexes" options={["Normal", "Brisk", "Diminished"]} field="cns_reflexes" />
                        <SelectButtons label="Romberg Sign" options={["Negative", "Positive"]} field="cns_romberg" />
                        <SelectButtons label="Cerebellar Signs" options={["Normal", "Abnormal"]} field="cns_cerebellar" />
                      </>
                    )}
                    <InputWithVoice label="Additional Notes" field="cns_notes" placeholder="CNS notes..." multiline />
                  </View>
                )}
              </View>

              {/* Extremities */}
              <View style={styles.card}>
                <CollapsibleHeader title="Extremities" icon="hand-left" section="extremities" color="#ec4899" />
                {!collapsed.extremities && (
                  <View style={styles.collapsibleContent}>
                    <ExamDropdown exam="extremities" label="Extremities Status" />
                    {examStatus.extremities === "Abnormal" && (
                      <InputWithVoice label="Findings" field="ext_findings" placeholder="Describe findings..." multiline />
                    )}
                    <InputWithVoice label="Additional Notes" field="ext_notes" placeholder="Extremities notes..." multiline />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={saveCaseSheet} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.btnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={proceedNext}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  tabBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    gap: 6,
  },
  tabBtnActive: { backgroundColor: "#2563eb" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#fff" },
  content: { flex: 1 },
  tabContent: { padding: 12 },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e40af",
    padding: 16,
    paddingBottom: 8,
  },
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  inputGroup: { marginBottom: 12, paddingHorizontal: 16 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569" },
  input: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 14,
    color: "#1e293b",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  selectBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  selectBtnTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchLabel: { fontSize: 13, color: "#475569" },
  voiceBtn: {
    backgroundColor: "#2563eb",
    padding: 6,
    borderRadius: 6,
  },
  voiceBtnRecording: { backgroundColor: "#dc2626" },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  collapsibleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  collapsibleTitle: { fontSize: 15, fontWeight: "700" },
  collapsibleContent: { paddingBottom: 16 },
  subSection: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  vitalItem: { width: "30%" },
  vitalLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginBottom: 4, textAlign: "center" },
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
  vbgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  vbgItem: { width: "31%" },
  vbgLabel: { fontSize: 10, fontWeight: "700", color: "#8b5cf6", marginBottom: 2, textAlign: "center" },
  vbgInput: {
    backgroundColor: "#f5f3ff",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c4b5fd",
    textAlign: "center",
    fontSize: 13,
  },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    padding: 12,
    borderRadius: 10,
    margin: 16,
    gap: 8,
  },
  aiBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  aiResult: {
    backgroundColor: "#f5f3ff",
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  aiResultTitle: { fontSize: 13, fontWeight: "700", color: "#7c3aed", marginBottom: 6 },
  aiResultText: { fontSize: 13, color: "#5b21b6", lineHeight: 20 },
  examDropdown: { paddingHorizontal: 16, marginBottom: 12 },
  examLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  examToggle: { flexDirection: "row", gap: 8 },
  examToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  examToggleNormal: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  examToggleAbnormal: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  examToggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  examToggleTextActive: { color: "#1e293b" },
  normalSummary: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    fontSize: 13,
    color: "#166534",
    fontStyle: "italic",
  },
  checkboxGrid: { paddingHorizontal: 0 },
  actionRow: { flexDirection: "row", gap: 12, padding: 16 },
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
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
