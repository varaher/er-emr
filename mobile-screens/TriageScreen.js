// TriageScreen.js - Hospital-Specific Triage Protocol (5-Level System)
// Based on TRIAGE.pdf: Priority I-V for Adult & Pediatric patients
import React, { useState, useRef, useCallback, useEffect } from "react";
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
    { id: "shock", label: "Shock (Hypovolemic/Cardiogenic/Anaphylactic)", category: "critical" },
    { id: "severe_respiratory_distress", label: "Severe Respiratory Distress", category: "airway" },
    { id: "major_trauma_bleeding", label: "Major Trauma with Severe Bleeding", category: "trauma" },
    { id: "altered_consciousness", label: "Unconscious / Altered Mental Status", category: "neuro" },
    { id: "severe_burns_airway", label: "Severe Burns with Airway Compromise", category: "trauma" },
    { id: "active_seizures", label: "Active Seizures", category: "neuro" },
    { id: "poisoning_abc", label: "Poisoning (Snake bite, Drug overdose)", category: "critical" },
    { id: "ami_complications", label: "Acute MI with Complications (CHF)", category: "cardiac" },
    { id: "pneumothorax", label: "Pneumothorax / Cardiac Tamponade", category: "critical" },
  ],
  priority_2: [
    { id: "chest_pain_cardiac", label: "Cardiac-sounding Chest Pain", category: "cardiac" },
    { id: "acute_stroke", label: "Acute Stroke (Within Window Period)", category: "neuro" },
    { id: "severe_pain", label: "Severe Pain (NRS 9-10)", category: "pain" },
    { id: "sepsis", label: "Suspected Sepsis / Septic Shock", category: "critical" },
    { id: "open_fractures", label: "Open Fractures", category: "trauma" },
    { id: "dka", label: "Suspected Diabetic Ketoacidosis (DKA)", category: "metabolic" },
    { id: "violent_patient", label: "Violent / Aggressive Patient", category: "psych" },
  ],
  priority_3: [
    { id: "moderate_head_injury", label: "Moderate Head Injury", category: "trauma" },
    { id: "moderate_trauma", label: "Moderate Trauma (Hip/Pelvis Fractures)", category: "trauma" },
    { id: "severe_dehydration", label: "Diarrhea/Vomiting with Dehydration", category: "gi" },
    { id: "acute_abdomen", label: "Acute Abdominal Pain", category: "gi" },
    { id: "psychosis", label: "Acute Psychosis with Suicidal Ideation", category: "psych" },
    { id: "allergic_reaction", label: "Acute Allergic Reactions", category: "allergy" },
    { id: "vaginal_bleeding", label: "Vaginal Bleeding with Stable Vitals", category: "gyn" },
  ],
  priority_4: [
    { id: "minor_trauma", label: "Minor Trauma (Ankle Sprain, Simple Fractures)", category: "trauma" },
    { id: "head_injury_alert", label: "Head Injury (Alert, No Vomiting)", category: "trauma" },
    { id: "fever_sore_throat", label: "Fever with Sore Throat", category: "infection" },
    { id: "mild_diarrhea", label: "Diarrhea/Vomiting (No Dehydration)", category: "gi" },
    { id: "mild_pain", label: "Pain Scale 1-3", category: "pain" },
    { id: "urti_lrti", label: "Respiratory Tract Infections (Mild)", category: "resp" },
    { id: "minor_procedures", label: "Minor Procedures", category: "procedure" },
  ],
  priority_5: [
    { id: "elective_procedures", label: "Elective Procedures", category: "procedure" },
    { id: "bp_checking", label: "BP Checking", category: "procedure" },
    { id: "sample_collection", label: "Sample Collection", category: "procedure" },
    { id: "prescription_refill", label: "Prescription Refill", category: "other" },
  ],
};

