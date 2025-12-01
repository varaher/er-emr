import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { WhisperTextarea } from '@/components/WhisperVoiceInput';
import WhisperTriageInput from '@/components/WhisperTriageInput';

export default function Triage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const [formData, setFormData] = useState({
    age_group: 'adult',
    chief_complaint: '',
    additional_notes: '',
    vitals: {
      hr: null,
      bp_systolic: null,
      bp_diastolic: null,
      rr: null,
      spo2: null,
      temperature: null,
      gcs_e: null,
      gcs_v: null,
      gcs_m: null,
      capillary_refill: null
    },
    symptoms: {
      // Normal
      normal_no_symptoms: false,
      
      // Airway
      obstructed_airway: false,
      facial_burns: false,
      stridor: false,
      
      // Breathing
      severe_respiratory_distress: false,
      moderate_respiratory_distress: false,
      mild_respiratory_symptoms: false,
      cyanosis: false,
      apnea: false,
      
      // Circulation
      shock: false,
      severe_bleeding: false,
      cardiac_arrest: false,
      chest_pain: false,
      chest_pain_with_hypotension: false,
      
      // Neurological
      seizure_ongoing: false,
      seizure_controlled: false,
      confusion: false,
      focal_deficits: false,
      lethargic_unconscious: false,
      
      // Trauma
      major_trauma: false,
      moderate_trauma: false,
      minor_injury: false,
      
      // Other critical
      severe_burns: false,
      anaphylaxis: false,
      suspected_stroke: false,
      sepsis: false,
      gi_bleed: false,
      fever: false,
      non_blanching_rash: false,
      
      // Pediatric specific
      severe_dehydration: false,
      moderate_dehydration: false,
      
      // Abdominal pain
      abdominal_pain_severe: false,
      abdominal_pain_moderate: false,
      abdominal_pain_mild: false,
      
      other_symptoms: []
    },
    mechanism: '',
    triaged_by: user?.name || ''
  });

  const handleCalculate = async () => {
    try {
      setLoading(true);
      const response = await api.post('/triage', formData);
      setTriageResult(response.data);
      toast.success('Triage assessment calculated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to calculate triage');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    if (!triageResult) {
      toast.error('Please calculate triage first');
      return;
    }
    // Navigate to case creation with triage data
    // Use pediatric route if age_group is pediatric
    const route = formData.age_group === 'pediatric' ? '/case-pediatric/new' : '/case/new';
    navigate(route, { 
      state: { 
        triageId: triageResult.id,
        triagePriority: triageResult.priority_level,
        triageColor: triageResult.priority_color,
        age_group: formData.age_group,
        // Pass recorded voice data
        chief_complaint: formData.chief_complaint,
        additional_notes: formData.additional_notes,
        // Pass vitals
        vitals: formData.vitals
      }
    });
  };

  const updateVital = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: value ? parseFloat(value) : null
      }
    }));
  };

  const toggleSymptom = (symptom) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [symptom]: !prev.symptoms[symptom]
      }
    }));
  };

  const handleExtractedData = (extractedData) => {
    // Apply extracted vitals
    if (extractedData.vitals) {
      setFormData(prev => ({
        ...prev,
        vitals: {
          ...prev.vitals,
          ...Object.fromEntries(
            Object.entries(extractedData.vitals).filter(([_, v]) => v !== null)
          )
        }
      }));
    }

    // Apply extracted symptoms
    if (extractedData.symptoms) {
      setFormData(prev => ({
        ...prev,
        symptoms: {
          ...prev.symptoms,
          ...extractedData.symptoms
        }
      }));
    }

    toast.success('✨ Auto-filled vitals and symptoms!', { duration: 3000 });
  };

  const getPriorityBadge = (result) => {
    const colorClasses = {
      red: 'bg-red-600 text-white',
      orange: 'bg-orange-500 text-white',
      yellow: 'bg-yellow-500 text-black',
      green: 'bg-green-600 text-white',
      blue: 'bg-blue-600 text-white'
    };

    return (
      <Badge className={`${colorClasses[result.priority_color]} text-lg px-4 py-2`}>
        Priority {result.priority_level} - {result.priority_name}
      </Badge>
    );
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
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Triage Assessment</h1>
                <p className="text-sm text-slate-600">Automated priority calculation based on vitals and symptoms</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Age Group Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Age Group</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="adult"
                      name="age_group"
                      value="adult"
                      checked={formData.age_group === 'adult'}
                      onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                      className="w-4 h-4"
                      data-testid="radio-adult"
                    />
                    <Label htmlFor="adult" className="text-base font-medium">Adult</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="pediatric"
                      name="age_group"
                      value="pediatric"
                      checked={formData.age_group === 'pediatric'}
                      onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                      className="w-4 h-4"
                      data-testid="radio-pediatric"
                    />
                    <Label htmlFor="pediatric" className="text-base font-medium">Pediatric</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Input - Chief Complaint with AI Extraction */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎤 Chief Complaint / Presenting Complaint
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Use voice recording - AI will auto-extract vitals & symptoms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="chief-complaint" className="text-sm font-semibold">
                    Main Reason for Visit
                  </Label>
                  <WhisperTriageInput
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    onExtractedData={handleExtractedData}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-slate-600">
                    ✨ <strong>AI-Powered:</strong> Speak vitals & symptoms - AI will auto-fill the form below!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vitals */}
            <Card>
              <CardHeader>
                <CardTitle>Vitals</CardTitle>
                <CardDescription>Enter patient vital signs</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Normal Vitals Reference - Adult */}
                {formData.age_group === 'adult' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-xs font-semibold text-green-900 mb-2">📊 Normal Vitals Reference (Adult)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-green-700">
                      <div><span className="font-medium">HR:</span> 60-100 bpm</div>
                      <div><span className="font-medium">BP:</span> 90-120/60-80 mmHg</div>
                      <div><span className="font-medium">RR:</span> 12-20 /min</div>
                      <div><span className="font-medium">SpO2:</span> 95-100%</div>
                      <div><span className="font-medium">Temp:</span> 36.1-37.2°C</div>
                      <div><span className="font-medium">GCS:</span> 15/15</div>
                    </div>
                  </div>
                )}

                {/* Normal Vitals Reference - Pediatric */}
                {formData.age_group === 'pediatric' && (
                  <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      👶 Pediatric Normal Vitals Reference (Age-Specific)
                    </h4>
                    
                    {/* Age-Based Vital Ranges Table */}
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="border border-blue-300 px-2 py-1 text-left font-semibold">Age Group</th>
                            <th className="border border-blue-300 px-2 py-1 text-center font-semibold">HR (bpm)</th>
                            <th className="border border-blue-300 px-2 py-1 text-center font-semibold">RR (/min)</th>
                            <th className="border border-blue-300 px-2 py-1 text-center font-semibold">Systolic BP</th>
                          </tr>
                        </thead>
                        <tbody className="text-blue-800">
                          <tr>
                            <td className="border border-blue-200 px-2 py-1 font-medium">Newborn (0-1 mo)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">120-160</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">30-60</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">60-90</td>
                          </tr>
                          <tr className="bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-medium">Infant (1-12 mo)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">100-160</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">25-40</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">70-100</td>
                          </tr>
                          <tr>
                            <td className="border border-blue-200 px-2 py-1 font-medium">Toddler (1-3 yrs)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">90-150</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">20-30</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">80-110</td>
                          </tr>
                          <tr className="bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-medium">Preschool (3-6 yrs)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">80-140</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">20-25</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">85-110</td>
                          </tr>
                          <tr>
                            <td className="border border-blue-200 px-2 py-1 font-medium">School Age (6-12 yrs)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">70-120</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">18-25</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">90-120</td>
                          </tr>
                          <tr className="bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-medium">Adolescent (12-18 yrs)</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">60-100</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">12-20</td>
                            <td className="border border-blue-200 px-2 py-1 text-center">90-120</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Quick Reference Formulas */}
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded">
                      <h5 className="text-xs font-bold text-amber-900 mb-2">📐 Quick Calculation Formulas</h5>
                      <div className="space-y-1 text-xs text-amber-800">
                        <div><span className="font-semibold">Weight (kg):</span> (Age in years × 2) + 8</div>
                        <div><span className="font-semibold">Systolic BP (mmHg):</span> 90 + (2 × age in years)</div>
                        <div><span className="font-semibold">Lower Limit Systolic BP:</span> 70 + (2 × age in years)</div>
                        <div><span className="font-semibold">ETT Size (uncuffed):</span> (Age in years ÷ 4) + 4</div>
                        <div><span className="font-semibold">ETT Depth (cm):</span> (Age in years ÷ 2) + 12</div>
                      </div>
                    </div>

                    {/* Common Values */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white border border-blue-200 rounded">
                        <span className="font-semibold text-blue-900">SpO2:</span>
                        <span className="text-blue-700"> 95-100%</span>
                      </div>
                      <div className="p-2 bg-white border border-blue-200 rounded">
                        <span className="font-semibold text-blue-900">Temperature:</span>
                        <span className="text-blue-700"> 36.5-37.5°C</span>
                      </div>
                      <div className="p-2 bg-white border border-blue-200 rounded">
                        <span className="font-semibold text-blue-900">CRT:</span>
                        <span className="text-blue-700"> &lt; 2 seconds</span>
                      </div>
                      <div className="p-2 bg-white border border-blue-200 rounded">
                        <span className="font-semibold text-blue-900">Urine Output:</span>
                        <span className="text-blue-700"> 1-2 ml/kg/hr</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hr">HR (bpm)</Label>
                    <Input
                      id="hr"
                      type="number"
                      value={formData.vitals.hr || ''}
                      onChange={(e) => updateVital('hr', e.target.value)}
                      data-testid="input-hr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-sys">BP Systolic</Label>
                    <Input
                      id="bp-sys"
                      type="number"
                      value={formData.vitals.bp_systolic || ''}
                      onChange={(e) => updateVital('bp_systolic', e.target.value)}
                      data-testid="input-bp-systolic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-dia">BP Diastolic</Label>
                    <Input
                      id="bp-dia"
                      type="number"
                      value={formData.vitals.bp_diastolic || ''}
                      onChange={(e) => updateVital('bp_diastolic', e.target.value)}
                      data-testid="input-bp-diastolic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rr">RR (bpm)</Label>
                    <Input
                      id="rr"
                      type="number"
                      value={formData.vitals.rr || ''}
                      onChange={(e) => updateVital('rr', e.target.value)}
                      data-testid="input-rr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spo2">SpO2 (%)</Label>
                    <Input
                      id="spo2"
                      type="number"
                      value={formData.vitals.spo2 || ''}
                      onChange={(e) => updateVital('spo2', e.target.value)}
                      data-testid="input-spo2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp">Temp (°C)</Label>
                    <Input
                      id="temp"
                      type="number"
                      step="0.1"
                      value={formData.vitals.temperature || ''}
                      onChange={(e) => updateVital('temperature', e.target.value)}
                      data-testid="input-temperature"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gcs-e">GCS Eye</Label>
                    <Input
                      id="gcs-e"
                      type="number"
                      min="1"
                      max="4"
                      value={formData.vitals.gcs_e || ''}
                      onChange={(e) => updateVital('gcs_e', e.target.value)}
                      data-testid="input-gcs-e"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gcs-v">GCS Verbal</Label>
                    <Input
                      id="gcs-v"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.vitals.gcs_v || ''}
                      onChange={(e) => updateVital('gcs_v', e.target.value)}
                      data-testid="input-gcs-v"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gcs-m">GCS Motor</Label>
                    <Input
                      id="gcs-m"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.vitals.gcs_m || ''}
                      onChange={(e) => updateVital('gcs_m', e.target.value)}
                      data-testid="input-gcs-m"
                    />
                  </div>
                  {formData.age_group === 'pediatric' && (
                    <div className="space-y-2">
                      <Label htmlFor="crt">Cap Refill (s)</Label>
                      <Input
                        id="crt"
                        type="number"
                        step="0.1"
                        value={formData.vitals.capillary_refill || ''}
                        onChange={(e) => updateVital('capillary_refill', e.target.value)}
                        data-testid="input-capillary-refill"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voice Input - Additional Notes */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎤 Additional Triage Notes
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Any additional observations or remarks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="additional-notes" className="text-sm font-semibold">
                    Notes / Observations
                  </Label>
                  <WhisperTextarea
                    id="additional-notes"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    placeholder="Click 'Record' for quick notes: Patient arrived via ambulance, family present..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Symptoms */}
            <Card>
              <CardHeader>
                <CardTitle>Clinical Symptoms</CardTitle>
                <CardDescription>Select all applicable symptoms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Normal Option */}
                  <div className="border-b pb-4">
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <Checkbox
                        id="normal_no_symptoms"
                        checked={formData.symptoms.normal_no_symptoms}
                        onCheckedChange={() => toggleSymptom('normal_no_symptoms')}
                        className="h-5 w-5"
                      />
                      <Label htmlFor="normal_no_symptoms" className="text-base font-semibold text-green-800 cursor-pointer">
                        ✓ Normal / No Critical Symptoms
                      </Label>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 ml-8">
                      Select this if patient has stable vitals with no critical symptoms
                    </p>
                  </div>

                  {/* Airway */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Airway</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'obstructed_airway', label: 'Obstructed Airway' },
                        { id: 'facial_burns', label: 'Facial Burns' },
                        { id: 'stridor', label: 'Stridor' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Breathing */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Breathing</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'severe_respiratory_distress', label: 'Severe Resp Distress' },
                        { id: 'moderate_respiratory_distress', label: 'Moderate Resp Distress' },
                        { id: 'mild_respiratory_symptoms', label: 'Mild Resp Symptoms' },
                        { id: 'cyanosis', label: 'Cyanosis' },
                        { id: 'apnea', label: 'Apnea' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Circulation */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Circulation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'shock', label: 'Shock' },
                        { id: 'severe_bleeding', label: 'Severe Bleeding' },
                        { id: 'cardiac_arrest', label: 'Cardiac Arrest' },
                        { id: 'chest_pain', label: 'Chest Pain' },
                        { id: 'chest_pain_with_hypotension', label: 'Chest Pain + Hypotension' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Neurological */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Neurological</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'seizure_ongoing', label: 'Seizure Ongoing' },
                        { id: 'seizure_controlled', label: 'Seizure Controlled' },
                        { id: 'confusion', label: 'Confusion' },
                        { id: 'focal_deficits', label: 'Focal Deficits' },
                        { id: 'lethargic_unconscious', label: 'Lethargic/Unconscious' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trauma */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Trauma</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'major_trauma', label: 'Major Trauma' },
                        { id: 'moderate_trauma', label: 'Moderate Trauma' },
                        { id: 'minor_injury', label: 'Minor Injury' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other Critical */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Other Critical Conditions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'severe_burns', label: 'Severe Burns' },
                        { id: 'anaphylaxis', label: 'Anaphylaxis' },
                        { id: 'suspected_stroke', label: 'Suspected Stroke' },
                        { id: 'sepsis', label: 'Sepsis' },
                        { id: 'gi_bleed', label: 'GI Bleed' },
                        { id: 'fever', label: 'Fever' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pediatric Specific */}
                  {formData.age_group === 'pediatric' && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Pediatric Specific</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: 'non_blanching_rash', label: 'Non-Blanching Rash' },
                          { id: 'severe_dehydration', label: 'Severe Dehydration' },
                          { id: 'moderate_dehydration', label: 'Moderate Dehydration' }
                        ].map(symptom => (
                          <div key={symptom.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={symptom.id}
                              checked={formData.symptoms[symptom.id]}
                              onCheckedChange={() => toggleSymptom(symptom.id)}
                            />
                            <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Abdominal Pain */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Abdominal Pain</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'abdominal_pain_severe', label: 'Severe' },
                        { id: 'abdominal_pain_moderate', label: 'Moderate' },
                        { id: 'abdominal_pain_mild', label: 'Mild' }
                      ].map(symptom => (
                        <div key={symptom.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={symptom.id}
                            checked={formData.symptoms[symptom.id]}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <Label htmlFor={symptom.id} className="text-sm">{symptom.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button 
                onClick={handleCalculate} 
                size="lg"
                disabled={loading}
                data-testid="calculate-triage-button"
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                {loading ? 'Calculating...' : 'Calculate Triage Priority'}
              </Button>
            </div>
          </div>

          {/* Right Column - Result */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Triage Result</CardTitle>
                <CardDescription>Automated priority assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {!triageResult ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Enter vitals and symptoms, then click Calculate</p>
                  </div>
                ) : (
                  <div className="space-y-6" data-testid="triage-result">
                    <div className="text-center p-6 bg-slate-50 rounded-lg">
                      {getPriorityBadge(triageResult)}
                      <div className="mt-4">
                        <div className="text-3xl font-bold font-data text-slate-900">
                          {triageResult.time_to_see}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Time to be seen</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">Triage Reasons</h3>
                      <ul className="space-y-1">
                        {triageResult.triage_reason.map((reason, index) => (
                          <li key={index} className="text-sm text-slate-700 flex items-start">
                            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-slate-500 flex-shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <Button 
                        onClick={handleCreateCase} 
                        className="w-full"
                        data-testid="create-case-from-triage-button"
                      >
                        Create Case Sheet
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
