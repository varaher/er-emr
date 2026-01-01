import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { VoiceTextInput, VoiceTextarea } from '@/components/VoiceTextInput';
import WhisperCaseSheetInput from '@/components/WhisperCaseSheetInput';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, AlertCircle, Mic, Database, Clock, FileText, Download, Plus, X, Search, Pill, ClipboardList, AlertTriangle, Timer, CheckCircle2, Home } from 'lucide-react';
import { generateCaseSheetPDF } from '@/utils/pdfGenerator';
import ContinuousVoiceRecorder from '@/components/ContinuousVoiceRecorder';
import { ADULT_DRUGS, PEDIATRIC_DRUGS, PROCEDURE_OPTIONS, PROCEDURE_CATEGORIES } from '@/data/drugFormulary';

export default function CaseSheetForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDateTime, setSaveDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [saveType, setSaveType] = useState('final');
  const [saveNotes, setSaveNotes] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiSources, setAiSources] = useState([]);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showTimestampModal, setShowTimestampModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [pendingLockDecision, setPendingLockDecision] = useState(null);
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [addendumNote, setAddendumNote] = useState('');
  const [addendums, setAddendums] = useState([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // NEW: Drug Selection State
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [isPediatric, setIsPediatric] = useState(false);
  
  // NEW: Procedure Notes State
  const [selectedProceduresWithNotes, setSelectedProceduresWithNotes] = useState({});
  
  // NEW: AI Diagnosis State
  const [aiDiagnosisLoading, setAiDiagnosisLoading] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState(null);
  const [aiRedFlags, setAiRedFlags] = useState([]);
  const [showAIDiagnosisPanel, setShowAIDiagnosisPanel] = useState(false);
  
  // NEW: Addendum Timer
  const addendumTimerRef = useRef(null);
  const [addendumReminderCount, setAddendumReminderCount] = useState(0);
  
  // Tab navigation - UPDATED to include notes tab
  const tabs = ['patient', 'vitals', 'primary', 'history', 'examination', 'investigations', 'treatment', 'notes'];
  const currentTabIndex = tabs.indexOf(activeTab);
  
  const goToNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goToPreviousTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Get triage data from navigation state
  const triageData = location.state || {};

  const [formData, setFormData] = useState({
    patient: {
      uhid: '',
      name: '',
      age: '',
      sex: 'Male',
      phone: '',
      address: '',
      arrival_datetime: new Date().toISOString().slice(0, 16),
      mode_of_arrival: 'Walk-in',
      accident_datetime: '',
      place_of_accident: '',
      nature_of_accident: [],
      mechanism_of_injury: [],
      brought_by: 'Relative',
      informant_name: '',
      informant_reliability: 'Good',
      identification_mark: '',
      mlc: false
    },
    vitals_at_arrival: {
      hr: null,
      bp_systolic: null,
      bp_diastolic: null,
      rr: null,
      spo2: null,
      temperature: null,
      gcs_e: null,
      gcs_v: null,
      gcs_m: null,
      grbs: null,
      pain_score: null
    },
    presenting_complaint: {
      text: '',
      duration: '',
      onset_type: 'Sudden',
      course: 'Worsening'
    },
    primary_assessment: {
      // Airway
      airway_status: '',
      airway_position: '',
      airway_obstruction_cause: '',
      airway_speech: '',
      airway_signs: '',
      airway_obstruction: [],
      airway_interventions: [],
      airway_notes: '',
      airway_additional_notes: '',
      // Breathing
      breathing_rr: null,
      breathing_spo2: null,
      breathing_oxygen_device: 'Room air',
      breathing_oxygen_flow: null,
      breathing_work: 'Normal',
      breathing_pattern: '',
      breathing_expansion: '',
      breathing_air_entry_status: '',
      breathing_added_sounds: '',
      breathing_air_entry: [],
      breathing_adjuncts: [],
      breathing_notes: '',
      breathing_additional_notes: '',
      // Circulation
      circulation_hr: null,
      circulation_bp_systolic: null,
      circulation_bp_diastolic: null,
      circulation_crt: null,
      circulation_crt_status: '',
      circulation_rhythm: '',
      circulation_skin: '',
      circulation_neck_veins: 'Normal',
      circulation_peripheral_pulses: 'Present',
      circulation_external_bleed: false,
      circulation_long_bone_deformity: false,
      circulation_adjuncts: [],
      circulation_notes: '',
      circulation_additional_notes: '',
      // Disability
      disability_avpu: 'A',
      disability_gcs_e: null,
      disability_gcs_v: null,
      disability_gcs_m: null,
      disability_pupils_size: 'Equal',
      disability_pupils_reaction: 'Brisk',
      disability_grbs: null,
      disability_seizure: false,
      disability_lateralizing: '',
      disability_notes: '',
      disability_additional_notes: '',
      // Exposure
      exposure_temperature: null,
      exposure_rashes: '',
      exposure_bruises: '',
      exposure_logroll_findings: [],
      exposure_local_exam_notes: '',
      exposure_additional_notes: '',
      // Reassessment
      reassessment_status: '',
      reassessment_time: '',
      reassessment_notes: '',
      // Adjuvants
      ecg_findings: '',
      vbg_ph: null,
      vbg_pco2: null,
      vbg_hco3: null,
      vbg_hb: null,
      vbg_glu: null,
      vbg_lac: null,
      vbg_na: null,
      vbg_k: null,
      vbg_cr: null,
      bedside_echo_findings: '',
      adjuvants_additional_notes: ''
    },
    history: {
      hpi: '',
      hpi_additional_notes: '',
      signs_and_symptoms: '',
      secondary_survey_neuro: [],
      secondary_survey_resp: [],
      secondary_survey_cardiac: [],
      secondary_survey_gi: [],
      secondary_survey_gu: [],
      secondary_survey_msk: [],
      secondary_survey_notes: '',
      secondary_survey_additional_notes: '',
      past_medical: [],
      past_medical_additional_notes: '',
      past_surgical: '',
      past_surgical_additional_notes: '',
      drug_history: '',
      family_history: '',
      family_gyn_additional_notes: '',
      gyn_history: '',
      lmp: '',
      allergies: [],
      allergies_additional_notes: '',
      psychological_assessment: {},
      psychological_additional_notes: ''
    },
    examination: {
      general_pallor: false,
      general_icterus: false,
      general_clubbing: false,
      general_lymphadenopathy: false,
      general_thyroid: 'Normal',
      general_varicose_veins: false,
      general_notes: '',
      general_additional_notes: '',
      cvs_status: 'Normal',
      cvs_s1_s2: '',
      cvs_pulse: '',
      cvs_pulse_rate: null,
      cvs_apex_beat: '',
      cvs_precordial_heave: '',
      cvs_added_sounds: '',
      cvs_murmurs: '',
      cvs_additional_notes: '',
      respiratory_status: 'Normal',
      respiratory_expansion: '',
      respiratory_percussion: '',
      respiratory_breath_sounds: '',
      respiratory_vocal_resonance: '',
      respiratory_added_sounds: '',
      respiratory_additional_notes: '',
      abdomen_status: 'Normal',
      abdomen_umbilical: '',
      abdomen_organomegaly: '',
      abdomen_percussion: '',
      abdomen_bowel_sounds: '',
      abdomen_external_genitalia: '',
      abdomen_hernial_orifices: '',
      abdomen_per_rectal: '',
      abdomen_per_vaginal: '',
      abdomen_additional_notes: '',
      cns_status: 'Normal',
      cns_higher_mental: '',
      cns_cranial_nerves: '',
      cns_sensory_system: '',
      cns_motor_system: '',
      cns_reflexes: '',
      cns_romberg_sign: '',
      cns_cerebellar_signs: '',
      cns_additional_notes: '',
      extremities_status: 'Normal',
      extremities_findings: '',
      extremities_additional_notes: ''
    },
    investigations: {
      panels_selected: [],
      individual_tests: [],
      results_notes: ''
    },
    treatment: {
      interventions: [],
      procedures: [],
      procedure_notes: '',
      intervention_notes: '',
      provisional_diagnoses: [],
      differential_diagnoses: []
    },
    disposition: {
      type: 'discharged',
      destination: '',
      advice: '',
      condition_at_discharge: 'Stable',
      discharge_vitals: {
        hr: null,
        bp_systolic: null,
        bp_diastolic: null,
        rr: null,
        spo2: null,
        temperature: null,
        gcs_e: null,
        gcs_v: null,
        gcs_m: null,
        grbs: null,
        pain_score: null
      }
    },
    triage_id: triageData.triageId || null,
    triage_priority: triageData.triagePriority || null,
    triage_color: triageData.triageColor || null,
    em_resident: user?.name || '',
    em_consultant: ''
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchCase();
    }
    
    // Auto-populate vitals from triage if available
    if (triageData.triageId) {
      fetchTriageAndPopulateVitals(triageData.triageId);
    }
    
    // Auto-populate from triage voice recordings and vitals
    if (triageData.chief_complaint || triageData.vitals) {
      setFormData(prev => ({
        ...prev,
        presenting_complaint: {
          ...prev.presenting_complaint,
          text: triageData.chief_complaint || prev.presenting_complaint.text
        },
        vitals_at_arrival: triageData.vitals ? {
          hr: triageData.vitals.hr || prev.vitals_at_arrival.hr,
          bp_systolic: triageData.vitals.bp_systolic || prev.vitals_at_arrival.bp_systolic,
          bp_diastolic: triageData.vitals.bp_diastolic || prev.vitals_at_arrival.bp_diastolic,
          rr: triageData.vitals.rr || prev.vitals_at_arrival.rr,
          spo2: triageData.vitals.spo2 || prev.vitals_at_arrival.spo2,
          temperature: triageData.vitals.temperature || prev.vitals_at_arrival.temperature,
          gcs_e: triageData.vitals.gcs_e || prev.vitals_at_arrival.gcs_e,
          gcs_v: triageData.vitals.gcs_v || prev.vitals_at_arrival.gcs_v,
          gcs_m: triageData.vitals.gcs_m || prev.vitals_at_arrival.gcs_m,
          grbs: prev.vitals_at_arrival.grbs,
          pain_score: prev.vitals_at_arrival.pain_score
        } : prev.vitals_at_arrival
      }));
      
      if (triageData.chief_complaint) {
        toast.success('✅ Chief complaint auto-filled from triage', { duration: 3000 });
      }
    }
  }, [id]);

  // Auto-save effect - saves every 30 seconds if there are changes
  useEffect(() => {
    if (!id || id === 'new' || isLocked) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        setAutoSaving(true);
        await api.put(`/cases/${id}?lock_case=false`, formData);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [id, formData, isLocked]);

  // NEW: Addendum reminder timer - every 2 hours
  useEffect(() => {
    if (!id || id === 'new') return;

    const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    addendumTimerRef.current = setInterval(() => {
      setAddendumReminderCount(prev => prev + 1);
      setShowAddendumModal(true);
      toast.info('⏰ Time for progress notes! Consider adding an addendum.', {
        duration: 5000
      });
    }, TWO_HOURS);

    return () => {
      if (addendumTimerRef.current) {
        clearInterval(addendumTimerRef.current);
      }
    };
  }, [id]);

  const fetchTriageAndPopulateVitals = async (triageId) => {
    try {
      const response = await api.get(`/triage/${triageId}`);
      const triageVitals = response.data.vitals;
      
      // Populate vitals from triage
      setFormData(prev => ({
        ...prev,
        vitals_at_arrival: {
          hr: triageVitals.hr || prev.vitals_at_arrival.hr,
          bp_systolic: triageVitals.bp_systolic || prev.vitals_at_arrival.bp_systolic,
          bp_diastolic: triageVitals.bp_diastolic || prev.vitals_at_arrival.bp_diastolic,
          rr: triageVitals.rr || prev.vitals_at_arrival.rr,
          spo2: triageVitals.spo2 || prev.vitals_at_arrival.spo2,
          temperature: triageVitals.temperature || prev.vitals_at_arrival.temperature,
          gcs_e: triageVitals.gcs_e || prev.vitals_at_arrival.gcs_e,
          gcs_v: triageVitals.gcs_v || prev.vitals_at_arrival.gcs_v,
          gcs_m: triageVitals.gcs_m || prev.vitals_at_arrival.gcs_m,
          grbs: triageVitals.grbs || prev.vitals_at_arrival.grbs,
          pain_score: prev.vitals_at_arrival.pain_score
        }
      }));
      
      toast.success('Vitals auto-populated from triage');
    } catch (error) {
      console.error('Failed to fetch triage data:', error);
    }
  };

  const fetchCase = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases/${id}`);
      setFormData(response.data);
      setAddendums(response.data.addendums || []);
      
      // Check if case is locked
      if (response.data.is_locked) {
        setIsLocked(true);
        toast.warning('⚠️ This case is LOCKED and cannot be edited (for legal/audit compliance). Use Addendum to add notes.', {
          duration: 6000
        });
      }
    } catch (error) {
      toast.error('Failed to fetch case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (lockAfterSave = false, customTimestamp = null) => {
    try {
      setLoading(true);
      if (id && id !== 'new') {
        const url = customTimestamp 
          ? `/cases/${id}?lock_case=${lockAfterSave}&custom_timestamp=${encodeURIComponent(customTimestamp)}`
          : `/cases/${id}?lock_case=${lockAfterSave}`;
        
        await api.put(url, formData);
        if (lockAfterSave) {
          setIsLocked(true);
          toast.success('🔒 Case Saved and LOCKED Successfully!', {
            description: 'No further edits allowed. Use Addendum feature to add notes.',
            duration: 5000
          });
        } else {
          toast.success('✅ Case Saved Successfully!', {
            description: `Saved at ${new Date().toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})} IST`,
            duration: 3000
          });
        }
      } else {
        const response = await api.post('/cases', formData);
        toast.success('✅ New Case Created Successfully!', {
          description: 'You can now continue editing or save.',
          duration: 3000
        });
        navigate(`/case/${response.data.id}`);
      }
      setShowLockWarning(false);
      setShowTimestampModal(false);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('⚠️ Case is locked and cannot be edited! Use Addendum feature.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to save case');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // AI Extraction Handlers for Case Sheet
  const handleHistoryExtraction = (extractedData) => {
    setFormData(prev => ({
      ...prev,
      history: {
        ...prev.history,
        ...(extractedData.signs_and_symptoms && { signs_and_symptoms: extractedData.signs_and_symptoms }),
        ...(extractedData.drug_history && { drug_history: extractedData.drug_history }),
        ...(extractedData.past_surgical && { past_surgical: extractedData.past_surgical }),
        ...(extractedData.family_history && { family_history: extractedData.family_history }),
        ...(extractedData.allergies && extractedData.allergies.length > 0 && { 
          allergies: [...new Set([...prev.history.allergies, ...extractedData.allergies])]
        }),
        ...(extractedData.past_medical && extractedData.past_medical.length > 0 && { 
          past_medical: [...new Set([...prev.history.past_medical, ...extractedData.past_medical])]
        })
      }
    }));
    toast.success('✨ History data applied!', { duration: 2000 });
  };

  const handleExaminationExtraction = (extractedData) => {
    setFormData(prev => ({
      ...prev,
      examination: {
        ...prev.examination,
        ...(extractedData.general_notes && { general_notes: extractedData.general_notes }),
        ...(extractedData.cvs_findings && { cvs_additional_notes: extractedData.cvs_findings }),
        ...(extractedData.respiratory_findings && { respiratory_additional_notes: extractedData.respiratory_findings }),
        ...(extractedData.abdomen_findings && { abdomen_additional_notes: extractedData.abdomen_findings }),
        ...(extractedData.cns_findings && { cns_additional_notes: extractedData.cns_findings }),
        ...(extractedData.general_pallor !== undefined && { general_pallor: extractedData.general_pallor }),
        ...(extractedData.general_icterus !== undefined && { general_icterus: extractedData.general_icterus }),
        ...(extractedData.general_clubbing !== undefined && { general_clubbing: extractedData.general_clubbing }),
        ...(extractedData.general_lymphadenopathy !== undefined && { general_lymphadenopathy: extractedData.general_lymphadenopathy })
      }
    }));
    toast.success('✨ Examination data applied!', { duration: 2000 });
  };

  const handlePrimaryAssessmentExtraction = (extractedData) => {
    setFormData(prev => ({
      ...prev,
      primary_assessment: {
        ...prev.primary_assessment,
        ...(extractedData.airway_notes && { airway_additional_notes: extractedData.airway_notes }),
        ...(extractedData.breathing_notes && { breathing_additional_notes: extractedData.breathing_notes }),
        ...(extractedData.circulation_notes && { circulation_additional_notes: extractedData.circulation_notes }),
        ...(extractedData.disability_notes && { disability_additional_notes: extractedData.disability_notes }),
        ...(extractedData.exposure_local_exam_notes && { exposure_additional_notes: extractedData.exposure_local_exam_notes })
      }
    }));
    toast.success('✨ Primary assessment data applied!', { duration: 2000 });
  };

  const handleTimestampSelection = () => {
    const now = new Date();
    
    // Get IST time
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + (istOffset * 60 * 1000));
    
    // Set default date and time to current IST
    const dateStr = istTime.toISOString().split('T')[0];
    const timeStr = istTime.toTimeString().slice(0, 5);
    
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setShowTimestampModal(true);
  };

  const confirmTimestamp = (lockDecision) => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    // Combine date and time into ISO format
    const timestamp = `${selectedDate}T${selectedTime}:00+05:30`; // IST timezone
    
    // Validate timestamp
    const selectedDateTime = new Date(timestamp);
    const now = new Date();
    
    // Check if in future
    if (selectedDateTime > now) {
      toast.error('Selected time cannot be in the future');
      return;
    }
    
    // Check if within 2 hours
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
    if (selectedDateTime < twoHoursAgo) {
      toast.error('Selected time must be within 2 hours of current time');
      return;
    }
    
    // Save with custom timestamp
    handleSave(lockDecision, timestamp);
  };

  const handleSaveClick = () => {
    if (id && id !== 'new' && !isLocked) {
      // Show timestamp selection first
      handleTimestampSelection();
    } else if (isLocked) {
      toast.error('⚠️ Case is locked and cannot be edited! Use Addendum feature.');
    } else {
      // For new cases, just save without locking
      handleSave(false);
    }
  };

  const handleAddAddendum = async () => {
    if (!addendumNote.trim()) {
      toast.error('Please enter addendum note');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/cases/${id}/addendum`, {
        case_id: id,
        note: addendumNote
      });
      
      // Refresh addendums
      const response = await api.get(`/cases/${id}/addendums`);
      setAddendums(response.data.addendums);
      
      setAddendumNote('');
      setShowAddendumModal(false);
      toast.success('Addendum added successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add addendum');
    } finally {
      setLoading(false);
    }
  };

  const handleAISuggestion = async (type) => {
    if (!id || id === 'new') {
      toast.error('Please save the case first before using AI suggestions');
      return;
    }

    try {
      setAiLoading(true);
      const response = await api.post('/ai/generate', {
        case_sheet_id: id,
        prompt_type: type
      });
      
      // Set title based on type
      const titles = {
        'red_flags': '🚨 AI Red Flags & Critical Findings',
        'diagnosis_suggestions': '💡 AI Differential Diagnosis Suggestions'
      };
      
      setAiTitle(titles[type] || 'AI Suggestion');
      setAiResponse(response.data.response);
      setAiSources(response.data.sources || []);
      setShowAIModal(true);
      
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'AI suggestion failed');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  // NEW: AI Diagnosis with Red Flags Function
  const getAIDiagnosisSuggestions = async () => {
    const clinicalContext = {
      age: formData.patient?.age,
      sex: formData.patient?.sex,
      presenting_complaint: formData.presenting_complaint?.text,
      vitals: {
        hr: formData.vitals_at_arrival?.hr,
        rr: formData.vitals_at_arrival?.rr,
        bp: `${formData.vitals_at_arrival?.bp_systolic || ''}/${formData.vitals_at_arrival?.bp_diastolic || ''}`,
        spo2: formData.vitals_at_arrival?.spo2,
        temp: formData.vitals_at_arrival?.temperature,
      },
      history: formData.history?.hpi,
      examination_findings: formData.examination?.general_notes || '',
      current_diagnosis: formData.treatment?.provisional_diagnoses?.join(', ') || '',
    };

    if (!clinicalContext.presenting_complaint && !clinicalContext.history) {
      toast.error('Please enter presenting complaint or history first');
      return;
    }

    setAiDiagnosisLoading(true);
    try {
      const response = await api.post('/ai/generate', {
        case_sheet_id: id || 'new',
        prompt_type: 'diagnosis_suggestions',
        case_context: clinicalContext,
      });

      setAiDiagnosisResult(response.data.response || response.data.content || '');
      
      // Extract red flags from response
      const responseText = response.data.response || '';
      const redFlagMatch = responseText.match(/RED FLAGS?:?([\s\S]*?)(?:SUGGESTED|DIFFERENTIAL|DIAGNOSIS|$)/i);
      if (redFlagMatch) {
        const flags = redFlagMatch[1].split(/[•\-\n]/).filter(f => f.trim().length > 3);
        setAiRedFlags(flags.slice(0, 5));
      }
      
      setShowAIDiagnosisPanel(true);
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI Diagnosis error:', error);
      toast.error('Failed to get AI suggestions. Please try again.');
    }
    setAiDiagnosisLoading(false);
  };

  // NEW: Drug Management Functions
  const drugList = isPediatric ? PEDIATRIC_DRUGS : ADULT_DRUGS;
  
  const filteredDrugs = drugList.filter(drug =>
    drug.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) ||
    drug.category.toLowerCase().includes(drugSearchQuery.toLowerCase())
  );

  const addDrug = (drug, dose) => {
    const newDrug = {
      id: Date.now(),
      name: drug.name,
      strength: drug.strength,
      dose: dose,
      category: drug.category,
      time: new Date().toLocaleTimeString(),
    };
    setSelectedDrugs(prev => [...prev, newDrug]);
    
    // Update form data
    const drugsList = [...selectedDrugs, newDrug].map(d => `${d.name} ${d.dose}`).join(', ');
    updateNestedField('treatment', 'intervention_notes', 
      (formData.treatment?.intervention_notes || '') + 
      (formData.treatment?.intervention_notes ? '\n' : '') + 
      `${newDrug.name} ${newDrug.dose} at ${newDrug.time}`
    );
    
    setShowDrugModal(false);
    setDrugSearchQuery('');
    toast.success(`Added ${drug.name} ${dose}`);
  };

  const removeDrug = (drugId) => {
    setSelectedDrugs(prev => prev.filter(d => d.id !== drugId));
  };

  // NEW: Procedure Notes Functions
  const toggleProcedureWithNote = (procedureId) => {
    setSelectedProceduresWithNotes(prev => {
      if (prev[procedureId] !== undefined) {
        const { [procedureId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [procedureId]: '' };
    });
  };

  const updateProcedureNote = (procedureId, note) => {
    setSelectedProceduresWithNotes(prev => ({
      ...prev,
      [procedureId]: note
    }));
  };

  const handleDownloadPDF = () => {
    if (!id || id === 'new') {
      toast.error('⚠️ Please save the case first before downloading PDF', {
        description: 'Click "Complete & Save Case Sheet" button to save',
        duration: 4000
      });
      return;
    }

    try {
      toast.info('Generating PDF...', { duration: 2000 });
      const pdf = generateCaseSheetPDF(formData);
      const fileName = `CaseSheet_${formData.patient?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('✅ PDF Downloaded Successfully!', {
        description: `File: ${fileName}`,
        duration: 3000
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('❌ Failed to generate PDF', {
        description: error.message || 'Please check console for details',
        duration: 5000
      });
    }
  };

  const handleDownloadWord = async () => {
    if (!id || id === 'new') {
      toast.error('⚠️ Please save the case first before downloading Word document', {
        description: 'Click "Complete & Save Case Sheet" button to save',
        duration: 4000
      });
      return;
    }

    try {
      toast.info('Generating Word document...', { duration: 2000 });
      
      // Simple text export as Word format
      const content = generateWordContent(formData);
      const blob = new Blob([content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CaseSheet_${formData.patient?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('✅ Word Document Downloaded!', {
        duration: 3000
      });
    } catch (error) {
      console.error('Word generation error:', error);
      toast.error('❌ Failed to generate Word document', {
        description: error.message,
        duration: 5000
      });
    }
  };

  const generateWordContent = (data) => {
    const get = (obj, path, defaultValue = 'N/A') => {
      try {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
      } catch {
        return defaultValue;
      }
    };

    return `
EMERGENCY DEPARTMENT CASE SHEET
(Print on Hospital Letterhead)
Generated: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST

================================================================================

PATIENT INFORMATION
================================================================================
UHID:                  ${get(data, 'patient.uhid')}
Name:                  ${get(data, 'patient.name')}
Age/Sex:               ${get(data, 'patient.age')} / ${get(data, 'patient.sex')}
Phone:                 ${get(data, 'patient.phone')}
Address:               ${get(data, 'patient.address')}
Arrival Date & Time:   ${data.patient?.arrival_datetime ? new Date(data.patient.arrival_datetime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}) : 'N/A'}
Mode of Arrival:       ${get(data, 'patient.mode_of_arrival')}
MLC:                   ${data.patient?.mlc ? 'Yes' : 'No'}

================================================================================

VITALS AT ARRIVAL
================================================================================
Heart Rate:            ${get(data, 'vitals_at_arrival.hr')} bpm
Blood Pressure:        ${get(data, 'vitals_at_arrival.bp_systolic')}/${get(data, 'vitals_at_arrival.bp_diastolic')} mmHg
Respiratory Rate:      ${get(data, 'vitals_at_arrival.rr')} /min
SpO2:                  ${get(data, 'vitals_at_arrival.spo2')}%
Temperature:           ${get(data, 'vitals_at_arrival.temperature')}°C
GCS:                   E${get(data, 'vitals_at_arrival.gcs_e', '-')} V${get(data, 'vitals_at_arrival.gcs_v', '-')} M${get(data, 'vitals_at_arrival.gcs_m', '-')}
Pain Score:            ${get(data, 'vitals_at_arrival.pain_score')}

================================================================================

PRESENTING COMPLAINT
================================================================================
${get(data, 'presenting_complaint.text')}
Duration: ${get(data, 'presenting_complaint.duration')}
Onset: ${get(data, 'presenting_complaint.onset_type')}

================================================================================

PRIMARY ASSESSMENT (ABCDE)
================================================================================
AIRWAY
  Status: ${get(data, 'primary_assessment.airway_status')}
  Notes: ${get(data, 'primary_assessment.airway_notes')}

BREATHING
  RR: ${get(data, 'primary_assessment.breathing_rr')} /min
  SpO2: ${get(data, 'primary_assessment.breathing_spo2')}%
  Work of Breathing: ${get(data, 'primary_assessment.breathing_work')}
  Notes: ${get(data, 'primary_assessment.breathing_notes')}

CIRCULATION
  HR: ${get(data, 'primary_assessment.circulation_hr')} bpm
  BP: ${get(data, 'primary_assessment.circulation_bp_systolic')}/${get(data, 'primary_assessment.circulation_bp_diastolic')} mmHg
  CRT: ${get(data, 'primary_assessment.circulation_crt')} sec
  Notes: ${get(data, 'primary_assessment.circulation_notes')}

DISABILITY
  AVPU: ${get(data, 'primary_assessment.disability_avpu')}
  GCS: E${get(data, 'primary_assessment.disability_gcs_e', '-')} V${get(data, 'primary_assessment.disability_gcs_v', '-')} M${get(data, 'primary_assessment.disability_gcs_m', '-')}
  GRBS: ${get(data, 'primary_assessment.disability_grbs')} mg/dL
  Notes: ${get(data, 'primary_assessment.disability_notes')}

EXPOSURE
  Temperature: ${get(data, 'primary_assessment.exposure_temperature')}°C
  Notes: ${get(data, 'primary_assessment.exposure_local_exam_notes')}

${data.primary_assessment?.ecg_findings && data.primary_assessment.ecg_findings !== 'N/A' ? `
ADJUVANTS TO PRIMARY ASSESSMENT
  ECG Findings: ${data.primary_assessment.ecg_findings}
  ${data.primary_assessment?.vbg_ph ? `VBG: PH ${data.primary_assessment.vbg_ph}, PCO2 ${data.primary_assessment.vbg_pco2}, HCO3 ${data.primary_assessment.vbg_hco3}` : ''}
  ${data.primary_assessment?.bedside_echo_findings ? `Bedside Echo: ${data.primary_assessment.bedside_echo_findings}` : ''}
` : ''}

================================================================================

HISTORY
================================================================================
History of Present Illness:
${get(data, 'history.hpi')}

Past Medical History: ${data.history?.past_medical?.length > 0 ? data.history.past_medical.join(', ') : 'None'}

Past Surgical History: ${get(data, 'history.past_surgical')}

Allergies: ${data.history?.allergies?.length > 0 ? data.history.allergies.join(', ') : 'None'}

================================================================================

PHYSICAL EXAMINATION
================================================================================
General: ${get(data, 'examination.general_notes')}

Cardiovascular System (CVS): ${get(data, 'examination.cvs_status')}
${data.examination?.cvs_status === 'Abnormal' ? `  Details: ${get(data, 'examination.cvs_s1_s2')} ${get(data, 'examination.cvs_pulse')}` : ''}

Respiratory System: ${get(data, 'examination.respiratory_status')}

Abdomen: ${get(data, 'examination.abdomen_status')}

Central Nervous System: ${get(data, 'examination.cns_status')}

Extremities: ${get(data, 'examination.extremities_status')}

================================================================================

INVESTIGATIONS ORDERED
================================================================================
${data.investigations?.panels_selected?.length > 0 ? data.investigations.panels_selected.join('\n') : 'None ordered yet'}

${get(data, 'investigations.notes') !== 'N/A' ? `Additional Tests: ${data.investigations.notes}` : ''}

================================================================================

TREATMENT GIVEN
================================================================================
Interventions: ${data.treatment?.interventions?.length > 0 ? data.treatment.interventions.join(', ') : 'None'}

Medications: ${get(data, 'treatment.medication_notes')}

Notes: ${get(data, 'treatment.notes')}

================================================================================

DISPOSITION
================================================================================
${data.disposition ? `
Type: ${get(data, 'disposition.type')}
Condition at Discharge: ${get(data, 'disposition.condition_at_discharge')}
Notes: ${get(data, 'disposition.notes')}
` : 'Not documented yet'}

================================================================================

SIGNATURES
================================================================================

_______________________              _______________________
EM Resident Signature                EM Consultant Signature

Dr. ${get(data, 'em_resident')}                     Dr. ${get(data, 'em_consultant')}


Generated: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST
    `.trim();
  };

  const handleTranscriptComplete = (parsedData) => {
    console.log('🔍 STEP 1: Received parsed data from backend:', JSON.stringify(parsedData, null, 2));
    
    // Create the updated form data object
    const mappedData = {};
    
    // 1. PATIENT INFORMATION
    if (parsedData.patient_info) {
      console.log('📝 Mapping patient info:', parsedData.patient_info);
      mappedData.patient = {
        ...formData.patient,
        ...(parsedData.patient_info.name && { name: parsedData.patient_info.name }),
        ...(parsedData.patient_info.age && { age: parsedData.patient_info.age }),
        ...(parsedData.patient_info.gender && { sex: parsedData.patient_info.gender })
      };
    }
    
    // 2. VITALS AT ARRIVAL
    if (parsedData.vitals) {
      console.log('📝 Mapping vitals:', parsedData.vitals);
      mappedData.vitals_at_arrival = {
        ...formData.vitals_at_arrival,
        ...(parsedData.vitals.hr && { hr: parsedData.vitals.hr }),
        ...(parsedData.vitals.bp_systolic && { bp_systolic: parsedData.vitals.bp_systolic }),
        ...(parsedData.vitals.bp_diastolic && { bp_diastolic: parsedData.vitals.bp_diastolic }),
        ...(parsedData.vitals.rr && { rr: parsedData.vitals.rr }),
        ...(parsedData.vitals.spo2 && { spo2: parsedData.vitals.spo2 }),
        ...(parsedData.vitals.temperature && { temperature: parsedData.vitals.temperature }),
        ...(parsedData.vitals.gcs_e && { gcs_e: parsedData.vitals.gcs_e }),
        ...(parsedData.vitals.gcs_v && { gcs_v: parsedData.vitals.gcs_v }),
        ...(parsedData.vitals.gcs_m && { gcs_m: parsedData.vitals.gcs_m })
      };
      console.log('✅ Vitals mapped to:', mappedData.vitals_at_arrival);
    }
    
    // 3. PRESENTING COMPLAINT
    if (parsedData.presenting_complaint) {
      mappedData.presenting_complaint = { ...formData.presenting_complaint, ...parsedData.presenting_complaint };
    }
    
    // 4. PRIMARY ASSESSMENT - ABCDE
    if (parsedData.primary_assessment) {
      mappedData.primary_assessment = { ...formData.primary_assessment, ...parsedData.primary_assessment };
    }
    
    // 5. HISTORY
    if (parsedData.history) {
      mappedData.history = { ...formData.history, ...parsedData.history };
    }
    
    // 6. EXAMINATION
    if (parsedData.examination) {
      mappedData.examination = { ...formData.examination, ...parsedData.examination };
    }
    
    // 7. TREATMENT
    if (parsedData.treatment) {
      mappedData.treatment = { ...formData.treatment, ...parsedData.treatment };
    }
    
    console.log('🎯 STEP 2: About to call setFormData with:', mappedData);
    
    // Apply all mapped data to form state
    setFormData(prevData => {
      const finalData = {
        ...prevData,
        ...mappedData
      };
      console.log('✅ STEP 3: setFormData called. Final state:', finalData);
      return finalData;
    });
    
    // Display red flags as toast notifications
    if (parsedData.red_flags && parsedData.red_flags.length > 0) {
      parsedData.red_flags.forEach(flag => {
        if (flag.includes('🚨')) {
          toast.error(flag, { duration: 10000 });
        } else {
          toast.warning(flag, { duration: 8000 });
        }
      });
    }
    
    toast.success('✅ Case sheet updated with AI-extracted data! Review and save.', {
      description: 'All sections have been auto-populated from your voice recording.'
    });
  };

  const handleSaveToEMR = async () => {
    if (!id || id === 'new') {
      toast.error('Please save the case first');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/save-to-emr', null, {
        params: {
          case_sheet_id: id,
          save_type: saveType,
          save_date: saveDateTime,
          notes: saveNotes
        }
      });
      
      toast.success(`Case saved to EMR successfully`, {
        description: `Saved at ${new Date(response.data.saved_at).toLocaleString()}`
      });
      
      setShowSaveModal(false);
      setSaveNotes('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save to EMR');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateNestedField = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const toggleArrayField = (section, field, value) => {
    setFormData(prev => {
      const currentArray = prev[section][field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  if (loading && id !== 'new') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading case...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                data-testid="back-to-dashboard"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {id === 'new' ? 'New Case Sheet' : 'Edit Case Sheet'}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-600">Emergency department case documentation</p>
                  {formData.triage_color && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${formData.triage_color === 'red' ? 'bg-red-100 text-red-800' : ''}
                      ${formData.triage_color === 'orange' ? 'bg-orange-100 text-orange-800' : ''}
                      ${formData.triage_color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${formData.triage_color === 'green' ? 'bg-green-100 text-green-800' : ''}
                      ${formData.triage_color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
                    `}>
                      Triage: Priority {formData.triage_priority}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {id && id !== 'new' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAISuggestion('red_flags')}
                    disabled={aiLoading}
                    data-testid="ai-red-flags-button"
                    className="border-red-200 hover:bg-red-50 hover:text-red-700"
                    title="Analyze vitals and symptoms for critical findings requiring immediate attention"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {aiLoading ? 'Analyzing...' : 'AI Red Flags'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAISuggestion('diagnosis_suggestions')}
                    disabled={aiLoading}
                    data-testid="ai-diagnosis-button"
                    className="border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                    title="Get AI-powered differential diagnosis suggestions based on case data"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading ? 'Thinking...' : 'AI Diagnosis'}
                  </Button>
                </>
              )}
              {!isLocked && lastSaved && (
                <span className="text-xs text-slate-500">
                  {autoSaving ? '💾 Auto-saving...' : `✓ Last saved: ${lastSaved.toLocaleTimeString('en-IN')}`}
                </span>
              )}
              
              <Button 
                onClick={handleSaveClick} 
                disabled={loading || isLocked}
                data-testid="save-case-button"
                className={isLocked ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLocked ? '🔒 Locked' : (loading ? 'Saving...' : 'Save Case')}
              </Button>
              {id && id !== 'new' ? (
                <>
                  <Button 
                    onClick={handleDownloadPDF} 
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    data-testid="download-pdf-button"
                    title="Download case sheet as PDF for printing on hospital letterhead"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button 
                    onClick={handleDownloadWord} 
                    variant="outline"
                    className="border-green-200 hover:bg-green-50 hover:text-green-700"
                    data-testid="download-word-button"
                    title="Download case sheet as Word document"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Word
                  </Button>
                  <Button 
                    onClick={() => setShowSaveModal(true)} 
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="save-to-emr-button"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Save to EMR
                  </Button>
                </>
              ) : (
                <div className="text-sm text-slate-500 italic">
                  💡 Save case first to enable PDF/Word downloads
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* AI Suggestion Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{aiTitle}</DialogTitle>
            <DialogDescription>
              AI-powered clinical decision support based on your case data
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Explanation Banner */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-900 font-medium mb-1">How to use this AI suggestion:</p>
                  <ul className="text-blue-700 space-y-1 list-disc ml-4">
                    <li>Review the AI analysis carefully</li>
                    <li>Use as clinical decision support, not replacement for judgment</li>
                    <li>Copy relevant points to your documentation</li>
                    <li>Always verify with clinical findings</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Response */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                  {aiResponse}
                </pre>
              </div>
            </div>

            {/* Sources Section */}
            {aiSources && aiSources.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  📚 Clinical References & Sources
                </h3>
                <div className="space-y-3">
                  {aiSources.map((source, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-slate-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline block"
                          >
                            {source.title}
                          </a>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {source.snippet}
                          </p>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 hover:text-slate-600 mt-1 inline-flex items-center gap-1"
                          >
                            {source.url}
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 italic">
                  💡 These references provide evidence-based context for the AI analysis. Always consult primary sources and current institutional protocols.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Powered by OpenAI GPT-5.1 • Evidence-based clinical references • Always verify AI suggestions
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(aiResponse);
                  toast.success('AI response copied to clipboard');
                }}
              >
                Copy to Clipboard
              </Button>
              <Button onClick={() => setShowAIModal(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save to EMR Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to EMR</DialogTitle>
            <DialogDescription>
              Save this case to the Electronic Medical Record system with a timestamp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-type">Save Type</Label>
              <select
                id="save-type"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={saveType}
                onChange={(e) => setSaveType(e.target.value)}
              >
                <option value="final">Final Save</option>
                <option value="draft">Draft Save</option>
                <option value="backup">Backup</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-datetime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Save Date & Time
              </Label>
              <Input
                id="save-datetime"
                type="datetime-local"
                value={saveDateTime}
                onChange={(e) => setSaveDateTime(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500">Adjust the date/time if needed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-notes">Notes (Optional)</Label>
              <textarea
                id="save-notes"
                className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                placeholder="Add any notes about this save..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveToEMR} disabled={loading}>
              <Database className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save to EMR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Warning Modal */}
      <Dialog open={showLockWarning} onOpenChange={setShowLockWarning}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-6 w-6" />
              ⚠️ Important: Review Before Saving
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              <strong>Please carefully review all information before saving.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Security & Legal Compliance
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span><strong>Do you want to LOCK this case?</strong> Once locked, NO further edits will be allowed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Locking ensures <strong>legal compliance</strong> and <strong>audit trail integrity</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>This prevents unauthorized modifications to medical records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Recommended: <strong>Lock after final review and before discharge</strong></span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">✅ Checklist Before Saving:</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>☑️ Patient information is complete and accurate</li>
                <li>☑️ All vitals and examination findings documented</li>
                <li>☑️ Investigation orders are correct</li>
                <li>☑️ Treatment plan is finalized</li>
                <li>☑️ Disposition decision is appropriate</li>
                <li>☑️ EM Resident and Consultant names are filled</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> You can save without locking if you need to make more changes later. 
                However, for final documentation and discharge, locking is recommended for security.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={() => { setShowLockWarning(false); setActiveTab('treatment'); }}
              className="w-full sm:w-auto"
            >
              ↩ Go Back to Review
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowLockWarning(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                if (confirm('Are you sure you want to save this case? You can edit it later.')) {
                  handleSave(false);
                }
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Without Locking
            </Button>
            <Button 
              onClick={() => {
                if (confirm('Are you sure you want to save and LOCK this case? No further edits will be allowed.')) {
                  handleSave(true);
                }
              }}
              disabled={loading}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            >
              <Database className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save & Lock Case 🔒'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addendum Modal - For Adding Notes to Locked Cases */}
      <Dialog open={showAddendumModal} onOpenChange={setShowAddendumModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Add Addendum to Locked Case
            </DialogTitle>
            <DialogDescription>
              Add additional notes or updates to this locked case. This will be recorded with your name and timestamp.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📝 <strong>Addendums</strong> allow you to add supplementary information to locked cases 
                without modifying the original documentation. All addendums are timestamped and attributed to the author.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addendum-note">Addendum Note *</Label>
              <textarea
                id="addendum-note"
                className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={addendumNote}
                onChange={(e) => setAddendumNote(e.target.value)}
                placeholder="Enter additional notes, updates, or clarifications..."
              />
              <p className="text-xs text-slate-500">
                This will be permanently added to the case record with your name and IST timestamp.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddendumModal(false); setAddendumNote(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddAddendum} disabled={loading || !addendumNote.trim()}>
              <FileText className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Addendum'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drug Selection Modal */}
      <Dialog open={showDrugModal} onOpenChange={setShowDrugModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Select {isPediatric ? 'Pediatric' : 'Adult'} Drug
            </DialogTitle>
            <DialogDescription>
              Search and select drugs from the emergency formulary
            </DialogDescription>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search drugs by name or category..."
              value={drugSearchQuery}
              onChange={(e) => setDrugSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Drug List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[50vh]">
            {filteredDrugs.map((drug, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-slate-900">{drug.name}</div>
                    <div className="text-sm text-slate-500">{drug.strength} • {drug.category}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {drug.doses.map((dose, doseIdx) => (
                    <Button
                      key={doseIdx}
                      size="sm"
                      onClick={() => addDrug(drug, dose)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {dose}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {filteredDrugs.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                No drugs match your search
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDrugModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banners */}
        <div className="mb-6 space-y-3">
          {/* Locked Case Warning */}
          {isLocked && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-red-900 mb-1">🔒 CASE LOCKED - READ ONLY</h3>
                    <p className="text-sm text-red-800">
                      This case has been locked for <strong>legal and audit compliance</strong>. No edits are allowed. 
                      All form fields are disabled. To add supplementary information, use the Addendum feature.
                    </p>
                    {formData.locked_at && (
                      <p className="text-xs text-red-700 mt-2">
                        Locked on: {new Date(formData.locked_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAddendumModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  data-testid="add-addendum-button"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add Addendum
                </Button>
              </div>
            </div>
          )}

          {/* Display Existing Addendums */}
          {addendums && addendums.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Addendums ({addendums.length})
              </h3>
              <div className="space-y-3">
                {addendums.map((addendum, index) => (
                  <div key={addendum.id || index} className="bg-white p-3 rounded-md border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-blue-900">
                        👤 {addendum.added_by_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-blue-700">
                        📅 {new Date(addendum.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{addendum.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Input Banner */}
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Mic className="h-5 w-5 text-sky-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-sky-900 mb-1">Voice Input Enabled</h3>
                <p className="text-sm text-sky-700">
                  Click the <Mic className="h-3 w-3 inline" /> microphone icon next to any text field to use voice dictation. 
                  Speak clearly and the text will be transcribed automatically. You can mix voice and keyboard input.
                </p>
              </div>
            </div>
          </div>

          {/* AI Features Guide */}
          {id && id !== 'new' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-900 mb-2">AI Clinical Decision Support</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-700">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-700">AI Red Flags</p>
                        <p className="text-xs">Analyzes vitals and symptoms to identify critical findings requiring immediate attention. Use this to catch potentially missed emergency indicators.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-purple-700">AI Diagnosis</p>
                        <p className="text-xs">Suggests differential diagnoses based on presenting complaint, vitals, and examination. Use this to consider alternative diagnoses you might not have thought of.</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 mt-2 italic">
                    💡 Tip: Fill in vitals, presenting complaint, and examination findings before using AI features for best results.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Continuous Voice Recorder for Auto-population */}
        <div className="mb-6">
          <ContinuousVoiceRecorder 
            onTranscriptComplete={handleTranscriptComplete}
            caseSheetId={id !== 'new' ? id : null}
          />
        </div>

        <div className={isLocked ? 'pointer-events-none opacity-60' : ''}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-8 mb-6">
            <TabsTrigger value="patient" data-testid="tab-patient">Patient Info</TabsTrigger>
            <TabsTrigger value="vitals" data-testid="tab-vitals">Vitals</TabsTrigger>
            <TabsTrigger value="primary" data-testid="tab-primary">ABCDE</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Secondary Survey</TabsTrigger>
            <TabsTrigger value="examination" data-testid="tab-examination">Physical Exam</TabsTrigger>
            <TabsTrigger value="investigations" data-testid="tab-investigations">Investigations</TabsTrigger>
            <TabsTrigger value="treatment" data-testid="tab-treatment">Treatment</TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes" className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Patient Info Tab */}
          <TabsContent value="patient">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Basic patient demographics and arrival details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="patient-name" className="flex items-center gap-2">
                      Patient Name *
                      <Mic className="h-3 w-3 text-slate-400" />
                    </Label>
                    <VoiceTextInput
                      id="patient-name"
                      data-testid="input-patient-name"
                      value={formData.patient.name}
                      onChange={(e) => updateNestedField('patient', 'name', e.target.value)}
                      placeholder="Enter patient name..."
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patient-uhid">UHID <span className="text-xs text-slate-500">(optional)</span></Label>
                    <Input
                      id="patient-uhid"
                      data-testid="input-patient-uhid"
                      value={formData.patient.uhid}
                      onChange={(e) => updateNestedField('patient', 'uhid', e.target.value)}
                      placeholder="Hospital ID (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-age">Age <span className="text-red-500">*</span></Label>
                    <Input
                      id="patient-age"
                      data-testid="input-patient-age"
                      value={formData.patient.age}
                      onChange={(e) => updateNestedField('patient', 'age', e.target.value)}
                      placeholder="Age in years"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-sex">Sex <span className="text-red-500">*</span></Label>
                    <select
                      id="patient-sex"
                      data-testid="select-patient-sex"
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.patient.sex}
                      onChange={(e) => updateNestedField('patient', 'sex', e.target.value)}
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Phone <span className="text-xs text-slate-500">(optional)</span></Label>
                    <Input
                      id="patient-phone"
                      data-testid="input-patient-phone"
                      value={formData.patient.phone}
                      onChange={(e) => updateNestedField('patient', 'phone', e.target.value)}
                      placeholder="Contact number (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-address">Address <span className="text-xs text-slate-500">(optional)</span></Label>
                    <Input
                      id="patient-address"
                      data-testid="input-patient-address"
                      value={formData.patient.address}
                      onChange={(e) => updateNestedField('patient', 'address', e.target.value)}
                      placeholder="Residential address (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival-datetime">Arrival Date & Time</Label>
                    <Input
                      id="arrival-datetime"
                      data-testid="input-arrival-datetime"
                      type="datetime-local"
                      value={formData.patient.arrival_datetime}
                      onChange={(e) => updateNestedField('patient', 'arrival_datetime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mode-of-arrival">Mode of Arrival</Label>
                    <select
                      id="mode-of-arrival"
                      data-testid="select-mode-of-arrival"
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.patient.mode_of_arrival}
                      onChange={(e) => updateNestedField('patient', 'mode_of_arrival', e.target.value)}
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Wheelchair">Wheelchair</option>
                      <option value="Stretcher">Stretcher</option>
                      <option value="Ambulance (BLS)">Ambulance (BLS)</option>
                      <option value="Ambulance (ALS)">Ambulance (ALS)</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mlc"
                        data-testid="checkbox-mlc"
                        checked={formData.patient.mlc}
                        onCheckedChange={(checked) => updateNestedField('patient', 'mlc', checked)}
                      />
                      <Label htmlFor="mlc" className="font-medium text-red-600">
                        MLC (Medico-Legal Case)
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: Vitals →
              </Button>
            </div>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Vitals at Arrival</CardTitle>
                <CardDescription>
                  Record initial vital signs
                  {formData.triage_id && (
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      ✓ Auto-populated from triage
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hr">Heart Rate (bpm)</Label>
                    <Input
                      id="hr"
                      data-testid="input-hr"
                      type="number"
                      value={formData.vitals_at_arrival.hr || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'hr', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bp-systolic">BP Systolic</Label>
                    <Input
                      id="bp-systolic"
                      data-testid="input-bp-systolic"
                      type="number"
                      value={formData.vitals_at_arrival.bp_systolic || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'bp_systolic', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bp-diastolic">BP Diastolic</Label>
                    <Input
                      id="bp-diastolic"
                      data-testid="input-bp-diastolic"
                      type="number"
                      value={formData.vitals_at_arrival.bp_diastolic || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'bp_diastolic', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rr">Respiratory Rate</Label>
                    <Input
                      id="rr"
                      data-testid="input-rr"
                      type="number"
                      value={formData.vitals_at_arrival.rr || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'rr', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spo2">SpO2 (%)</Label>
                    <Input
                      id="spo2"
                      data-testid="input-spo2"
                      type="number"
                      value={formData.vitals_at_arrival.spo2 || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'spo2', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°C)</Label>
                    <Input
                      id="temperature"
                      data-testid="input-temperature"
                      type="number"
                      step="0.1"
                      value={formData.vitals_at_arrival.temperature || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'temperature', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gcs-e">GCS Eye</Label>
                    <Input
                      id="gcs-e"
                      data-testid="input-gcs-e"
                      type="number"
                      min="1"
                      max="4"
                      value={formData.vitals_at_arrival.gcs_e || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'gcs_e', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gcs-v">GCS Verbal</Label>
                    <Input
                      id="gcs-v"
                      data-testid="input-gcs-v"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.vitals_at_arrival.gcs_v || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'gcs_v', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gcs-m">GCS Motor</Label>
                    <Input
                      id="gcs-m"
                      data-testid="input-gcs-m"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.vitals_at_arrival.gcs_m || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'gcs_m', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grbs">GRBS (mg/dL)</Label>
                    <Input
                      id="grbs"
                      data-testid="input-grbs"
                      type="number"
                      value={formData.vitals_at_arrival.grbs || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'grbs', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pain-score">Pain Score (0-10)</Label>
                    <Input
                      id="pain-score"
                      data-testid="input-pain-score"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.vitals_at_arrival.pain_score || ''}
                      onChange={(e) => updateNestedField('vitals_at_arrival', 'pain_score', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Patient Info
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: ABCDE Assessment →
              </Button>
            </div>
          </TabsContent>

          {/* Presenting Complaint Tab - Part of Primary */}
          <TabsContent value="primary">
            <div className="space-y-6">
              {/* Presenting Complaint */}
              <Card>
                <CardHeader>
                  <CardTitle>Presenting Complaint</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="complaint-text" className="flex items-center gap-2">
                        Chief Complaint *
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mic className="h-3 w-3" />
                          Voice enabled
                        </span>
                      </Label>
                      <VoiceTextarea
                        id="complaint-text"
                        data-testid="textarea-complaint"
                        value={formData.presenting_complaint.text}
                        onChange={(e) => updateNestedField('presenting_complaint', 'text', e.target.value)}
                        placeholder="Describe the chief complaint..."
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Input
                          id="duration"
                          data-testid="input-duration"
                          value={formData.presenting_complaint.duration}
                          onChange={(e) => updateNestedField('presenting_complaint', 'duration', e.target.value)}
                          placeholder="e.g., 2 hours, 3 days"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="onset-type">Onset</Label>
                        <select
                          id="onset-type"
                          data-testid="select-onset-type"
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={formData.presenting_complaint.onset_type}
                          onChange={(e) => updateNestedField('presenting_complaint', 'onset_type', e.target.value)}
                        >
                          <option value="Sudden">Sudden</option>
                          <option value="Gradual">Gradual</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="course">Course</Label>
                        <select
                          id="course"
                          data-testid="select-course"
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={formData.presenting_complaint.course}
                          onChange={(e) => updateNestedField('presenting_complaint', 'course', e.target.value)}
                        >
                          <option value="Worsening">Worsening</option>
                          <option value="Improving">Improving</option>
                          <option value="Intermittent">Intermittent</option>
                          <option value="Static">Static</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ABCDE Assessment - Detailed Dropdown Format */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">PRIMARY SURVEY – ABCDE</span>
                  </CardTitle>
                  <CardDescription>Complete the structured primary survey with standardized dropdown options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* AI-Powered ABCDE Assessment */}
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <Label className="flex items-center gap-2 mb-2 font-semibold text-blue-900">
                        <Sparkles className="h-5 w-5" />
                        Quick ABCDE Assessment (AI-Powered)
                      </Label>
                      <WhisperCaseSheetInput
                        value={formData.primary_assessment.airway_additional_notes}
                        onChange={(e) => updateNestedField('primary_assessment', 'airway_additional_notes', e.target.value)}
                        onExtractedData={handlePrimaryAssessmentExtraction}
                        section="primary_assessment"
                        placeholder="Click Record: Airway patent, breathing regular 16/min, circulation stable HR 80 BP 120/80, GCS 15, no external injuries..."
                        rows={3}
                      />
                      <p className="text-xs text-slate-600 mt-2">
                        ✨ <strong>AI will extract:</strong> Airway status, Breathing assessment, Circulation findings, Disability/Neuro, Exposure findings
                      </p>
                    </div>

                    {/* A - AIRWAY */}
                    <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50/30">
                      <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                        <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">A</span>
                        AIRWAY
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="airway-position">Position</Label>
                          <select
                            id="airway-position"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={formData.primary_assessment.airway_position || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_position', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Self-maintained">Self-maintained</option>
                            <option value="Recovery position">Recovery position</option>
                            <option value="Head tilt/Chin lift">Head tilt/Chin lift</option>
                            <option value="Jaw thrust">Jaw thrust</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="airway-patency">Patency</Label>
                          <select
                            id="airway-patency"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={formData.primary_assessment.airway_status}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_status', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Patent">Patent</option>
                            <option value="Partially obstructed">Partially obstructed</option>
                            <option value="Completely obstructed">Completely obstructed</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="airway-obstruction">Obstruction Cause</Label>
                          <select
                            id="airway-obstruction"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={formData.primary_assessment.airway_obstruction_cause || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_obstruction_cause', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Tongue fall">Tongue fall</option>
                            <option value="Secretions">Secretions</option>
                            <option value="Blood/Vomitus">Blood/Vomitus</option>
                            <option value="Foreign body">Foreign body</option>
                            <option value="Edema">Edema</option>
                            <option value="Trauma">Trauma</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="airway-speech">Speech</Label>
                          <select
                            id="airway-speech"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={formData.primary_assessment.airway_speech || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_speech', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Clear">Clear</option>
                            <option value="Hoarse">Hoarse</option>
                            <option value="Stridor">Stridor</option>
                            <option value="Gurgling">Gurgling</option>
                            <option value="Unable to speak">Unable to speak</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="airway-signs">Signs of Compromise</Label>
                          <select
                            id="airway-signs"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={formData.primary_assessment.airway_signs || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_signs', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Accessory muscle use">Accessory muscle use</option>
                            <option value="Tracheal tug">Tracheal tug</option>
                            <option value="Intercostal recession">Intercostal recession</option>
                            <option value="Cyanosis">Cyanosis</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Interventions Done</Label>
                          <div className="flex flex-wrap gap-2">
                            {['Suction', 'OPA', 'NPA', 'LMA', 'ETT', 'Cricothyrotomy'].map(item => (
                              <div key={item} className="flex items-center space-x-1">
                                <Checkbox
                                  id={`airway-${item}`}
                                  checked={formData.primary_assessment.airway_interventions?.includes(item)}
                                  onCheckedChange={() => toggleArrayField('primary_assessment', 'airway_interventions', item)}
                                />
                                <Label htmlFor={`airway-${item}`} className="text-xs">{item}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="airway-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="airway-additional-notes"
                          value={formData.primary_assessment.airway_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'airway_additional_notes', e.target.value)}
                          placeholder="Additional airway observations..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* B - BREATHING */}
                    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50/30">
                      <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                        <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">B</span>
                        BREATHING
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="breathing-rr">RR (/min)</Label>
                          <Input
                            id="breathing-rr"
                            type="number"
                            value={formData.primary_assessment.breathing_rr || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_rr', parseFloat(e.target.value))}
                            className="border-orange-300 focus:ring-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-spo2">SpO2 (%)</Label>
                          <Input
                            id="breathing-spo2"
                            type="number"
                            value={formData.primary_assessment.breathing_spo2 || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_spo2', parseFloat(e.target.value))}
                            className="border-orange-300 focus:ring-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-o2-device">O₂ Device</Label>
                          <select
                            id="breathing-o2-device"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_oxygen_device}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_oxygen_device', e.target.value)}
                          >
                            <option value="Room air">Room air</option>
                            <option value="Nasal prongs">Nasal prongs</option>
                            <option value="Simple face mask">Simple face mask</option>
                            <option value="Venturi mask">Venturi mask</option>
                            <option value="NRM">NRM (Non-rebreather)</option>
                            <option value="HFNC">HFNC</option>
                            <option value="NIV/BiPAP">NIV/BiPAP</option>
                            <option value="Mechanical ventilation">Mechanical ventilation</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-o2-flow">O₂ Flow (L/min)</Label>
                          <Input
                            id="breathing-o2-flow"
                            type="number"
                            value={formData.primary_assessment.breathing_oxygen_flow || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_oxygen_flow', parseFloat(e.target.value))}
                            className="border-orange-300 focus:ring-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-pattern">Breathing Pattern</Label>
                          <select
                            id="breathing-pattern"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_pattern || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_pattern', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Regular">Regular</option>
                            <option value="Tachypneic">Tachypneic</option>
                            <option value="Bradypneic">Bradypneic</option>
                            <option value="Kussmaul">Kussmaul</option>
                            <option value="Cheyne-Stokes">Cheyne-Stokes</option>
                            <option value="Ataxic">Ataxic</option>
                            <option value="Apneic spells">Apneic spells</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-expansion">Chest Expansion</Label>
                          <select
                            id="breathing-expansion"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_expansion || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_expansion', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Equal bilateral">Equal bilateral</option>
                            <option value="Reduced left">Reduced left</option>
                            <option value="Reduced right">Reduced right</option>
                            <option value="Reduced bilateral">Reduced bilateral</option>
                            <option value="Paradoxical">Paradoxical (flail chest)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-air-entry">Air Entry</Label>
                          <select
                            id="breathing-air-entry"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_air_entry_status || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_air_entry_status', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Equal bilateral">Equal bilateral</option>
                            <option value="Reduced left">Reduced left</option>
                            <option value="Reduced right">Reduced right</option>
                            <option value="Reduced bilateral">Reduced bilateral</option>
                            <option value="Absent left">Absent left</option>
                            <option value="Absent right">Absent right</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-effort">Effort</Label>
                          <select
                            id="breathing-effort"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_work}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_work', e.target.value)}
                          >
                            <option value="Normal">Normal</option>
                            <option value="Mild ↑">Mild ↑</option>
                            <option value="Moderate ↑">Moderate ↑</option>
                            <option value="Severe ↑">Severe ↑</option>
                            <option value="Exhaustion">Exhaustion</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-sounds">Added Breath Sounds</Label>
                          <select
                            id="breathing-sounds"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.primary_assessment.breathing_added_sounds || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_added_sounds', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Wheeze">Wheeze</option>
                            <option value="Crackles">Crackles</option>
                            <option value="Rhonchi">Rhonchi</option>
                            <option value="Stridor">Stridor</option>
                            <option value="Pleural rub">Pleural rub</option>
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-2 lg:col-span-3">
                          <Label>Interventions Done</Label>
                          <div className="flex flex-wrap gap-2">
                            {['Nebulization', 'ICD insertion', 'Needle decompression', 'Bag-mask ventilation', 'Intubation'].map(item => (
                              <div key={item} className="flex items-center space-x-1">
                                <Checkbox
                                  id={`breathing-${item}`}
                                  checked={formData.primary_assessment.breathing_adjuncts?.includes(item)}
                                  onCheckedChange={() => toggleArrayField('primary_assessment', 'breathing_adjuncts', item)}
                                />
                                <Label htmlFor={`breathing-${item}`} className="text-xs">{item}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="breathing-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="breathing-additional-notes"
                          value={formData.primary_assessment.breathing_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'breathing_additional_notes', e.target.value)}
                          placeholder="Additional breathing observations..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* C - CIRCULATION */}
                    <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50/30">
                      <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                        <span className="bg-yellow-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">C</span>
                        CIRCULATION
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="circulation-hr">HR (bpm)</Label>
                          <Input
                            id="circulation-hr"
                            type="number"
                            value={formData.primary_assessment.circulation_hr || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_hr', parseFloat(e.target.value))}
                            className="border-yellow-300 focus:ring-yellow-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-bp">BP (mmHg)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="circulation-bp-systolic"
                              type="number"
                              placeholder="Sys"
                              value={formData.primary_assessment.circulation_bp_systolic || ''}
                              onChange={(e) => updateNestedField('primary_assessment', 'circulation_bp_systolic', parseFloat(e.target.value))}
                              className="border-yellow-300 focus:ring-yellow-500"
                            />
                            <span className="flex items-center">/</span>
                            <Input
                              id="circulation-bp-diastolic"
                              type="number"
                              placeholder="Dia"
                              value={formData.primary_assessment.circulation_bp_diastolic || ''}
                              onChange={(e) => updateNestedField('primary_assessment', 'circulation_bp_diastolic', parseFloat(e.target.value))}
                              className="border-yellow-300 focus:ring-yellow-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-rhythm">Rhythm</Label>
                          <select
                            id="circulation-rhythm"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={formData.primary_assessment.circulation_rhythm || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_rhythm', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Regular">Regular</option>
                            <option value="Irregular">Irregular</option>
                            <option value="Irregularly irregular">Irregularly irregular</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-crt">CRT (sec)</Label>
                          <select
                            id="circulation-crt"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={formData.primary_assessment.circulation_crt_status || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_crt_status', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="<2 sec">&lt;2 sec (Normal)</option>
                            <option value="2-3 sec">2-3 sec (Delayed)</option>
                            <option value=">3 sec">&gt;3 sec (Prolonged)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-skin">Skin</Label>
                          <select
                            id="circulation-skin"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={formData.primary_assessment.circulation_skin || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_skin', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Warm and dry">Warm and dry</option>
                            <option value="Warm and moist">Warm and moist</option>
                            <option value="Cool and dry">Cool and dry</option>
                            <option value="Cool and clammy">Cool and clammy</option>
                            <option value="Mottled">Mottled</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-pulses">Peripheral Pulses</Label>
                          <select
                            id="circulation-pulses"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={formData.primary_assessment.circulation_peripheral_pulses}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_peripheral_pulses', e.target.value)}
                          >
                            <option value="Present">Present (all)</option>
                            <option value="Weak">Weak</option>
                            <option value="Absent">Absent</option>
                            <option value="Asymmetric">Asymmetric</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-neck-veins">Neck Veins (JVP)</Label>
                          <select
                            id="circulation-neck-veins"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={formData.primary_assessment.circulation_neck_veins}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_neck_veins', e.target.value)}
                          >
                            <option value="Normal">Normal</option>
                            <option value="Raised">Raised</option>
                            <option value="Flat">Flat</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Bleeding/Injury</Label>
                          <div className="flex flex-wrap gap-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="circulation-external-bleed"
                                checked={formData.primary_assessment.circulation_external_bleed}
                                onCheckedChange={(checked) => updateNestedField('primary_assessment', 'circulation_external_bleed', checked)}
                              />
                              <Label htmlFor="circulation-external-bleed" className="text-sm">External Bleeding</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="circulation-long-bone"
                                checked={formData.primary_assessment.circulation_long_bone_deformity}
                                onCheckedChange={(checked) => updateNestedField('primary_assessment', 'circulation_long_bone_deformity', checked)}
                              />
                              <Label htmlFor="circulation-long-bone" className="text-sm">Long Bone Deformity</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 md:col-span-2 lg:col-span-4">
                          <Label>Interventions Done</Label>
                          <div className="flex flex-wrap gap-2">
                            {['IV access', 'IO access', 'Fluid bolus', 'Blood transfusion', 'Vasopressors', 'CPR', 'Defibrillation', 'Pacing', 'Tourniquet', 'Splinting'].map(item => (
                              <div key={item} className="flex items-center space-x-1">
                                <Checkbox
                                  id={`circulation-${item}`}
                                  checked={formData.primary_assessment.circulation_adjuncts?.includes(item)}
                                  onCheckedChange={() => toggleArrayField('primary_assessment', 'circulation_adjuncts', item)}
                                />
                                <Label htmlFor={`circulation-${item}`} className="text-xs">{item}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="circulation-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="circulation-additional-notes"
                          value={formData.primary_assessment.circulation_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'circulation_additional_notes', e.target.value)}
                          placeholder="Additional circulation observations..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* D - DISABILITY */}
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50/30">
                      <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                        <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">D</span>
                        DISABILITY (Neuro)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="disability-avpu">AVPU</Label>
                          <select
                            id="disability-avpu"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={formData.primary_assessment.disability_avpu}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_avpu', e.target.value)}
                          >
                            <option value="A">A – Alert</option>
                            <option value="V">V – Responds to Voice</option>
                            <option value="P">P – Responds to Pain</option>
                            <option value="U">U – Unresponsive</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>GCS</Label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-slate-500">E (1-4)</Label>
                              <select
                                id="disability-gcs-e"
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.primary_assessment.disability_gcs_e || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_e', parseInt(e.target.value))}
                              >
                                <option value="">-</option>
                                <option value="4">4 - Spontaneous</option>
                                <option value="3">3 - To voice</option>
                                <option value="2">2 - To pain</option>
                                <option value="1">1 - None</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-slate-500">V (1-5)</Label>
                              <select
                                id="disability-gcs-v"
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.primary_assessment.disability_gcs_v || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_v', parseInt(e.target.value))}
                              >
                                <option value="">-</option>
                                <option value="5">5 - Oriented</option>
                                <option value="4">4 - Confused</option>
                                <option value="3">3 - Inappropriate</option>
                                <option value="2">2 - Incomprehensible</option>
                                <option value="1">1 - None</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-slate-500">M (1-6)</Label>
                              <select
                                id="disability-gcs-m"
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.primary_assessment.disability_gcs_m || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_m', parseInt(e.target.value))}
                              >
                                <option value="">-</option>
                                <option value="6">6 - Obeys commands</option>
                                <option value="5">5 - Localizes pain</option>
                                <option value="4">4 - Withdraws</option>
                                <option value="3">3 - Flexion</option>
                                <option value="2">2 - Extension</option>
                                <option value="1">1 - None</option>
                              </select>
                            </div>
                          </div>
                          {(formData.primary_assessment.disability_gcs_e && formData.primary_assessment.disability_gcs_v && formData.primary_assessment.disability_gcs_m) && (
                            <div className="text-center mt-1 text-sm font-semibold text-green-700">
                              Total GCS: {formData.primary_assessment.disability_gcs_e + formData.primary_assessment.disability_gcs_v + formData.primary_assessment.disability_gcs_m}/15
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-pupils-size">Pupils Size</Label>
                          <select
                            id="disability-pupils-size"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={formData.primary_assessment.disability_pupils_size}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_pupils_size', e.target.value)}
                          >
                            <option value="Equal">Equal</option>
                            <option value="Unequal">Unequal</option>
                            <option value="Dilated bilateral">Dilated bilateral</option>
                            <option value="Constricted bilateral">Constricted bilateral</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-pupils-reaction">Pupils Reaction</Label>
                          <select
                            id="disability-pupils-reaction"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={formData.primary_assessment.disability_pupils_reaction}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_pupils_reaction', e.target.value)}
                          >
                            <option value="Brisk">Brisk bilateral</option>
                            <option value="Sluggish">Sluggish</option>
                            <option value="Non-reactive">Non-reactive</option>
                            <option value="Fixed">Fixed bilateral</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-grbs">GRBS (mg/dL)</Label>
                          <Input
                            id="disability-grbs"
                            type="number"
                            value={formData.primary_assessment.disability_grbs || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_grbs', parseFloat(e.target.value))}
                            className="border-green-300 focus:ring-green-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Seizure Activity</Label>
                          <div className="flex items-center space-x-4 h-10">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="disability-seizure"
                                checked={formData.primary_assessment.disability_seizure}
                                onCheckedChange={(checked) => updateNestedField('primary_assessment', 'disability_seizure', checked)}
                              />
                              <Label htmlFor="disability-seizure" className="text-sm">Seizure observed</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-lateralizing">Lateralizing Signs</Label>
                          <select
                            id="disability-lateralizing"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={formData.primary_assessment.disability_lateralizing || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_lateralizing', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Left hemiparesis">Left hemiparesis</option>
                            <option value="Right hemiparesis">Right hemiparesis</option>
                            <option value="Left facial droop">Left facial droop</option>
                            <option value="Right facial droop">Right facial droop</option>
                            <option value="Other">Other (specify in notes)</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="disability-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="disability-additional-notes"
                          value={formData.primary_assessment.disability_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'disability_additional_notes', e.target.value)}
                          placeholder="Additional neurological observations..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* E - EXPOSURE */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                      <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">E</span>
                        EXPOSURE
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="exposure-temperature">Temperature (°C)</Label>
                          <Input
                            id="exposure-temperature"
                            type="number"
                            step="0.1"
                            value={formData.primary_assessment.exposure_temperature || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'exposure_temperature', parseFloat(e.target.value))}
                            className="border-blue-300 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exposure-rashes">Rashes</Label>
                          <select
                            id="exposure-rashes"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.primary_assessment.exposure_rashes || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'exposure_rashes', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Petechiae">Petechiae</option>
                            <option value="Purpura">Purpura</option>
                            <option value="Urticaria">Urticaria</option>
                            <option value="Maculopapular">Maculopapular</option>
                            <option value="Vesicular">Vesicular</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exposure-bruises">Bruises/Injuries</Label>
                          <select
                            id="exposure-bruises"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.primary_assessment.exposure_bruises || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'exposure_bruises', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="None">None</option>
                            <option value="Head/Face">Head/Face</option>
                            <option value="Neck">Neck</option>
                            <option value="Chest">Chest</option>
                            <option value="Abdomen">Abdomen</option>
                            <option value="Back">Back</option>
                            <option value="Extremities">Extremities</option>
                            <option value="Multiple sites">Multiple sites</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Logroll Findings</Label>
                          <div className="flex flex-wrap gap-2">
                            {['Spinal tenderness', 'Deformity', 'Sacral edema', 'Pressure sores'].map(item => (
                              <div key={item} className="flex items-center space-x-1">
                                <Checkbox
                                  id={`exposure-${item}`}
                                  checked={formData.primary_assessment.exposure_logroll_findings?.includes(item)}
                                  onCheckedChange={() => toggleArrayField('primary_assessment', 'exposure_logroll_findings', item)}
                                />
                                <Label htmlFor={`exposure-${item}`} className="text-xs">{item}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="exposure-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Local Examination / Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="exposure-additional-notes"
                          value={formData.primary_assessment.exposure_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'exposure_additional_notes', e.target.value)}
                          placeholder="Local examination findings, other observations..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* REASSESSMENT */}
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50/30">
                      <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">R</span>
                        REASSESSMENT
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reassessment-status">Status After Initial Resuscitation</Label>
                          <select
                            id="reassessment-status"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={formData.primary_assessment.reassessment_status || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'reassessment_status', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Improving">Improving</option>
                            <option value="Stable">Stable</option>
                            <option value="Deteriorating">Deteriorating</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reassessment-time">Time of Reassessment</Label>
                          <Input
                            id="reassessment-time"
                            type="time"
                            value={formData.primary_assessment.reassessment_time || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'reassessment_time', e.target.value)}
                            className="border-purple-300 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reassessment-notes" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Reassessment Notes
                          </Label>
                          <VoiceTextarea
                            id="reassessment-notes"
                            value={formData.primary_assessment.reassessment_notes || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'reassessment_notes', e.target.value)}
                            placeholder="Response to interventions, changes noted..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Adjuvants to Primary Assessment */}
                    <div className="border-t-2 border-slate-300 pt-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Adjuvants to Primary Assessment</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="ecg-findings" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            ECG Findings
                          </Label>
                          <VoiceTextarea
                            id="ecg-findings"
                            value={formData.primary_assessment.ecg_findings}
                            onChange={(e) => updateNestedField('primary_assessment', 'ecg_findings', e.target.value)}
                            placeholder="Document ECG findings..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label className="block mb-3">VBG Parameters</Label>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="vbg-ph" className="text-xs">PH</Label>
                              <Input
                                id="vbg-ph"
                                type="number"
                                step="0.01"
                                value={formData.primary_assessment.vbg_ph || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_ph', parseFloat(e.target.value))}
                                placeholder="7.35-7.45"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-pco2" className="text-xs">PCO2</Label>
                              <Input
                                id="vbg-pco2"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_pco2 || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_pco2', parseFloat(e.target.value))}
                                placeholder="mmHg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-hco3" className="text-xs">HCO3</Label>
                              <Input
                                id="vbg-hco3"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_hco3 || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_hco3', parseFloat(e.target.value))}
                                placeholder="mEq/L"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-hb" className="text-xs">HB</Label>
                              <Input
                                id="vbg-hb"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_hb || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_hb', parseFloat(e.target.value))}
                                placeholder="g/dL"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-glu" className="text-xs">GLU</Label>
                              <Input
                                id="vbg-glu"
                                type="number"
                                step="1"
                                value={formData.primary_assessment.vbg_glu || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_glu', parseFloat(e.target.value))}
                                placeholder="mg/dL"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-lac" className="text-xs">LAC</Label>
                              <Input
                                id="vbg-lac"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_lac || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_lac', parseFloat(e.target.value))}
                                placeholder="mmol/L"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-na" className="text-xs">NA</Label>
                              <Input
                                id="vbg-na"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_na || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_na', parseFloat(e.target.value))}
                                placeholder="mEq/L"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-k" className="text-xs">K</Label>
                              <Input
                                id="vbg-k"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_k || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_k', parseFloat(e.target.value))}
                                placeholder="mEq/L"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="vbg-cr" className="text-xs">CR</Label>
                              <Input
                                id="vbg-cr"
                                type="number"
                                step="0.1"
                                value={formData.primary_assessment.vbg_cr || ''}
                                onChange={(e) => updateNestedField('primary_assessment', 'vbg_cr', parseFloat(e.target.value))}
                                placeholder="mg/dL"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bedside-echo-findings" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Bedside Screening Echo
                          </Label>
                          <VoiceTextarea
                            id="bedside-echo-findings"
                            value={formData.primary_assessment.bedside_echo_findings}
                            onChange={(e) => updateNestedField('primary_assessment', 'bedside_echo_findings', e.target.value)}
                            placeholder="e.g., Good LVM, IVC Collapsing, No Blines, No RWMA, No RA, RV..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adjuvants-additional-notes" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Additional Notes
                          </Label>
                          <VoiceTextarea
                            id="adjuvants-additional-notes"
                            value={formData.primary_assessment.adjuvants_additional_notes}
                            onChange={(e) => updateNestedField('primary_assessment', 'adjuvants_additional_notes', e.target.value)}
                            placeholder="Additional observations for adjuvant assessments..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Vitals
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: History →
              </Button>
            </div>
          </TabsContent>

          {/* Secondary Survey Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Secondary Survey</CardTitle>
                <CardDescription>Comprehensive patient history and assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* S - Signs and Symptoms */}
                  <div className="space-y-3 p-4 border-l-4 border-red-400 bg-red-50">
                    <Label className="text-lg font-bold text-red-900 flex items-center gap-2">
                      S - Signs and Symptoms
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="signs-symptoms" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Current Signs and Symptoms (AI-Powered)
                      </Label>
                      <WhisperCaseSheetInput
                        value={formData.history.signs_and_symptoms}
                        onChange={(e) => updateNestedField('history', 'signs_and_symptoms', e.target.value)}
                        onExtractedData={handleHistoryExtraction}
                        section="history"
                        placeholder="Click Record and speak: Patient has chest pain, shortness of breath, known allergies to penicillin, on aspirin and metformin..."
                        rows={4}
                      />
                      <p className="text-xs text-slate-600">
                        ✨ <strong>AI will extract:</strong> Symptoms, Allergies, Medications, Past Medical History, Surgical History
                      </p>
                    </div>
                  </div>

                  {/* A - Allergies */}
                  <div className="space-y-3 p-4 border-l-4 border-orange-400 bg-orange-50">
                    <Label className="text-lg font-bold text-orange-900 flex items-center gap-2">
                      A - Allergies
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="allergies-field">Known Allergies (comma separated)</Label>
                      <Input
                        id="allergies-field"
                        data-testid="input-allergies"
                        value={formData.history.allergies.join(', ')}
                        onChange={(e) => updateNestedField('history', 'allergies', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="e.g., Penicillin, Peanuts, Latex"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allergies-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Allergy Details
                      </Label>
                      <VoiceTextarea
                        id="allergies-additional-notes"
                        data-testid="textarea-allergies-additional-notes"
                        value={formData.history.allergies_additional_notes}
                        onChange={(e) => updateNestedField('history', 'allergies_additional_notes', e.target.value)}
                        placeholder="Describe reactions, severity, etc..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* M - Medications */}
                  <div className="space-y-3 p-4 border-l-4 border-yellow-400 bg-yellow-50">
                    <Label className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                      M - Medications
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="medications" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Current Medications
                      </Label>
                      <VoiceTextarea
                        id="medications"
                        data-testid="textarea-medications"
                        value={formData.history.medications || ''}
                        onChange={(e) => updateNestedField('history', 'medications', e.target.value)}
                        placeholder="List current medications with dosages..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* P - Past Medical/Surgical/Family/Gynae History */}
                  <div className="space-y-3 p-4 border-l-4 border-green-400 bg-green-50">
                    <Label className="text-lg font-bold text-green-900 flex items-center gap-2">
                      P - Past History
                    </Label>
                    
                    {/* Past Medical History */}
                    <div className="space-y-2">
                      <Label className="font-semibold text-green-800">Past Medical History</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Hypertension', 'Diabetes', 'CAD', 'CKD', 'CLD', 'COPD/Asthma', 'Epilepsy', 'Stroke', 'Malignancy'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={`pmh-${item}`}
                              checked={formData.history.past_medical.includes(item)}
                              onCheckedChange={() => toggleArrayField('history', 'past_medical', item)}
                            />
                            <Label htmlFor={`pmh-${item}`} className="text-sm">{item}</Label>
                          </div>
                        ))}
                      </div>
                      <VoiceTextarea
                        id="past-medical-additional-notes"
                        data-testid="textarea-past-medical-additional-notes"
                        value={formData.history.past_medical_additional_notes}
                        onChange={(e) => updateNestedField('history', 'past_medical_additional_notes', e.target.value)}
                        placeholder="Additional medical history details..."
                        rows={2}
                        className="mt-2"
                      />
                    </div>

                    {/* Past Surgical History */}
                    <div className="space-y-2">
                      <Label htmlFor="past-surgical" className="flex items-center gap-2 font-semibold text-green-800">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Surgical History
                      </Label>
                      <VoiceTextarea
                        id="past-surgical"
                        data-testid="textarea-past-surgical"
                        value={formData.history.past_surgical}
                        onChange={(e) => updateNestedField('history', 'past_surgical', e.target.value)}
                        placeholder="Previous surgeries and procedures..."
                        rows={2}
                      />
                    </div>

                    {/* Family / Gynae History */}
                    <div className="space-y-2">
                      <Label htmlFor="family-gyn-additional-notes" className="flex items-center gap-2 font-semibold text-green-800">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Family / Gynae History
                      </Label>
                      <VoiceTextarea
                        id="family-gyn-additional-notes"
                        data-testid="textarea-family-gyn-additional-notes"
                        value={formData.history.family_gyn_additional_notes}
                        onChange={(e) => updateNestedField('history', 'family_gyn_additional_notes', e.target.value)}
                        placeholder="Family history and gynecological history (LMP, gravida, para, etc.)..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* L - Last Meal / LMP */}
                  <div className="space-y-3 p-4 border-l-4 border-blue-400 bg-blue-50">
                    <Label className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      L - Last Meal / LMP
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="last-meal-lmp" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Last Oral Intake / LMP
                      </Label>
                      <VoiceTextarea
                        id="last-meal-lmp"
                        data-testid="textarea-last-meal-lmp"
                        value={formData.history.last_meal_lmp || ''}
                        onChange={(e) => updateNestedField('history', 'last_meal_lmp', e.target.value)}
                        placeholder="Time of last meal/drink. For females: Last menstrual period date..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* E - Events / HOPI */}
                  <div className="space-y-3 p-4 border-l-4 border-purple-400 bg-purple-50">
                    <Label className="text-lg font-bold text-purple-900 flex items-center gap-2">
                      E - Events / History of Present Illness
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="hpi" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Events Leading to Presentation / HOPI
                      </Label>
                      <VoiceTextarea
                        id="hpi"
                        data-testid="textarea-hpi"
                        value={formData.history.hpi}
                        onChange={(e) => updateNestedField('history', 'hpi', e.target.value)}
                        placeholder="Detailed timeline of events leading to this presentation..."
                        rows={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-lg font-semibold">Psychological Assessment</Label>
                    <div className="space-y-4">
                      {[
                        { key: 'q1', text: 'Have you been feeling persistently low, excessively worried, angry, or finding it hard to focus lately?' },
                        { key: 'q2', text: 'Have you noticed hearing or seeing things that others don\'t, or feeling detached from reality at times?' },
                        { key: 'q3', text: 'Do you regularly use alcohol, tobacco, or any other substances (including recreational or non-prescribed drugs)?' },
                        { key: 'q4', text: 'Is this individual currently feeling confused or agitated?' },
                        { key: 'q5', text: 'Have you ever had thoughts of ending your life, or have you ever attempted to harm yourself?' },
                        { key: 'q6', text: 'Have you ever received treatment or support for mental health, psychological issues, or substance use problems?' }
                      ].map((question, index) => (
                        <div key={question.key} className="space-y-2 p-3 bg-slate-50 rounded-lg">
                          <Label className="text-sm font-medium text-slate-900">
                            {index + 1}. {question.text}
                          </Label>
                          <div className="flex gap-4 ml-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`psych-${question.key}-yes`}
                                name={`psych-${question.key}`}
                                checked={formData.history.psychological_assessment[question.key] === 'Yes'}
                                onChange={() => {
                                  const updated = { ...formData.history.psychological_assessment, [question.key]: 'Yes' };
                                  updateNestedField('history', 'psychological_assessment', updated);
                                }}
                                className="h-4 w-4 text-sky-600"
                              />
                              <Label htmlFor={`psych-${question.key}-yes`} className="text-sm cursor-pointer">
                                ✓ Yes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`psych-${question.key}-no`}
                                name={`psych-${question.key}`}
                                checked={formData.history.psychological_assessment[question.key] === 'No'}
                                onChange={() => {
                                  const updated = { ...formData.history.psychological_assessment, [question.key]: 'No' };
                                  updateNestedField('history', 'psychological_assessment', updated);
                                }}
                                className="h-4 w-4 text-sky-600"
                              />
                              <Label htmlFor={`psych-${question.key}-no`} className="text-sm cursor-pointer">
                                ✗ No
                              </Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="psychological-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Psychological Assessment - Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="psychological-additional-notes"
                      data-testid="textarea-psychological-additional-notes"
                      value={formData.history.psychological_additional_notes}
                      onChange={(e) => updateNestedField('history', 'psychological_additional_notes', e.target.value)}
                      placeholder="Additional psychological assessment observations..."
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: ABCDE
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: Physical Examination →
              </Button>
            </div>
          </TabsContent>

          {/* Physical Examination Tab */}
          <TabsContent value="examination">
            <Card>
              <CardHeader>
                <CardTitle>Physical Examination</CardTitle>
                <CardDescription>Document examination findings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>General Examination</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="general-pallor"
                          checked={formData.examination.general_pallor}
                          onCheckedChange={(checked) => updateNestedField('examination', 'general_pallor', checked)}
                        />
                        <Label htmlFor="general-pallor" className="text-sm">Pallor</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="general-icterus"
                          checked={formData.examination.general_icterus}
                          onCheckedChange={(checked) => updateNestedField('examination', 'general_icterus', checked)}
                        />
                        <Label htmlFor="general-icterus" className="text-sm">Icterus</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="general-clubbing"
                          checked={formData.examination.general_clubbing}
                          onCheckedChange={(checked) => updateNestedField('examination', 'general_clubbing', checked)}
                        />
                        <Label htmlFor="general-clubbing" className="text-sm">Clubbing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="general-lymphadenopathy"
                          checked={formData.examination.general_lymphadenopathy}
                          onCheckedChange={(checked) => updateNestedField('examination', 'general_lymphadenopathy', checked)}
                        />
                        <Label htmlFor="general-lymphadenopathy" className="text-sm">Lymphadenopathy</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="general-additional-notes" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      Physical Examination Notes (AI-Powered)
                    </Label>
                    <WhisperCaseSheetInput
                      value={formData.examination.general_additional_notes}
                      onChange={(e) => updateNestedField('examination', 'general_additional_notes', e.target.value)}
                      onExtractedData={handleExaminationExtraction}
                      section="examination"
                      placeholder="Click Record: Patient has pallor, no icterus, cardiovascular exam shows regular rhythm, chest clear, abdomen soft..."
                      rows={4}
                    />
                    <p className="text-xs text-slate-600 mt-2">
                      ✨ <strong>AI will extract:</strong> General findings, Pallor/Icterus/Clubbing, CVS, Respiratory, Abdomen, CNS examination findings
                    </p>
                  </div>

                  {/* CVS Examination with Normal/Abnormal Pattern */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Cardiovascular System (CVS)</Label>
                      <select
                        className="flex h-9 w-32 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.examination.cvs_status}
                        onChange={(e) => updateNestedField('examination', 'cvs_status', e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                    
                    {formData.examination.cvs_status === 'Abnormal' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-sky-200">
                        <div className="space-y-2">
                          <Label htmlFor="cvs-s1-s2" className="text-sm">S1, S2</Label>
                          <Input
                            id="cvs-s1-s2"
                            value={formData.examination.cvs_s1_s2}
                            onChange={(e) => updateNestedField('examination', 'cvs_s1_s2', e.target.value)}
                            placeholder="Normal, Muffled, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvs-pulse" className="text-sm">Pulse</Label>
                          <Input
                            id="cvs-pulse"
                            value={formData.examination.cvs_pulse}
                            onChange={(e) => updateNestedField('examination', 'cvs_pulse', e.target.value)}
                            placeholder="Regular, Irregular, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvs-pulse-rate" className="text-sm">Pulse Rate (bpm)</Label>
                          <Input
                            id="cvs-pulse-rate"
                            type="number"
                            value={formData.examination.cvs_pulse_rate || ''}
                            onChange={(e) => updateNestedField('examination', 'cvs_pulse_rate', parseInt(e.target.value))}
                            placeholder="bpm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvs-apex-beat" className="text-sm">Apex Beat</Label>
                          <Input
                            id="cvs-apex-beat"
                            value={formData.examination.cvs_apex_beat}
                            onChange={(e) => updateNestedField('examination', 'cvs_apex_beat', e.target.value)}
                            placeholder="Normal, localized in 5th ICS midclavicular line"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvs-precordial-heave" className="text-sm">Precordial Heave</Label>
                          <Input
                            id="cvs-precordial-heave"
                            value={formData.examination.cvs_precordial_heave}
                            onChange={(e) => updateNestedField('examination', 'cvs_precordial_heave', e.target.value)}
                            placeholder="Absent, Present"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvs-added-sounds" className="text-sm">Added Sounds</Label>
                          <Input
                            id="cvs-added-sounds"
                            value={formData.examination.cvs_added_sounds}
                            onChange={(e) => updateNestedField('examination', 'cvs_added_sounds', e.target.value)}
                            placeholder="None, S3, S4, etc."
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="cvs-murmurs" className="text-sm">Murmurs</Label>
                          <Input
                            id="cvs-murmurs"
                            value={formData.examination.cvs_murmurs}
                            onChange={(e) => updateNestedField('examination', 'cvs_murmurs', e.target.value)}
                            placeholder="None, details if present"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="cvs-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        CVS - Additional Notes
                      </Label>
                      <VoiceTextarea
                        id="cvs-additional-notes"
                        value={formData.examination.cvs_additional_notes}
                        onChange={(e) => updateNestedField('examination', 'cvs_additional_notes', e.target.value)}
                        placeholder="Additional CVS observations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Respiratory/Chest Examination with Normal/Abnormal Pattern */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Chest / Respiratory System</Label>
                      <select
                        className="flex h-9 w-32 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.examination.respiratory_status}
                        onChange={(e) => updateNestedField('examination', 'respiratory_status', e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                    
                    {formData.examination.respiratory_status === 'Abnormal' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-green-200">
                        <div className="space-y-2">
                          <Label htmlFor="resp-expansion" className="text-sm">Expansion</Label>
                          <Input
                            id="resp-expansion"
                            value={formData.examination.respiratory_expansion}
                            onChange={(e) => updateNestedField('examination', 'respiratory_expansion', e.target.value)}
                            placeholder="Equal bilaterally, Asymmetric"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp-percussion" className="text-sm">Percussion</Label>
                          <Input
                            id="resp-percussion"
                            value={formData.examination.respiratory_percussion}
                            onChange={(e) => updateNestedField('examination', 'respiratory_percussion', e.target.value)}
                            placeholder="Resonant bilaterally, Dull, Hyperresonant"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp-breath-sounds" className="text-sm">Breath Sounds</Label>
                          <Input
                            id="resp-breath-sounds"
                            value={formData.examination.respiratory_breath_sounds}
                            onChange={(e) => updateNestedField('examination', 'respiratory_breath_sounds', e.target.value)}
                            placeholder="Vesicular, equal bilaterally"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp-vocal-resonance" className="text-sm">Vocal Resonance</Label>
                          <Input
                            id="resp-vocal-resonance"
                            value={formData.examination.respiratory_vocal_resonance}
                            onChange={(e) => updateNestedField('examination', 'respiratory_vocal_resonance', e.target.value)}
                            placeholder="Normal, Increased, Decreased"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="resp-added-sounds" className="text-sm">Added Sounds</Label>
                          <Input
                            id="resp-added-sounds"
                            value={formData.examination.respiratory_added_sounds}
                            onChange={(e) => updateNestedField('examination', 'respiratory_added_sounds', e.target.value)}
                            placeholder="None, Wheezing, Crackles, etc."
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="respiratory-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Respiratory - Additional Notes
                      </Label>
                      <VoiceTextarea
                        id="respiratory-additional-notes"
                        value={formData.examination.respiratory_additional_notes}
                        onChange={(e) => updateNestedField('examination', 'respiratory_additional_notes', e.target.value)}
                        placeholder="Additional respiratory observations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Abdomen Examination with Normal/Abnormal Pattern */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Abdomen</Label>
                      <select
                        className="flex h-9 w-32 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.examination.abdomen_status}
                        onChange={(e) => updateNestedField('examination', 'abdomen_status', e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                    
                    {formData.examination.abdomen_status === 'Abnormal' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-amber-200">
                        <div className="space-y-2">
                          <Label htmlFor="abd-umbilical" className="text-sm">Umbilical</Label>
                          <Input
                            id="abd-umbilical"
                            value={formData.examination.abdomen_umbilical}
                            onChange={(e) => updateNestedField('examination', 'abdomen_umbilical', e.target.value)}
                            placeholder="Central, no abnormalities"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-organomegaly" className="text-sm">Organomegaly</Label>
                          <Input
                            id="abd-organomegaly"
                            value={formData.examination.abdomen_organomegaly}
                            onChange={(e) => updateNestedField('examination', 'abdomen_organomegaly', e.target.value)}
                            placeholder="None, Hepatomegaly, Splenomegaly"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-percussion" className="text-sm">Percussion</Label>
                          <Input
                            id="abd-percussion"
                            value={formData.examination.abdomen_percussion}
                            onChange={(e) => updateNestedField('examination', 'abdomen_percussion', e.target.value)}
                            placeholder="Normal tympany, no dullness"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-bowel-sounds" className="text-sm">Bowel Sounds</Label>
                          <Input
                            id="abd-bowel-sounds"
                            value={formData.examination.abdomen_bowel_sounds}
                            onChange={(e) => updateNestedField('examination', 'abdomen_bowel_sounds', e.target.value)}
                            placeholder="Normal, active in all quadrants"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-external-genitalia" className="text-sm">External Genitalia</Label>
                          <Input
                            id="abd-external-genitalia"
                            value={formData.examination.abdomen_external_genitalia}
                            onChange={(e) => updateNestedField('examination', 'abdomen_external_genitalia', e.target.value)}
                            placeholder="Normal, no abnormalities"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-hernial" className="text-sm">Hernial Orifices</Label>
                          <Input
                            id="abd-hernial"
                            value={formData.examination.abdomen_hernial_orifices}
                            onChange={(e) => updateNestedField('examination', 'abdomen_hernial_orifices', e.target.value)}
                            placeholder="No bulging"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-per-rectal" className="text-sm">Per Rectal</Label>
                          <Input
                            id="abd-per-rectal"
                            value={formData.examination.abdomen_per_rectal}
                            onChange={(e) => updateNestedField('examination', 'abdomen_per_rectal', e.target.value)}
                            placeholder="No tenderness, normal tone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="abd-per-vaginal" className="text-sm">Per Vaginal</Label>
                          <Input
                            id="abd-per-vaginal"
                            value={formData.examination.abdomen_per_vaginal}
                            onChange={(e) => updateNestedField('examination', 'abdomen_per_vaginal', e.target.value)}
                            placeholder="Normal findings"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="abdomen-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Abdomen - Additional Notes
                      </Label>
                      <VoiceTextarea
                        id="abdomen-additional-notes"
                        value={formData.examination.abdomen_additional_notes}
                        onChange={(e) => updateNestedField('examination', 'abdomen_additional_notes', e.target.value)}
                        placeholder="Additional abdominal observations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* CNS Examination with Normal/Abnormal Pattern */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Central Nervous System (CNS)</Label>
                      <select
                        className="flex h-9 w-32 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.examination.cns_status}
                        onChange={(e) => updateNestedField('examination', 'cns_status', e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                    
                    {formData.examination.cns_status === 'Abnormal' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-purple-200">
                        <div className="space-y-2">
                          <Label htmlFor="cns-higher-mental" className="text-sm">Higher Mental Functions</Label>
                          <Input
                            id="cns-higher-mental"
                            value={formData.examination.cns_higher_mental}
                            onChange={(e) => updateNestedField('examination', 'cns_higher_mental', e.target.value)}
                            placeholder="Normal, alert and oriented"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cns-cranial-nerves" className="text-sm">Cranial Nerves</Label>
                          <Input
                            id="cns-cranial-nerves"
                            value={formData.examination.cns_cranial_nerves}
                            onChange={(e) => updateNestedField('examination', 'cns_cranial_nerves', e.target.value)}
                            placeholder="Intact (I-XII)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cns-sensory" className="text-sm">Sensory System</Label>
                          <Input
                            id="cns-sensory"
                            value={formData.examination.cns_sensory_system}
                            onChange={(e) => updateNestedField('examination', 'cns_sensory_system', e.target.value)}
                            placeholder="Normal, intact to light touch, pain, temperature"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cns-motor" className="text-sm">Motor System</Label>
                          <Input
                            id="cns-motor"
                            value={formData.examination.cns_motor_system}
                            onChange={(e) => updateNestedField('examination', 'cns_motor_system', e.target.value)}
                            placeholder="Normal muscle tone, strength 5/5 in all limbs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cns-reflexes" className="text-sm">Reflexes</Label>
                          <Input
                            id="cns-reflexes"
                            value={formData.examination.cns_reflexes}
                            onChange={(e) => updateNestedField('examination', 'cns_reflexes', e.target.value)}
                            placeholder="Normal deep tendon reflexes (2+)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cns-romberg" className="text-sm">Romberg Sign</Label>
                          <Input
                            id="cns-romberg"
                            value={formData.examination.cns_romberg_sign}
                            onChange={(e) => updateNestedField('examination', 'cns_romberg_sign', e.target.value)}
                            placeholder="Negative, Positive"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="cns-cerebellar" className="text-sm">Cerebellar Signs</Label>
                          <Input
                            id="cns-cerebellar"
                            value={formData.examination.cns_cerebellar_signs}
                            onChange={(e) => updateNestedField('examination', 'cns_cerebellar_signs', e.target.value)}
                            placeholder="Absent, Present (specify)"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="cns-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        CNS - Additional Notes
                      </Label>
                      <VoiceTextarea
                        id="cns-additional-notes"
                        value={formData.examination.cns_additional_notes}
                        onChange={(e) => updateNestedField('examination', 'cns_additional_notes', e.target.value)}
                        placeholder="Additional CNS observations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Extremities and Back Examination with Normal/Abnormal Pattern */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Extremities and Back</Label>
                      <select
                        className="flex h-9 w-32 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.examination.extremities_status}
                        onChange={(e) => updateNestedField('examination', 'extremities_status', e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Abnormal">Abnormal</option>
                      </select>
                    </div>
                    
                    {formData.examination.extremities_status === 'Abnormal' && (
                      <div className="pl-4 border-l-2 border-teal-200">
                        <div className="space-y-2">
                          <Label htmlFor="extremities-findings" className="text-sm flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Findings
                          </Label>
                          <VoiceTextarea
                            id="extremities-findings"
                            value={formData.examination.extremities_findings}
                            onChange={(e) => updateNestedField('examination', 'extremities_findings', e.target.value)}
                            placeholder="Document any abnormalities in extremities or back examination..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="extremities-additional-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Extremities - Additional Notes
                      </Label>
                      <VoiceTextarea
                        id="extremities-additional-notes"
                        value={formData.examination.extremities_additional_notes}
                        onChange={(e) => updateNestedField('examination', 'extremities_additional_notes', e.target.value)}
                        placeholder="Additional extremities observations..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Secondary Survey
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: Investigations →
              </Button>
            </div>
          </TabsContent>

          {/* Investigations Tab */}
          <TabsContent value="investigations">
            <Card>
              <CardHeader>
                <CardTitle>Investigations</CardTitle>
                <CardDescription>Select investigation panels and document results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Investigation Panels</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries({
                        'ER Basic Panel': ['CBC', 'Urea', 'Creatinine', 'Electrolytes'],
                        'ER Advance Panel': ['CBC', 'CRP', 'RFT', 'LFT', 'Urea', 'Electrolytes'],
                        'NSTEMI Panel': ['CBC', 'CRP', 'RFT', 'LFT', 'Electrolytes', 'Urea', 'Troponin I/T', 'CK-MB', 'PT/INR'],
                        'STEMI Panel': ['CBC', 'CRP', 'RFT', 'LFT', 'Electrolytes', 'Urea', 'Troponin', 'CK-MB', 'PT/INR', 'Lipid Profile'],
                        'Acute Stroke Panel': ['CBC', 'Blood Group+Type', 'RFT', 'LFT', 'Electrolytes', 'PT/INR', 'CT Brain', 'MRI Brain'],
                        'Pedia Mini Panel': ['CBC', 'Blood Glucose', 'Electrolytes'],
                        'Adult Seizure Panel': ['CBC', 'RFT', 'LFT', 'Electrolytes', 'Glucose', 'Calcium', 'Magnesium', 'CT Brain'],
                        'Pedia Febrile Seizure Panel': ['CBC', 'Glucose', 'Electrolytes', 'Calcium', 'Blood Culture']
                      }).map(([panel, tests]) => {
                        const isSelected = formData.investigations.panels_selected.includes(panel);
                        return (
                          <div key={panel} className={`border rounded-lg p-3 ${isSelected ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                id={`panel-${panel}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleArrayField('investigations', 'panels_selected', panel)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <Label htmlFor={`panel-${panel}`} className="text-sm font-semibold cursor-pointer">{panel}</Label>
                                <div className="mt-1 text-xs text-slate-600">
                                  {tests.map((test, idx) => (
                                    <span key={idx}>
                                      {test}
                                      {idx < tests.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </div>
                                
                                {/* Expanded Detail Fields When Checked */}
                                {isSelected && (
                                  <div className="mt-3 pt-3 border-t border-sky-200 space-y-2">
                                    <p className="text-xs font-semibold text-sky-800 mb-2">📋 Test Results:</p>
                                    {tests.map((test) => (
                                      <div key={test} className="space-y-1">
                                        <Label htmlFor={`test-${panel}-${test}`} className="text-xs text-slate-700">{test}</Label>
                                        <Input
                                          id={`test-${panel}-${test}`}
                                          value={formData.investigations[`${panel}_${test}`] || ''}
                                          onChange={(e) => updateNestedField('investigations', `${panel}_${test}`, e.target.value)}
                                          placeholder={`Enter ${test} result`}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="results-notes" className="flex items-center gap-2">
                      Investigation Results & Notes
                      <Mic className="h-3 w-3 text-slate-400" />
                    </Label>
                    <VoiceTextarea
                      id="results-notes"
                      data-testid="textarea-results-notes"
                      value={formData.investigations.results_notes}
                      onChange={(e) => updateNestedField('investigations', 'results_notes', e.target.value)}
                      placeholder="Document key investigation findings..."
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick="{goToPreviousTab}">
                ← Back: Physical Examination
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: Treatment →
              </Button>
            </div>
          </TabsContent>

          {/* Treatment Tab */}
          <TabsContent value="treatment">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Treatment in ER</CardTitle>
                  <CardDescription>Document interventions, procedures, and diagnoses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Interventions Done */}
                    <div className="space-y-2 p-4 border-l-4 border-blue-400 bg-blue-50/50 rounded-r-lg">
                      <Label className="text-lg font-semibold text-blue-900">Interventions Done</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Oxygen', 'Nebulisation', 'Antiplatelets', 'Anticoagulant', 'Thrombolysis', 'Antibiotics', 'Analgesics', 'Antiemetics', 'Anticonvulsants', 'IV Fluids', 'Vasopressors', 'Blood Transfusion'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={`treatment-${item}`}
                              checked={formData.treatment.interventions.includes(item)}
                              onCheckedChange={() => toggleArrayField('treatment', 'interventions', item)}
                            />
                            <Label htmlFor={`treatment-${item}`} className="text-sm">{item}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Procedures Done */}
                    <div className="space-y-2 p-4 border-l-4 border-purple-400 bg-purple-50/50 rounded-r-lg">
                      <Label className="text-lg font-semibold text-purple-900">Procedures Done</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['IV Cannulation', 'Foley Catheter', 'NG Tube', 'Central Line', 'Arterial Line', 'Intubation', 'ICD Insertion', 'Lumbar Puncture', 'Wound Suturing', 'Splinting', 'CPR', 'Cardioversion/Defibrillation'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={`procedure-${item}`}
                              checked={formData.treatment.procedures?.includes(item)}
                              onCheckedChange={() => toggleArrayField('treatment', 'procedures', item)}
                            />
                            <Label htmlFor={`procedure-${item}`} className="text-sm">{item}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <Label htmlFor="procedure-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Procedure Notes
                        </Label>
                        <VoiceTextarea
                          id="procedure-notes"
                          value={formData.treatment.procedure_notes || ''}
                          onChange={(e) => updateNestedField('treatment', 'procedure_notes', e.target.value)}
                          placeholder="Details of procedures performed..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Provisional Diagnosis with AI */}
                    <div className="space-y-4 p-4 border-l-4 border-green-400 bg-green-50/50 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="provisional-diagnoses" className="text-lg font-semibold text-green-900">Provisional Diagnosis</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={getAIDiagnosisSuggestions}
                          disabled={aiDiagnosisLoading}
                          className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                          data-testid="ai-diagnosis-suggest-btn"
                        >
                          {aiDiagnosisLoading ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Suggest Diagnosis & Red Flags
                            </>
                          )}
                        </Button>
                      </div>
                      <Input
                        id="provisional-diagnoses"
                        data-testid="input-provisional-diagnoses"
                        value={formData.treatment.provisional_diagnoses.join(', ')}
                        onChange={(e) => updateNestedField('treatment', 'provisional_diagnoses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="Enter provisional diagnoses separated by commas"
                        className="text-base"
                      />
                      
                      {/* AI Diagnosis Results */}
                      {showAIDiagnosisPanel && aiDiagnosisResult && (
                        <div className="mt-4 space-y-3">
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="font-semibold text-purple-800">AI Suggestions</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAIDiagnosisPanel(false)}
                                className="ml-auto h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-purple-700 whitespace-pre-wrap">{aiDiagnosisResult}</p>
                          </div>
                          
                          {/* Red Flags */}
                          {aiRedFlags.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="font-semibold text-red-800">Red Flags to Consider</span>
                              </div>
                              <ul className="space-y-1">
                                {aiRedFlags.map((flag, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{flag.trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drug Selection Section */}
                    <div className="space-y-4 p-4 border-l-4 border-orange-400 bg-orange-50/50 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                          <Pill className="h-5 w-5" />
                          Medications ({isPediatric ? 'Pediatric' : 'Adult'} Formulary)
                        </Label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={isPediatric}
                              onChange={(e) => setIsPediatric(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            Pediatric
                          </label>
                          <Button
                            type="button"
                            onClick={() => setShowDrugModal(true)}
                            className="bg-orange-600 hover:bg-orange-700"
                            data-testid="add-drug-btn"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Drug from List
                          </Button>
                        </div>
                      </div>
                      
                      {/* Selected Drugs List */}
                      {selectedDrugs.length > 0 && (
                        <div className="space-y-2">
                          {selectedDrugs.map((drug) => (
                            <div key={drug.id} className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg">
                              <div>
                                <span className="font-semibold text-orange-800">{drug.name}</span>
                                <span className="text-orange-600 ml-2">{drug.dose}</span>
                                <span className="text-slate-500 text-sm ml-2">at {drug.time}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDrug(drug.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Treatment Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="intervention-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Treatment Notes / Medications Given
                      </Label>
                      <VoiceTextarea
                        id="intervention-notes"
                        data-testid="textarea-intervention-notes"
                        value={formData.treatment.intervention_notes}
                        onChange={(e) => updateNestedField('treatment', 'intervention_notes', e.target.value)}
                        placeholder="Detailed treatment plan, medications, dosages..."
                        rows={5}
                      />
                    </div>

                    {/* Addendum Notes Section */}
                    {addendums.length > 0 && (
                      <div className="space-y-2 p-4 border-l-4 border-sky-400 bg-sky-50/50 rounded-r-lg">
                        <Label className="text-lg font-semibold text-sky-900 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Addendum Notes
                        </Label>
                        <div className="space-y-2">
                          {addendums.map((addendum, idx) => (
                            <div key={idx} className="p-3 bg-white border border-sky-200 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">
                                {new Date(addendum.timestamp).toLocaleString()} - {addendum.author}
                              </div>
                              <p className="text-sm text-slate-700">{addendum.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add Addendum Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddendumModal(true)}
                      className="w-full border-dashed border-sky-400 text-sky-700 hover:bg-sky-50"
                      data-testid="add-addendum-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Addendum Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Disposition */}
              <Card>
                <CardHeader>
                  <CardTitle>Disposition</CardTitle>
                  <CardDescription>Final disposition decision</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="disposition-type">Disposition Type</Label>
                      <select
                        id="disposition-type"
                        data-testid="select-disposition-type"
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.disposition.type}
                        onChange={(e) => updateNestedField('disposition', 'type', e.target.value)}
                      >
                        <option value="discharged">Normal Discharge</option>
                        <option value="observation">Observation in ER</option>
                        <option value="admitted-icu">Admitted - ICU</option>
                        <option value="admitted-hdu">Admitted - HDU</option>
                        <option value="admitted-ward">Admitted - Ward</option>
                        <option value="referred">Referred</option>
                        <option value="dama">DAMA</option>
                        <option value="death">Death in ER</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observation in ER */}
              <Card>
                <CardHeader>
                  <CardTitle>Observation in ER</CardTitle>
                  <CardDescription>Document patient's course in the emergency room</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="er-observation-notes" className="flex items-center gap-2">
                        ER Observation Notes
                        <Mic className="h-3 w-3 text-slate-400" />
                      </Label>
                      <VoiceTextarea
                        id="er-observation-notes"
                        data-testid="textarea-er-observation"
                        value={formData.er_observation?.notes || ''}
                        onChange={(e) => updateNestedField('er_observation', 'notes', e.target.value)}
                        placeholder="Patient's course in ER, response to treatment, changes in condition..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="er-duration">Duration in ER</Label>
                      <Input
                        id="er-duration"
                        data-testid="input-er-duration"
                        value={formData.er_observation?.duration || ''}
                        onChange={(e) => updateNestedField('er_observation', 'duration', e.target.value)}
                        placeholder="e.g., 4 hours"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Discharge Advice - Only show if disposition is discharged */}
              {formData.disposition.type === 'discharged' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Discharge Advice</CardTitle>
                    <CardDescription>Follow-up instructions for the patient</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="disposition-advice" className="flex items-center gap-2">
                        Follow-up Advice
                        <Mic className="h-3 w-3 text-slate-400" />
                      </Label>
                      <VoiceTextarea
                        id="disposition-advice"
                        data-testid="textarea-disposition-advice"
                        value={formData.disposition.advice}
                        onChange={(e) => updateNestedField('disposition', 'advice', e.target.value)}
                        placeholder="Follow-up instructions, medications, precautions..."
                        rows={5}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prepare Discharge Summary Section - Only show if disposition is "discharged" */}
              {id && id !== 'new' && formData.disposition.type === 'discharged' && (
                <Card className="border-2 border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <FileText className="h-5 w-5" />
                      Prepare Discharge Summary
                    </CardTitle>
                    <CardDescription>
                      Patient is being discharged. Create a discharge summary document.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => navigate(`/discharge/${id}`)}
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="prepare-discharge-button"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Open Discharge Summary Editor
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Final Navigation Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Investigations
              </Button>
              <Button variant="outline" onClick={goToNextTab}>
                Next: Notes →
              </Button>
            </div>
          </TabsContent>

          {/* Notes Tab (Procedures) */}
          <TabsContent value="notes">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Procedures Performed
                  </CardTitle>
                  <CardDescription>Document all procedures performed and add detailed notes for each</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {PROCEDURE_CATEGORIES.map((category) => {
                      const categoryProcedures = PROCEDURE_OPTIONS.filter(p => p.category === category);
                      if (categoryProcedures.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-3">
                          <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded">
                            {category}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
                            {categoryProcedures.map((proc) => {
                              const isSelected = selectedProceduresWithNotes[proc.id] !== undefined;
                              return (
                                <div key={proc.id} className="space-y-2">
                                  <div 
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-green-50 border border-green-300' 
                                        : 'bg-white border border-slate-200 hover:border-slate-300'
                                    }`}
                                    onClick={() => toggleProcedureWithNote(proc.id)}
                                  >
                                    {isSelected ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${isSelected ? 'font-semibold text-green-800' : 'text-slate-700'}`}>
                                      {proc.name}
                                    </span>
                                  </div>
                                  
                                  {/* Notes input for selected procedure */}
                                  {isSelected && (
                                    <div className="pl-8">
                                      <textarea
                                        className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                        placeholder={`Notes for ${proc.name}...`}
                                        value={selectedProceduresWithNotes[proc.id] || ''}
                                        onChange={(e) => updateProcedureNote(proc.id, e.target.value)}
                                        rows={2}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Procedure Summary */}
              {Object.keys(selectedProceduresWithNotes).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="h-5 w-5" />
                      Procedures Summary ({Object.keys(selectedProceduresWithNotes).length} selected)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(selectedProceduresWithNotes).map(([procId, note]) => {
                        const proc = PROCEDURE_OPTIONS.find(p => p.id === procId);
                        return (
                          <div key={procId} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-green-800">{proc?.name || procId}</div>
                              {note && <div className="text-sm text-green-700 mt-1">{note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={goToPreviousTab}>
                  ← Back: Treatment
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleSaveClick();
                      setTimeout(() => navigate('/dashboard'), 1000);
                    }}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Save & Go to Dashboard
                  </Button>
                  <Button onClick={handleSaveClick} className="bg-green-600 hover:bg-green-700" size="lg">
                    <Save className="h-5 w-5 mr-2" />
                    Save Case Sheet
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
}
