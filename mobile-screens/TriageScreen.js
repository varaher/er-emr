// TriageScreen.js - Hospital-Specific Triage Protocol (5-Level System)
// Based on TRIAGE.pdf: Priority I-V for Adult & Pediatric patients
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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const API_URL = "https://er-emr-backend.onrender.com/api";

// Default normal values for auto-fill
const DEFAULT_VITALS = {
  hr: "80",
  bp_systolic: "120",
  bp_diastolic: "80",
  rr: "16",
  spo2: "98",
  temperature: "36.8",
  gcs_e: "4",
  gcs_v: "5",
  gcs_m: "6",
  grbs: "100",
  crt: "2",
};

// Priority Levels Configuration based on hospital PDF
const PRIORITY_LEVELS = {
  1: { color: "#dc2626", bgColor: "#fee2e2", name: "IMMEDIATE", label: "Priority I", timeframe: "0 min" },
  2: { color: "#f97316", bgColor: "#ffedd5", name: "VERY URGENT", label: "Priority II", timeframe: "5 min" },
  3: { color: "#eab308", bgColor: "#fef9c3", name: "URGENT", label: "Priority III", timeframe: "30 min" },
  4: { color: "#22c55e", bgColor: "#dcfce7", name: "STANDARD", label: "Priority IV", timeframe: "60 min" },
  5: { color: "#3b82f6", bgColor: "#dbeafe", name: "NON-URGENT", label: "Priority V", timeframe: "120 min" },
};

// Adult Triage Conditions (from PDF)
const ADULT_CONDITIONS = {
  priority_1: [
    { id: "cardiac_arrest", label: "Cardiac / Respiratory Arrest", category: "critical" },
    { id: "shock", label: "Shock (Hypovolemic/Cardiogenic/Anaphylactic/Neurogenic)", category: "critical" },
    { id: "severe_respiratory_distress", label: "Severe Respiratory Distress", category: "airway" },
    { id: "major_trauma_bleeding", label: "Major Trauma with Severe Bleeding", category: "trauma" },
    { id: "altered_consciousness", label: "Unconscious / Altered Mental Status", category: "neuro" },
    { id: "severe_burns_airway", label: "Severe Burns with Airway Compromise", category: "trauma" },
    { id: "active_seizures", label: "Active Seizures", category: "neuro" },
    { id: "life_threatening_fb", label: "Foreign Body Aspiration (Life-threatening)", category: "airway" },
    { id: "poisoning_abc", label: "Poisoning (Snake bite, Drug overdose)", category: "critical" },
    { id: "drowning_deficits", label: "Drowning with Respiratory/Neuro Deficits", category: "critical" },
    { id: "hanging", label: "Hanging", category: "critical" },
    { id: "ami_complications", label: "Acute MI with Complications (CHF)", category: "cardiac" },
    { id: "pneumothorax", label: "Pneumothorax / Cardiac Tamponade", category: "critical" },
  ],
  priority_2: [
    { id: "chest_pain_cardiac", label: "Cardiac-sounding Chest Pain (Radiating)", category: "cardiac" },
    { id: "acute_stroke", label: "Acute Stroke (Within Window Period)", category: "neuro" },
    { id: "circulatory_compromise", label: "Circulatory Compromise", category: "cardiac" },
    { id: "severe_pain", label: "Severe Pain / Pain Shock (NRS 9-13)", category: "pain" },
    { id: "sepsis", label: "Suspected Sepsis / Septic Shock", category: "critical" },
    { id: "open_fractures", label: "Open Fractures", category: "trauma" },
    { id: "dka", label: "Suspected Diabetic Ketoacidosis (DKA)", category: "metabolic" },
    { id: "meningococcal", label: "Meningococcal Sepsis", category: "infection" },
    { id: "violent_patient", label: "Violent / Aggressive Patient", category: "psych" },
    { id: "slip_fall", label: "Slip and Fall (High Risk)", category: "trauma" },
  ],
  priority_3: [
    { id: "moderate_head_injury", label: "Moderate Head Injury / Spinal Cord Injury", category: "trauma" },
    { id: "moderate_trauma", label: "Moderate Trauma (Hip/Pelvis Fractures, Dislocated Shoulder)", category: "trauma" },
    { id: "severe_dehydration", label: "Diarrhea/Vomiting with Severe Dehydration", category: "gi" },
    { id: "uti_stable", label: "UTI with Stable Vital Signs", category: "gu" },
    { id: "renal_calculi", label: "Renal Calculi with Flank Pain", category: "gu" },
    { id: "acute_abdomen", label: "Acute Abdominal Pain (Appendicitis, Cholecystitis)", category: "gi" },
    { id: "psychosis", label: "Acute Psychosis with Suicidal Ideation", category: "psych" },
    { id: "infection_signs", label: "Signs of Infection (Cellulitis, Post-surgery)", category: "infection" },
    { id: "allergic_reaction", label: "Acute Allergic Reactions", category: "allergy" },
    { id: "vaginal_bleeding", label: "Vaginal Bleeding with Stable Vitals", category: "gyn" },
    { id: "chronic_bedridden", label: "Chronic Bedridden Patients", category: "other" },
  ],
  priority_4: [
    { id: "minor_trauma", label: "Minor Trauma (Ankle Sprain, Simple Fractures)", category: "trauma" },
    { id: "head_injury_alert", label: "Head Injury (Alert, No Vomiting)", category: "trauma" },
    { id: "fever_sore_throat", label: "Fever with Sore Throat", category: "infection" },
    { id: "mild_diarrhea", label: "Diarrhea/Vomiting with No Dehydration", category: "gi" },
    { id: "mild_pain", label: "Pain Scale 1-3 (Earache, Headache, Backache)", category: "pain" },
    { id: "urti_lrti", label: "Upper/Lower Respiratory Tract Infections (Mild)", category: "resp" },
    { id: "fb_non_threatening", label: "Foreign Body (Eyes, Nose, Ears - Non-threatening)", category: "other" },
    { id: "minor_procedures", label: "Minor Procedures (Catheterization, Suture Removal)", category: "procedure" },
    { id: "simple_firstaid", label: "Simple First Aid / Primary Care Cases", category: "other" },
    { id: "referral_no_abc", label: "Outside Referral without ABC Compromise", category: "other" },
    { id: "scrotal_swelling", label: "Scrotal/Penile Swelling (Non-acute)", category: "gu" },
    { id: "chest_pain_normal", label: "Chest Pain with Normal Vitals", category: "cardiac" },
    { id: "rat_human_bite", label: "Rat Bite / Human Bite", category: "trauma" },
  ],
  priority_5: [
    { id: "elective_procedures", label: "Elective Procedures", category: "procedure" },
    { id: "bp_checking", label: "BP Checking", category: "procedure" },
    { id: "sample_collection", label: "Sample Collection", category: "procedure" },
    { id: "iv_line", label: "IV Line Insertion", category: "procedure" },
    { id: "prescription_refill", label: "Prescription Refill", category: "other" },
  ],
};

