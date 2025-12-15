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
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ PRODUCTION API URL - Use this for Render deployment
const API_URL = "https://er-emr-backend.onrender.com/api";

export default function PhysicalExamScreen({ route, navigation }) {
  const { caseId, patientType = "adult", patientName = "", triageData = {} } = route.params || {};
  const isPediatric = patientType === "pediatric";

  /* ===================== LOADING STATE ===================== */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ===================== VOICE STATE ===================== */
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  /* ===================== FORM DATA (Single State Object) ===================== */
  const [formData, setFormData] = useState({
    // General Examination
    general_appearance: "Well",
    general_build: "Normal",
    general_nutrition: "Normal",
    general_pallor: false,
    general_icterus: false,
    general_cyanosis: false,
    general_clubbing: false,
    general_lymphadenopathy: false,
    general_edema: false,
    general_dehydration: "None",
    general_notes: "",

    // Head & Neck
    head_scalp: "Normal",
    head_face: "Symmetrical",
    head_eyes: "Normal",
    head_pupils: "Equal, Reactive",
    head_ears: "Normal",
    head_nose: "Normal",
    head_throat: "Normal",
    head_neck_veins: "Not Distended",
    head_thyroid: "Normal",
    head_notes: "",

    // Cardiovascular System
    cvs_inspection: "Normal",
    cvs_palpation: "Normal",
    cvs_apex_beat: "Normal",
    cvs_s1_s2: "Normal",
    cvs_murmurs: "None",
    cvs_peripheral_pulses: "Present",
    cvs_capillary_refill: "Normal",
    cvs_notes: "",

    // Respiratory System
    respiratory_inspection: "Normal",
    respiratory_chest_shape: "Normal",
    respiratory_trachea: "Central",
    respiratory_expansion: "Equal",
    respiratory_percussion: "Resonant",
    respiratory_breath_sounds: "Vesicular",
    respiratory_added_sounds: "None",
    respiratory_notes: "",

    // Abdomen
    abdomen_inspection: "Normal",
    abdomen_shape: "Flat",
    abdomen_umbilicus: "Central",
    abdomen_palpation: "Soft",
    abdomen_tenderness: "None",
    abdomen_guarding: false,
    abdomen_rigidity: false,
    abdomen_organomegaly: "None",
    abdomen_bowel_sounds: "Present",
    abdomen_notes: "",

    // CNS
    cns_consciousness: "Alert",
    cns_orientation: "Oriented",
    cns_speech: "Normal",
    cns_memory: "Intact",
    cns_cranial_nerves: "Intact",
    cns_motor_power: "5/5",
    cns_sensory: "Intact",
    cns_reflexes: "Normal",
    cns_coordination: "Normal",
    cns_gait: "Normal",
    cns_notes: "",

    // Musculoskeletal
    msk_inspection: "Normal",
    msk_deformity: "None",
    msk_swelling: "None",
    msk_tenderness: "None",
    msk_range_of_motion: "Full",
    msk_notes: "",

    // Skin
    skin_color: "Normal",
    skin_temperature: "Warm",
    skin_moisture: "Normal",
    skin_rashes: false,
    skin_wounds: false,
    skin_notes: "",

    // Local Examination
    local_site: "",
    local_findings: "",
  });

  /* ===================== OPTIMIZED FIELD UPDATE ===================== */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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
        name: "physicalexam.m4a",
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
      await parseExamTranscript(transcribeData.transcription, token);
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Voice Error", err.message || "Unable to process voice");
    }
    setLoading(false);
  };

  const parseExamTranscript = async (text, token) => {
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
          extraction_type: "physical_exam",
        }),
      });

      if (!res.ok) throw new Error("Parsing failed");

      const data = await res.json();
      console.log("Parsed exam data:", JSON.stringify(data, null, 2));

      // Auto-populate examination fields
      autoPopulateExam(data);

      Alert.alert("✅ Success", "Physical exam auto-populated from voice!");
    } catch (err) {
      console.error("Parse error:", err);
      Alert.alert("Parse Error", err.message || "Could not structure data");
    }
  };

  /* =========================================================
     🔄 AUTO-POPULATE FROM PARSED DATA
     ========================================================= */

  const autoPopulateExam = (data) => {
    setFormData(prev => {
      const updated = { ...prev };

      // Examination data
      if (data.examination) {
        const ex = data.examination;
        
        // General
        if (ex.general_pallor !== undefined) updated.general_pallor = ex.general_pallor;
        if (ex.general_icterus !== undefined) updated.general_icterus = ex.general_icterus;
        if (ex.general_cyanosis !== undefined) updated.general_cyanosis = ex.general_cyanosis;
        if (ex.general_clubbing !== undefined) updated.general_clubbing = ex.general_clubbing;
        if (ex.general_lymphadenopathy !== undefined) updated.general_lymphadenopathy = ex.general_lymphadenopathy;
        if (ex.general_notes) updated.general_notes = ex.general_notes;
        if (ex.general_additional_notes) updated.general_notes = ex.general_additional_notes;

        // CVS
        if (ex.cvs_status) updated.cvs_inspection = ex.cvs_status;
        if (ex.cvs_s1_s2) updated.cvs_s1_s2 = ex.cvs_s1_s2;
        if (ex.cvs_murmurs) updated.cvs_murmurs = ex.cvs_murmurs;
        if (ex.cvs_additional_notes) updated.cvs_notes = ex.cvs_additional_notes;

        // Respiratory
        if (ex.respiratory_status) updated.respiratory_inspection = ex.respiratory_status;
        if (ex.respiratory_expansion) updated.respiratory_expansion = ex.respiratory_expansion;
        if (ex.respiratory_percussion) updated.respiratory_percussion = ex.respiratory_percussion;
        if (ex.respiratory_breath_sounds) updated.respiratory_breath_sounds = ex.respiratory_breath_sounds;
        if (ex.respiratory_added_sounds) updated.respiratory_added_sounds = ex.respiratory_added_sounds;
        if (ex.respiratory_additional_notes) updated.respiratory_notes = ex.respiratory_additional_notes;

        // Abdomen
        if (ex.abdomen_status) updated.abdomen_palpation = ex.abdomen_status;
        if (ex.abdomen_organomegaly) updated.abdomen_organomegaly = ex.abdomen_organomegaly;
        if (ex.abdomen_bowel_sounds) updated.abdomen_bowel_sounds = ex.abdomen_bowel_sounds;
        if (ex.abdomen_additional_notes) updated.abdomen_notes = ex.abdomen_additional_notes;

        // CNS
        if (ex.cns_status) updated.cns_consciousness = ex.cns_status;
        if (ex.cns_higher_mental) updated.cns_orientation = ex.cns_higher_mental;
        if (ex.cns_cranial_nerves) updated.cns_cranial_nerves = ex.cns_cranial_nerves;
        if (ex.cns_motor_system) updated.cns_motor_power = ex.cns_motor_system;
        if (ex.cns_sensory_system) updated.cns_sensory = ex.cns_sensory_system;
        if (ex.cns_reflexes) updated.cns_reflexes = ex.cns_reflexes;
        if (ex.cns_additional_notes) updated.cns_notes = ex.cns_additional_notes;

        // Extremities/MSK
        if (ex.extremities_status) updated.msk_inspection = ex.extremities_status;
        if (ex.extremities_findings) updated.msk_notes = ex.extremities_findings;
        if (ex.extremities_additional_notes) updated.msk_notes = ex.extremities_additional_notes;
      }

      return updated;
    });
  };

  /* =========================================================
     💾 SAVE EXAMINATION
     ========================================================= */

  const saveExamination = async () => {
    if (!caseId) {
      Alert.alert("Error", "No case ID - please save case sheet first");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        examination: {
          general_pallor: formData.general_pallor,
          general_icterus: formData.general_icterus,
          general_cyanosis: formData.general_cyanosis,
          general_clubbing: formData.general_clubbing,
          general_lymphadenopathy: formData.general_lymphadenopathy,
          general_notes: formData.general_notes,
          general_additional_notes: formData.general_notes,
          
          cvs_status: formData.cvs_inspection,
          cvs_s1_s2: formData.cvs_s1_s2,
          cvs_murmurs: formData.cvs_murmurs,
          cvs_additional_notes: formData.cvs_notes,
          
          respiratory_status: formData.respiratory_inspection,
          respiratory_expansion: formData.respiratory_expansion,
          respiratory_percussion: formData.respiratory_percussion,
          respiratory_breath_sounds: formData.respiratory_breath_sounds,
          respiratory_added_sounds: formData.respiratory_added_sounds,
          respiratory_additional_notes: formData.respiratory_notes,
          
          abdomen_status: formData.abdomen_palpation,
          abdomen_organomegaly: formData.abdomen_organomegaly,
          abdomen_bowel_sounds: formData.abdomen_bowel_sounds,
          abdomen_additional_notes: formData.abdomen_notes,
          
          cns_status: formData.cns_consciousness,
          cns_higher_mental: formData.cns_orientation,
          cns_cranial_nerves: formData.cns_cranial_nerves,
          cns_motor_system: formData.cns_motor_power,
          cns_sensory_system: formData.cns_sensory,
          cns_reflexes: formData.cns_reflexes,
          cns_additional_notes: formData.cns_notes,
          
          extremities_status: formData.msk_inspection,
          extremities_findings: formData.msk_notes,
          extremities_additional_notes: formData.msk_notes,
        },
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
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to save examination");
      }

      Alert.alert("✅ Saved", "Physical examination saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     ➡️ PROCEED TO NEXT SCREEN
     ========================================================= */

  const proceedToTreatment = async () => {
    // Auto-save before proceeding
    if (caseId) {
      await saveExamination();
    }

    navigation.navigate("Treatment", {
      caseId,
      patientType,
      patientName,
      triageData,
    });
  };

  /* =========================================================
     🧱 UI COMPONENTS
     ========================================================= */

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
          <Text style={styles.headerTitle}>🩺 Physical Examination</Text>
          {triageData.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(triageData.priority) }]}>
              <Text style={styles.priorityText}>{triageData.priority}</Text>
            </View>
          )}
        </View>

        {/* Patient Info Banner */}
        {patientName && (
          <View style={styles.patientBanner}>
            <Ionicons name="person" size={18} color="#1e40af" />
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientType}>• {isPediatric ? "Pediatric" : "Adult"}</Text>
          </View>
        )}

        {/* Voice Recording */}
        <TouchableOpacity
          style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={loading}
        >
          <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#fff" />
          <Text style={styles.voiceText}>
            {isRecording ? "Stop Recording" : "🎤 Dictate Examination Findings"}
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

        {/* ==================== GENERAL EXAMINATION ==================== */}
        <SectionTitle icon="body" title="General Examination" />
        <View style={styles.card}>
          <SelectButtons label="Appearance" options={["Well", "Unwell", "Toxic", "Moribund"]} field="general_appearance" />
          <SelectButtons label="Build" options={["Normal", "Thin", "Obese"]} field="general_build" />
          <SelectButtons label="Nutrition" options={["Normal", "Malnourished", "Over-nourished"]} field="general_nutrition" />
          
          <Text style={styles.subSection}>Clinical Signs</Text>
          <SwitchRow label="Pallor" field="general_pallor" />
          <SwitchRow label="Icterus" field="general_icterus" />
          <SwitchRow label="Cyanosis" field="general_cyanosis" />
          <SwitchRow label="Clubbing" field="general_clubbing" />
          <SwitchRow label="Lymphadenopathy" field="general_lymphadenopathy" />
          <SwitchRow label="Edema" field="general_edema" />
          
          <SelectButtons label="Dehydration" options={["None", "Mild", "Moderate", "Severe"]} field="general_dehydration" />
          <InputField label="Notes" field="general_notes" placeholder="General findings..." multiline />
        </View>

        {/* ==================== CVS ==================== */}
        <SectionTitle icon="heart" title="Cardiovascular System" />
        <View style={styles.card}>
          <SelectButtons label="Inspection" options={["Normal", "Abnormal"]} field="cvs_inspection" />
          <SelectButtons label="S1 S2" options={["Normal", "Loud", "Soft", "Split"]} field="cvs_s1_s2" />
          <SelectButtons label="Murmurs" options={["None", "Systolic", "Diastolic", "Continuous"]} field="cvs_murmurs" />
          <SelectButtons label="Peripheral Pulses" options={["Present", "Weak", "Absent"]} field="cvs_peripheral_pulses" />
          <SelectButtons label="Capillary Refill" options={["Normal", "Delayed (>2s)"]} field="cvs_capillary_refill" />
          <InputField label="Notes" field="cvs_notes" placeholder="CVS findings..." multiline />
        </View>

        {/* ==================== RESPIRATORY ==================== */}
        <SectionTitle icon="fitness" title="Respiratory System" />
        <View style={styles.card}>
          <SelectButtons label="Inspection" options={["Normal", "Abnormal"]} field="respiratory_inspection" />
          <SelectButtons label="Chest Shape" options={["Normal", "Barrel", "Pigeon", "Funnel"]} field="respiratory_chest_shape" />
          <SelectButtons label="Trachea" options={["Central", "Deviated"]} field="respiratory_trachea" />
          <SelectButtons label="Expansion" options={["Equal", "Reduced"]} field="respiratory_expansion" />
          <SelectButtons label="Percussion" options={["Resonant", "Dull", "Hyper-resonant"]} field="respiratory_percussion" />
          <SelectButtons label="Breath Sounds" options={["Vesicular", "Bronchial", "Absent", "Diminished"]} field="respiratory_breath_sounds" />
          <SelectButtons label="Added Sounds" options={["None", "Crackles", "Wheeze", "Rhonchi", "Stridor"]} field="respiratory_added_sounds" />
          <InputField label="Notes" field="respiratory_notes" placeholder="Respiratory findings..." multiline />
        </View>

        {/* ==================== ABDOMEN ==================== */}
        <SectionTitle icon="nutrition" title="Abdomen" />
        <View style={styles.card}>
          <SelectButtons label="Shape" options={["Flat", "Distended", "Scaphoid"]} field="abdomen_shape" />
          <SelectButtons label="Palpation" options={["Soft", "Firm", "Rigid", "Board-like"]} field="abdomen_palpation" />
          <SelectButtons label="Tenderness" options={["None", "Localized", "Generalized"]} field="abdomen_tenderness" />
          <SwitchRow label="Guarding" field="abdomen_guarding" />
          <SwitchRow label="Rigidity" field="abdomen_rigidity" />
          <SelectButtons label="Organomegaly" options={["None", "Hepatomegaly", "Splenomegaly", "Both"]} field="abdomen_organomegaly" />
          <SelectButtons label="Bowel Sounds" options={["Present", "Hyperactive", "Hypoactive", "Absent"]} field="abdomen_bowel_sounds" />
          <InputField label="Notes" field="abdomen_notes" placeholder="Abdominal findings..." multiline />
        </View>

        {/* ==================== CNS ==================== */}
        <SectionTitle icon="brain" title="Central Nervous System" />
        <View style={styles.card}>
          <SelectButtons label="Consciousness" options={["Alert", "Drowsy", "Obtunded", "Comatose"]} field="cns_consciousness" />
          <SelectButtons label="Orientation" options={["Oriented", "Disoriented", "Confused"]} field="cns_orientation" />
          <SelectButtons label="Speech" options={["Normal", "Slurred", "Dysarthric", "Aphasic"]} field="cns_speech" />
          <SelectButtons label="Cranial Nerves" options={["Intact", "Deficit"]} field="cns_cranial_nerves" />
          <SelectButtons label="Motor Power" options={["5/5", "4/5", "3/5", "2/5", "1/5", "0/5"]} field="cns_motor_power" />
          <SelectButtons label="Sensory" options={["Intact", "Diminished", "Absent"]} field="cns_sensory" />
          <SelectButtons label="Reflexes" options={["Normal", "Brisk", "Diminished", "Absent"]} field="cns_reflexes" />
          <SelectButtons label="Gait" options={["Normal", "Abnormal", "Unable"]} field="cns_gait" />
          <InputField label="Notes" field="cns_notes" placeholder="CNS findings..." multiline />
        </View>

        {/* ==================== MUSCULOSKELETAL ==================== */}
        <SectionTitle icon="barbell" title="Musculoskeletal" />
        <View style={styles.card}>
          <SelectButtons label="Inspection" options={["Normal", "Abnormal"]} field="msk_inspection" />
          <SelectButtons label="Deformity" options={["None", "Present"]} field="msk_deformity" />
          <SelectButtons label="Swelling" options={["None", "Present"]} field="msk_swelling" />
          <SelectButtons label="Tenderness" options={["None", "Present"]} field="msk_tenderness" />
          <SelectButtons label="Range of Motion" options={["Full", "Limited", "Painful"]} field="msk_range_of_motion" />
          <InputField label="Notes" field="msk_notes" placeholder="MSK findings..." multiline />
        </View>

        {/* ==================== SKIN ==================== */}
        <SectionTitle icon="hand-left" title="Skin" />
        <View style={styles.card}>
          <SelectButtons label="Color" options={["Normal", "Pale", "Jaundiced", "Cyanotic", "Flushed"]} field="skin_color" />
          <SelectButtons label="Temperature" options={["Warm", "Cold", "Hot"]} field="skin_temperature" />
          <SelectButtons label="Moisture" options={["Normal", "Dry", "Moist", "Diaphoretic"]} field="skin_moisture" />
          <SwitchRow label="Rashes" field="skin_rashes" />
          <SwitchRow label="Wounds/Lacerations" field="skin_wounds" />
          <InputField label="Notes" field="skin_notes" placeholder="Skin findings..." multiline />
        </View>

        {/* ==================== LOCAL EXAMINATION ==================== */}
        <SectionTitle icon="search" title="Local Examination" />
        <View style={styles.card}>
          <InputField label="Site" field="local_site" placeholder="Area being examined..." />
          <InputField label="Findings" field="local_findings" placeholder="Detailed local findings..." multiline />
        </View>

        {/* ==================== ACTION BUTTONS ==================== */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={saveExamination}
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
            onPress={proceedToTreatment}
            disabled={loading}
          >
            <Text style={styles.btnText}>Treatment</Text>
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
  patientType: {
    fontSize: 12,
    color: "#64748b",
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
