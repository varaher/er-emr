import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, Baby } from 'lucide-react';
import ContinuousVoiceRecorder from '@/components/ContinuousVoiceRecorder';

const initialFormData = {
  patient: {
    uhid: '',
    name: '',
    age: '',
    age_unit: 'years', // years, months, days
    sex: 'Male',
    phone: '',
    address: '',
    arrival_datetime: new Date().toISOString().slice(0, 16),
    mode_of_arrival: 'Walk-in',
    brought_by: 'Parent',
  },
  growth_parameters: {
    weight: '',
    height: '',
    head_circumference: '',
    bmi: '',
  },
  pat: {
    // Pediatric Assessment Triangle
    appearance: 'Normal', // Normal, Abnormal
    work_of_breathing: 'Normal', // Normal, Increased
    circulation_to_skin: 'Normal', // Normal, Abnormal
    overall_impression: 'Stable', // Stable, Sick, Critical
  },
  vitals_at_arrival: {
    hr: '',
    bp_systolic: '',
    bp_diastolic: '',
    rr: '',
    spo2: '',
    temperature: '',
    gcs_e: '',
    gcs_v: '',
    gcs_m: '',
    capillary_refill: '',
    pain_score: '',
  },
  presenting_complaint: {
    text: '',
    duration: '',
    onset_type: 'Sudden',
  },
  primary_assessment: {
    // Pediatric ABCDE
    airway_status: 'Patent',
    airway_additional_notes: '',
    breathing_status: 'Normal',
    breathing_additional_notes: '',
    circulation_status: 'Normal',
    circulation_additional_notes: '',
    disability_status: 'Alert',
    disability_additional_notes: '',
    exposure_status: 'Normal',
    exposure_additional_notes: '',
  },
  history: {
    signs_and_symptoms: '',
    birth_history: '',
    immunization_status: '',
    developmental_milestones: '',
    past_medical: [],
    allergies: [],
    drug_history: '',
    past_surgical: '',
    family_history: '',
    feeding_history: '',
  },
  examination: {
    general_notes: '',
    general_pallor: false,
    general_icterus: false,
    general_cyanosis: false,
    general_dehydration: 'None', // None, Mild, Moderate, Severe
    cvs_additional_notes: '',
    respiratory_additional_notes: '',
    abdomen_additional_notes: '',
    cns_additional_notes: '',
    musculoskeletal_notes: '',
    skin_notes: '',
  },
  treatment: {
    intervention_notes: '',
  },
  triage: {
    priority: null,
    priority_color: '',
    priority_name: '',
  },
};

