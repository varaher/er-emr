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

          {/* Continue in next message due to length... */}
          
        </Tabs>
      </main>
    </div>
  );
}
