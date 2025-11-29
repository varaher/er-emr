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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { VoiceTextInput, VoiceTextarea } from '@/components/VoiceTextInput';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, AlertCircle, Mic, Database, Clock, FileText } from 'lucide-react';

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
      airway_additional_notes: '',
      breathing_rr: null,
      breathing_spo2: null,
      breathing_oxygen_device: 'Room air',
      breathing_oxygen_flow: null,
      breathing_work: 'Normal',
      breathing_air_entry: [],
      breathing_adjuncts: [],
      breathing_notes: '',
      breathing_additional_notes: '',
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
      circulation_additional_notes: '',
      disability_avpu: 'A',
      disability_gcs_e: null,
      disability_gcs_v: null,
      disability_gcs_m: null,
      disability_pupils_size: 'Equal',
      disability_pupils_reaction: 'Brisk',
      disability_grbs: null,
      disability_seizure: false,
      disability_notes: '',
      disability_additional_notes: '',
      exposure_temperature: null,
      exposure_logroll_findings: [],
      exposure_local_exam_notes: '',
      exposure_additional_notes: '',
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
              <Button 
                onClick={handleSave} 
                disabled={loading}
                data-testid="save-case-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Case'}
              </Button>
              {id && id !== 'new' && (
                <Button 
                  onClick={() => setShowSaveModal(true)} 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="save-to-emr-button"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Save to EMR
                </Button>
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
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Powered by OpenAI GPT-5.1 • Always verify AI suggestions
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banners */}
        <div className="mb-6 space-y-3">
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
                        <div className="space-y-2">
                          <Label htmlFor="airway-additional-notes" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Additional Notes
                          </Label>
                          <VoiceTextarea
                            id="airway-additional-notes"
                            data-testid="textarea-airway-additional-notes"
                            value={formData.primary_assessment.airway_additional_notes}
                            onChange={(e) => updateNestedField('primary_assessment', 'airway_additional_notes', e.target.value)}
                            placeholder="Additional observations for Airway..."
                            rows={2}
                          />
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
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="breathing-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="breathing-additional-notes"
                          data-testid="textarea-breathing-additional-notes"
                          value={formData.primary_assessment.breathing_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'breathing_additional_notes', e.target.value)}
                          placeholder="Additional observations for Breathing..."
                          rows={2}
                        />
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
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="circulation-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="circulation-additional-notes"
                          data-testid="textarea-circulation-additional-notes"
                          value={formData.primary_assessment.circulation_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'circulation_additional_notes', e.target.value)}
                          placeholder="Additional observations for Circulation..."
                          rows={2}
                        />
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
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="disability-additional-notes" className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          Additional Notes
                        </Label>
                        <VoiceTextarea
                          id="disability-additional-notes"
                          data-testid="textarea-disability-additional-notes"
                          value={formData.primary_assessment.disability_additional_notes}
                          onChange={(e) => updateNestedField('primary_assessment', 'disability_additional_notes', e.target.value)}
                          placeholder="Additional observations for Disability..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* E - Exposure */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">E - Exposure</h3>
                      <div className="space-y-4">
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

                        <div className="space-y-2">
                          <Label htmlFor="exposure-additional-notes" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            Additional Notes
                          </Label>
                          <VoiceTextarea
                            id="exposure-additional-notes"
                            data-testid="textarea-exposure-additional-notes"
                            value={formData.primary_assessment.exposure_additional_notes}
                            onChange={(e) => updateNestedField('primary_assessment', 'exposure_additional_notes', e.target.value)}
                            placeholder="Additional observations for Exposure..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Adjuvants to Primary Assessment */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 border-t pt-4">Adjuvants to Primary Assessment</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="ecg-findings" className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-blue-600" />
                            ECG Findings
                          </Label>
                          <VoiceTextarea
                            id="ecg-findings"
                            data-testid="textarea-ecg-findings"
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
                            data-testid="textarea-bedside-echo-findings"
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
                            data-testid="textarea-adjuvants-additional-notes"
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
                    <Label htmlFor="hpi-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      HPI Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="hpi-additional-notes"
                      data-testid="textarea-hpi-additional-notes"
                      value={formData.history.hpi_additional_notes}
                      onChange={(e) => updateNestedField('history', 'hpi_additional_notes', e.target.value)}
                      placeholder="Additional observations for HPI..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signs-symptoms" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Signs and Symptoms
                    </Label>
                    <VoiceTextarea
                      id="signs-symptoms"
                      data-testid="textarea-signs-symptoms"
                      value={formData.history.signs_and_symptoms}
                      onChange={(e) => updateNestedField('history', 'signs_and_symptoms', e.target.value)}
                      placeholder="Document signs and symptoms observed..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-survey-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Secondary Survey Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="secondary-survey-additional-notes"
                      data-testid="textarea-secondary-survey-additional-notes"
                      value={formData.history.secondary_survey_additional_notes}
                      onChange={(e) => updateNestedField('history', 'secondary_survey_additional_notes', e.target.value)}
                      placeholder="Additional observations from secondary survey..."
                      rows={2}
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
                    <Label htmlFor="past-medical-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Past Medical History - Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="past-medical-additional-notes"
                      data-testid="textarea-past-medical-additional-notes"
                      value={formData.history.past_medical_additional_notes}
                      onChange={(e) => updateNestedField('history', 'past_medical_additional_notes', e.target.value)}
                      placeholder="Additional details about past medical history..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="past-surgical" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Surgical History
                    </Label>
                    <VoiceTextarea
                      id="past-surgical"
                      data-testid="textarea-past-surgical"
                      value={formData.history.past_surgical}
                      onChange={(e) => updateNestedField('history', 'past_surgical', e.target.value)}
                      placeholder="Document past surgical history..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="past-surgical-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Surgical History - Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="past-surgical-additional-notes"
                      data-testid="textarea-past-surgical-additional-notes"
                      value={formData.history.past_surgical_additional_notes}
                      onChange={(e) => updateNestedField('history', 'past_surgical_additional_notes', e.target.value)}
                      placeholder="Additional details about surgical history..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="family-gyn-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Family / Gynae History
                    </Label>
                    <VoiceTextarea
                      id="family-gyn-additional-notes"
                      data-testid="textarea-family-gyn-additional-notes"
                      value={formData.history.family_gyn_additional_notes}
                      onChange={(e) => updateNestedField('history', 'family_gyn_additional_notes', e.target.value)}
                      placeholder="Document family history and gynecological history (LMP, etc.)..."
                      rows={2}
                    />
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

                  <div className="space-y-2">
                    <Label htmlFor="allergies-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Allergies - Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="allergies-additional-notes"
                      data-testid="textarea-allergies-additional-notes"
                      value={formData.history.allergies_additional_notes}
                      onChange={(e) => updateNestedField('history', 'allergies_additional_notes', e.target.value)}
                      placeholder="Additional details about allergies..."
                      rows={2}
                    />
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
                    <Label htmlFor="general-additional-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      General Examination - Additional Notes
                    </Label>
                    <VoiceTextarea
                      id="general-additional-notes"
                      data-testid="textarea-general-additional-notes"
                      value={formData.examination.general_additional_notes}
                      onChange={(e) => updateNestedField('examination', 'general_additional_notes', e.target.value)}
                      placeholder="Additional observations for general examination..."
                      rows={2}
                    />
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
                      }).map(([panel, tests]) => (
                        <div key={panel} className={`border rounded-lg p-3 ${formData.investigations.panels_selected.includes(panel) ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id={`panel-${panel}`}
                              checked={formData.investigations.panels_selected.includes(panel)}
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
                            </div>
                          </div>
                        </div>
                      ))}
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
                      <Label htmlFor="intervention-notes" className="flex items-center gap-2">
                        Treatment Notes
                        <Mic className="h-3 w-3 text-slate-400" />
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

                    <div className="space-y-2">
                      <Label htmlFor="provisional-diagnoses">Provisional Diagnosis</Label>
                      <Input
                        id="provisional-diagnoses"
                        data-testid="input-provisional-diagnoses"
                        value={formData.treatment.provisional_diagnoses.join(', ')}
                        onChange={(e) => updateNestedField('treatment', 'provisional_diagnoses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="Enter provisional diagnoses separated by commas"
                      />
                      <p className="text-xs text-slate-500">
                        💡 Differential diagnoses will be documented in the discharge summary
                      </p>
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
                        <option value="observation">Observation in ER</option>
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
                  </div>
                </CardContent>
              </Card>

              {/* Prepare Discharge Summary Section */}
              {id && id !== 'new' && (
                <Card className="border-2 border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <FileText className="h-5 w-5" />
                      Prepare Discharge Summary
                    </CardTitle>
                    <CardDescription>
                      Review and complete the discharge summary. All case sheet data is auto-filled. 
                      Complete the treatment details and follow-up advice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button 
                        onClick={() => navigate(`/discharge/${id}`)}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700"
                        data-testid="prepare-discharge-button"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Open Discharge Summary Editor
                      </Button>
                      
                      <div className="p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Discharge Summary Will Include:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Patient demographics</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Vitals at arrival</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Presenting complaint</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>History & examination</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Investigation results</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Provisional diagnosis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span className="text-amber-700 font-medium">Treatment given (You will fill)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span className="text-amber-700 font-medium">Follow-up advice (You will fill)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span className="text-amber-700 font-medium">Differential diagnoses (You will add)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
