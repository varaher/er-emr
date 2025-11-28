import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { VoiceTextInput, VoiceTextarea } from '@/components/VoiceTextInput';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, AlertCircle, Mic } from 'lucide-react';

export default function CaseSheetForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  
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
      airway_status: 'Patent',
      airway_obstruction: [],
      airway_interventions: [],
      airway_notes: '',
      breathing_rr: null,
      breathing_spo2: null,
      breathing_oxygen_device: 'Room air',
      breathing_oxygen_flow: null,
      breathing_work: 'Normal',
      breathing_air_entry: [],
      breathing_adjuncts: [],
      breathing_notes: '',
      circulation_hr: null,
      circulation_bp_systolic: null,
      circulation_bp_diastolic: null,
      circulation_crt: null,
      circulation_neck_veins: 'Normal',
      circulation_peripheral_pulses: 'Present',
      circulation_external_bleed: false,
      circulation_long_bone_deformity: false,
      circulation_adjuncts: [],
      circulation_notes: '',
      disability_avpu: 'A',
      disability_gcs_e: null,
      disability_gcs_v: null,
      disability_gcs_m: null,
      disability_pupils_size: 'Equal',
      disability_pupils_reaction: 'Brisk',
      disability_grbs: null,
      disability_seizure: false,
      disability_notes: '',
      exposure_temperature: null,
      exposure_logroll_findings: [],
      exposure_local_exam_notes: ''
    },
    history: {
      hpi: '',
      secondary_survey_neuro: [],
      secondary_survey_resp: [],
      secondary_survey_cardiac: [],
      secondary_survey_gi: [],
      secondary_survey_gu: [],
      secondary_survey_msk: [],
      secondary_survey_notes: '',
      past_medical: [],
      past_surgical: '',
      drug_history: '',
      family_history: '',
      gyn_history: '',
      lmp: '',
      allergies: []
    },
    examination: {
      general_pallor: false,
      general_icterus: false,
      general_clubbing: false,
      general_lymphadenopathy: false,
      general_thyroid: 'Normal',
      general_varicose_veins: false,
      general_notes: '',
      respiratory_summary: '',
      cvs_summary: '',
      abdomen_summary: '',
      cns_summary: '',
      extremities_summary: ''
    },
    investigations: {
      panels_selected: [],
      individual_tests: [],
      results_notes: ''
    },
    treatment: {
      interventions: [],
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
  }, [id]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases/${id}`);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to fetch case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (id && id !== 'new') {
        await api.put(`/cases/${id}`, formData);
        toast.success('Case updated successfully');
      } else {
        const response = await api.post('/cases', formData);
        toast.success('Case created successfully');
        navigate(`/case/${response.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save case');
      console.error(error);
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
      
      toast.success('AI suggestion generated', {
        description: response.data.response.substring(0, 100) + '...'
      });

      // Show AI response in a modal or alert
      alert(response.data.response);
    } catch (error) {
      toast.error('AI suggestion failed');
      console.error(error);
    } finally {
      setAiLoading(false);
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
                onClick={() => navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {id === 'new' ? 'New Case Sheet' : 'Edit Case Sheet'}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-600">Complete the emergency department case documentation</p>
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
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    AI Red Flags
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAISuggestion('diagnosis_suggestions')}
                    disabled={aiLoading}
                    data-testid="ai-diagnosis-button"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Diagnosis
                  </Button>
                </>
              )}
              <Button 
                onClick={handleSave} 
                disabled={loading}
                data-testid="save-case-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Case'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 mb-6">
            <TabsTrigger value="patient" data-testid="tab-patient">Patient Info</TabsTrigger>
            <TabsTrigger value="vitals" data-testid="tab-vitals">Vitals</TabsTrigger>
            <TabsTrigger value="primary" data-testid="tab-primary">ABCDE</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="examination" data-testid="tab-examination">Examination</TabsTrigger>
            <TabsTrigger value="investigations" data-testid="tab-investigations">Investigations</TabsTrigger>
            <TabsTrigger value="treatment" data-testid="tab-treatment">Treatment</TabsTrigger>
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
                    <Label htmlFor="patient-name">Patient Name *</Label>
                    <Input
                      id="patient-name"
                      data-testid="input-patient-name"
                      value={formData.patient.name}
                      onChange={(e) => updateNestedField('patient', 'name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patient-uhid">UHID</Label>
                    <Input
                      id="patient-uhid"
                      data-testid="input-patient-uhid"
                      value={formData.patient.uhid}
                      onChange={(e) => updateNestedField('patient', 'uhid', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-age">Age *</Label>
                    <Input
                      id="patient-age"
                      data-testid="input-patient-age"
                      value={formData.patient.age}
                      onChange={(e) => updateNestedField('patient', 'age', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-sex">Sex</Label>
                    <select
                      id="patient-sex"
                      data-testid="select-patient-sex"
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.patient.sex}
                      onChange={(e) => updateNestedField('patient', 'sex', e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Phone</Label>
                    <Input
                      id="patient-phone"
                      data-testid="input-patient-phone"
                      value={formData.patient.phone}
                      onChange={(e) => updateNestedField('patient', 'phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-address">Address</Label>
                    <Input
                      id="patient-address"
                      data-testid="input-patient-address"
                      value={formData.patient.address}
                      onChange={(e) => updateNestedField('patient', 'address', e.target.value)}
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
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Vitals at Arrival</CardTitle>
                <CardDescription>Record initial vital signs</CardDescription>
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

              {/* ABCDE Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle>Primary Assessment - ABCDE</CardTitle>
                  <CardDescription>Complete the structured primary survey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* A - Airway */}
                    <div className="border-b border-slate-200 pb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">A - Airway</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="airway-status">Status</Label>
                          <select
                            id="airway-status"
                            data-testid="select-airway-status"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            value={formData.primary_assessment.airway_status}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_status', e.target.value)}
                          >
                            <option value="Patent">Patent</option>
                            <option value="Threatened">Threatened</option>
                            <option value="Compromised">Compromised</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Interventions</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['Positioning', 'Suction', 'OPA', 'NPA', 'Intubation', 'Supraglottic', 'Cricothyrotomy'].map(item => (
                              <div key={item} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`airway-${item}`}
                                  checked={formData.primary_assessment.airway_interventions.includes(item)}
                                  onCheckedChange={() => toggleArrayField('primary_assessment', 'airway_interventions', item)}
                                />
                                <Label htmlFor={`airway-${item}`} className="text-sm">{item}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* B - Breathing */}
                    <div className="border-b border-slate-200 pb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">B - Breathing</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="breathing-rr">RR (bpm)</Label>
                          <Input
                            id="breathing-rr"
                            data-testid="input-breathing-rr"
                            type="number"
                            value={formData.primary_assessment.breathing_rr || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_rr', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-spo2">SpO2 (%)</Label>
                          <Input
                            id="breathing-spo2"
                            data-testid="input-breathing-spo2"
                            type="number"
                            value={formData.primary_assessment.breathing_spo2 || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_spo2', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="breathing-work">Work of Breathing</Label>
                          <select
                            id="breathing-work"
                            data-testid="select-breathing-work"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            value={formData.primary_assessment.breathing_work}
                            onChange={(e) => updateNestedField('primary_assessment', 'breathing_work', e.target.value)}
                          >
                            <option value="Normal">Normal</option>
                            <option value="Mild ↑">Mild ↑</option>
                            <option value="Moderate ↑">Moderate ↑</option>
                            <option value="Severe ↑">Severe ↑</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* C - Circulation */}
                    <div className="border-b border-slate-200 pb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">C - Circulation</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="circulation-hr">HR (bpm)</Label>
                          <Input
                            id="circulation-hr"
                            data-testid="input-circulation-hr"
                            type="number"
                            value={formData.primary_assessment.circulation_hr || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_hr', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-bp-systolic">BP Systolic</Label>
                          <Input
                            id="circulation-bp-systolic"
                            data-testid="input-circulation-bp-systolic"
                            type="number"
                            value={formData.primary_assessment.circulation_bp_systolic || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_bp_systolic', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-bp-diastolic">BP Diastolic</Label>
                          <Input
                            id="circulation-bp-diastolic"
                            data-testid="input-circulation-bp-diastolic"
                            type="number"
                            value={formData.primary_assessment.circulation_bp_diastolic || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_bp_diastolic', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="circulation-crt">CRT (seconds)</Label>
                          <Input
                            id="circulation-crt"
                            data-testid="input-circulation-crt"
                            type="number"
                            step="0.1"
                            value={formData.primary_assessment.circulation_crt || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'circulation_crt', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* D - Disability */}
                    <div className="border-b border-slate-200 pb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">D - Disability</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="disability-avpu">AVPU</Label>
                          <select
                            id="disability-avpu"
                            data-testid="select-disability-avpu"
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            value={formData.primary_assessment.disability_avpu}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_avpu', e.target.value)}
                          >
                            <option value="A">Alert</option>
                            <option value="V">Voice</option>
                            <option value="P">Pain</option>
                            <option value="U">Unresponsive</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-gcs-e">GCS Eye</Label>
                          <Input
                            id="disability-gcs-e"
                            data-testid="input-disability-gcs-e"
                            type="number"
                            min="1"
                            max="4"
                            value={formData.primary_assessment.disability_gcs_e || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_e', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-gcs-v">GCS Verbal</Label>
                          <Input
                            id="disability-gcs-v"
                            data-testid="input-disability-gcs-v"
                            type="number"
                            min="1"
                            max="5"
                            value={formData.primary_assessment.disability_gcs_v || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_v', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disability-gcs-m">GCS Motor</Label>
                          <Input
                            id="disability-gcs-m"
                            data-testid="input-disability-gcs-m"
                            type="number"
                            min="1"
                            max="6"
                            value={formData.primary_assessment.disability_gcs_m || ''}
                            onChange={(e) => updateNestedField('primary_assessment', 'disability_gcs_m', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* E - Exposure */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">E - Exposure</h3>
                      <div className="space-y-2">
                        <Label htmlFor="exposure-temperature">Temperature (°C)</Label>
                        <Input
                          id="exposure-temperature"
                          data-testid="input-exposure-temperature"
                          type="number"
                          step="0.1"
                          value={formData.primary_assessment.exposure_temperature || ''}
                          onChange={(e) => updateNestedField('primary_assessment', 'exposure_temperature', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>Past medical history and present illness details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="hpi" className="flex items-center gap-2">
                      History of Present Illness
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        Voice enabled
                      </span>
                    </Label>
                    <VoiceTextarea
                      id="hpi"
                      data-testid="textarea-hpi"
                      value={formData.history.hpi}
                      onChange={(e) => updateNestedField('history', 'hpi', e.target.value)}
                      placeholder="Document the history of present illness..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Past Medical History</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allergies-field">Allergies</Label>
                    <Input
                      id="allergies-field"
                      data-testid="input-allergies"
                      value={formData.history.allergies.join(', ')}
                      onChange={(e) => updateNestedField('history', 'allergies', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="Enter allergies separated by commas"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examination Tab */}
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
                    <Label htmlFor="respiratory-summary">Respiratory System</Label>
                    <textarea
                      id="respiratory-summary"
                      data-testid="textarea-respiratory"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.examination.respiratory_summary}
                      onChange={(e) => updateNestedField('examination', 'respiratory_summary', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvs-summary">Cardiovascular System</Label>
                    <textarea
                      id="cvs-summary"
                      data-testid="textarea-cvs"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.examination.cvs_summary}
                      onChange={(e) => updateNestedField('examination', 'cvs_summary', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="abdomen-summary">Abdomen</Label>
                    <textarea
                      id="abdomen-summary"
                      data-testid="textarea-abdomen"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.examination.abdomen_summary}
                      onChange={(e) => updateNestedField('examination', 'abdomen_summary', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cns-summary">Central Nervous System</Label>
                    <textarea
                      id="cns-summary"
                      data-testid="textarea-cns"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.examination.cns_summary}
                      onChange={(e) => updateNestedField('examination', 'cns_summary', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <div className="space-y-2">
                    <Label>Investigation Panels</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['ER Basic Panel', 'ER Advance Panel', 'NSTEMI Panel', 'STEMI Panel', 'Acute Stroke Panel', 'Pedia Mini Panel', 'Adult Seizure Panel'].map(panel => (
                        <div key={panel} className="flex items-center space-x-2">
                          <Checkbox
                            id={`panel-${panel}`}
                            checked={formData.investigations.panels_selected.includes(panel)}
                            onCheckedChange={() => toggleArrayField('investigations', 'panels_selected', panel)}
                          />
                          <Label htmlFor={`panel-${panel}`} className="text-sm">{panel}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="results-notes">Investigation Results & Notes</Label>
                    <textarea
                      id="results-notes"
                      data-testid="textarea-results-notes"
                      className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.investigations.results_notes}
                      onChange={(e) => updateNestedField('investigations', 'results_notes', e.target.value)}
                      placeholder="Document key investigation findings..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment Tab */}
          <TabsContent value="treatment">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Treatment in ER</CardTitle>
                  <CardDescription>Document interventions and medications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Interventions</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Oxygen', 'Nebulisation', 'Antiplatelets', 'Anticoagulant', 'Thrombolysis', 'Antibiotics', 'Analgesics', 'Antiemetics', 'Anticonvulsants', 'IV Fluids', 'Vasopressors'].map(item => (
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

                    <div className="space-y-2">
                      <Label htmlFor="intervention-notes">Treatment Notes</Label>
                      <textarea
                        id="intervention-notes"
                        data-testid="textarea-intervention-notes"
                        className="flex min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.treatment.intervention_notes}
                        onChange={(e) => updateNestedField('treatment', 'intervention_notes', e.target.value)}
                        placeholder="Detailed treatment plan, medications, dosages..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provisional-diagnoses">Provisional Diagnosis</Label>
                      <Input
                        id="provisional-diagnoses"
                        data-testid="input-provisional-diagnoses"
                        value={formData.treatment.provisional_diagnoses.join(', ')}
                        onChange={(e) => updateNestedField('treatment', 'provisional_diagnoses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="Enter diagnoses separated by commas"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="differential-diagnoses">Differential Diagnoses</Label>
                      <Input
                        id="differential-diagnoses"
                        data-testid="input-differential-diagnoses"
                        value={formData.treatment.differential_diagnoses.join(', ')}
                        onChange={(e) => updateNestedField('treatment', 'differential_diagnoses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="Enter differential diagnoses separated by commas"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Disposition */}
              <Card>
                <CardHeader>
                  <CardTitle>Disposition</CardTitle>
                  <CardDescription>Final disposition and discharge planning</CardDescription>
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
                        <option value="admitted-icu">Admitted - ICU</option>
                        <option value="admitted-hdu">Admitted - HDU</option>
                        <option value="admitted-ward">Admitted - Ward</option>
                        <option value="referred">Referred</option>
                        <option value="dama">DAMA</option>
                        <option value="death">Death in ER</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition-at-discharge">Condition at Discharge</Label>
                      <select
                        id="condition-at-discharge"
                        data-testid="select-condition-discharge"
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.disposition.condition_at_discharge}
                        onChange={(e) => updateNestedField('disposition', 'condition_at_discharge', e.target.value)}
                      >
                        <option value="Stable">Stable</option>
                        <option value="Unstable">Unstable</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disposition-advice">Follow-up Advice</Label>
                      <textarea
                        id="disposition-advice"
                        data-testid="textarea-disposition-advice"
                        className="flex min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={formData.disposition.advice}
                        onChange={(e) => updateNestedField('disposition', 'advice', e.target.value)}
                        placeholder="Follow-up instructions, medications, precautions..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