function calculatePediatricTriage(vitals, age, ageUnit, pat) {
  // Pediatric triage based on age-appropriate vitals and PAT
  let priority = 5;
  let priorityColor = 'green';
  let priorityName = 'Non-urgent';

  // Convert age to months for easier calculation
  let ageInMonths = 0;
  if (ageUnit === 'years') ageInMonths = parseInt(age) * 12;
  else if (ageUnit === 'months') ageInMonths = parseInt(age);
  else if (ageUnit === 'days') ageInMonths = parseInt(age) / 30;

  const hr = Number(vitals.hr) || 0;
  const sbp = Number(vitals.bp_systolic) || 0;
  const rr = Number(vitals.rr) || 0;
  const spo2 = Number(vitals.spo2) || 0;
  const gcsTotal = (Number(vitals.gcs_e) || 0) + (Number(vitals.gcs_v) || 0) + (Number(vitals.gcs_m) || 0);

  // Age-specific vital ranges
  let hrLow, hrHigh, rrLow, rrHigh, sbpLow;
  
  if (ageInMonths < 1) { // Neonate
    hrLow = 100; hrHigh = 180; rrLow = 30; rrHigh = 60; sbpLow = 60;
  } else if (ageInMonths < 12) { // Infant
    hrLow = 100; hrHigh = 160; rrLow = 25; rrHigh = 50; sbpLow = 70;
  } else if (ageInMonths < 36) { // Toddler
    hrLow = 90; hrHigh = 150; rrLow = 20; rrHigh = 40; sbpLow = 70;
  } else if (ageInMonths < 72) { // Preschool
    hrLow = 80; hrHigh = 140; rrLow = 20; rrHigh = 30; sbpLow = 75;
  } else if (ageInMonths < 144) { // School-age
    hrLow = 70; hrHigh = 120; rrLow = 15; rrHigh = 25; sbpLow = 80;
  } else { // Adolescent
    hrLow = 60; hrHigh = 100; rrLow = 12; rrHigh = 20; sbpLow = 90;
  }

  // Critical conditions (Priority 1 - Red)
  if (pat?.overall_impression === 'Critical' || 
      sbp < sbpLow || 
      spo2 < 85 || 
      gcsTotal < 9 || 
      rr < rrLow - 5) {
    priority = 1;
    priorityColor = 'red';
    priorityName = 'Resuscitation';
  }
  // Emergent (Priority 2 - Orange)
  else if (pat?.overall_impression === 'Sick' ||
           spo2 < 90 || 
           hr > hrHigh || 
           hr < hrLow || 
           rr > rrHigh || 
           gcsTotal < 13) {
    priority = 2;
    priorityColor = 'orange';
    priorityName = 'Emergent';
  }
  // Urgent (Priority 3 - Yellow)
  else if (hr > hrHigh - 10 || rr > rrHigh - 5 || spo2 < 94) {
    priority = 3;
    priorityColor = 'yellow';
    priorityName = 'Urgent';
  }
  // Less Urgent (Priority 4 - Green)
  else if (hr > 0 || sbp > 0) {
    priority = 4;
    priorityColor = 'green';
    priorityName = 'Less Urgent';
  }

  return { priority, priority_color: priorityColor, priority_name: priorityName };
}

export default function EditPediatricCaseSheetNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Load existing case if editing
  useEffect(() => {
    if (id && id !== 'new') {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases-pediatric/${id}`);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to load case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Section update handlers
  const updateSection = (section, patch) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...patch,
      },
    }));
  };

  const handlePatientChange = (field, value) => {
    updateSection('patient', { [field]: value });
  };

  const handleGrowthChange = (field, value) => {
    updateSection('growth_parameters', { [field]: value });
  };

  const handlePATChange = (field, value) => {
    updateSection('pat', { [field]: value });
  };

  const handleVitalsChange = (field, value) => {
    updateSection('vitals_at_arrival', { [field]: value });
    
    // Auto-recalculate triage when vitals change
    setTimeout(() => {
      const newVitals = { ...formData.vitals_at_arrival, [field]: value };
      const triageResult = calculatePediatricTriage(
        newVitals, 
        formData.patient.age, 
        formData.patient.age_unit,
        formData.pat
      );
      updateSection('triage', triageResult);
    }, 100);
  };

  const handlePresentingComplaintChange = (field, value) => {
    updateSection('presenting_complaint', { [field]: value });
  };

  const handlePrimaryAssessmentChange = (field, value) => {
    updateSection('primary_assessment', { [field]: value });
  };

  const handleHistoryChange = (field, value) => {
    updateSection('history', { [field]: value });
  };

  const handleExaminationChange = (field, value) => {
    updateSection('examination', { [field]: value });
  };

  const handleTreatmentChange = (field, value) => {
    updateSection('treatment', { [field]: value });
  };

  // Main AUTO-POPULATE handler
  const handleProcessTranscript = async (transcript) => {
    if (!transcript.trim()) {
      toast.error('No transcript to process');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🔍 STEP 1: Sending pediatric transcript to backend:', transcript.substring(0, 100) + '...');

      const response = await api.post('/extract-case-data', {
        transcript: transcript,
        is_pediatric: true
      });

      if (!response.data.success) {
        throw new Error('Extraction failed');
      }

      const parsed = response.data.data;
      console.log('📦 STEP 2: Received parsed pediatric data:', parsed);

      // Build mapped data
      const mappedData = {};

      // 1. PATIENT INFORMATION (including pediatric age unit)
      if (parsed.patient_info) {
        console.log('📝 Mapping pediatric patient info...');
        mappedData.patient = {
          ...formData.patient,
          ...(parsed.patient_info.name && { name: parsed.patient_info.name }),
          ...(parsed.patient_info.age && { age: String(parsed.patient_info.age) }),
          ...(parsed.patient_info.age_unit && { age_unit: parsed.patient_info.age_unit }),
          ...(parsed.patient_info.gender && { sex: parsed.patient_info.gender }),
        };
      }

      // 2. GROWTH PARAMETERS
      if (parsed.growth_parameters) {
        console.log('📝 Mapping growth parameters...');
        mappedData.growth_parameters = {
          ...formData.growth_parameters,
          ...parsed.growth_parameters,
        };
      }

      // 3. PAT (Pediatric Assessment Triangle)
      if (parsed.pat) {
        console.log('📝 Mapping PAT...');
        mappedData.pat = {
          ...formData.pat,
          ...parsed.pat,
        };
      }

      // 4. VITALS AT ARRIVAL
      if (parsed.vitals) {
        console.log('📝 Mapping pediatric vitals...');
        mappedData.vitals_at_arrival = {
          ...formData.vitals_at_arrival,
          ...(parsed.vitals.hr && { hr: String(parsed.vitals.hr) }),
          ...(parsed.vitals.bp_systolic && { bp_systolic: String(parsed.vitals.bp_systolic) }),
          ...(parsed.vitals.bp_diastolic && { bp_diastolic: String(parsed.vitals.bp_diastolic) }),
          ...(parsed.vitals.rr && { rr: String(parsed.vitals.rr) }),
          ...(parsed.vitals.spo2 && { spo2: String(parsed.vitals.spo2) }),
          ...(parsed.vitals.temperature && { temperature: String(parsed.vitals.temperature) }),
          ...(parsed.vitals.gcs_e && { gcs_e: String(parsed.vitals.gcs_e) }),
          ...(parsed.vitals.gcs_v && { gcs_v: String(parsed.vitals.gcs_v) }),
          ...(parsed.vitals.gcs_m && { gcs_m: String(parsed.vitals.gcs_m) }),
          ...(parsed.vitals.capillary_refill && { capillary_refill: String(parsed.vitals.capillary_refill) }),
        };
      }

      // 5. PRESENTING COMPLAINT
      if (parsed.presenting_complaint) {
        mappedData.presenting_complaint = {
          ...formData.presenting_complaint,
          ...parsed.presenting_complaint,
        };
      }

      // 6. PRIMARY ASSESSMENT (Pediatric ABCDE)
      if (parsed.primary_assessment) {
        mappedData.primary_assessment = {
          ...formData.primary_assessment,
          ...parsed.primary_assessment,
        };
      }

      // 7. HISTORY (including pediatric-specific)
      if (parsed.history) {
        mappedData.history = {
          ...formData.history,
          ...parsed.history,
        };
      }

      // 8. EXAMINATION
      if (parsed.examination) {
        mappedData.examination = {
          ...formData.examination,
          ...parsed.examination,
        };
      }

      // 9. TREATMENT
      if (parsed.treatment) {
        mappedData.treatment = {
          ...formData.treatment,
          ...parsed.treatment,
        };
      }

      // Auto-calculate pediatric triage
      const triageResult = calculatePediatricTriage(
        mappedData.vitals_at_arrival || formData.vitals_at_arrival,
        (mappedData.patient || formData.patient).age,
        (mappedData.patient || formData.patient).age_unit,
        mappedData.pat || formData.pat
      );
      mappedData.triage = triageResult;

      // Apply all mapped data at once
      const finalData = {
        ...formData,
        ...mappedData,
      };

      console.log('🎯 STEP 3: Setting final pediatric formData:', finalData);
      setFormData(finalData);

      // Display red flags
      if (response.data.red_flags && response.data.red_flags.length > 0) {
        response.data.red_flags.forEach(flag => {
          if (flag.includes('🚨')) {
            toast.error(flag, { duration: 10000 });
          } else {
            toast.warning(flag, { duration: 8000 });
          }
        });
      }

      toast.success('✅ Pediatric case sheet auto-populated!', {
        description: 'All fields filled. Review age-specific vitals and PAT assessment.'
      });

    } catch (error) {
      console.error('❌ Error processing pediatric transcript:', error);
      toast.error(error.response?.data?.detail || 'Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (id === 'new') {
        const response = await api.post('/cases-pediatric', {
          ...formData,
          created_by: user.id,
          created_by_name: user.name
        });
        toast.success('Pediatric case created successfully');
        navigate(`/case-pediatric/${response.data.id}`);
      } else {
        await api.put(`/cases-pediatric/${id}`, formData);
        toast.success('Pediatric case updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const p = formData.patient;
  const g = formData.growth_parameters;
  const pat = formData.pat;
  const v = formData.vitals_at_arrival;
  const pc = formData.presenting_complaint;
  const pa = formData.primary_assessment;
  const h = formData.history;
  const e = formData.examination;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Baby className="h-8 w-8 text-pink-600" />
              <h1 className="text-3xl font-bold text-slate-900">
                {id === 'new' ? 'New Pediatric Case Sheet' : 'Edit Pediatric Case Sheet'}
              </h1>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Case'}
          </Button>
        </div>

        {/* Voice Recording Section */}
        <Card className="border-pink-200 bg-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-600" />
              AI-Powered Pediatric Voice Documentation
            </CardTitle>
            <CardDescription>
              Record pediatric history, examination, and vitals - AI will automatically extract age-appropriate data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContinuousVoiceRecorder
              onTranscriptComplete={handleProcessTranscript}
              caseSheetId={id}
            />
          </CardContent>
        </Card>

        {/* Triage Priority Display */}
        {formData.triage.priority && (
          <Card className={`border-2 border-${formData.triage.priority_color}-400 bg-${formData.triage.priority_color}-50`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Pediatric Triage: {formData.triage.priority_name}</h3>
                  <p className="text-sm text-slate-600">Priority Level {formData.triage.priority} (Age-adjusted)</p>
                </div>
                <div className={`text-4xl font-bold text-${formData.triage.priority_color}-600`}>
                  P{formData.triage.priority}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for sections */}
        <Tabs defaultValue="patient" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="pat">PAT</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="abcde">ABCDE</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="exam">Exam</TabsTrigger>
          </TabsList>

          {/* Patient Information */}
          <TabsContent value="patient">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient Name *</Label>
                    <Input
                      value={p.name}
                      onChange={(e) => handlePatientChange('name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Age *</Label>
                      <Input
                        type="number"
                        value={p.age}
                        onChange={(e) => handlePatientChange('age', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={p.age_unit}
                        onChange={(e) => handlePatientChange('age_unit', e.target.value)}
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Sex</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={p.sex}
                      onChange={(e) => handlePatientChange('sex', e.target.value)}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Brought By</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={p.brought_by}
                      onChange={(e) => handlePatientChange('brought_by', e.target.value)}
                    >
                      <option>Parent</option>
                      <option>Guardian</option>
                      <option>School Staff</option>
                      <option>Police</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>UHID</Label>
                    <Input
                      value={p.uhid}
                      onChange={(e) => handlePatientChange('uhid', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Parent/Guardian Phone</Label>
                    <Input
                      value={p.phone}
                      onChange={(e) => handlePatientChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={p.address}
                      onChange={(e) => handlePatientChange('address', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Parameters */}
          <TabsContent value="growth">
            <Card>
              <CardHeader>
                <CardTitle>Growth Parameters</CardTitle>
                <CardDescription>Important for pediatric assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={g.weight}
                      onChange={(e) => handleGrowthChange('weight', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={g.height}
                      onChange={(e) => handleGrowthChange('height', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Head Circumference (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={g.head_circumference}
                      onChange={(e) => handleGrowthChange('head_circumference', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>BMI</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={g.bmi}
                      onChange={(e) => handleGrowthChange('bmi', e.target.value)}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAT (Pediatric Assessment Triangle) */}
          <TabsContent value="pat">
            <Card>
              <CardHeader>
                <CardTitle>PAT - Pediatric Assessment Triangle</CardTitle>
                <CardDescription>Quick visual assessment before detailed examination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Appearance</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={pat.appearance}
                      onChange={(e) => handlePATChange('appearance', e.target.value)}
                    >
                      <option>Normal</option>
                      <option>Abnormal</option>
                    </select>
                  </div>
                  <div>
                    <Label>Work of Breathing</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={pat.work_of_breathing}
                      onChange={(e) => handlePATChange('work_of_breathing', e.target.value)}
                    >
                      <option>Normal</option>
                      <option>Increased</option>
                    </select>
                  </div>
                  <div>
                    <Label>Circulation to Skin</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={pat.circulation_to_skin}
                      onChange={(e) => handlePATChange('circulation_to_skin', e.target.value)}
                    >
                      <option>Normal</option>
                      <option>Abnormal</option>
                    </select>
                  </div>
                  <div>
                    <Label>Overall Impression</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={pat.overall_impression}
                      onChange={(e) => handlePATChange('overall_impression', e.target.value)}
                    >
                      <option>Stable</option>
                      <option>Sick</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vitals */}
          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric Vitals at Arrival</CardTitle>
                <CardDescription>Age-appropriate vital signs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>HR (bpm)</Label>
                    <Input
                      type="number"
                      value={v.hr}
                      onChange={(e) => handleVitalsChange('hr', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>BP Systolic</Label>
                    <Input
                      type="number"
                      value={v.bp_systolic}
                      onChange={(e) => handleVitalsChange('bp_systolic', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>BP Diastolic</Label>
                    <Input
                      type="number"
                      value={v.bp_diastolic}
                      onChange={(e) => handleVitalsChange('bp_diastolic', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>RR (/min)</Label>
                    <Input
                      type="number"
                      value={v.rr}
                      onChange={(e) => handleVitalsChange('rr', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>SpO2 (%)</Label>
                    <Input
                      type="number"
                      value={v.spo2}
                      onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={v.temperature}
                      onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CRT (sec)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={v.capillary_refill}
                      onChange={(e) => handleVitalsChange('capillary_refill', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Pain Score (0-10)</Label>
                    <Input
                      type="number"
                      value={v.pain_score}
                      onChange={(e) => handleVitalsChange('pain_score', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>GCS Eye (1-4)</Label>
                    <Input
                      type="number"
                      value={v.gcs_e}
                      onChange={(e) => handleVitalsChange('gcs_e', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>GCS Verbal (1-5)</Label>
                    <Input
                      type="number"
                      value={v.gcs_v}
                      onChange={(e) => handleVitalsChange('gcs_v', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>GCS Motor (1-6)</Label>
                    <Input
                      type="number"
                      value={v.gcs_m}
                      onChange={(e) => handleVitalsChange('gcs_m', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABCDE */}
          <TabsContent value="abcde">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric Primary Assessment - ABCDE</CardTitle>
                <CardDescription>Auto-calculated based on PAT and vitals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h4 className="font-semibold">A - Airway</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={pa.airway_status}
                        onChange={(e) => handlePrimaryAssessmentChange('airway_status', e.target.value)}
                      >
                        <option>Patent</option>
                        <option>Threatened</option>
                        <option>Obstructed</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={pa.airway_additional_notes}
                        onChange={(e) => handlePrimaryAssessmentChange('airway_additional_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">B - Breathing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={pa.breathing_status}
                        onChange={(e) => handlePrimaryAssessmentChange('breathing_status', e.target.value)}
                      >
                        <option>Normal</option>
                        <option>Abnormal</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes (Retractions, Grunting, Wheeze)</Label>
                      <Input
                        value={pa.breathing_additional_notes}
                        onChange={(e) => handlePrimaryAssessmentChange('breathing_additional_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">C - Circulation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={pa.circulation_status}
                        onChange={(e) => handlePrimaryAssessmentChange('circulation_status', e.target.value)}
                      >
                        <option>Normal</option>
                        <option>Abnormal</option>
                        <option>Shock</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes (CRT, Pulses, Perfusion)</Label>
                      <Input
                        value={pa.circulation_additional_notes}
                        onChange={(e) => handlePrimaryAssessmentChange('circulation_additional_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">D - Disability</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={pa.disability_status}
                        onChange={(e) => handlePrimaryAssessmentChange('disability_status', e.target.value)}
                      >
                        <option>Alert</option>
                        <option>AVPU - Voice</option>
                        <option>AVPU - Pain</option>
                        <option>AVPU - Unresponsive</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes (GCS, Pupils, Posture)</Label>
                      <Input
                        value={pa.disability_additional_notes}
                        onChange={(e) => handlePrimaryAssessmentChange('disability_additional_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">E - Exposure</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={pa.exposure_status}
                        onChange={(e) => handlePrimaryAssessmentChange('exposure_status', e.target.value)}
                      >
                        <option>Normal</option>
                        <option>Rash</option>
                        <option>Injury</option>
                        <option>Fever</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes (Rashes, Injuries, Deformities)</Label>
                      <Input
                        value={pa.exposure_additional_notes}
                        onChange={(e) => handlePrimaryAssessmentChange('exposure_additional_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Presenting Complaint & HPI</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={3}
                    value={h.signs_and_symptoms}
                    onChange={(e) => handleHistoryChange('signs_and_symptoms', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Birth History</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.birth_history}
                    onChange={(e) => handleHistoryChange('birth_history', e.target.value)}
                    placeholder="Term/Preterm, Birth weight, Complications..."
                  />
                </div>
                <div>
                  <Label>Immunization Status</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.immunization_status}
                    onChange={(e) => handleHistoryChange('immunization_status', e.target.value)}
                    placeholder="Up-to-date, Delayed, Specific vaccines..."
                  />
                </div>
                <div>
                  <Label>Developmental Milestones</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.developmental_milestones}
                    onChange={(e) => handleHistoryChange('developmental_milestones', e.target.value)}
                    placeholder="Age-appropriate, Delayed, Specific concerns..."
                  />
                </div>
                <div>
                  <Label>Feeding History</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.feeding_history}
                    onChange={(e) => handleHistoryChange('feeding_history', e.target.value)}
                    placeholder="Breastfeeding, Formula, Solid foods, Feeding difficulties..."
                  />
                </div>
                <div>
                  <Label>Medications</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.drug_history}
                    onChange={(e) => handleHistoryChange('drug_history', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examination */}
          <TabsContent value="exam">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric Physical Examination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>General Appearance</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.general_notes}
                    onChange={(e) => handleExaminationChange('general_notes', e.target.value)}
                    placeholder="Alert, Active, Playful, Irritable, Lethargic..."
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Dehydration</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={e.general_dehydration}
                      onChange={(e) => handleExaminationChange('general_dehydration', e.target.value)}
                    >
                      <option>None</option>
                      <option>Mild</option>
                      <option>Moderate</option>
                      <option>Severe</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>CVS Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.cvs_additional_notes}
                    onChange={(e) => handleExaminationChange('cvs_additional_notes', e.target.value)}
                    placeholder="Heart sounds, Murmurs, Pulses..."
                  />
                </div>
                <div>
                  <Label>Respiratory Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.respiratory_additional_notes}
                    onChange={(e) => handleExaminationChange('respiratory_additional_notes', e.target.value)}
                    placeholder="Air entry, Wheeze, Crackles, Retractions..."
                  />
                </div>
                <div>
                  <Label>Abdomen Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.abdomen_additional_notes}
                    onChange={(e) => handleExaminationChange('abdomen_additional_notes', e.target.value)}
                    placeholder="Soft, Distended, Tender, Masses..."
                  />
                </div>
                <div>
                  <Label>CNS Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.cns_additional_notes}
                    onChange={(e) => handleExaminationChange('cns_additional_notes', e.target.value)}
                    placeholder="Tone, Reflexes, Fontanelle (if infant)..."
                  />
                </div>
                <div>
                  <Label>Skin Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.skin_notes}
                    onChange={(e) => handleExaminationChange('skin_notes', e.target.value)}
                    placeholder="Rashes, Bruises, Petechiae, Cyanosis..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
