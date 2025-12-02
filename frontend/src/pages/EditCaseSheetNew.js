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
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import ContinuousVoiceRecorder from '@/components/ContinuousVoiceRecorder';

const initialFormData = {
  patient: {
    uhid: '',
    name: '',
    age: '',
    sex: 'Male',
    phone: '',
    address: '',
    arrival_datetime: new Date().toISOString().slice(0, 16),
    mode_of_arrival: 'Walk-in',
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
    grbs: '',
    pain_score: '',
  },
  presenting_complaint: {
    text: '',
    duration: '',
    onset_type: 'Sudden',
  },
  primary_assessment: {
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
    past_medical: [],
    allergies: [],
    drug_history: '',
    past_surgical: '',
    family_history: '',
  },
  examination: {
    general_notes: '',
    general_pallor: false,
    general_icterus: false,
    general_clubbing: false,
    general_lymphadenopathy: false,
    cvs_additional_notes: '',
    respiratory_additional_notes: '',
    abdomen_additional_notes: '',
    cns_additional_notes: '',
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

function calculateTriageFromVitals(vitals) {
  // Simple triage calculation based on vitals
  let priority = 5;
  let priorityColor = 'green';
  let priorityName = 'Non-urgent';

  const hr = Number(vitals.hr) || 0;
  const sbp = Number(vitals.bp_systolic) || 0;
  const rr = Number(vitals.rr) || 0;
  const spo2 = Number(vitals.spo2) || 0;
  const gcsTotal = (Number(vitals.gcs_e) || 0) + (Number(vitals.gcs_v) || 0) + (Number(vitals.gcs_m) || 0);

  // Critical conditions (Priority 1 - Red)
  if (sbp < 90 || spo2 < 85 || gcsTotal < 9 || rr < 10) {
    priority = 1;
    priorityColor = 'red';
    priorityName = 'Resuscitation';
  }
  // Emergent (Priority 2 - Orange)
  else if (sbp < 100 || spo2 < 90 || hr > 130 || hr < 40 || rr > 30 || gcsTotal < 13) {
    priority = 2;
    priorityColor = 'orange';
    priorityName = 'Emergent';
  }
  // Urgent (Priority 3 - Yellow)
  else if (hr > 100 || rr > 20 || spo2 < 94) {
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

export default function EditCaseSheetNew() {
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
      const response = await api.get(`/cases/${id}`);
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

  const handleVitalsChange = (field, value) => {
    updateSection('vitals_at_arrival', { [field]: value });
    
    // Auto-recalculate triage when vitals change
    setTimeout(() => {
      const newVitals = { ...formData.vitals_at_arrival, [field]: value };
      const triageResult = calculateTriageFromVitals(newVitals);
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
      console.log('🔍 STEP 1: Sending transcript to backend:', transcript.substring(0, 100) + '...');

      const response = await api.post('/extract-case-data', {
        transcript: transcript
      });

      if (!response.data.success) {
        throw new Error('Extraction failed');
      }

      const parsed = response.data.data;
      console.log('📦 STEP 2: Received parsed data:', parsed);

      // Build mapped data from parsed response
      const mappedData = {};

      // 1. PATIENT INFORMATION
      if (parsed.patient_info) {
        console.log('📝 Mapping patient info...');
        mappedData.patient = {
          ...formData.patient,
          ...(parsed.patient_info.name && { name: parsed.patient_info.name }),
          ...(parsed.patient_info.age && { age: String(parsed.patient_info.age) }),
          ...(parsed.patient_info.gender && { sex: parsed.patient_info.gender }),
        };
      }

      // 2. VITALS AT ARRIVAL
      if (parsed.vitals) {
        console.log('📝 Mapping vitals...');
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
        };
      }

      // 3. PRESENTING COMPLAINT
      if (parsed.presenting_complaint) {
        console.log('📝 Mapping presenting complaint...');
        mappedData.presenting_complaint = {
          ...formData.presenting_complaint,
          ...parsed.presenting_complaint,
        };
      }

      // 4. PRIMARY ASSESSMENT (ABCDE)
      if (parsed.primary_assessment) {
        console.log('📝 Mapping primary assessment (ABCDE)...');
        mappedData.primary_assessment = {
          ...formData.primary_assessment,
          ...parsed.primary_assessment,
        };
      }

      // 5. HISTORY
      if (parsed.history) {
        console.log('📝 Mapping history...');
        mappedData.history = {
          ...formData.history,
          ...parsed.history,
        };
      }

      // 6. EXAMINATION
      if (parsed.examination) {
        console.log('📝 Mapping examination...');
        mappedData.examination = {
          ...formData.examination,
          ...parsed.examination,
        };
      }

      // 7. TREATMENT
      if (parsed.treatment) {
        console.log('📝 Mapping treatment...');
        mappedData.treatment = {
          ...formData.treatment,
          ...parsed.treatment,
        };
      }

      // Auto-calculate triage from mapped vitals
      const triageResult = calculateTriageFromVitals(mappedData.vitals_at_arrival || formData.vitals_at_arrival);
      mappedData.triage = triageResult;

      // Apply all mapped data at once
      const finalData = {
        ...formData,
        ...mappedData,
      };

      console.log('🎯 STEP 3: Setting final formData:', finalData);
      setFormData(finalData);

      // Display red flags as toasts
      if (response.data.red_flags && response.data.red_flags.length > 0) {
        response.data.red_flags.forEach(flag => {
          if (flag.includes('🚨')) {
            toast.error(flag, { duration: 10000 });
          } else {
            toast.warning(flag, { duration: 8000 });
          }
        });
      }

      toast.success('✅ AI auto-population complete!', {
        description: 'All fields have been filled. Please review and edit as needed.'
      });

    } catch (error) {
      console.error('❌ Error processing transcript:', error);
      toast.error(error.response?.data?.detail || 'Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (id === 'new') {
        const response = await api.post('/cases', {
          ...formData,
          created_by: user.id,
          created_by_name: user.name
        });
        toast.success('Case created successfully');
        navigate(`/case-sheet/${response.data.id}`);
      } else {
        await api.put(`/cases/${id}`, formData);
        toast.success('Case updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const p = formData.patient;
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
            <h1 className="text-3xl font-bold text-slate-900">
              {id === 'new' ? 'New Case Sheet' : 'Edit Case Sheet'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Case'}
          </Button>
        </div>

        {/* Voice Recording Section */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI-Powered Voice Documentation
            </CardTitle>
            <CardDescription>
              Record patient history, examination, and vitals - AI will automatically extract and populate all fields
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
                  <h3 className="text-lg font-bold">Triage Priority: {formData.triage.priority_name}</h3>
                  <p className="text-sm text-slate-600">Priority Level {formData.triage.priority}</p>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="complaint">Complaint</TabsTrigger>
            <TabsTrigger value="abcde">ABCDE</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="exam">Examination</TabsTrigger>
          </TabsList>

          {/* Patient Information */}
          <TabsContent value="patient">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
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
                  <div>
                    <Label>Age *</Label>
                    <Input
                      type="number"
                      value={p.age}
                      onChange={(e) => handlePatientChange('age', e.target.value)}
                      placeholder="Years"
                    />
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
                    <Label>Mode of Arrival</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={p.mode_of_arrival}
                      onChange={(e) => handlePatientChange('mode_of_arrival', e.target.value)}
                    >
                      <option>Walk-in</option>
                      <option>Ambulance</option>
                      <option>Police</option>
                      <option>Referred</option>
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
                    <Label>Phone</Label>
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

          {/* Vitals */}
          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Vitals at Arrival</CardTitle>
                <CardDescription>Auto-populates from voice recording</CardDescription>
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
                  <div>
                    <Label>GRBS</Label>
                    <Input
                      type="number"
                      value={v.grbs}
                      onChange={(e) => handleVitalsChange('grbs', e.target.value)}
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Presenting Complaint */}
          <TabsContent value="complaint">
            <Card>
              <CardHeader>
                <CardTitle>Presenting Complaint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Chief Complaint</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={3}
                    value={pc.text}
                    onChange={(e) => handlePresentingComplaintChange('text', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration</Label>
                    <Input
                      value={pc.duration}
                      onChange={(e) => handlePresentingComplaintChange('duration', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Onset Type</Label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={pc.onset_type}
                      onChange={(e) => handlePresentingComplaintChange('onset_type', e.target.value)}
                    >
                      <option>Sudden</option>
                      <option>Gradual</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABCDE */}
          <TabsContent value="abcde">
            <Card>
              <CardHeader>
                <CardTitle>Primary Assessment - ABCDE</CardTitle>
                <CardDescription>Auto-calculated based on vitals</CardDescription>
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
                      <Label>Notes</Label>
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
                        <option>Compromised</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes</Label>
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
                        <option>Moderate impairment</option>
                        <option>Severe impairment</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes</Label>
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
                        <option>Fever</option>
                        <option>Hypothermia</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notes</Label>
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
                <CardTitle>History - SAMPLE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Signs and Symptoms</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={3}
                    value={h.signs_and_symptoms}
                    onChange={(e) => handleHistoryChange('signs_and_symptoms', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Drug History / Medications</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.drug_history}
                    onChange={(e) => handleHistoryChange('drug_history', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Past Surgical History</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={h.past_surgical}
                    onChange={(e) => handleHistoryChange('past_surgical', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examination */}
          <TabsContent value="exam">
            <Card>
              <CardHeader>
                <CardTitle>Physical Examination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>General Notes</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.general_notes}
                    onChange={(e) => handleExaminationChange('general_notes', e.target.value)}
                  />
                </div>
                <div>
                  <Label>CVS Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.cvs_additional_notes}
                    onChange={(e) => handleExaminationChange('cvs_additional_notes', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Respiratory Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.respiratory_additional_notes}
                    onChange={(e) => handleExaminationChange('respiratory_additional_notes', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Abdomen Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.abdomen_additional_notes}
                    onChange={(e) => handleExaminationChange('abdomen_additional_notes', e.target.value)}
                  />
                </div>
                <div>
                  <Label>CNS Findings</Label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={e.cns_additional_notes}
                    onChange={(e) => handleExaminationChange('cns_additional_notes', e.target.value)}
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
