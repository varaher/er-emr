import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, FileText, Printer, Save, Edit2, Home, RefreshCw } from 'lucide-react';

/**
 * Generate comprehensive Course in ER summary from case sheet data
 */
const generateCourseInER = (caseData) => {
  if (!caseData) return "";

  const parts = [];

  // 1. Presenting Complaint
  if (caseData.presenting_complaint?.text) {
    parts.push(`Patient presented to the Emergency Department with ${caseData.presenting_complaint.text}.`);
  }

  // 2. History of Present Illness
  const history = caseData.history || {};
  if (history.hpi || history.events_hopi) {
    parts.push(history.hpi || history.events_hopi);
  }

  // 3. Primary Assessment Summary
  const primary = caseData.primary_assessment || {};
  const airwayStatus = primary.airway_status || 'patent';
  const breathingStatus = primary.breathing_status || 'adequate';
  const circulationStatus = primary.circulation_status || 'stable';
  parts.push(`Primary assessment revealed airway ${airwayStatus}, breathing ${breathingStatus}, circulation ${circulationStatus}.`);

  // 4. Vitals Summary
  const vitals = caseData.vitals_at_arrival || {};
  if (vitals.hr || vitals.bp_systolic) {
    const vitalText = [];
    if (vitals.hr) vitalText.push(`HR ${vitals.hr}/min`);
    if (vitals.bp_systolic && vitals.bp_diastolic) vitalText.push(`BP ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`);
    if (vitals.rr) vitalText.push(`RR ${vitals.rr}/min`);
    if (vitals.spo2) vitalText.push(`SpO2 ${vitals.spo2}%`);
    if (vitals.temperature) vitalText.push(`Temp ${vitals.temperature}°C`);
    if (vitalText.length) {
      parts.push(`Vitals at arrival: ${vitalText.join(', ')}.`);
    }
  }

  // 5. Examination Findings
  const exam = caseData.examination || {};
  const examFindings = [];
  if (exam.general_additional_notes) examFindings.push(`General: ${exam.general_additional_notes}`);
  if (exam.cvs_additional_notes) examFindings.push(`CVS: ${exam.cvs_additional_notes}`);
  if (exam.respiratory_additional_notes) examFindings.push(`RS: ${exam.respiratory_additional_notes}`);
  if (exam.abdomen_additional_notes) examFindings.push(`Abdomen: ${exam.abdomen_additional_notes}`);
  if (exam.cns_additional_notes) examFindings.push(`CNS: ${exam.cns_additional_notes}`);
  if (examFindings.length) {
    parts.push(`Clinical examination: ${examFindings.join('. ')}.`);
  } else {
    parts.push('Clinical examination was unremarkable.');
  }

  // 6. Investigations
  const investigations = caseData.investigations || {};
  if (investigations.panels_selected?.length || investigations.imaging?.length) {
    const invList = [];
    if (investigations.panels_selected?.length) invList.push(...investigations.panels_selected);
    if (investigations.imaging?.length) invList.push(...investigations.imaging);
    parts.push(`Investigations ordered: ${invList.join(', ')}.`);
  }
  if (investigations.results_notes) {
    parts.push(`Investigation findings: ${investigations.results_notes}`);
  }

  // 7. Treatment Given
  const treatment = caseData.treatment || {};
  if (treatment.intervention_notes) {
    parts.push(`Treatment: ${treatment.intervention_notes}`);
  }

  // 8. Drugs Administered
  const drugs = caseData.drugs_administered || [];
  if (drugs.length) {
    const drugList = drugs.map(d => `${d.name} ${d.dose}`).join(', ');
    parts.push(`Medications administered: ${drugList}.`);
  } else if (treatment.medications) {
    parts.push(`Medications: ${treatment.medications}`);
  }

  // 9. Procedures Performed
  const procedures = caseData.procedures_performed || [];
  if (procedures.length) {
    const procList = procedures.map(p => p.name).join(', ');
    parts.push(`Procedures performed: ${procList}.`);
  }

  // 10. ER Observation
  const erObs = caseData.er_observation || {};
  if (erObs.notes) {
    parts.push(`Course in ER: ${erObs.notes}`);
  }
  if (erObs.duration) {
    parts.push(`Patient was observed in ER for ${erObs.duration}.`);
  }

  // 11. Diagnosis
  if (treatment.provisional_diagnoses?.length) {
    parts.push(`Provisional Diagnosis: ${treatment.provisional_diagnoses.join(', ')}.`);
  }
  if (treatment.differential_diagnoses?.length) {
    parts.push(`Differential Diagnoses: ${treatment.differential_diagnoses.join(', ')}.`);
  }

  // 12. AI Red Flags (if any)
  if (treatment.ai_red_flags?.length) {
    parts.push(`Red flags noted: ${treatment.ai_red_flags.join(', ')}.`);
  }

  // 13. Disposition
  const disposition = caseData.disposition || {};
  if (disposition.type) {
    const dispositionText = {
      discharged: "Patient was discharged in stable condition",
      "admitted-icu": "Patient was admitted to ICU for further management",
      "admitted-hdu": "Patient was admitted to HDU for monitoring",
      "admitted-ward": "Patient was admitted to ward",
      referred: "Patient was referred to higher center",
      dama: "Patient left against medical advice (DAMA/LAMA)",
      death: "Patient was declared deceased"
    };
    parts.push(dispositionText[disposition.type] || `Patient disposition: ${disposition.type}.`);
  }

  return parts.join(' ') || "Course documented in case sheet.";
};

