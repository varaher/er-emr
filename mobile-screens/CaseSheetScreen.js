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

// Drug Database for Emergency Medicine
const ADULT_DRUGS = [
  { name: "Adrenaline", strength: "1mg/mL", doses: ["0.5mg IM", "1mg IV"] },
  { name: "Atropine", strength: "0.6mg/mL", doses: ["0.6mg IV", "1.2mg IV"] },
  { name: "Amiodarone", strength: "150mg/3mL", doses: ["150mg IV", "300mg IV"] },
  { name: "Aspirin", strength: "325mg", doses: ["325mg PO", "150mg PO"] },
  { name: "Clopidogrel", strength: "75mg", doses: ["300mg loading", "75mg maintenance"] },
  { name: "Diazepam", strength: "10mg/2mL", doses: ["5mg IV", "10mg IV", "5mg PR"] },
  { name: "Dopamine", strength: "200mg/5mL", doses: ["5mcg/kg/min", "10mcg/kg/min", "15mcg/kg/min"] },
  { name: "Dobutamine", strength: "250mg/20mL", doses: ["5mcg/kg/min", "10mcg/kg/min"] },
  { name: "Dexamethasone", strength: "4mg/mL", doses: ["4mg IV", "8mg IV"] },
  { name: "Fentanyl", strength: "50mcg/mL", doses: ["50mcg IV", "100mcg IV"] },
  { name: "Furosemide", strength: "20mg/2mL", doses: ["20mg IV", "40mg IV", "80mg IV"] },
  { name: "Hydrocortisone", strength: "100mg", doses: ["100mg IV", "200mg IV"] },
  { name: "Heparin", strength: "5000U/mL", doses: ["5000U SC", "60U/kg bolus"] },
  { name: "Insulin Regular", strength: "100U/mL", doses: ["10U IV", "0.1U/kg/hr"] },
  { name: "Ketamine", strength: "50mg/mL", doses: ["1mg/kg IV", "2mg/kg IM"] },
  { name: "Labetalol", strength: "5mg/mL", doses: ["20mg IV", "40mg IV"] },
  { name: "Lidocaine", strength: "2%", doses: ["1mg/kg IV", "1.5mg/kg IV"] },
  { name: "Magnesium Sulfate", strength: "50%", doses: ["2g IV", "4g IV"] },
  { name: "Midazolam", strength: "5mg/mL", doses: ["2mg IV", "5mg IV", "5mg IM"] },
  { name: "Morphine", strength: "10mg/mL", doses: ["2mg IV", "4mg IV", "5mg SC"] },
  { name: "Naloxone", strength: "0.4mg/mL", doses: ["0.4mg IV", "0.8mg IV", "2mg IN"] },
  { name: "Nitroglycerin", strength: "5mg/mL", doses: ["0.4mg SL", "5mcg/min infusion"] },
  { name: "Noradrenaline", strength: "4mg/4mL", doses: ["0.1mcg/kg/min", "0.2mcg/kg/min"] },
  { name: "Ondansetron", strength: "4mg/2mL", doses: ["4mg IV", "8mg IV"] },
  { name: "Pantoprazole", strength: "40mg", doses: ["40mg IV", "80mg IV bolus"] },
  { name: "Paracetamol", strength: "1g/100mL", doses: ["1g IV", "650mg PO"] },
  { name: "Phenytoin", strength: "250mg/5mL", doses: ["15mg/kg IV", "20mg/kg IV"] },
  { name: "Propofol", strength: "10mg/mL", doses: ["1mg/kg IV", "2mg/kg IV"] },
  { name: "Rocuronium", strength: "50mg/5mL", doses: ["0.6mg/kg IV", "1.2mg/kg IV"] },
  { name: "Salbutamol Neb", strength: "5mg/mL", doses: ["2.5mg neb", "5mg neb"] },
  { name: "Sodium Bicarbonate", strength: "8.4%", doses: ["50mEq IV", "1mEq/kg IV"] },
  { name: "Succinylcholine", strength: "100mg/5mL", doses: ["1mg/kg IV", "1.5mg/kg IV"] },
  { name: "Tramadol", strength: "50mg/mL", doses: ["50mg IV", "100mg IV"] },
  { name: "Tranexamic Acid", strength: "500mg/5mL", doses: ["1g IV", "1g IV over 10min"] },
  { name: "Vasopressin", strength: "20U/mL", doses: ["40U IV", "0.03U/min infusion"] },
];