// Pediatric Triage Conditions (from PDF)
const PEDIATRIC_CONDITIONS = {
  priority_1: [
    { id: "cardiac_arrest", label: "Cardiac Arrest / Gasping", category: "critical" },
    { id: "gcs_less_8", label: "GCS < 8", category: "neuro" },
    { id: "severe_resp_distress", label: "Resp Distress with Tachypnea + Retractions (SpO2 < 94%)", category: "airway" },
    { id: "grunting_stridor", label: "Grunting / Stridor / Audible Wheeze / Acute Severe Asthma", category: "airway" },
    { id: "shock_signs", label: "Signs of Shock (Altered mentation, Tachycardia +20, CRT >3s, BP <5th centile)", category: "critical" },
    { id: "severe_dehydration", label: "Severe Dehydration (Sunken eyes, Depressed fontanel, Dry tongue, Loss skin turgor)", category: "critical" },
    { id: "active_seizures", label: "Active Seizures", category: "neuro" },
    { id: "ped_trauma_abc", label: "Pediatric Trauma with ABC Compromise + Bleeding", category: "trauma" },
    { id: "poisoning_abc", label: "Poisoning within 4 hrs with ABC Compromise", category: "critical" },
    { id: "fb_ingestion_abc", label: "Foreign Body Ingestion/Aspiration with ABC Compromise", category: "airway" },
    { id: "snake_scorpion_bite", label: "Unknown Bites / Snake / Scorpion Sting", category: "critical" },
    { id: "neonate_critical", label: "Neonate with ABC Compromise", category: "critical" },
    { id: "chest_pain_abnormal", label: "Chest Pain with Abnormal Vitals", category: "cardiac" },
  ],
  priority_2: [
    { id: "gcs_9_12", label: "GCS 9-12 (ABC Not Compromised)", category: "neuro" },
    { id: "seizures_4hrs", label: "Seizures within Last 4 Hours", category: "neuro" },
    { id: "fever_infant_high", label: "Fever >102°F in Young Infants (<2 years)", category: "infection" },
    { id: "acute_diarrhea_dehy", label: "Acute Diarrhea with Some Dehydration", category: "gi" },
    { id: "fever_neck_pain", label: "Fever with Neck Pain / Headache", category: "infection" },
    { id: "htn_neuro", label: "Hypertension with Blurring Vision / Seizures / Headache", category: "cardiac" },
    { id: "cardiac_no_abc", label: "Cardiac Disease without ABC Compromise", category: "cardiac" },
    { id: "post_op_15days", label: "Any Post-operative Child within 15 Days", category: "other" },
    { id: "child_abuse", label: "Suspicion of Child Abuse", category: "other" },
    { id: "snake_no_abc", label: "Snake/Scorpion Bite without ABC Compromise", category: "trauma" },
    { id: "immuno_no_abc", label: "Immunocompromised Child without ABC", category: "other" },
    { id: "burns_any", label: "Burns - Any Degree", category: "trauma" },
    { id: "low_grbs_infant", label: "Low GRBS <54 in Infant", category: "metabolic" },
  ],
  priority_3: [
    { id: "active_bleeding", label: "Active Bleeding", category: "trauma" },
    { id: "fever_child", label: "Fever >102°F in Children (2-5 years)", category: "infection" },
    { id: "onco_child", label: "Any Child of Hemato-Oncology", category: "other" },
    { id: "seizure_4_24hrs", label: "History of Seizures within 4-24 Hours", category: "neuro" },
    { id: "htn_no_neuro", label: "Hypertension without Headache/Blurring", category: "cardiac" },
    { id: "painful_scrotum", label: "Acute Painful Scrotal/Testicular Swelling", category: "gu" },
    { id: "dka_pediatric", label: "GRBS >250 + Acidosis (DKA)", category: "metabolic" },
    { id: "dog_bite", label: "Dog Bite", category: "trauma" },
    { id: "abdominal_pain", label: "Acute Abdominal Pain", category: "gi" },
    { id: "abd_distension_vom", label: "Abdominal Distension with Vomiting", category: "gi" },
    { id: "rapid_breathing", label: "Rapid Breathing + Retractions (SpO2 >94%)", category: "resp" },
    { id: "referral_hb_low", label: "Referral with Hb <6gm / Platelets <50,000", category: "other" },
    { id: "hemoptysis_liver", label: "Hemoptysis/Hematemesis in Chronic Liver Disease", category: "gi" },
    { id: "irritable_infant", label: "Irritable Crying Infant (<1 year)", category: "other" },
  ],
  priority_4: [
    { id: "fever_older", label: "Fever ≥102°F in Children >5 years", category: "infection" },
    { id: "acute_diarrhea_no_dehy", label: "Acute Diarrhea with No Dehydration", category: "gi" },
    { id: "cough_cold", label: "Cough & Cold Symptoms Only", category: "resp" },
    { id: "scrotal_penile", label: "Scrotal/Penile Swelling (Non-acute)", category: "gu" },
    { id: "throat_pain", label: "Throat Pain", category: "infection" },
    { id: "skin_rash", label: "Skin Rash / Infection / Cellulitis", category: "skin" },
    { id: "joint_pain", label: "Joint Pains / Painful Joint Swelling", category: "msk" },
    { id: "non_active_bleed", label: "Non-active Skin Bleed", category: "skin" },
    { id: "referral_no_abc", label: "Outside Referral without ABC Compromise", category: "other" },
    { id: "chest_pain_normal", label: "Chest Pain with Normal Vitals", category: "cardiac" },
  ],
  priority_5: [
    { id: "elective_procedures", label: "Elective Procedures", category: "procedure" },
    { id: "bp_checking", label: "BP Checking", category: "procedure" },
    { id: "sample_collection", label: "Sample Collection", category: "procedure" },
    { id: "iv_line", label: "IV Line Insertion", category: "procedure" },
  ],
};

