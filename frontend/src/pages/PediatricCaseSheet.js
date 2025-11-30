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
import { ArrowLeft, Save, AlertCircle, Mic, Download, FileText, Baby } from 'lucide-react';

export default function PediatricCaseSheet() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  
  // Get triage data from navigation state
  const triageData = location.state || {};

  // Tab navigation
  const tabs = ['patient', 'pat', 'abcde', 'sample', 'examination', 'investigations', 'treatment'];
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

  const [formData, setFormData] = useState({
    case_type: 'pediatric',
    patient: {
      uhid: '',
      name: '',
      age: '',
      age_unit: 'months', // years, months, days
      sex: 'Male',
      weight: '',
      height: '',
      phone: '',
      address: '',
      arrival_datetime: new Date().toISOString().slice(0, 16),
      mode_of_arrival: 'Walk-in',
      accident_datetime: '',
      place_of_accident: '',
      nature_of_accident: [],
      mechanism_of_injury: [],
      brought_by: 'Parents',
      informant_name: '',
      informant_reliability: 'Good',
      identification_mark: ''
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
      onset_type: 'Sudden'
    },
    // Pediatric Assessment Triangle (PAT)
    pat: {
      appearance_tone: '',
      appearance_interactivity: '',
      appearance_consolability: '',
      appearance_look_gaze: '',
      appearance_speech_cry: '',
      work_of_breathing: '',
      circulation_to_skin: ''
    },
    // Pediatric ABCDE
    abcde: {
      airway_cry: 'Good',
      airway_status: 'Patent',
      airway_intervention: '',
      breathing_rr: '',
      breathing_spo2: '',
      breathing_wob: [],
      breathing_abnormal_positioning: 'No',
      breathing_positioning_details: '',
      breathing_air_entry: 'Normal',
      breathing_subcutaneous_emphysema: 'No',
      breathing_intervention: '',
      circulation_crt: 'Normal',
      circulation_hr: '',
      circulation_bp: '',
      circulation_skin_color: 'Pink',
      circulation_distended_neck_veins: 'No',
      circulation_intervention: '',
      disability_avpu_gcs: 'Alert',
      disability_pupils: 'Equal, round, reactive',
      disability_abnormal_responses: '',
      disability_glucose: '',
      exposure_temperature: '',
      exposure_trauma: '',
      exposure_signs: [],
      exposure_long_bone_deformities: 'No',
      exposure_extremities_findings: '',
      efast_heart: '',
      efast_abdomen: '',
      efast_lungs: '',
      efast_pelvis: ''
    },
    // SAMPLE History
    sample: {
      signs_symptoms: '',
      allergies: [],
      allergies_details: '',
      medications: '',
      medications_last_dose: '',
      medications_environment: '',
      past_medical_history: '',
      past_medical_premature: 'No',
      past_medical_illnesses: [],
      past_surgeries: '',
      immunization_status: '',
      last_meal_time: '',
      last_meal_type: '',
      events_hopi: ''
    },
    // Physical Examination
    examination: {
      heent: '',
      respiratory: '',
      cardiovascular: '',
      abdomen: '',
      back: '',
      extremities: ''
    },
    // Investigations
    investigations: {
      panels_selected: [],
      results_notes: ''
    },
    // Treatment
    treatment: {
      interventions: [],
      intervention_notes: '',
      differential_diagnoses: [],
      course_in_hospital: ''
    },
    // Disposition
    disposition: {
      type: 'Discharge',
      condition_at_discharge: 'Stable'
    },
    em_resident: '',
    em_consultant: ''
  });

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
      const array = prev[section][field] || [];
      const newArray = array.includes(value)
        ? array.filter(item => item !== value)
        : [...array, value];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (id && id !== 'new') {
        await api.put(`/cases/${id}`, formData);
        toast.success('Pediatric case updated successfully');
      } else {
        const response = await api.post('/cases', formData);
        navigate(`/case-pediatric/${response.data.id}`);
        toast.success('Pediatric case created successfully');
      }
    } catch (error) {
      toast.error('Failed to save case');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Baby className="h-6 w-6 text-blue-600" />
                  {id === 'new' ? 'New Pediatric Case Sheet' : 'Edit Pediatric Case Sheet'}
                </h1>
                <p className="text-sm text-slate-600">Pediatric Emergency Department Documentation</p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Case'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full mb-6">
            <TabsTrigger value="patient">Patient Info</TabsTrigger>
            <TabsTrigger value="pat">PAT</TabsTrigger>
            <TabsTrigger value="abcde">ABCDE</TabsTrigger>
            <TabsTrigger value="sample">SAMPLE</TabsTrigger>
            <TabsTrigger value="examination">Examination</TabsTrigger>
            <TabsTrigger value="investigations">Investigations</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
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
                    <Label htmlFor="uhid">UHID / MR Number</Label>
                    <Input
                      id="uhid"
                      value={formData.patient.uhid}
                      onChange={(e) => updateNestedField('patient', 'uhid', e.target.value)}
                      placeholder="Hospital ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Patient Name *</Label>
                    <Input
                      id="name"
                      value={formData.patient.name}
                      onChange={(e) => updateNestedField('patient', 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="age"
                        type="number"
                        value={formData.patient.age}
                        onChange={(e) => updateNestedField('patient', 'age', e.target.value)}
                        placeholder="Age"
                        className="flex-1"
                      />
                      <select
                        className="flex h-10 w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.patient.age_unit}
                        onChange={(e) => updateNestedField('patient', 'age_unit', e.target.value)}
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <select
                      id="sex"
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formData.patient.sex}
                      onChange={(e) => updateNestedField('patient', 'sex', e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.patient.weight}
                      onChange={(e) => updateNestedField('patient', 'weight', e.target.value)}
                      placeholder="Weight in kg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={formData.patient.height}
                      onChange={(e) => updateNestedField('patient', 'height', e.target.value)}
                      placeholder="Height in cm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Number</Label>
                    <Input
                      id="phone"
                      value={formData.patient.phone}
                      onChange={(e) => updateNestedField('patient', 'phone', e.target.value)}
                      placeholder="Parent/Guardian contact"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.patient.address}
                      onChange={(e) => updateNestedField('patient', 'address', e.target.value)}
                      placeholder="Residential address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival-datetime">Date & Time of Arrival</Label>
                    <Input
                      id="arrival-datetime"
                      type="datetime-local"
                      value={formData.patient.arrival_datetime}
                      onChange={(e) => updateNestedField('patient', 'arrival_datetime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brought-by">Brought By</Label>
                    <select
                      id="brought-by"
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formData.patient.brought_by}
                      onChange={(e) => updateNestedField('patient', 'brought_by', e.target.value)}
                    >
                      <option value="Parents">Parents</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Relative">Relative</option>
                      <option value="Ambulance">Ambulance</option>
                      <option value="Police">Police</option>
                      <option value="School">School Staff</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="informant">Informant Name</Label>
                    <Input
                      id="informant"
                      value={formData.patient.informant_name}
                      onChange={(e) => updateNestedField('patient', 'informant_name', e.target.value)}
                      placeholder="Person providing history"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identification-mark">Identification Mark</Label>
                    <Input
                      id="identification-mark"
                      value={formData.patient.identification_mark}
                      onChange={(e) => updateNestedField('patient', 'identification_mark', e.target.value)}
                      placeholder="e.g., Mole on left cheek"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Presenting Complaint</h3>
                  <div className="space-y-2">
                    <Label htmlFor="complaint" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Chief Complaint
                    </Label>
                    <VoiceTextarea
                      id="complaint"
                      value={formData.presenting_complaint.text}
                      onChange={(e) => updateNestedField('presenting_complaint', 'text', e.target.value)}
                      placeholder="Main reason for visit..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={formData.presenting_complaint.duration}
                        onChange={(e) => updateNestedField('presenting_complaint', 'duration', e.target.value)}
                        placeholder="e.g., 2 hours, 3 days"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="onset">Onset</Label>
                      <select
                        id="onset"
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.presenting_complaint.onset_type}
                        onChange={(e) => updateNestedField('presenting_complaint', 'onset_type', e.target.value)}
                      >
                        <option value="Sudden">Sudden</option>
                        <option value="Gradual">Gradual</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" disabled>
                ← Back
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: PAT Assessment →
              </Button>
            </div>
          </TabsContent>

          {/* PAT (Pediatric Assessment Triangle) Tab */}
          <TabsContent value="pat">
            <Card>
              <CardHeader>
                <CardTitle>Pediatric Assessment Triangle (PAT)</CardTitle>
                <CardDescription>First impression - visual assessment without touching the child</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Appearance */}
                  <div className="p-4 border-l-4 border-blue-400 bg-blue-50 space-y-4">
                    <h3 className="text-lg font-bold text-blue-900">Appearance</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pat-tone" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Tone (muscle tone and movement)
                      </Label>
                      <VoiceTextarea
                        id="pat-tone"
                        value={formData.pat.appearance_tone}
                        onChange={(e) => updateNestedField('pat', 'appearance_tone', e.target.value)}
                        placeholder="Moves spontaneously, resists examination, sits or stands..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pat-interactivity" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Interactivity
                      </Label>
                      <VoiceTextarea
                        id="pat-interactivity"
                        value={formData.pat.appearance_interactivity}
                        onChange={(e) => updateNestedField('pat', 'appearance_interactivity', e.target.value)}
                        placeholder="Alert, engaged with clinician, interacts with people, reaches for objects..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pat-consolability" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Consolability
                      </Label>
                      <VoiceTextarea
                        id="pat-consolability"
                        value={formData.pat.appearance_consolability}
                        onChange={(e) => updateNestedField('pat', 'appearance_consolability', e.target.value)}
                        placeholder="Stops crying with holding or comforting by caregiver..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pat-look" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Look / Gaze
                      </Label>
                      <VoiceTextarea
                        id="pat-look"
                        value={formData.pat.appearance_look_gaze}
                        onChange={(e) => updateNestedField('pat', 'appearance_look_gaze', e.target.value)}
                        placeholder="Makes eye contact, tracks visually, normal/abnormal behavior..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pat-speech" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Speech / Cry
                      </Label>
                      <VoiceTextarea
                        id="pat-speech"
                        value={formData.pat.appearance_speech_cry}
                        onChange={(e) => updateNestedField('pat', 'appearance_speech_cry', e.target.value)}
                        placeholder="Age-appropriate speech or cry quality..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Work of Breathing */}
                  <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 space-y-2">
                    <h3 className="text-lg font-bold text-yellow-900">Work of Breathing</h3>
                    <VoiceTextarea
                      value={formData.pat.work_of_breathing}
                      onChange={(e) => updateNestedField('pat', 'work_of_breathing', e.target.value)}
                      placeholder="Assess respiratory rate, effort, abnormal sounds (stridor, wheezing, grunting)..."
                      rows={3}
                    />
                  </div>

                  {/* Circulation to Skin */}
                  <div className="p-4 border-l-4 border-red-400 bg-red-50 space-y-2">
                    <h3 className="text-lg font-bold text-red-900">Circulation to Skin</h3>
                    <VoiceTextarea
                      value={formData.pat.circulation_to_skin}
                      onChange={(e) => updateNestedField('pat', 'circulation_to_skin', e.target.value)}
                      placeholder="Skin color (pink, pale, cyanotic, mottled), capillary refill..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Patient Info
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: ABCDE Assessment →
              </Button>
            </div>
          </TabsContent>

          {/* ABCDE Tab - Pediatric Primary Assessment */}
          <TabsContent value="abcde">
            <div className="space-y-6">
              {/* Airway */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-700">A - Airway</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cry Quality</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.abcde.airway_cry}
                        onChange={(e) => updateNestedField('abcde', 'airway_cry', e.target.value)}
                      >
                        <option value="Good">Good</option>
                        <option value="Weak">Weak</option>
                        <option value="No Cry">No Cry</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Airway Status</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.abcde.airway_status}
                        onChange={(e) => updateNestedField('abcde', 'airway_status', e.target.value)}
                      >
                        <option value="Patent">Patent</option>
                        <option value="Threatened">Threatened</option>
                        <option value="Compromised">Compromised</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Intervention
                    </Label>
                    <VoiceTextarea
                      value={formData.abcde.airway_intervention}
                      onChange={(e) => updateNestedField('abcde', 'airway_intervention', e.target.value)}
                      placeholder="e.g., airway clearance, repositioning, intubation"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Breathing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-700">B - Breathing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Respiratory Rate (RR)</Label>
                      <Input
                        type="number"
                        value={formData.abcde.breathing_rr}
                        onChange={(e) => updateNestedField('abcde', 'breathing_rr', e.target.value)}
                        placeholder="/min"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>SpO2 (%)</Label>
                      <Input
                        type="number"
                        value={formData.abcde.breathing_spo2}
                        onChange={(e) => updateNestedField('abcde', 'breathing_spo2', e.target.value)}
                        placeholder="%"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Work of Breathing (WOB)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['Nasal flaring', 'Retractions', 'Grunting', 'Wheezing', 'Stridor', 'Snoring', 'Gurgling'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`wob-${item}`}
                            checked={formData.abcde.breathing_wob.includes(item)}
                            onCheckedChange={() => toggleArrayField('abcde', 'breathing_wob', item)}
                          />
                          <Label htmlFor={`wob-${item}`} className="text-sm">{item}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Abnormal Positioning</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.abcde.breathing_abnormal_positioning}
                        onChange={(e) => updateNestedField('abcde', 'breathing_abnormal_positioning', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {formData.abcde.breathing_abnormal_positioning === 'Yes' && (
                      <div className="space-y-2">
                        <Label>Position Details</Label>
                        <Input
                          value={formData.abcde.breathing_positioning_details}
                          onChange={(e) => updateNestedField('abcde', 'breathing_positioning_details', e.target.value)}
                          placeholder="Tripod, sniffing, seated..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Intervention
                    </Label>
                    <VoiceTextarea
                      value={formData.abcde.breathing_intervention}
                      onChange={(e) => updateNestedField('abcde', 'breathing_intervention', e.target.value)}
                      placeholder="e.g., oxygen administration, CPAP, intubation"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Circulation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-pink-700">C - Circulation of Skin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Capillary Refill Time (CRT)</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.abcde.circulation_crt}
                        onChange={(e) => updateNestedField('abcde', 'circulation_crt', e.target.value)}
                      >
                        <option value="Normal">&lt; 2 seconds (Normal)</option>
                        <option value="Delayed">&gt; 2 seconds (Delayed)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Heart Rate (HR)</Label>
                      <Input
                        type="number"
                        value={formData.abcde.circulation_hr}
                        onChange={(e) => updateNestedField('abcde', 'circulation_hr', e.target.value)}
                        placeholder="bpm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Blood Pressure (BP)</Label>
                      <Input
                        value={formData.abcde.circulation_bp}
                        onChange={(e) => updateNestedField('abcde', 'circulation_bp', e.target.value)}
                        placeholder="Systolic/Diastolic"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Skin Color & Temperature</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formData.abcde.circulation_skin_color}
                      onChange={(e) => updateNestedField('abcde', 'circulation_skin_color', e.target.value)}
                    >
                      <option value="Pink">Pink</option>
                      <option value="Pale">Pale</option>
                      <option value="Cyanosed">Cyanosed</option>
                      <option value="Mottled">Mottled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Intervention
                    </Label>
                    <VoiceTextarea
                      value={formData.abcde.circulation_intervention}
                      onChange={(e) => updateNestedField('abcde', 'circulation_intervention', e.target.value)}
                      placeholder="e.g., IV fluids, medications"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Disability */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-700">D - Disability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AVPU / GCS</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={formData.abcde.disability_avpu_gcs}
                        onChange={(e) => updateNestedField('abcde', 'disability_avpu_gcs', e.target.value)}
                      >
                        <option value="Alert">Alert</option>
                        <option value="Verbal">Responds to Verbal</option>
                        <option value="Pain">Responds to Pain</option>
                        <option value="Unresponsive">Unresponsive</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Glucose (GRBS)</Label>
                      <Input
                        type="number"
                        value={formData.abcde.disability_glucose}
                        onChange={(e) => updateNestedField('abcde', 'disability_glucose', e.target.value)}
                        placeholder="mg/dL"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pupils: Size and Response</Label>
                    <Input
                      value={formData.abcde.disability_pupils}
                      onChange={(e) => updateNestedField('abcde', 'disability_pupils', e.target.value)}
                      placeholder="e.g., Equal, round, reactive to light"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Abnormal Responses
                    </Label>
                    <VoiceTextarea
                      value={formData.abcde.disability_abnormal_responses}
                      onChange={(e) => updateNestedField('abcde', 'disability_abnormal_responses', e.target.value)}
                      placeholder="Pinpoint, dilated, unilaterally dilated..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Exposure */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-teal-700">E - Exposure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Temperature (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.abcde.exposure_temperature}
                        onChange={(e) => updateNestedField('abcde', 'exposure_temperature', e.target.value)}
                        placeholder="Body temperature"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Signs of Trauma or Illness</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Rashes', 'Petechiae', 'Ecchymosis', 'Bruises', 'Burns'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sign-${item}`}
                            checked={formData.abcde.exposure_signs.includes(item)}
                            onCheckedChange={() => toggleArrayField('abcde', 'exposure_signs', item)}
                          />
                          <Label htmlFor={`sign-${item}`} className="text-sm">{item}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Extremities Findings
                    </Label>
                    <VoiceTextarea
                      value={formData.abcde.exposure_extremities_findings}
                      onChange={(e) => updateNestedField('abcde', 'exposure_extremities_findings', e.target.value)}
                      placeholder="Check for deformities, bruising, tenderness..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* EFAST */}
              <Card>
                <CardHeader>
                  <CardTitle>Adjunct: EFAST (If Trauma Suspected)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Heart</Label>
                      <Input
                        value={formData.abcde.efast_heart}
                        onChange={(e) => updateNestedField('abcde', 'efast_heart', e.target.value)}
                        placeholder="Pericardial effusion?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Abdomen</Label>
                      <Input
                        value={formData.abcde.efast_abdomen}
                        onChange={(e) => updateNestedField('abcde', 'efast_abdomen', e.target.value)}
                        placeholder="Free fluid?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lungs</Label>
                      <Input
                        value={formData.abcde.efast_lungs}
                        onChange={(e) => updateNestedField('abcde', 'efast_lungs', e.target.value)}
                        placeholder="Pleural effusion/pneumothorax?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pelvis</Label>
                      <Input
                        value={formData.abcde.efast_pelvis}
                        onChange={(e) => updateNestedField('abcde', 'efast_pelvis', e.target.value)}
                        placeholder="Pelvic fractures?"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: PAT
              </Button>
              <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">
                Next: SAMPLE History →
              </Button>
            </div>
          </TabsContent>

          {/* SAMPLE Tab */}
          <TabsContent value="sample">
            <Card>
              <CardHeader>
                <CardTitle>SAMPLE History</CardTitle>
                <CardDescription>Comprehensive pediatric history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* S - Signs and Symptoms */}
                  <div className="p-4 border-l-4 border-red-400 bg-red-50 space-y-2">
                    <Label className="text-lg font-bold text-red-900">S - Signs and Symptoms</Label>
                    <VoiceTextarea
                      value={formData.sample.signs_symptoms}
                      onChange={(e) => updateNestedField('sample', 'signs_symptoms', e.target.value)}
                      placeholder="Breathing difficulty, fever, vomiting, diarrhea, irritability..."
                      rows={4}
                    />
                  </div>

                  {/* A - Allergies */}
                  <div className="p-4 border-l-4 border-orange-400 bg-orange-50 space-y-3">
                    <Label className="text-lg font-bold text-orange-900">A - Allergies</Label>
                    <div className="space-y-2">
                      <Label>Known Allergies (comma separated)</Label>
                      <Input
                        value={formData.sample.allergies.join(', ')}
                        onChange={(e) => updateNestedField('sample', 'allergies', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="Medications, foods, latex..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Allergy Details & Reactions
                      </Label>
                      <VoiceTextarea
                        value={formData.sample.allergies_details}
                        onChange={(e) => updateNestedField('sample', 'allergies_details', e.target.value)}
                        placeholder="Describe reactions, severity..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* M - Medications */}
                  <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 space-y-3">
                    <Label className="text-lg font-bold text-yellow-900">M - Medications</Label>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Current Medications
                      </Label>
                      <VoiceTextarea
                        value={formData.sample.medications}
                        onChange={(e) => updateNestedField('sample', 'medications', e.target.value)}
                        placeholder="Include over-the-counter drugs, vitamins, inhalers..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Dose and Time</Label>
                      <Input
                        value={formData.sample.medications_last_dose}
                        onChange={(e) => updateNestedField('sample', 'medications_last_dose', e.target.value)}
                        placeholder="e.g., Paracetamol 250mg at 10:00 AM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Medications Found in Environment</Label>
                      <Input
                        value={formData.sample.medications_environment}
                        onChange={(e) => updateNestedField('sample', 'medications_environment', e.target.value)}
                        placeholder="Any medications child may have accessed"
                      />
                    </div>
                  </div>

                  {/* P - Past History */}
                  <div className="p-4 border-l-4 border-green-400 bg-green-50 space-y-4">
                    <Label className="text-lg font-bold text-green-900">P - Past Medical History</Label>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Health History
                      </Label>
                      <VoiceTextarea
                        value={formData.sample.past_medical_history}
                        onChange={(e) => updateNestedField('sample', 'past_medical_history', e.target.value)}
                        placeholder="Premature birth, significant illnesses, hospitalizations, underlying conditions (asthma, diabetes, heart disease)..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Past Surgeries
                      </Label>
                      <VoiceTextarea
                        value={formData.sample.past_surgeries}
                        onChange={(e) => updateNestedField('sample', 'past_surgeries', e.target.value)}
                        placeholder="Previous surgical procedures..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Immunization Status
                      </Label>
                      <VoiceTextarea
                        value={formData.sample.immunization_status}
                        onChange={(e) => updateNestedField('sample', 'immunization_status', e.target.value)}
                        placeholder="Up to date? Missing vaccines? Recent immunizations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* L - Last Meal */}
                  <div className="p-4 border-l-4 border-blue-400 bg-blue-50 space-y-3">
                    <Label className="text-lg font-bold text-blue-900">L - Last Meal</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time of Last Intake</Label>
                        <Input
                          value={formData.sample.last_meal_time}
                          onChange={(e) => updateNestedField('sample', 'last_meal_time', e.target.value)}
                          placeholder="e.g., 2 hours ago"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type (Liquid/Solid)</Label>
                        <Input
                          value={formData.sample.last_meal_type}
                          onChange={(e) => updateNestedField('sample', 'last_meal_type', e.target.value)}
                          placeholder="e.g., Milk, solid food"
                        />
                      </div>
                    </div>
                  </div>

                  {/* E - Events / HOPI */}
                  <div className="p-4 border-l-4 border-purple-400 bg-purple-50 space-y-2">
                    <Label className="text-lg font-bold text-purple-900">E - Events / History of Present Illness</Label>
                    <VoiceTextarea
                      value={formData.sample.events_hopi}
                      onChange={(e) => updateNestedField('sample', 'events_hopi', e.target.value)}
                      placeholder="Timeline of events leading to presentation, treatment provided before arrival..."
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <CardTitle>Focused Physical Examination</CardTitle>
                <CardDescription>System-wise examination findings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="heent" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      HEENT (Head, Eyes, Ears, Nose, Throat)
                    </Label>
                    <VoiceTextarea
                      id="heent"
                      value={formData.examination.heent}
                      onChange={(e) => updateNestedField('examination', 'heent', e.target.value)}
                      placeholder="Inspect head, examine eyes, check ears, examine nose, evaluate throat, palpate thyroid and lymph nodes..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="respiratory" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Respiratory System
                    </Label>
                    <VoiceTextarea
                      id="respiratory"
                      value={formData.examination.respiratory}
                      onChange={(e) => updateNestedField('examination', 'respiratory', e.target.value)}
                      placeholder="Chest examination, abnormal breathing sounds (stridor, wheezing, crackles), nasal obstruction, retractions, chest movement..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardiovascular" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Cardiovascular System
                    </Label>
                    <VoiceTextarea
                      id="cardiovascular"
                      value={formData.examination.cardiovascular}
                      onChange={(e) => updateNestedField('examination', 'cardiovascular', e.target.value)}
                      placeholder="Signs of heart failure (gallop rhythm, crackles, peripheral edema), poor perfusion (cyanosis, feeble pulse, cold extremities, flushed skin)..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="abdomen" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Abdomen
                    </Label>
                    <VoiceTextarea
                      id="abdomen"
                      value={formData.examination.abdomen}
                      onChange={(e) => updateNestedField('examination', 'abdomen', e.target.value)}
                      placeholder="Tenderness, distention, signs of injury, hepatomegaly..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="back" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Back / Spine
                    </Label>
                    <VoiceTextarea
                      id="back"
                      value={formData.examination.back}
                      onChange={(e) => updateNestedField('examination', 'back', e.target.value)}
                      placeholder="Signs of spine or vertebral injury..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extremities" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Extremities
                    </Label>
                    <VoiceTextarea
                      id="extremities"
                      value={formData.examination.extremities}
                      onChange={(e) => updateNestedField('examination', 'extremities', e.target.value)}
                      placeholder="Assess for fractures, swelling, bruising, deformities..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: SAMPLE
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
                <CardDescription>Select investigation panels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Pediatric Investigation Panels</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries({
                        'Pedia Mini Panel': ['CBC', 'Blood Glucose', 'Electrolytes'],
                        'Pedia Febrile Seizure Panel': ['CBC', 'Glucose', 'Electrolytes', 'Calcium', 'Blood Culture'],
                        'Pedia Sepsis Panel': ['CBC', 'CRP', 'Blood Culture', 'Urine Culture', 'Procalcitonin'],
                        'Pedia Dehydration Panel': ['CBC', 'Electrolytes', 'Urea', 'Creatinine', 'Blood Gas'],
                        'Pedia Respiratory Panel': ['CBC', 'CRP', 'Blood Gas', 'Chest X-ray'],
                        'Pedia GI Panel': ['CBC', 'Electrolytes', 'LFT', 'Lipase', 'Stool Culture']
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
                                  {tests.join(', ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="results-notes" className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-blue-600" />
                      Investigation Results & Notes
                    </Label>
                    <VoiceTextarea
                      id="results-notes"
                      value={formData.investigations.results_notes}
                      onChange={(e) => updateNestedField('investigations', 'results_notes', e.target.value)}
                      placeholder="Document key investigation findings..."
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Examination
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
                  <CardDescription>Document interventions and medications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="intervention-notes" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Treatment Given
                      </Label>
                      <VoiceTextarea
                        id="intervention-notes"
                        value={formData.treatment.intervention_notes}
                        onChange={(e) => updateNestedField('treatment', 'intervention_notes', e.target.value)}
                        placeholder="Medications, fluids, oxygen, procedures..."
                        rows={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="course" className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        Course in Hospital
                      </Label>
                      <VoiceTextarea
                        id="course"
                        value={formData.treatment.course_in_hospital}
                        onChange={(e) => updateNestedField('treatment', 'course_in_hospital', e.target.value)}
                        placeholder="Patient's clinical course during hospital stay..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Provisional Diagnosis at Time of Discharge/Shift</Label>
                      <Input
                        value={formData.treatment.differential_diagnoses.join(', ')}
                        onChange={(e) => updateNestedField('treatment', 'differential_diagnoses', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="e.g., Respiratory distress, Dehydration, Sepsis"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disposition</CardTitle>
                  <CardDescription>Patient outcome and disposition</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Disposition</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={formData.disposition.type}
                          onChange={(e) => updateNestedField('disposition', 'type', e.target.value)}
                        >
                          <option value="Discharge">Discharge</option>
                          <option value="ICU">ICU</option>
                          <option value="Ward">Ward</option>
                          <option value="Room">Room</option>
                          <option value="Referral">Referral</option>
                          <option value="DAMA">DAMA (Against Medical Advice)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Condition at Time of Shift</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={formData.disposition.condition_at_discharge}
                          onChange={(e) => updateNestedField('disposition', 'condition_at_discharge', e.target.value)}
                        >
                          <option value="Stable">Stable</option>
                          <option value="Unstable">Unstable</option>
                          <option value="Critical">Critical</option>
                          <option value="Improved">Improved</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="em-resident">EM Resident</Label>
                        <Input
                          id="em-resident"
                          value={formData.em_resident}
                          onChange={(e) => setFormData(prev => ({ ...prev, em_resident: e.target.value }))}
                          placeholder="Resident name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="em-consultant">EM Consultant</Label>
                        <Input
                          id="em-consultant"
                          value={formData.em_consultant}
                          onChange={(e) => setFormData(prev => ({ ...prev, em_consultant: e.target.value }))}
                          placeholder="Consultant name"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousTab}>
                ← Back: Investigations
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="lg">
                <Save className="h-5 w-5 mr-2" />
                Complete & Save Pediatric Case Sheet
              </Button>
            </div>
          </TabsContent>
          
        </Tabs>
      </main>
    </div>
  );
}