const PEDIATRIC_DRUGS = [
  { name: "Adrenaline", strength: "1:10000", doses: ["0.01mg/kg IV", "0.1mg/kg ETT"] },
  { name: "Atropine", strength: "0.6mg/mL", doses: ["0.02mg/kg IV (min 0.1mg)"] },
  { name: "Amoxicillin", strength: "250mg/5mL", doses: ["25mg/kg PO", "50mg/kg PO"] },
  { name: "Ceftriaxone", strength: "1g", doses: ["50mg/kg IV", "100mg/kg IV (meningitis)"] },
  { name: "Dexamethasone", strength: "4mg/mL", doses: ["0.15mg/kg IV", "0.6mg/kg PO (croup)"] },
  { name: "Diazepam", strength: "10mg/2mL", doses: ["0.2mg/kg IV", "0.5mg/kg PR"] },
  { name: "Ibuprofen", strength: "100mg/5mL", doses: ["10mg/kg PO"] },
  { name: "Midazolam", strength: "5mg/mL", doses: ["0.1mg/kg IV", "0.2mg/kg IN", "0.5mg/kg buccal"] },
  { name: "Ondansetron", strength: "4mg/2mL", doses: ["0.15mg/kg IV (max 4mg)"] },
  { name: "Paracetamol", strength: "250mg/5mL", doses: ["15mg/kg PO", "20mg/kg PR"] },
  { name: "Phenobarbital", strength: "200mg/mL", doses: ["20mg/kg IV loading"] },
  { name: "Prednisolone", strength: "5mg/5mL", doses: ["1mg/kg PO", "2mg/kg PO (asthma)"] },
  { name: "Salbutamol Neb", strength: "5mg/mL", doses: ["2.5mg neb (<5y)", "5mg neb (>5y)"] },
  { name: "Sodium Bicarbonate", strength: "4.2%", doses: ["1mEq/kg IV"] },
];

// Procedures List
const PROCEDURE_OPTIONS = [
  { id: "cpr", name: "CPR", category: "Resuscitation" },
  { id: "intubation", name: "Endotracheal Intubation", category: "Airway" },
  { id: "lma", name: "LMA Insertion", category: "Airway" },
  { id: "cricothyrotomy", name: "Cricothyrotomy", category: "Airway" },
  { id: "bvm", name: "Bag-Valve-Mask Ventilation", category: "Airway" },
  { id: "central_line", name: "Central Line Insertion", category: "Vascular" },
  { id: "peripheral_iv", name: "Peripheral IV Access", category: "Vascular" },
  { id: "io_access", name: "Intraosseous Access", category: "Vascular" },
  { id: "arterial_line", name: "Arterial Line", category: "Vascular" },
  { id: "chest_tube", name: "Chest Tube Insertion", category: "Chest" },
  { id: "needle_decompression", name: "Needle Decompression", category: "Chest" },
  { id: "pericardiocentesis", name: "Pericardiocentesis", category: "Chest" },
  { id: "thoracentesis", name: "Thoracentesis", category: "Chest" },
  { id: "lumbar_puncture", name: "Lumbar Puncture", category: "Neuro" },
  { id: "foleys", name: "Foley's Catheter", category: "GU" },
  { id: "ng_tube", name: "NG Tube Insertion", category: "GI" },
  { id: "gastric_lavage", name: "Gastric Lavage", category: "GI" },
  { id: "wound_closure", name: "Wound Closure/Suturing", category: "Wound" },
  { id: "wound_irrigation", name: "Wound Irrigation", category: "Wound" },
  { id: "fracture_splint", name: "Fracture Splinting", category: "Ortho" },
  { id: "joint_reduction", name: "Joint Reduction", category: "Ortho" },
  { id: "cardioversion", name: "Cardioversion", category: "Cardiac" },
  { id: "defibrillation", name: "Defibrillation", category: "Cardiac" },
  { id: "pacing", name: "Transcutaneous Pacing", category: "Cardiac" },
  { id: "ecg", name: "12-Lead ECG", category: "Monitoring" },
  { id: "abg", name: "ABG/VBG", category: "Monitoring" },
];