// Pediatric Triage Conditions (from PDF)
const PEDIATRIC_CONDITIONS = {
  priority_1: [
    { id: "cardiac_arrest", label: "Cardiac Arrest / Gasping", category: "critical" },
    { id: "gcs_less_8", label: "GCS < 8", category: "neuro" },
    { id: "severe_resp_distress", label: "Resp Distress (SpO2 < 94%)", category: "airway" },
    { id: "grunting_stridor", label: "Grunting / Stridor / Acute Severe Asthma", category: "airway" },
    { id: "shock_signs", label: "Signs of Shock (CRT >3s, BP <5th centile)", category: "critical" },
    { id: "severe_dehydration", label: "Severe Dehydration", category: "critical" },
    { id: "active_seizures", label: "Active Seizures", category: "neuro" },
    { id: "ped_trauma_abc", label: "Pediatric Trauma with Bleeding", category: "trauma" },
    { id: "poisoning_abc", label: "Poisoning with ABC Compromise", category: "critical" },
    { id: "snake_scorpion_bite", label: "Snake / Scorpion Sting", category: "critical" },
    { id: "neonate_critical", label: "Neonate with ABC Compromise", category: "critical" },
  ],
  priority_2: [
    { id: "gcs_9_12", label: "GCS 9-12", category: "neuro" },
    { id: "seizures_4hrs", label: "Seizures within Last 4 Hours", category: "neuro" },
    { id: "fever_infant_high", label: "Fever >102°F in Infant (<2 yrs)", category: "infection" },
    { id: "acute_diarrhea_dehy", label: "Acute Diarrhea with Some Dehydration", category: "gi" },
    { id: "fever_neck_pain", label: "Fever with Neck Pain / Headache", category: "infection" },
    { id: "burns_any", label: "Burns - Any Degree", category: "trauma" },
    { id: "low_grbs_infant", label: "Low GRBS <54 in Infant", category: "metabolic" },
  ],
  priority_3: [
    { id: "active_bleeding", label: "Active Bleeding", category: "trauma" },
    { id: "fever_child", label: "Fever >102°F in Children (2-5 yrs)", category: "infection" },
    { id: "seizure_4_24hrs", label: "Seizures within 4-24 Hours", category: "neuro" },
    { id: "dog_bite", label: "Dog Bite", category: "trauma" },
    { id: "abdominal_pain", label: "Acute Abdominal Pain", category: "gi" },
    { id: "irritable_infant", label: "Irritable Crying Infant (<1 yr)", category: "other" },
  ],
  priority_4: [
    { id: "fever_older", label: "Fever ≥102°F in Children >5 yrs", category: "infection" },
    { id: "acute_diarrhea_no_dehy", label: "Acute Diarrhea (No Dehydration)", category: "gi" },
    { id: "cough_cold", label: "Cough & Cold Symptoms Only", category: "resp" },
    { id: "throat_pain", label: "Throat Pain", category: "infection" },
    { id: "skin_rash", label: "Skin Rash / Infection", category: "skin" },
    { id: "joint_pain", label: "Joint Pains", category: "msk" },
  ],
  priority_5: [
    { id: "elective_procedures", label: "Elective Procedures", category: "procedure" },
    { id: "sample_collection", label: "Sample Collection", category: "procedure" },
  ],
};

// Helper function to determine if patient is pediatric based on age
const checkIfPediatric = (ageString, ageUnit = "years") => {
  if (!ageString) return false;
  const numericAge = parseFloat(ageString);
  if (isNaN(numericAge)) return false;
  if (ageUnit === "days" || ageUnit === "weeks" || ageUnit === "months") return true;
  return numericAge < 16;
};