export default function DischargeSummary() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable discharge summary fields - comprehensive
  const [dischargeData, setDischargeData] = useState({
    presenting_complaint: '',
    hopi: '',
    past_medical: '',
    past_surgical: '',
    examination_summary: '',
    investigations: '',
    course_in_er: '',
    final_diagnosis: '',
    differential_diagnoses: '',
    treatment_given: '',
    discharge_medications: '',
    follow_up_advice: '',
    warning_signs: '',
    condition_at_discharge: 'Stable',
    discharge_vitals: {
      hr: '', bp: '', rr: '', spo2: '', gcs: '', temp: ''
    },
    ed_resident: '',
    ed_consultant: ''
  });

  useEffect(() => {
    fetchCaseAndSummary();
  }, [caseId]);

  useEffect(() => {
    // Auto-fill discharge data from case sheet
    if (caseData) {
      const history = caseData.history || {};
      const treatment = caseData.treatment || {};
      const exam = caseData.examination || {};
      const investigations = caseData.investigations || {};
      const procedures = caseData.procedures_performed || [];
      const drugs = caseData.drugs_administered || [];

      // Build examination summary
      const examParts = [];
      if (exam.general_additional_notes) examParts.push(`General: ${exam.general_additional_notes}`);
      if (exam.cvs_additional_notes) examParts.push(`CVS: ${exam.cvs_additional_notes}`);
      if (exam.respiratory_additional_notes) examParts.push(`RS: ${exam.respiratory_additional_notes}`);
      if (exam.abdomen_additional_notes) examParts.push(`Abdomen: ${exam.abdomen_additional_notes}`);
      if (exam.cns_additional_notes) examParts.push(`CNS: ${exam.cns_additional_notes}`);
      
      // Build treatment summary
      const treatmentParts = [];
      if (treatment.intervention_notes) treatmentParts.push(treatment.intervention_notes);
      if (treatment.fluids) treatmentParts.push(`IV Fluids: ${treatment.fluids}`);
      if (procedures.length) {
        treatmentParts.push(`Procedures: ${procedures.map(p => `${p.name}${p.notes ? ` (${p.notes})` : ''}`).join(', ')}`);
      }

      // Build drug list
      const drugList = drugs.length 
        ? drugs.map(d => `${d.name} ${d.dose} @ ${d.time}`).join('\n')
        : treatment.medications || '';

      setDischargeData(prev => ({
        ...prev,
        presenting_complaint: caseData.presenting_complaint?.text || '',
        hopi: history.hpi || history.events_hopi || '',
        past_medical: history.past_medical?.join(', ') || 'None',
        past_surgical: history.past_surgical || 'None',
        examination_summary: examParts.join('\n') || 'Unremarkable',
        investigations: investigations.results_notes || 
          (investigations.panels_selected?.length ? `Ordered: ${investigations.panels_selected.join(', ')}` : 'Pending'),
        course_in_er: caseData.er_observation?.notes || generateCourseInER(caseData),
        final_diagnosis: treatment.provisional_diagnoses?.join(', ') || '',
        differential_diagnoses: treatment.differential_diagnoses?.join(', ') || '',
        treatment_given: treatmentParts.join('\n') || '',
        discharge_medications: drugList,
        follow_up_advice: caseData.disposition?.advice || '',
        ed_resident: caseData.em_resident || user?.name || '',
        ed_consultant: caseData.em_consultant || ''
      }));
    }
  }, [caseData, user]);

  const fetchCaseAndSummary = async () => {
    try {
      setLoading(true);
      const caseResponse = await api.get(`/cases/${caseId}`);
      setCaseData(caseResponse.data);

      try {
        const summaryResponse = await api.get(`/discharge-summary/${caseId}`);
        setSummary(summaryResponse.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching summary:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch case data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/discharge-summary?case_sheet_id=${caseId}`);
      setSummary(response.data);
      toast.success('Discharge summary generated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate discharge summary');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update case sheet with discharge data
      const payload = {
        disposition: {
          ...caseData.disposition,
          type: caseData.disposition?.type || 'discharged',
          advice: dischargeData.follow_up_advice,
          condition_at_discharge: dischargeData.condition_at_discharge.toLowerCase(),
          discharge_vitals: {
            hr: dischargeData.discharge_vitals.hr ? parseFloat(dischargeData.discharge_vitals.hr) : null,
            bp: dischargeData.discharge_vitals.bp,
            rr: dischargeData.discharge_vitals.rr ? parseFloat(dischargeData.discharge_vitals.rr) : null,
            spo2: dischargeData.discharge_vitals.spo2 ? parseFloat(dischargeData.discharge_vitals.spo2) : null,
            gcs: dischargeData.discharge_vitals.gcs,
            temperature: dischargeData.discharge_vitals.temp ? parseFloat(dischargeData.discharge_vitals.temp) : null
          }
        },
        er_observation: {
          ...caseData.er_observation,
          notes: dischargeData.course_in_er
        },
        treatment: {
          ...caseData.treatment,
          medications: dischargeData.discharge_medications,
          provisional_diagnoses: dischargeData.final_diagnosis ? dischargeData.final_diagnosis.split(',').map(s => s.trim()) : [],
          differential_diagnoses: dischargeData.differential_diagnoses ? dischargeData.differential_diagnoses.split(',').map(s => s.trim()) : []
        },
        em_resident: dischargeData.ed_resident,
        em_consultant: dischargeData.ed_consultant,
        status: 'discharged'
      };

      await api.put(`/cases/${caseId}?lock_case=false`, payload);
      toast.success('Discharge summary saved successfully');
      setIsEditing(false);
      
      // Refresh case data
      await fetchCaseAndSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save discharge summary');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCourse = () => {
    const newCourse = generateCourseInER(caseData);
    setDischargeData(prev => ({
      ...prev,
      course_in_er: newCourse
    }));
    toast.success('Course in ER regenerated from case sheet');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFinish = async () => {
    await handleSave();
    navigate('/dashboard');
  };

  const updateField = (field, value) => {
    setDischargeData(prev => ({ ...prev, [field]: value }));
  };

  const updateVital = (vital, value) => {
    setDischargeData(prev => ({
      ...prev,
      discharge_vitals: { ...prev.discharge_vitals, [vital]: value }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600">Case not found</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPediatric = caseData.case_type === 'pediatric' || 
    (caseData.patient?.age && parseInt(caseData.patient.age) < 16);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Hide on print */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/case/${caseId}`)}
                data-testid="back-to-case"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Case Sheet
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discharge Summary</h1>
                  {isPediatric && (
                    <Badge className="bg-pink-100 text-pink-800 border border-pink-300">
                      👶 Pediatric
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">{caseData.patient?.name} - {caseData.patient?.uhid || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(!isEditing)}
                data-testid="edit-toggle"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                data-testid="save-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint}
                data-testid="print-button"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleFinish}
                disabled={saving}
                data-testid="finish-button"
              >
                Finish & Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:pb-4">
            <div className="text-center border-b border-slate-200 pb-4 mb-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                Emergency Department Discharge Summary
              </h1>
              <p className="text-slate-600">Hospital Name - Emergency Department</p>
            </div>
            
            {/* Patient Demographics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
              <div>
                <span className="font-semibold text-slate-700">Patient Name:</span>
                <div className="font-medium">{caseData.patient?.name}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Age/Sex:</span>
                <div className="font-medium">{caseData.patient?.age} / {caseData.patient?.sex}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">UHID:</span>
                <div className="font-medium font-mono">{caseData.patient?.uhid || 'N/A'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">MLC:</span>
                <div className="font-medium">{caseData.patient?.mlc ? 'Yes' : 'No'}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-700">Arrival:</span>
                <div className="font-medium">{caseData.patient?.arrival_datetime ? new Date(caseData.patient.arrival_datetime).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-700">Mode of Arrival:</span>
                <div className="font-medium">{caseData.patient?.mode_of_arrival || 'N/A'}</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Vitals at Arrival */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Vitals at Time of Arrival
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                {[
                  { label: 'HR', value: caseData.vitals_at_arrival?.hr, unit: '/min' },
                  { label: 'BP', value: `${caseData.vitals_at_arrival?.bp_systolic || 'N/A'}/${caseData.vitals_at_arrival?.bp_diastolic || 'N/A'}`, unit: 'mmHg' },
                  { label: 'RR', value: caseData.vitals_at_arrival?.rr, unit: '/min' },
                  { label: 'SpO2', value: caseData.vitals_at_arrival?.spo2, unit: '%' },
                  { label: 'Temp', value: caseData.vitals_at_arrival?.temperature, unit: '°C' },
                  { label: 'GCS', value: `E${caseData.vitals_at_arrival?.gcs_e || '-'}V${caseData.vitals_at_arrival?.gcs_v || '-'}M${caseData.vitals_at_arrival?.gcs_m || '-'}`, unit: '' },
                ].map(vital => (
                  <div key={vital.label} className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500 text-xs uppercase">{vital.label}</div>
                    <div className="font-semibold text-slate-900">{vital.value || 'N/A'}{vital.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Presenting Complaint */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Presenting Complaint
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={2}
                  value={dischargeData.presenting_complaint}
                  onChange={(e) => updateField('presenting_complaint', e.target.value)}
                />
              ) : (
                <p className="text-slate-700">{dischargeData.presenting_complaint || 'Not documented'}</p>
              )}
            </div>

            {/* HOPI */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                History of Present Illness
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  value={dischargeData.hopi}
                  onChange={(e) => updateField('hopi', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.hopi || 'Not documented'}</p>
              )}
            </div>

            {/* Past History */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Past Medical History
                </h3>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={2}
                    value={dischargeData.past_medical}
                    onChange={(e) => updateField('past_medical', e.target.value)}
                  />
                ) : (
                  <p className="text-slate-700">{dischargeData.past_medical || 'None'}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Past Surgical History
                </h3>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={2}
                    value={dischargeData.past_surgical}
                    onChange={(e) => updateField('past_surgical', e.target.value)}
                  />
                ) : (
                  <p className="text-slate-700">{dischargeData.past_surgical || 'None'}</p>
                )}
              </div>
            </div>

            {/* Examination */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Clinical Examination
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={4}
                  value={dischargeData.examination_summary}
                  onChange={(e) => updateField('examination_summary', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.examination_summary || 'Unremarkable'}</p>
              )}
            </div>

            {/* Investigations */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Investigations
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  value={dischargeData.investigations}
                  onChange={(e) => updateField('investigations', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.investigations || 'Pending'}</p>
              )}
            </div>

            {/* Course in ER - with regenerate button */}
            <div>
              <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  Course in Emergency Room
                </h3>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleRegenerateCourse}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate from Case Sheet
                  </Button>
                )}
              </div>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={6}
                  value={dischargeData.course_in_er}
                  onChange={(e) => updateField('course_in_er', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{dischargeData.course_in_er || 'Not documented'}</p>
              )}
            </div>

            {/* Diagnosis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Final Diagnosis
                </h3>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={2}
                    value={dischargeData.final_diagnosis}
                    onChange={(e) => updateField('final_diagnosis', e.target.value)}
                    placeholder="Comma-separated diagnoses"
                  />
                ) : (
                  <p className="text-slate-700">{dischargeData.final_diagnosis || 'Not specified'}</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Differential Diagnoses
                </h3>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={2}
                    value={dischargeData.differential_diagnoses}
                    onChange={(e) => updateField('differential_diagnoses', e.target.value)}
                    placeholder="Comma-separated diagnoses"
                  />
                ) : (
                  <p className="text-slate-700">{dischargeData.differential_diagnoses || 'None'}</p>
                )}
              </div>
            </div>

            {/* Treatment Given */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Treatment Given
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={4}
                  value={dischargeData.treatment_given}
                  onChange={(e) => updateField('treatment_given', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.treatment_given || 'Not documented'}</p>
              )}
            </div>

            {/* Discharge Medications */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Discharge Medications
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={4}
                  value={dischargeData.discharge_medications}
                  onChange={(e) => updateField('discharge_medications', e.target.value)}
                  placeholder="List medications with doses and instructions"
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.discharge_medications || 'None'}</p>
              )}
            </div>

            {/* Follow-up Advice */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Follow-up Advice
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  value={dischargeData.follow_up_advice}
                  onChange={(e) => updateField('follow_up_advice', e.target.value)}
                  placeholder="Follow-up instructions, when to return, etc."
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.follow_up_advice || 'As advised'}</p>
              )}
            </div>

            {/* Warning Signs */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Warning Signs (When to Return)
              </h3>
              {isEditing ? (
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  value={dischargeData.warning_signs}
                  onChange={(e) => updateField('warning_signs', e.target.value)}
                  placeholder="Warning signs to watch for..."
                />
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{dischargeData.warning_signs || 'Return immediately if symptoms worsen'}</p>
              )}
            </div>

            {/* Condition at Discharge */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                Condition at Discharge
              </h3>
              {isEditing ? (
                <select
                  className="w-full p-3 border rounded-md"
                  value={dischargeData.condition_at_discharge}
                  onChange={(e) => updateField('condition_at_discharge', e.target.value)}
                >
                  <option value="Stable">Stable</option>
                  <option value="Improved">Improved</option>
                  <option value="Guarded">Guarded</option>
                  <option value="Critical">Critical</option>
                </select>
              ) : (
                <Badge className={`text-sm ${
                  dischargeData.condition_at_discharge === 'Stable' ? 'bg-green-100 text-green-800' :
                  dischargeData.condition_at_discharge === 'Improved' ? 'bg-blue-100 text-blue-800' :
                  dischargeData.condition_at_discharge === 'Guarded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {dischargeData.condition_at_discharge}
                </Badge>
              )}
            </div>

            {/* Discharge Vitals */}
            {isEditing && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Vitals at Discharge
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <Label htmlFor="d-hr">HR</Label>
                    <Input id="d-hr" value={dischargeData.discharge_vitals.hr} 
                      onChange={(e) => updateVital('hr', e.target.value)} placeholder="bpm" />
                  </div>
                  <div>
                    <Label htmlFor="d-bp">BP</Label>
                    <Input id="d-bp" value={dischargeData.discharge_vitals.bp} 
                      onChange={(e) => updateVital('bp', e.target.value)} placeholder="120/80" />
                  </div>
                  <div>
                    <Label htmlFor="d-rr">RR</Label>
                    <Input id="d-rr" value={dischargeData.discharge_vitals.rr} 
                      onChange={(e) => updateVital('rr', e.target.value)} placeholder="/min" />
                  </div>
                  <div>
                    <Label htmlFor="d-spo2">SpO2</Label>
                    <Input id="d-spo2" value={dischargeData.discharge_vitals.spo2} 
                      onChange={(e) => updateVital('spo2', e.target.value)} placeholder="%" />
                  </div>
                  <div>
                    <Label htmlFor="d-gcs">GCS</Label>
                    <Input id="d-gcs" value={dischargeData.discharge_vitals.gcs} 
                      onChange={(e) => updateVital('gcs', e.target.value)} placeholder="15" />
                  </div>
                  <div>
                    <Label htmlFor="d-temp">Temp</Label>
                    <Input id="d-temp" value={dischargeData.discharge_vitals.temp} 
                      onChange={(e) => updateVital('temp', e.target.value)} placeholder="°C" />
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">EM Resident</p>
                  {isEditing ? (
                    <Input 
                      value={dischargeData.ed_resident} 
                      onChange={(e) => updateField('ed_resident', e.target.value)}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-2 text-slate-900">{dischargeData.ed_resident || caseData.em_resident || 'N/A'}</p>
                  )}
                  <div className="mt-4 border-t border-slate-300 pt-1">
                    <p className="text-xs text-slate-500">Signature</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">EM Consultant</p>
                  {isEditing ? (
                    <Input 
                      value={dischargeData.ed_consultant} 
                      onChange={(e) => updateField('ed_consultant', e.target.value)}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-2 text-slate-900">{dischargeData.ed_consultant || caseData.em_consultant || 'N/A'}</p>
                  )}
                  <div className="mt-4 border-t border-slate-300 pt-1">
                    <p className="text-xs text-slate-500">Signature</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                <p>Generated on: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