export default function CaseSheetScreen({ route, navigation }) {
  const { 
    patientType = "adult", 
    vitals = {}, 
    patient = {},
    presentingComplaint = {},
    voiceTranscript = "",
    caseId: existingCaseId 
  } = route.params || {};
  const isPediatric = patientType === "pediatric";

  /* ===================== STATE ===================== */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState(existingCaseId || null);
  const [activeTab, setActiveTab] = useState("patient");
  const [showMlcFields, setShowMlcFields] = useState(patient.mlc || false);
  
  // AI Diagnosis State
  const [aiDiagnosisLoading, setAiDiagnosisLoading] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState(null);
  const [aiRedFlags, setAiRedFlags] = useState([]);
  
  // Drug Selection State
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [drugSearchQuery, setDrugSearchQuery] = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  
  // Procedures State
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [procedureNotes, setProcedureNotes] = useState({});
  
  // Addendum Modal State
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [addendumNotes, setAddendumNotes] = useState([]);
  const [currentAddendum, setCurrentAddendum] = useState("");
  const addendumTimerRef = useRef(null);
  
  // Collapsed sections
  const [collapsed, setCollapsed] = useState({
    airway: false,
    breathing: false,
    circulation: false,
    disability: false,
    exposure: false,
    reassessment: false,
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
    // Patient Info (populated from Triage if available)
    patient_name: patient.name || "",
    patient_age: patient.age ? String(patient.age) : (vitals.age ? String(vitals.age) : ""),
    patient_sex: patient.sex || "Male",
    patient_phone: patient.phone || "",
    patient_uhid: patient.uhid || "",
    patient_mode_of_arrival: patient.mode_of_arrival || "Walk-in",
    patient_mlc: patient.mlc || false,
    patient_brought_by: patient.brought_by || "",
    
    // MLC Fields
    mlc_nature: "",
    mlc_date_time: "",
    mlc_place: "",
    mlc_identification_mark: "",

    // Presenting Complaint (populated from Triage if available)
    complaint_text: presentingComplaint.text || voiceTranscript || "",
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
    airway_position: "",
    airway_patency: "",
    airway_obstruction_cause: "",
    airway_speech: "",
    airway_interventions: [],
    airway_notes: "",
    
    breathing_wob: "Normal",
    breathing_rr: "",
    breathing_spo2: "",
    breathing_o2_flow: "",
    breathing_o2_device: "",
    breathing_effort: "",
    breathing_pattern: "",
    breathing_expansion: "",
    breathing_air_entry: "Equal",
    breathing_added_sounds: "",
    breathing_breath_sounds: "Normal",
    breathing_interventions: [],
    breathing_notes: "",
    
    circulation_status: "Normal",
    circulation_hr: "",
    circulation_bp: "",
    circulation_rhythm: "",
    circulation_crt: "Normal",
    circulation_skin: "Warm, Dry",
    circulation_pulse: "Regular",
    circulation_jvp: "Normal",
    circulation_external_bleed: false,
    circulation_long_bone: false,
    circulation_interventions: [],
    circulation_notes: "",
    
    disability_avpu: "Alert",
    disability_gcs_e: "",
    disability_gcs_v: "",
    disability_gcs_m: "",
    disability_grbs: "",
    disability_pupils: "Equal, Reactive",
    disability_pupils_size: "",
    disability_pupils_reaction: "",
    disability_lateralizing: "",
    disability_seizure: false,
    disability_motor: "Normal",
    disability_notes: "",
    
    exposure_status: "Normal",
    exposure_temperature: "",
    exposure_rashes: "",
    exposure_bruises: "",
    exposure_logroll: [],
    exposure_findings: "",
    exposure_notes: "",

    // Reassessment
    reassessment_status: "",
    reassessment_notes: "",

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
    labs_ordered: "",
    imaging_ordered: "",
    investigation_results: "",
    vbg_interpretation: "",
    diagnosis_primary: "",
    diagnosis_differential: "",
    treatment_medications: "",
    treatment_fluids: "",
    treatment_procedures: "",
    treatment_course: "",

    // Disposition
    disposition_type: "Discharge",
    disposition_ward: "",
    disposition_refer_hospital: "",
    disposition_refer_reason: "",
    disposition_lama_notes: "",
    disposition_death_time: "",
    disposition_death_cause: "",
    disposition_condition: "Stable",
    discharge_medications: "",
    discharge_followup: "",
    
    // Procedures & Notes
    procedures_performed: [],
    procedure_notes: {},
    
    // Addendum Notes
    addendum_notes: [],
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
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const forceUpdate = () => setForceRenderKey(prev => prev + 1);

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

  /* ===================== ADDENDUM TIMER ===================== */
  useEffect(() => {
    // Set up 2-hour reminder for addendum notes
    const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    addendumTimerRef.current = setInterval(() => {
      if (caseId) { // Only show if case is saved
        setShowAddendumModal(true);
      }
    }, TWO_HOURS);

    return () => {
      if (addendumTimerRef.current) {
        clearInterval(addendumTimerRef.current);
      }
    };
  }, [caseId]);

  /* ===================== AI DIAGNOSIS FUNCTIONS ===================== */
  const getAIDiagnosisSuggestions = async () => {
    const fd = formDataRef.current;
    
    // Build clinical context
    const clinicalContext = {
      age: fd.patient_age,
      sex: fd.patient_sex,
      presenting_complaint: fd.complaint_text,
      vitals: {
        hr: fd.vitals_hr,
        rr: fd.vitals_rr,
        bp: `${fd.vitals_bp_systolic}/${fd.vitals_bp_diastolic}`,
        spo2: fd.vitals_spo2,
        temp: fd.vitals_temperature,
      },
      history: fd.history_hpi,
      examination_findings: fd.general_notes || "",
      current_diagnosis: fd.diagnosis_primary || "",
    };

    if (!clinicalContext.presenting_complaint && !clinicalContext.history) {
      Alert.alert("Insufficient Data", "Please enter presenting complaint or history first");
      return;
    }

    setAiDiagnosisLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt_type: "diagnosis_suggestions",
          case_context: clinicalContext,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiDiagnosisResult(data.response || data.content || "");
        
        // Extract red flags from response
        const redFlagMatch = data.response?.match(/RED FLAGS?:?([\s\S]*?)(?:SUGGESTED|DIFFERENTIAL|$)/i);
        if (redFlagMatch) {
          const flags = redFlagMatch[1].split(/[•\-\n]/).filter(f => f.trim().length > 3);
          setAiRedFlags(flags.slice(0, 5));
        }
      } else {
        throw new Error("AI request failed");
      }
    } catch (err) {
      console.error("AI Diagnosis error:", err);
      Alert.alert("Error", "Failed to get AI suggestions. Please try again.");
    }
    setAiDiagnosisLoading(false);
  };

  /* ===================== DRUG MANAGEMENT ===================== */
  const drugList = isPediatric ? PEDIATRIC_DRUGS : ADULT_DRUGS;
  
  const filteredDrugs = drugList.filter(drug => 
    drug.name.toLowerCase().includes(drugSearchQuery.toLowerCase())
  );

  const addDrug = (drug, dose) => {
    const newDrug = {
      id: Date.now(),
      name: drug.name,
      strength: drug.strength,
      dose: dose,
      time: new Date().toLocaleTimeString(),
    };
    setSelectedDrugs(prev => [...prev, newDrug]);
    
    // Update form data
    const drugsList = [...selectedDrugs, newDrug].map(d => `${d.name} ${d.dose}`).join(", ");
    formDataRef.current.treatment_medications = drugsList;
    
    setShowDrugModal(false);
    setDrugSearchQuery("");
  };

  const removeDrug = (drugId) => {
    const updated = selectedDrugs.filter(d => d.id !== drugId);
    setSelectedDrugs(updated);
    formDataRef.current.treatment_medications = updated.map(d => `${d.name} ${d.dose}`).join(", ");
  };

  /* ===================== PROCEDURE MANAGEMENT ===================== */
  const toggleProcedure = (procedureId) => {
    setSelectedProcedures(prev => {
      if (prev.includes(procedureId)) {
        return prev.filter(p => p !== procedureId);
      }
      return [...prev, procedureId];
    });
  };

  const updateProcedureNote = (procedureId, note) => {
    setProcedureNotes(prev => ({ ...prev, [procedureId]: note }));
    
    // Update form data
    formDataRef.current.procedure_notes = { ...procedureNotes, [procedureId]: note };
  };

  /* ===================== ADDENDUM NOTES ===================== */
  const saveAddendum = () => {
    if (!currentAddendum.trim()) {
      setShowAddendumModal(false);
      return;
    }
    
    const newAddendum = {
      id: Date.now(),
      text: currentAddendum,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleString(),
    };
    
    const updated = [...addendumNotes, newAddendum];
    setAddendumNotes(updated);
    formDataRef.current.addendum_notes = updated;
    
    setCurrentAddendum("");
    setShowAddendumModal(false);
    
    // Auto-save case sheet with new addendum
    saveCaseSheet();
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

  /* ===================== DEFAULT VALUES ===================== */
  const DEFAULT_NORMAL_VALUES = {
    // Primary Assessment
    airway_status: "Patent",
    breathing_wob: "Normal",
    breathing_air_entry: "Equal",
    circulation_status: "Normal",
    circulation_crt: "Normal",
    circulation_pulse: "Regular",
    circulation_jvp: "Normal",
    disability_avpu: "Alert",
    disability_pupils: "Equal, Reactive",
    exposure_status: "Normal",
    // Examination defaults
    general_appearance: "Conscious, alert, oriented",
    general_pallor: "Absent",
    general_icterus: "Absent",
    general_cyanosis: "Absent",
    general_clubbing: "Absent",
    general_lymphadenopathy: "Absent",
    general_edema: "Absent",
    cvs_s1_s2: "Normal",
    cvs_murmur: "Absent",
    resp_percussion: "Resonant",
    resp_breath_sounds: "Vesicular",
    abd_inspection: "Normal",
    abd_tenderness: "Absent",
    abd_guarding_rigidity: "Absent",
    abd_organomegaly: "Absent",
    abd_bowel_sounds: "Present",
    cns_gcs: "15/15",
    cns_pupils: "Equal, reactive",
    cns_tone: "Normal",
    cns_power: "5/5",
    cns_reflexes: "Normal",
    cns_sensation: "Intact",
    cns_motor: "Normal",
    ext_inspection: "Normal",
    ext_deformity: "Nil",
    ext_swelling: "Nil",
    ext_tenderness: "Nil",
    ext_movement: "Full ROM",
    ext_pulses: "Present",
    ext_sensation: "Intact",
  };

  const applyDefaultValues = () => {
    const fd = formDataRef.current;
    
    // Apply defaults only if fields are empty
    Object.entries(DEFAULT_NORMAL_VALUES).forEach(([key, value]) => {
      if (!fd[key] || fd[key] === "") {
        fd[key] = value;
      }
    });
    
    // Ensure arrays have defaults
    if (!fd.airway_interventions || fd.airway_interventions.length === 0) {
      fd.airway_interventions = [];
    }
    if (!fd.breathing_interventions || fd.breathing_interventions.length === 0) {
      fd.breathing_interventions = [];
    }
    if (!fd.circulation_interventions || fd.circulation_interventions.length === 0) {
      fd.circulation_interventions = [];
    }
    if (!fd.exposure_logroll || fd.exposure_logroll.length === 0) {
      fd.exposure_logroll = [];
    }
  };

  /* ===================== SAVE ===================== */
  const saveCaseSheet = async () => {
    setSaving(true);
    
    // Apply default values to empty fields before saving
    applyDefaultValues();
    
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
          medications: fd.treatment_medications,
          fluids: fd.treatment_fluids,
          procedures_done: fd.treatment_procedures,
          course_in_hospital: fd.treatment_course,
          differential_diagnoses: fd.diagnosis_differential ? fd.diagnosis_differential.split(",").map(s => s.trim()).filter(Boolean) : [],
          provisional_diagnoses: fd.diagnosis_primary ? [fd.diagnosis_primary.trim()] : [],
        },
        investigations: {
          panels_selected: fd.labs_ordered ? fd.labs_ordered.split(",").map(s => s.trim()).filter(Boolean) : [],
          imaging: fd.imaging_ordered ? fd.imaging_ordered.split(",").map(s => s.trim()).filter(Boolean) : [],
          results_notes: fd.investigation_results,
        },
        disposition: {
          type: mapDispositionType(fd.disposition_type),
          destination: fd.disposition_ward || fd.disposition_refer_hospital || "",
          advice: fd.discharge_followup || "",
          condition_at_discharge: (fd.disposition_condition || "stable").toLowerCase(),
          discharge_vitals: null,
        },
        em_resident: user.name || "",
      };

      // Helper function to map disposition type
      function mapDispositionType(type) {
        const map = {
          "Discharge": "discharged",
          "Admit": "admitted-ward",
          "Refer": "referred",
          "LAMA": "dama",
          "Absconded": "absconded",
          "Death": "death",
        };
        return map[type] || "discharged";
      }

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
      // Properly format error message - CRITICAL FIX
      let errorMsg = "Failed to save case";
      if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.response?.data && typeof err.response.data === 'object') {
        errorMsg = JSON.stringify(err.response.data);
      } else if (err?.message) {
        errorMsg = err.message;
      }
      Alert.alert("Error", errorMsg);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Tab navigation order
  const TAB_ORDER = ["patient", "vitals", "primary", "history", "exam", "treatment", "disposition"];

  const proceedNext = async () => {
    // Save if not saved yet and has patient name
    if (formDataRef.current.patient_name && !caseId) {
      await saveCaseSheet();
    }
    
    // Find current tab index and go to next
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    } else {
      // On last tab, navigate to discharge summary
      if (caseId) {
        navigation.navigate("DischargeSummary", { caseId });
      } else {
        Alert.alert("Save Required", "Please save the case sheet first");
      }
    }
  };

  const goToPrevious = () => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  };

  /* ===================== VBG INTERPRETATION ===================== */
  const interpretVBG = async () => {
    const fd = formDataRef.current;
    const ph = parseFloat(fd.vbg_ph);
    const pco2 = parseFloat(fd.vbg_pco2);
    const hco3 = parseFloat(fd.vbg_hco3);
    const lactate = parseFloat(fd.vbg_lactate);

    if (!ph || !pco2 || !hco3) {
      Alert.alert("Missing Data", "Please enter pH, pCO2, and HCO3 for interpretation");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_URL}/ai/interpret-abg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ph,
          pco2,
          po2: parseFloat(fd.vbg_po2) || null,
          hco3,
          lactate: lactate || null,
          be: parseFloat(fd.vbg_be) || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        formDataRef.current.vbg_interpretation = data.interpretation || data.result || "Interpretation complete";
        forceUpdate();
      } else {
        // Fallback to basic interpretation
        let interpretation = "";
        
        // pH assessment
        if (ph < 7.35) interpretation += "Acidemia. ";
        else if (ph > 7.45) interpretation += "Alkalemia. ";
        else interpretation += "Normal pH. ";
        
        // Primary disorder
        if (ph < 7.35 && pco2 > 45) interpretation += "Respiratory acidosis. ";
        else if (ph < 7.35 && hco3 < 22) interpretation += "Metabolic acidosis. ";
        else if (ph > 7.45 && pco2 < 35) interpretation += "Respiratory alkalosis. ";
        else if (ph > 7.45 && hco3 > 26) interpretation += "Metabolic alkalosis. ";
        
        // Lactate
        if (lactate > 2) interpretation += `Elevated lactate (${lactate}). `;
        
        formDataRef.current.vbg_interpretation = interpretation || "Unable to interpret automatically";
        forceUpdate();
      }
    } catch (error) {
      console.log("VBG interpretation error:", error);
      Alert.alert("Error", "Could not interpret VBG");
    }
    setLoading(false);
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
        key={`${field}-${forceRenderKey}`}
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
  const SwitchRow = ({ label, field, onToggle }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={formDataRef.current[field]}
        onValueChange={(v) => {
          formDataRef.current[field] = v;
          setSelectStates(prev => ({ ...prev }));
          if (onToggle) onToggle(v);
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
            <TabButton id="treatment" label="Treatment" icon="medkit" />
            <TabButton id="disposition" label="Disposition" icon="exit" />
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
                <InputField label="Brought By" field="patient_brought_by" placeholder="Person who brought patient" />
                <SelectButtons label="Mode of Arrival" options={["Walk-in", "Ambulance", "Referred"]} field="patient_mode_of_arrival" />
                
                {/* MLC Toggle */}
                <View style={styles.mlcContainer}>
                  <SwitchRow 
                    label="MLC Case" 
                    field="patient_mlc" 
                    onToggle={(value) => setShowMlcFields(value)}
                  />
                </View>

                {/* MLC Fields - Show when MLC is checked */}
                {showMlcFields && (
                  <View style={styles.mlcFields}>
                    <Text style={styles.mlcTitle}>⚠️ MLC Details</Text>
                    <InputField label="Nature of Incident" field="mlc_nature" placeholder="e.g., Road Traffic Accident, Assault" />
                    <InputField label="Date & Time of Incident" field="mlc_date_time" placeholder="DD/MM/YYYY HH:MM" />
                    <InputField label="Place of Incident" field="mlc_place" placeholder="Location where incident occurred" />
                    <InputField label="Identification Mark" field="mlc_identification_mark" placeholder="Any identifying marks" />
                    <InputField label="Informant/Brought By" field="patient_brought_by" placeholder="Name & relation of person" />
                  </View>
                )}
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

          {/* ==================== TREATMENT TAB ==================== */}
          {activeTab === "treatment" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Investigations</Text>
                <InputWithVoice label="Labs Ordered" field="labs_ordered" placeholder="CBC, RFT, LFT, ABG..." multiline />
                <InputWithVoice label="Imaging" field="imaging_ordered" placeholder="X-ray, CT, USG..." multiline />
                <InputWithVoice label="Results Summary" field="investigation_results" placeholder="Key findings..." multiline />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>VBG / ABG</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><InputField label="pH" field="vbg_ph" placeholder="7.35-7.45" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><InputField label="pCO₂" field="vbg_pco2" placeholder="mmHg" keyboardType="decimal-pad" /></View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><InputField label="pO₂" field="vbg_po2" placeholder="mmHg" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><InputField label="HCO₃" field="vbg_hco3" placeholder="mEq/L" keyboardType="decimal-pad" /></View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><InputField label="Lactate" field="vbg_lactate" placeholder="mmol/L" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><InputField label="BE" field="vbg_be" placeholder="mEq/L" /></View>
                </View>
                <TouchableOpacity style={styles.interpretBtn} onPress={interpretVBG}>
                  <Ionicons name="analytics" size={18} color="#fff" />
                  <Text style={styles.interpretBtnText}>AI Interpret VBG</Text>
                </TouchableOpacity>
                {formDataRef.current.vbg_interpretation ? (
                  <View style={styles.interpretResult}>
                    <Text style={styles.interpretTitle}>Interpretation:</Text>
                    <Text style={styles.interpretText}>{formDataRef.current.vbg_interpretation}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Provisional Diagnosis</Text>
                <InputWithVoice label="Primary Diagnosis" field="diagnosis_primary" placeholder="Main diagnosis..." />
                <InputWithVoice label="Differential Diagnoses" field="diagnosis_differential" placeholder="Other possibilities..." multiline />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Treatment Given</Text>
                <InputWithVoice label="Medications" field="treatment_medications" placeholder="Drugs administered..." multiline />
                <InputWithVoice label="IV Fluids" field="treatment_fluids" placeholder="NS, RL, etc..." />
                <InputWithVoice label="Procedures Done" field="treatment_procedures" placeholder="Any procedures..." multiline />
                <InputWithVoice label="Course in ED" field="treatment_course" placeholder="Progress notes..." multiline />
              </View>
            </View>
          )}

          {/* ==================== DISPOSITION TAB ==================== */}
          {activeTab === "disposition" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Disposition</Text>
                <SelectButtons 
                  label="Disposition Type" 
                  options={["Discharge", "Admit", "Refer", "LAMA", "Absconded", "Death"]} 
                  field="disposition_type" 
                />
                
                {formDataRef.current.disposition_type === "Admit" && (
                  <InputField label="Admit to Ward" field="disposition_ward" placeholder="e.g., ICU, Medicine, Surgery" />
                )}
                
                {formDataRef.current.disposition_type === "Refer" && (
                  <>
                    <InputField label="Refer to Hospital" field="disposition_refer_hospital" placeholder="Hospital name" />
                    <InputField label="Reason for Referral" field="disposition_refer_reason" placeholder="Why referring..." />
                  </>
                )}
                
                {formDataRef.current.disposition_type === "LAMA" && (
                  <InputWithVoice label="LAMA Notes" field="disposition_lama_notes" placeholder="Patient left against advice..." multiline />
                )}
                
                {formDataRef.current.disposition_type === "Death" && (
                  <>
                    <InputField label="Time of Death" field="disposition_death_time" placeholder="HH:MM" />
                    <InputWithVoice label="Cause of Death" field="disposition_death_cause" placeholder="Primary cause..." />
                  </>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Condition at Discharge</Text>
                <SelectButtons 
                  label="Condition" 
                  options={["Stable", "Guarded", "Critical"]} 
                  field="disposition_condition" 
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Discharge Advice</Text>
                <InputWithVoice label="Medications" field="discharge_medications" placeholder="Discharge prescriptions..." multiline />
                <InputWithVoice label="Follow-up Instructions" field="discharge_followup" placeholder="When to return, warning signs..." multiline />
              </View>

              {/* Generate Discharge Summary Button */}
              <TouchableOpacity 
                style={styles.dischargeSummaryBtn} 
                onPress={() => {
                  if (caseId) {
                    saveCaseSheet();
                    navigation.navigate("DischargeSummary", { caseId });
                  } else {
                    Alert.alert("Save Required", "Please save the case sheet first");
                  }
                }}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.dischargeSummaryBtnText}>Generate Discharge Summary</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {activeTab !== "patient" && (
              <TouchableOpacity style={styles.prevBtn} onPress={goToPrevious}>
                <Ionicons name="arrow-back" size={20} color="#64748b" />
                <Text style={styles.prevBtnText}>Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={saveCaseSheet} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.btnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={proceedNext}>
              <Text style={styles.btnText}>{activeTab === "disposition" ? "Finish" : "Next"}</Text>
              <Ionicons name={activeTab === "disposition" ? "checkmark" : "arrow-forward"} size={20} color="#fff" />
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
  checkboxGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  checkboxItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, minWidth: "45%" },
  checkboxText: { fontSize: 12, color: "#475569" },
  checkboxLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 12, marginBottom: 6, paddingHorizontal: 16 },
  
  // Normal/Abnormal toggle styles
  statusToggleRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statusToggle: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    paddingVertical: 10, 
    borderRadius: 10, 
    backgroundColor: "#f1f5f9", 
    borderWidth: 2, 
    borderColor: "#e2e8f0",
    gap: 6,
  },
  statusToggleNormalActive: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  statusToggleAbnormalActive: { backgroundColor: "#ef4444", borderColor: "#dc2626" },
  statusToggleText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  statusToggleTextActive: { color: "#fff" },
  
  abnormalDetails: { 
    backgroundColor: "#fef2f2", 
    padding: 12, 
    marginHorizontal: 16, 
    marginBottom: 12, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  
  // Compact vitals row
  vitalsRowCompact: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  vitalItemCompact: { flex: 1 },
  vitalLabelCompact: { fontSize: 10, fontWeight: "700", color: "#64748b", marginBottom: 4, textAlign: "center" },
  vitalInputCompact: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Highlighted field
  highlightedField: {
    borderLeftWidth: 4,
    paddingLeft: 8,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 8,
  },
  
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
  prevBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  prevBtnText: { color: "#64748b", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  
  // MLC Fields
  mlcContainer: { marginTop: 8 },
  mlcFields: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  mlcTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 12,
  },
  
  // VBG/Treatment styles
  interpretBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  interpretBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  interpretResult: {
    backgroundColor: "#f5f3ff",
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  interpretTitle: { fontSize: 13, fontWeight: "700", color: "#7c3aed", marginBottom: 6 },
  interpretText: { fontSize: 13, color: "#5b21b6", lineHeight: 20 },
  
  // Discharge Summary button
  dischargeSummaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  dischargeSummaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