// Helper function to determine if patient is pediatric based on age
const checkIfPediatric = (ageString, ageUnit = "years") => {
  if (!ageString) return false;
  
  const numericAge = parseFloat(ageString);
  if (isNaN(numericAge)) return false;
  
  // Days, weeks, months are always pediatric
  if (ageUnit === "days" || ageUnit === "weeks" || ageUnit === "months") {
    return true;
  }
  
  // For years, check if < 16
  return numericAge < 16;
};

export default function TriageScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Voice Recording State
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  // Form data ref for performance
  const formDataRef = useRef({
    name: "",
    age: "",
    sex: "Male",
    phone: "",
    address: "",
    brought_by: "",
    mode_of_arrival: "Walk-in",
    chief_complaint: "",
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
    crt: "",
  });

  // UI State
  const [patientType, setPatientType] = useState("adult");
  const [ageUnit, setAgeUnit] = useState("years");
  const [sex, setSex] = useState("Male");
  const [modeOfArrival, setModeOfArrival] = useState("Walk-in");
  const [mlc, setMlc] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // State for form fields that need re-render
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  
  // Selected conditions by priority
  const [selectedConditions, setSelectedConditions] = useState({});
  
  // Calculated triage result
  const [triageResult, setTriageResult] = useState(null);
  
  const forceUpdate = useCallback(() => setRefreshKey(k => k + 1), []);

  const updateTextField = useCallback((field, value) => {
    formDataRef.current[field] = value;
  }, []);

  // Get conditions based on patient type
  const getConditions = () => {
    return patientType === "pediatric" ? PEDIATRIC_CONDITIONS : ADULT_CONDITIONS;
  };

  // Toggle condition selection
  const toggleCondition = (priority, conditionId) => {
    setSelectedConditions(prev => {
      const key = `${priority}_${conditionId}`;
      const newState = { ...prev };
      if (newState[key]) {
        delete newState[key];
      } else {
        newState[key] = { priority, conditionId };
      }
      return newState;
    });
    
    // Auto-calculate priority after selection
    setTimeout(() => calculatePriority(), 100);
  };

  // Calculate triage priority based on selected conditions and vitals
  const calculatePriority = () => {
    const fd = formDataRef.current;
    let highestPriority = 5; // Default to lowest
    const reasons = [];

    // Check selected conditions
    Object.values(selectedConditions).forEach(({ priority, conditionId }) => {
      const priorityNum = parseInt(priority.replace("priority_", ""));
      if (priorityNum < highestPriority) {
        highestPriority = priorityNum;
        const conditions = getConditions()[priority];
        const condition = conditions?.find(c => c.id === conditionId);
        if (condition) {
          reasons.push(condition.label);
        }
      }
    });

    // Check vitals for critical values
    const gcsTotal = (parseInt(fd.gcs_e) || 0) + (parseInt(fd.gcs_v) || 0) + (parseInt(fd.gcs_m) || 0);
    
    // Priority I (Red) vitals criteria
    if (fd.spo2 && parseFloat(fd.spo2) < 90) {
      if (highestPriority > 1) highestPriority = 1;
      reasons.push(`SpO2 ${fd.spo2}% (Severe Hypoxia)`);
    }
    if (fd.bp_systolic && parseFloat(fd.bp_systolic) < 80) {
      if (highestPriority > 1) highestPriority = 1;
      reasons.push(`BP ${fd.bp_systolic}/${fd.bp_diastolic} (Shock Range)`);
    }
    if (gcsTotal > 0 && gcsTotal <= 8) {
      if (highestPriority > 1) highestPriority = 1;
      reasons.push(`GCS ${gcsTotal} (Coma)`);
    }
    if (fd.rr && (parseFloat(fd.rr) < 8 || parseFloat(fd.rr) > 35)) {
      if (highestPriority > 1) highestPriority = 1;
      reasons.push(`RR ${fd.rr}/min (Critical)`);
    }

    // Priority II (Orange) vitals criteria
    if (fd.spo2 && parseFloat(fd.spo2) >= 90 && parseFloat(fd.spo2) < 92) {
      if (highestPriority > 2) highestPriority = 2;
      reasons.push(`SpO2 ${fd.spo2}% (Moderate Hypoxia)`);
    }
    if (fd.hr && (parseFloat(fd.hr) > 130 || parseFloat(fd.hr) < 50)) {
      if (highestPriority > 2) highestPriority = 2;
      reasons.push(`HR ${fd.hr} bpm (Critical Range)`);
    }
    if (gcsTotal >= 9 && gcsTotal <= 10) {
      if (highestPriority > 2) highestPriority = 2;
      reasons.push(`GCS ${gcsTotal} (Severely Reduced)`);
    }

    // Priority III (Yellow) vitals criteria
    if (fd.spo2 && parseFloat(fd.spo2) >= 92 && parseFloat(fd.spo2) < 94) {
      if (highestPriority > 3) highestPriority = 3;
      reasons.push(`SpO2 ${fd.spo2}% (Mild Hypoxia)`);
    }
    if (fd.hr && (parseFloat(fd.hr) > 110 || parseFloat(fd.hr) < 55)) {
      if (highestPriority > 3) highestPriority = 3;
      reasons.push(`HR ${fd.hr} bpm (Abnormal)`);
    }
    if (gcsTotal >= 11 && gcsTotal <= 12) {
      if (highestPriority > 3) highestPriority = 3;
      reasons.push(`GCS ${gcsTotal} (Reduced Sensorium)`);
    }

    // Pediatric-specific vital adjustments
    if (patientType === "pediatric") {
      const age = parseFloat(fd.age) || 0;
      
      // Fever thresholds for pediatric
      if (fd.temperature) {
        const tempC = parseFloat(fd.temperature);
        const tempF = tempC * 9/5 + 32;
        
        if (ageUnit === "years" && age < 2 && tempF > 102) {
          if (highestPriority > 2) highestPriority = 2;
          reasons.push(`Fever >102°F in infant <2 years`);
        } else if (ageUnit === "years" && age >= 2 && age <= 5 && tempF > 102) {
          if (highestPriority > 3) highestPriority = 3;
          reasons.push(`Fever >102°F in child 2-5 years`);
        }
      }
      
      // Low GRBS in infant
      if (fd.grbs && parseFloat(fd.grbs) < 54 && age < 1) {
        if (highestPriority > 2) highestPriority = 2;
        reasons.push(`Low GRBS ${fd.grbs} in infant`);
      }
      
      // CRT > 3 seconds (shock sign)
      if (fd.crt && parseFloat(fd.crt) > 3) {
        if (highestPriority > 1) highestPriority = 1;
        reasons.push(`CRT ${fd.crt}s (Sign of Shock)`);
      }
    }

    // Set result
    if (reasons.length === 0) {
      reasons.push("No critical findings - Standard triage");
    }

    const priorityConfig = PRIORITY_LEVELS[highestPriority];
    setTriageResult({
      priority_level: highestPriority,
      priority_color: priorityConfig.color,
      priority_name: priorityConfig.name,
      priority_label: priorityConfig.label,
      time_to_see: priorityConfig.timeframe,
      reasons: reasons,
    });
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access is required for voice input");
        return;
      }

      setVoiceText("");
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
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    await transcribeAndExtract(uri);
  };

  const transcribeAndExtract = async (audioUri) => {
    try {
      setIsTranscribing(true);
      const token = await AsyncStorage.getItem("token");

      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        name: "voice.m4a",
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
      const transcription = transcribeData.transcription || "";
      
      setVoiceText(prev => prev ? `${prev}\n${transcription}` : transcription);
      setIsTranscribing(false);

      // Extract data using AI
      setIsExtracting(true);
      
      const extractRes = await fetch(`${API_URL}/extract-triage-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: transcription }),
      });

      if (extractRes.ok) {
        const extractData = await extractRes.json();
        if (extractData.success && extractData.data) {
          applyExtractedData(extractData.data);
          Alert.alert("✅ Voice Data Captured", "Patient info has been auto-filled from voice.");
        }
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      let errorMsg = "Voice processing failed";
      if (err?.message) errorMsg = err.message;
      Alert.alert("Error", errorMsg);
    } finally {
      setIsTranscribing(false);
      setIsExtracting(false);
    }
  };

  const applyExtractedData = (data) => {
    if (!data) return;

    if (data.vitals) {
      const v = data.vitals;
      if (v.hr) formDataRef.current.hr = String(v.hr);
      if (v.bp_sys || v.bp_systolic) formDataRef.current.bp_systolic = String(v.bp_sys || v.bp_systolic);
      if (v.bp_dia || v.bp_diastolic) formDataRef.current.bp_diastolic = String(v.bp_dia || v.bp_diastolic);
      if (v.rr) formDataRef.current.rr = String(v.rr);
      if (v.spo2) formDataRef.current.spo2 = String(v.spo2);
      if (v.temp || v.temperature) formDataRef.current.temperature = String(v.temp || v.temperature);
      if (v.gcs_e) formDataRef.current.gcs_e = String(v.gcs_e);
      if (v.gcs_v) formDataRef.current.gcs_v = String(v.gcs_v);
      if (v.gcs_m) formDataRef.current.gcs_m = String(v.gcs_m);
      if (v.grbs) formDataRef.current.grbs = String(v.grbs);
    }

    if (data.age) {
      formDataRef.current.age = String(data.age);
      setPatientAge(String(data.age));
      const isPed = checkIfPediatric(String(data.age), data.age_unit || "years");
      setPatientType(isPed ? "pediatric" : "adult");
    }

    if (data.name) {
      formDataRef.current.name = data.name;
      setPatientName(data.name);
    }

    if (data.chief_complaint) {
      formDataRef.current.chief_complaint = data.chief_complaint;
      setChiefComplaint(data.chief_complaint);
    }

    forceUpdate();
    calculatePriority();
  };

  // Fill with default normal values
  const fillWithDefaults = () => {
    const fd = formDataRef.current;
    Object.keys(DEFAULT_VITALS).forEach(key => {
      if (!fd[key]) fd[key] = DEFAULT_VITALS[key];
    });
    forceUpdate();
    calculatePriority();
  };

  // Save to Case Sheet
  const saveToCaseSheet = async () => {
    const fd = formDataRef.current;
    const name = fd.name || patientName;
    
    if (!name) {
      Alert.alert("Required", "Please enter patient name before saving");
      return;
    }

    // Calculate priority if not done
    if (!triageResult) {
      calculatePriority();
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");

      const patientData = {
        name: fd.name || patientName || "",
        age: fd.age || patientAge || "",
        sex: sex,
        phone: fd.phone || "",
        address: fd.address || "",
        arrival_datetime: new Date().toISOString(),
        mode_of_arrival: modeOfArrival,
        brought_by: fd.brought_by || "",
        mlc: mlc,
      };

      const vitalsData = {
        hr: fd.hr ? parseFloat(fd.hr) : parseFloat(DEFAULT_VITALS.hr),
        bp_systolic: fd.bp_systolic ? parseFloat(fd.bp_systolic) : parseFloat(DEFAULT_VITALS.bp_systolic),
        bp_diastolic: fd.bp_diastolic ? parseFloat(fd.bp_diastolic) : parseFloat(DEFAULT_VITALS.bp_diastolic),
        rr: fd.rr ? parseFloat(fd.rr) : parseFloat(DEFAULT_VITALS.rr),
        spo2: fd.spo2 ? parseFloat(fd.spo2) : parseFloat(DEFAULT_VITALS.spo2),
        temperature: fd.temperature ? parseFloat(fd.temperature) : parseFloat(DEFAULT_VITALS.temperature),
        gcs_e: fd.gcs_e ? parseInt(fd.gcs_e) : parseInt(DEFAULT_VITALS.gcs_e),
        gcs_v: fd.gcs_v ? parseInt(fd.gcs_v) : parseInt(DEFAULT_VITALS.gcs_v),
        gcs_m: fd.gcs_m ? parseInt(fd.gcs_m) : parseInt(DEFAULT_VITALS.gcs_m),
        grbs: fd.grbs ? parseFloat(fd.grbs) : parseFloat(DEFAULT_VITALS.grbs),
      };

      const presentingComplaint = {
        text: fd.chief_complaint || chiefComplaint || voiceText || "",
        duration: "",
        onset_type: "Sudden",
        course: "Progressive",
      };

      // Build triage reasons string
      const triageReasons = triageResult?.reasons?.join("; ") || "";

      const payload = {
        patient: patientData,
        vitals_at_arrival: vitalsData,
        presenting_complaint: presentingComplaint,
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

      Alert.alert(
        "✅ Saved to Case Sheet",
        `${triageResult?.priority_label || "Priority IV"} - ${triageResult?.priority_name || "STANDARD"}\n${triageReasons}\n\nContinue editing?`,
        [
          {
            text: "Yes, Continue",
            onPress: () => navigation.navigate("CaseSheet", {
              caseId: newCase.id,
              patientType,
              patient: patientData,
              vitals: vitalsData,
              presentingComplaint: presentingComplaint,
              voiceTranscript: voiceText,
            }),
          },
          {
            text: "Go to Dashboard",
            onPress: () => navigation.navigate("Dashboard"),
            style: "cancel",
          },
        ]
      );
    } catch (err) {
      console.error("Save to case sheet error:", err);
      let errorMsg = "Failed to save";
      if (err?.message) errorMsg = err.message;
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Render Components
  const InputField = ({ label, field, placeholder, keyboardType = "default", multiline = false }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        key={`${field}-${refreshKey}`}
        style={[styles.input, multiline && styles.textArea]}
        defaultValue={formDataRef.current[field]}
        onChangeText={(t) => {
          updateTextField(field, t);
          if (field === 'name') setPatientName(t);
          if (field === 'age') {
            setPatientAge(t);
            const isPed = checkIfPediatric(t, ageUnit);
            setPatientType(isPed ? "pediatric" : "adult");
          }
          if (field === 'chief_complaint') setChiefComplaint(t);
        }}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );

  const VitalInput = ({ label, field, placeholder, unit = "" }) => (
    <View style={styles.vitalItem}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <TextInput
        key={`${field}-${refreshKey}`}
        style={styles.vitalInput}
        defaultValue={formDataRef.current[field]}
        onChangeText={(t) => {
          updateTextField(field, t);
          // Auto-calculate priority when vitals change
          setTimeout(() => calculatePriority(), 300);
        }}
        placeholder={placeholder}
        keyboardType="numeric"
      />
      {unit ? <Text style={styles.vitalUnit}>{unit}</Text> : null}
    </View>
  );

  const SelectButtons = ({ label, options, value, onSelect }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selectBtn, value === opt && styles.selectBtnActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.selectBtnText, value === opt && styles.selectBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ConditionCheckbox = ({ condition, priority, isSelected }) => {
    const priorityNum = parseInt(priority.replace("priority_", ""));
    const config = PRIORITY_LEVELS[priorityNum];
    
    return (
      <TouchableOpacity
        style={[
          styles.conditionItem,
          isSelected && { backgroundColor: config.bgColor, borderColor: config.color }
        ]}
        onPress={() => toggleCondition(priority, condition.id)}
      >
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={18}
          color={isSelected ? config.color : "#94a3b8"}
        />
        <Text style={[styles.conditionText, isSelected && { color: config.color }]}>
          {condition.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const PrioritySection = ({ priority, title }) => {
    const conditions = getConditions()[priority] || [];
    const priorityNum = parseInt(priority.replace("priority_", ""));
    const config = PRIORITY_LEVELS[priorityNum];
    
    if (conditions.length === 0) return null;
    
    return (
      <View style={styles.prioritySection}>
        <View style={[styles.prioritySectionHeader, { backgroundColor: config.bgColor, borderColor: config.color }]}>
          <View style={[styles.priorityDot, { backgroundColor: config.color }]} />
          <Text style={[styles.prioritySectionTitle, { color: config.color }]}>
            {config.label} - {config.name} ({config.timeframe})
          </Text>
        </View>
        <View style={styles.conditionsGrid}>
          {conditions.map((condition) => (
            <ConditionCheckbox
              key={condition.id}
              condition={condition}
              priority={priority}
              isSelected={!!selectedConditions[`${priority}_${condition.id}`]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>Emergency Triage</Text>
          <View style={{
            backgroundColor: patientType === 'pediatric' ? '#fce7f3' : '#dbeafe',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: patientType === 'pediatric' ? '#f9a8d4' : '#93c5fd',
          }}>
            <Text style={{
              color: patientType === 'pediatric' ? '#be185d' : '#1d4ed8',
              fontSize: 12,
              fontWeight: '600',
            }}>
              {patientType === 'pediatric' ? '👶 Pediatric' : '🧑 Adult'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={fillWithDefaults}>
          <Ionicons name="flash" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Triage Result Card - Always Visible at Top */}
        <View style={[
          styles.triageResultCard,
          triageResult ? {
            backgroundColor: PRIORITY_LEVELS[triageResult.priority_level].bgColor,
            borderColor: PRIORITY_LEVELS[triageResult.priority_level].color,
          } : {}
        ]}>
          <View style={styles.triageResultHeader}>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: triageResult ? PRIORITY_LEVELS[triageResult.priority_level].color : "#94a3b8" }
            ]}>
              <Text style={styles.priorityBadgeText}>
                {triageResult?.priority_label || "Priority IV"}
              </Text>
            </View>
            <Text style={[
              styles.triageResultTitle,
              { color: triageResult ? PRIORITY_LEVELS[triageResult.priority_level].color : "#64748b" }
            ]}>
              {triageResult?.priority_name || "STANDARD"}
            </Text>
          </View>
          <Text style={styles.triageTimeframe}>
            ⏱ Time to see: {triageResult?.time_to_see || "60 min"}
          </Text>
          {triageResult?.reasons?.length > 0 && (
            <View style={styles.triageReasons}>
              {triageResult.reasons.slice(0, 3).map((reason, idx) => (
                <Text key={idx} style={styles.triageReasonText}>• {reason}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Voice Recording Section */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceSectionTitle}>
            <Ionicons name="mic" size={18} color="#2563eb" /> Voice Input
          </Text>
          <TouchableOpacity
            style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isExtracting}
          >
            {isTranscribing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.voiceBtnText}>Transcribing...</Text>
              </>
            ) : isExtracting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.voiceBtnText}>Extracting...</Text>
              </>
            ) : isRecording ? (
              <>
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.voiceBtnText}>Stop Recording</Text>
              </>
            ) : (
              <>
                <Ionicons name="mic" size={24} color="#fff" />
                <Text style={styles.voiceBtnText}>Start Recording</Text>
              </>
            )}
          </TouchableOpacity>
          {voiceText ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Transcript:</Text>
              <Text style={styles.transcriptText}>{voiceText}</Text>
            </View>
          ) : null}
        </View>

        {/* Patient Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          
          <InputField label="Name *" field="name" placeholder="Patient name" />
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField label="Age *" field="age" placeholder="Age" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <SelectButtons
                label="Unit"
                options={["years", "months", "days"]}
                value={ageUnit}
                onSelect={(unit) => {
                  setAgeUnit(unit);
                  const isPed = checkIfPediatric(patientAge, unit);
                  setPatientType(isPed ? "pediatric" : "adult");
                }}
              />
            </View>
          </View>

          <SelectButtons label="Sex" options={["Male", "Female"]} value={sex} onSelect={setSex} />
          
          <SelectButtons
            label="Mode of Arrival"
            options={["Walk-in", "Ambulance", "Referred"]}
            value={modeOfArrival}
            onSelect={setModeOfArrival}
          />

          <InputField label="Chief Complaint" field="chief_complaint" placeholder="Main complaint..." multiline />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>MLC Case</Text>
            <TouchableOpacity
              style={[styles.switchToggle, mlc && styles.switchToggleActive]}
              onPress={() => setMlc(!mlc)}
            >
              <Text style={[styles.switchToggleText, mlc && styles.switchToggleTextActive]}>
                {mlc ? "YES" : "NO"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vitals Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vitals</Text>
            <TouchableOpacity style={styles.normalBtn} onPress={fillWithDefaults}>
              <Text style={styles.normalBtnText}>Fill Normal</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.vitalsGrid}>
            <VitalInput label="HR" field="hr" placeholder="bpm" unit="bpm" />
            <VitalInput label="RR" field="rr" placeholder="/min" unit="/min" />
            <VitalInput label="SpO₂" field="spo2" placeholder="%" unit="%" />
            <VitalInput label="Temp" field="temperature" placeholder="°C" unit="°C" />
            <VitalInput label="BP Sys" field="bp_systolic" placeholder="mmHg" />
            <VitalInput label="BP Dia" field="bp_diastolic" placeholder="mmHg" />
          </View>

          <Text style={styles.subSection}>GCS & Other</Text>
          <View style={styles.vitalsGrid}>
            <VitalInput label="E" field="gcs_e" placeholder="1-4" />
            <VitalInput label="V" field="gcs_v" placeholder="1-5" />
            <VitalInput label="M" field="gcs_m" placeholder="1-6" />
            <VitalInput label="GRBS" field="grbs" placeholder="mg/dL" />
            {patientType === "pediatric" && (
              <VitalInput label="CRT" field="crt" placeholder="sec" unit="s" />
            )}
          </View>
        </View>

        {/* Triage Conditions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {patientType === "pediatric" ? "Pediatric" : "Adult"} Triage Conditions
          </Text>
          <Text style={styles.cardSubtitle}>
            Select presenting conditions (highest priority determines triage level)
          </Text>

          <PrioritySection priority="priority_1" title="Priority I - IMMEDIATE" />
          <PrioritySection priority="priority_2" title="Priority II - VERY URGENT" />
          <PrioritySection priority="priority_3" title="Priority III - URGENT" />
          <PrioritySection priority="priority_4" title="Priority IV - STANDARD" />
          <PrioritySection priority="priority_5" title="Priority V - NON-URGENT" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.analyzeBtn]}
            onPress={calculatePriority}
          >
            <Ionicons name="analytics" size={20} color="#fff" />
            <Text style={styles.btnText}>Calculate Priority</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.btnDisabled]}
            onPress={saveToCaseSheet}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Save to Case Sheet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  content: { flex: 1 },

  // Triage Result Card
  triageResultCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  triageResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  triageResultTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  triageTimeframe: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  triageReasons: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  triageReasonText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 2,
  },

  // Voice Section
  voiceSection: {
    backgroundColor: "#eff6ff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  voiceSectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e40af" },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  voiceBtnRecording: { backgroundColor: "#dc2626" },
  voiceBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  transcriptBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  transcriptLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  transcriptText: { fontSize: 14, color: "#1e293b", marginTop: 4 },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e40af", marginBottom: 12 },
  cardSubtitle: { fontSize: 12, color: "#64748b", marginBottom: 12, marginTop: -8 },
  normalBtn: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  normalBtnText: { fontSize: 12, fontWeight: "600", color: "#16a34a" },

  // Input
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },

  // Select Buttons
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
  selectBtnText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  selectBtnTextActive: { color: "#fff" },

  // Switch
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  switchLabel: { fontSize: 14, color: "#475569" },
  switchToggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  switchToggleActive: { backgroundColor: "#ef4444" },
  switchToggleText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  switchToggleTextActive: { color: "#fff" },

  // Vitals
  subSection: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalItem: { width: "30%", minWidth: 80 },
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
  vitalUnit: { fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 2 },

  // Priority Sections
  prioritySection: {
    marginBottom: 16,
  },
  prioritySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  prioritySectionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  conditionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 8,
  },
  conditionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
    maxWidth: "100%",
  },
  conditionText: { fontSize: 12, color: "#64748b", flexShrink: 1 },

  // Action Row
  actionRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 16 },
  analyzeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  createBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});