export default function TriageScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  
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

      // Extract data using AI-powered endpoint
      setIsExtracting(true);
      
      const extractRes = await fetch(`${API_URL}/ai/extract-triage-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: transcription }),
      });

      if (extractRes.ok) {
        const extractData = await extractRes.json();
        console.log("AI Extraction response:", JSON.stringify(extractData, null, 2));
        
        if (extractData.success) {
          // Apply vitals
          if (extractData.vitals) {
            applyExtractedVitals(extractData.vitals);
          }
          
          // Also try to extract name/age from text using regex
          extractPatientInfoFromText(transcription);
          
          Alert.alert("✅ Voice Data Captured", "Patient info has been auto-filled from voice.");
          
          // Auto-calculate priority
          setTimeout(() => calculatePriority(), 200);
        }
      } else {
        // Fallback to regex-based extraction
        console.log("AI extraction failed, using regex fallback");
        const regexRes = await fetch(`${API_URL}/extract-triage-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: transcription }),
        });
        
        if (regexRes.ok) {
          const regexData = await regexRes.json();
          if (regexData.success && regexData.data) {
            applyRegexExtractedData(regexData.data);
            Alert.alert("✅ Voice Data Captured", "Patient info has been auto-filled from voice.");
          }
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

  // Apply AI-extracted vitals
  const applyExtractedVitals = (vitals) => {
    if (!vitals) return;
    
    const fd = formDataRef.current;
    
    if (vitals.hr != null) fd.hr = String(vitals.hr);
    if (vitals.bp_systolic != null) fd.bp_systolic = String(vitals.bp_systolic);
    if (vitals.bp_diastolic != null) fd.bp_diastolic = String(vitals.bp_diastolic);
    if (vitals.rr != null) fd.rr = String(vitals.rr);
    if (vitals.spo2 != null) fd.spo2 = String(vitals.spo2);
    if (vitals.temperature != null) fd.temperature = String(vitals.temperature);
    if (vitals.gcs_e != null) fd.gcs_e = String(vitals.gcs_e);
    if (vitals.gcs_v != null) fd.gcs_v = String(vitals.gcs_v);
    if (vitals.gcs_m != null) fd.gcs_m = String(vitals.gcs_m);
    if (vitals.capillary_refill != null) fd.crt = String(vitals.capillary_refill);
    if (vitals.grbs != null) fd.grbs = String(vitals.grbs);
    
    forceUpdate();
  };

  // Extract patient info from text using regex
  const extractPatientInfoFromText = (text) => {
    if (!text) return;
    
    const lower = text.toLowerCase();
    const fd = formDataRef.current;
    
    // Extract age
    const ageMatch = lower.match(/(\d+)\s*(year|yr|years?|month|mo|months?|day|days?)/i);
    if (ageMatch) {
      fd.age = ageMatch[1];
      setPatientAge(ageMatch[1]);
      
      const unitText = ageMatch[2].toLowerCase();
      if (unitText.startsWith("month") || unitText === "mo") {
        setAgeUnit("months");
        setPatientType("pediatric");
      } else if (unitText.startsWith("day")) {
        setAgeUnit("days");
        setPatientType("pediatric");
      } else {
        setAgeUnit("years");
        const age = parseInt(ageMatch[1]);
        setPatientType(age < 16 ? "pediatric" : "adult");
      }
    }
    
    // Extract sex
    if (lower.includes("male") || lower.includes("man") || lower.includes(" m ")) {
      setSex("Male");
      fd.sex = "Male";
    } else if (lower.includes("female") || lower.includes("woman") || lower.includes(" f ")) {
      setSex("Female");
      fd.sex = "Female";
    }
    
    // Extract chief complaint (keywords)
    const complaintPatterns = [
      /(?:complaint|complaining|presenting with|came with|brought for|c\/o)\s*[:]*\s*([^.]+)/i,
      /(?:chest pain|fever|cough|vomiting|diarrhea|breathlessness|headache|abdominal pain|weakness|seizure|trauma|accident|fall)[^.]*/i,
    ];
    
    for (const pattern of complaintPatterns) {
      const match = text.match(pattern);
      if (match) {
        const complaint = match[0].replace(/^(complaint|complaining|presenting with|came with|brought for|c\/o)\s*[:]*\s*/i, "").trim();
        if (complaint && complaint.length > 3) {
          fd.chief_complaint = complaint;
          setChiefComplaint(complaint);
          break;
        }
      }
    }
    
    forceUpdate();
  };

  // Apply regex-based extracted data (fallback)
  const applyRegexExtractedData = (data) => {
    if (!data) return;
    
    const fd = formDataRef.current;

    if (data.vitals) {
      const v = data.vitals;
      if (v.hr) fd.hr = String(v.hr);
      if (v.bp_sys || v.bp_systolic) fd.bp_systolic = String(v.bp_sys || v.bp_systolic);
      if (v.bp_dia || v.bp_diastolic) fd.bp_diastolic = String(v.bp_dia || v.bp_diastolic);
      if (v.rr) fd.rr = String(v.rr);
      if (v.spo2) fd.spo2 = String(v.spo2);
      if (v.temp || v.temperature) fd.temperature = String(v.temp || v.temperature);
      if (v.gcs_e) fd.gcs_e = String(v.gcs_e);
      if (v.gcs_v) fd.gcs_v = String(v.gcs_v);
      if (v.gcs_m) fd.gcs_m = String(v.gcs_m);
      if (v.grbs) fd.grbs = String(v.grbs);
    }

    if (data.age) {
      fd.age = String(data.age);
      setPatientAge(String(data.age));
      const isPed = checkIfPediatric(String(data.age), data.age_unit || "years");
      setPatientType(isPed ? "pediatric" : "adult");
    }

    if (data.name) {
      fd.name = data.name;
      setPatientName(data.name);
    }

    if (data.chief_complaint) {
      fd.chief_complaint = data.chief_complaint;
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

  // Go to Case Sheet (auto-creates case and navigates)
  const goToCaseSheet = async () => {
    const fd = formDataRef.current;
    const name = fd.name || patientName;
    
    if (!name) {
      Alert.alert("Required", "Please enter patient name before proceeding");
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

      // Navigate directly to Case Sheet
      navigation.replace("CaseSheet", {
        caseId: newCase.id,
        patientType,
        patient: patientData,
        vitals: vitalsData,
        presentingComplaint: presentingComplaint,
        voiceTranscript: voiceText,
        triageResult: triageResult,
      });

    } catch (err) {
      console.error("Create case error:", err);
      let errorMsg = "Failed to create case";
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
        placeholderTextColor="#94a3b8"
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
        placeholderTextColor="#94a3b8"
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
        <Text style={[styles.conditionText, isSelected && { color: config.color, fontWeight: "600" }]}>
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
              {patientType === 'pediatric' ? 'Pediatric' : 'Adult'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={fillWithDefaults}>
          <Ionicons name="flash" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Voice Recording Section */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceSectionTitle}>
            <Ionicons name="mic" size={18} color="#2563eb" /> Voice Input
          </Text>
          <Text style={styles.voiceHint}>
            Speak: "45 year old male with chest pain, BP 120/80, HR 90, SpO2 98%"
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
                <Text style={styles.voiceBtnText}>Extracting Data...</Text>
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

        {/* Calculate Priority Button */}
        <TouchableOpacity
          style={styles.calculateBtn}
          onPress={calculatePriority}
        >
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.btnText}>Calculate Triage Priority</Text>
        </TouchableOpacity>

        {/* Triage Result Card - At Bottom */}
        {triageResult && (
          <View style={[
            styles.triageResultCard,
            {
              backgroundColor: PRIORITY_LEVELS[triageResult.priority_level].bgColor,
              borderColor: PRIORITY_LEVELS[triageResult.priority_level].color,
            }
          ]}>
            <View style={styles.triageResultHeader}>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: PRIORITY_LEVELS[triageResult.priority_level].color }
              ]}>
                <Text style={styles.priorityBadgeText}>
                  {triageResult.priority_label}
                </Text>
              </View>
              <Text style={[
                styles.triageResultTitle,
                { color: PRIORITY_LEVELS[triageResult.priority_level].color }
              ]}>
                {triageResult.priority_name}
              </Text>
            </View>
            <Text style={styles.triageTimeframe}>
              ⏱ Time to see: {triageResult.time_to_see}
            </Text>
            {triageResult.reasons?.length > 0 && (
              <View style={styles.triageReasons}>
                {triageResult.reasons.map((reason, idx) => (
                  <Text key={idx} style={styles.triageReasonText}>• {reason}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Go to Case Sheet Button */}
        <TouchableOpacity
          style={[styles.goToCaseSheetBtn, loading && styles.btnDisabled]}
          onPress={goToCaseSheet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
              <Text style={styles.goToCaseSheetText}>Go to Case Sheet</Text>
            </>
          )}
        </TouchableOpacity>

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

  // Voice Section
  voiceSection: {
    backgroundColor: "#eff6ff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  voiceSectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e40af" },
  voiceHint: { fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" },
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
    marginBottom: 12,
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
    color: "#1e293b",
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
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
    color: "#1e293b",
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

  // Calculate Button
  calculateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  // Triage Result Card - Bottom
  triageResultCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
  },
  triageResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  triageResultTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  triageTimeframe: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 8,
    fontWeight: "600",
  },
  triageReasons: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  triageReasonText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 3,
  },

  // Go to Case Sheet Button
  goToCaseSheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  goToCaseSheetText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
});
