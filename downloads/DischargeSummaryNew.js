import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { VoiceTextarea } from '@/components/VoiceTextInput';
import { toast } from 'sonner';
import { ArrowLeft, Save, Printer, Download, Mic } from 'lucide-react';

/**
 * Generate comprehensive Course in ER summary from case sheet data
 * Template: "The patient presented to the Emergency Department with the above complaints. 
 * Initial triage and assessment were performed. Necessary investigations were initiated, 
 * and appropriate treatment was given. The patient was monitored in the ER, showed clinical 
 * improvement, and remained stable throughout the stay."
 */
const generateCourseInER = (caseData) => {
  if (!caseData) return "The patient presented to the Emergency Department with the above complaints. Initial triage and assessment were performed. Necessary investigations were initiated, and appropriate treatment was given. The patient was monitored in the ER, showed clinical improvement, and remained stable throughout the stay.";
  
  const { treatment, disposition, er_observation, investigations } = caseData;
  const parts = [];

  // 1. Opening - Chief complaint
  if (caseData.presenting_complaint?.text) {
    parts.push(`The patient presented to the Emergency Department with ${caseData.presenting_complaint.text}.`);
  } else {
    parts.push("The patient presented to the Emergency Department with the above complaints.");
  }

  // 2. Triage and Assessment
  parts.push("Initial triage and assessment were performed.");

  // 3. Investigations
  const inv = investigations;
  if (inv?.panels_selected?.length || inv?.imaging?.length) {
    const invList = [...(inv.panels_selected || []), ...(inv.imaging || [])].join(', ');
    parts.push(`Necessary investigations (${invList}) were initiated.`);
  } else {
    parts.push("Necessary investigations were initiated.");
  }

  // 4. Treatment
  if (treatment?.intervention_notes) {
    parts.push(`Appropriate treatment was given: ${treatment.intervention_notes}.`);
  } else {
    parts.push("Appropriate treatment was given.");
  }

  // 5. Drugs administered
  const drugs = caseData.drugs_administered || [];
  if (drugs.length) {
    const drugList = drugs.map(d => `${d.name} ${d.dose}`).join(', ');
    parts.push(`Medications administered: ${drugList}.`);
  }

  // 6. Procedures
  const procs = caseData.procedures_performed || [];
  if (procs.length) {
    const procList = procs.map(p => p.name).join(', ');
    parts.push(`Procedures performed: ${procList}.`);
  }

  // 7. ER observation
  if (er_observation?.duration) {
    parts.push(`The patient was monitored in the ER for ${er_observation.duration}.`);
  } else {
    parts.push("The patient was monitored in the ER.");
  }

  // 8. Outcome based on disposition
  const dispositionOutcome = {
    "discharged": "Patient showed clinical improvement and remained stable throughout the stay.",
    "admitted-icu": "Patient required ICU admission for further monitoring and management.",
    "admitted-hdu": "Patient required HDU admission for close monitoring.",
    "admitted-ward": "Patient was stabilized and admitted to ward for further care.",
    "referred": "Patient was stabilized and referred to a higher center for specialized care.",
    "dama": "Patient opted to leave against medical advice after being counseled about risks.",
    "death": "Despite resuscitative efforts, the patient could not be revived."
  };
  
  if (disposition?.type && dispositionOutcome[disposition.type]) {
    parts.push(dispositionOutcome[disposition.type]);
  } else {
    parts.push("Patient showed clinical improvement and remained stable throughout the stay.");
  }

  // 9. Diagnosis (if available)
  if (treatment?.provisional_diagnoses?.length) {
    parts.push(`Final diagnosis: ${treatment.provisional_diagnoses.join(', ')}.`);
  }

  return parts.join(' ');
};

export default function DischargeSummaryNew() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState(null);
  
  const [dischargeData, setDischargeData] = useState({
    discharge_medications: '',
    disposition_type: 'Normal Discharge',
    condition_at_discharge: 'STABLE',
    discharge_vitals: { hr: '', bp: '', rr: '', spo2: '', gcs: '', pain_score: '', grbs: '', temp: '' },
    follow_up_advice: '',
    ed_resident: '',
    ed_consultant: ''
  });

  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  // FIX: Auto-populate discharge data when caseData is loaded
  useEffect(() => {
    if (caseData) {
      const treatment = caseData.treatment || {};
      const drugs = caseData.drugs_administered || [];
      const disposition = caseData.disposition || {};
      
      // Build drug list from drugs_administered
      let drugList = '';
      if (drugs.length > 0) {
        drugList = drugs.map(d => `${d.name} ${d.dose || ''} ${d.time ? `@ ${d.time}` : ''}`).join('\n');
      } else if (treatment.intervention_notes) {
        drugList = treatment.intervention_notes;
      }
      
      // Auto-populate discharge medications and follow-up advice
      setDischargeData(prev => ({
        ...prev,
        discharge_medications: prev.discharge_medications || drugList,
        follow_up_advice: prev.follow_up_advice || disposition.advice || '',
        ed_resident: prev.ed_resident || caseData.em_resident || '',
        ed_consultant: prev.ed_consultant || caseData.em_consultant || ''
      }));
    }
  }, [caseData]);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases/${caseId}`);
      setCaseData(response.data);
      
      setDischargeData(prev => ({
        ...prev,
        ed_resident: response.data.em_resident || '',
        ed_consultant: response.data.em_consultant || ''
      }));
    } catch (error) {
      toast.error('Failed to fetch case data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put(`/discharge/${caseId}`, dischargeData);
      toast.success('Discharge summary saved successfully');
    } catch (error) {
      toast.error('Failed to save discharge summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info('PDF generation in progress...');
    // Implement PDF generation
  };

  // Helper functions
  const buildPrimaryAssessment = (data) => {
    const primary = data.primary_assessment || data.abcde || {};
    let text = `Airway: ${primary.airway_status || 'Patent'}`;
    if (primary.airway_intervention) text += ` (Intervention: ${primary.airway_intervention})`;
    text += `\nBreathing: WOB - ${primary.breathing_wob?.join(', ') || 'Normal'}, Air entry - ${primary.breathing_air_entry || 'Normal'}`;
    text += `\nCirculation: CRT - ${primary.circulation_crt || 'Normal'}`;
    if (primary.circulation_distended_neck_veins) text += `, Distended neck veins - ${primary.circulation_distended_neck_veins}`;
    text += `\nDisability: ${primary.disability_avpu_gcs || 'Alert'}, Pupils - ${primary.disability_pupils || 'Normal'}`;
    if (primary.disability_glucose) text += `, GRBS - ${primary.disability_glucose}`;
    text += `\nExposure: Temp - ${primary.exposure_temperature || 'Normal'}`;
    if (primary.exposure_long_bone_deformities) text += `, Long bone deformity - ${primary.exposure_long_bone_deformities}`;
    return text;
  };

  const buildSecondaryAssessment = (data) => {
    const exam = data.examination || {};
    const isPediatric = data.case_type === 'pediatric';
    
    let text = '';
    const general = [];
    if (exam.general_pallor) general.push('Pallor');
    if (exam.general_icterus) general.push('Icterus');
    if (exam.general_cyanosis) general.push('Cyanosis');
    if (exam.general_clubbing) general.push('Clubbing');
    if (exam.general_lymphadenopathy) general.push('Lymphadenopathy');
    if (exam.general_edema) general.push('Edema');
    
    if (general.length > 0) text += general.join(' ') + '\n';
    
    if (isPediatric) {
      text += `\nCHEST: ${exam.respiratory_status || 'Normal'}`;
      if (exam.respiratory_status === 'Abnormal') text += ` - ${exam.respiratory_abnormality || ''}`;
      text += `\nCVS: ${exam.cardiovascular_status || 'Normal'}`;
      if (exam.cardiovascular_status === 'Abnormal') text += ` - ${exam.cardiovascular_abnormality || ''}`;
      text += `\nP/A: ${exam.abdomen_status || 'Normal'}`;
      if (exam.abdomen_status === 'Abnormal') text += ` - ${exam.abdomen_abnormality || ''}`;
      text += `\nEXTREMITIES: ${exam.extremities_status || 'Normal'}`;
      if (exam.extremities_status === 'Abnormal') text += ` - ${exam.extremities_abnormality || ''}`;
    } else {
      text += `\nCHEST: ${exam.respiratory_status || 'Normal'}`;
      if (exam.respiratory_status === 'Abnormal' && exam.respiratory_findings) text += ` - ${exam.respiratory_findings}`;
      text += `\nCVS: ${exam.cvs_status || 'Normal'}`;
      if (exam.cvs_status === 'Abnormal') text += ` - ${exam.cvs_s1_s2 || ''} ${exam.cvs_pulse || ''}`;
      text += `\nP/A: ${exam.abdomen_status || 'Normal'}`;
      if (exam.abdomen_status === 'Abnormal' && exam.abdomen_findings) text += ` - ${exam.abdomen_findings}`;
      text += `\nCNS: ${exam.cns_status || 'Normal'}`;
      if (exam.cns_status === 'Abnormal' && exam.cns_findings) text += ` - ${exam.cns_findings}`;
      text += `\nEXTREMITIES: ${exam.extremities_status || 'Normal'}`;
      if (exam.extremities_status === 'Abnormal' && exam.extremities_findings) text += ` - ${exam.extremities_findings}`;
    }
    
    return text;
  };

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">{loading ? 'Loading...' : 'No case data found'}</p>
      </div>
    );
  }

  const vitalsAtArrival = caseData.vitals_at_arrival || {};
  const gcsTotal = (vitalsAtArrival.gcs_e || 0) + (vitalsAtArrival.gcs_v || 0) + (vitalsAtArrival.gcs_m || 0);
  const isPediatric = caseData.case_type === 'pediatric';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Action Header - Hidden on print */}
      <header className="bg-white border-b sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate(`/case/${caseId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Discharge Summary</h1>
                <p className="text-sm text-slate-600">{caseData.patient?.name} - {caseData.patient?.uhid || 'N/A'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Discharge Summary Content - Printable */}
      <main className="max-w-5xl mx-auto px-4 py-8 print:px-8 print:py-4">
        <div className="bg-white rounded-lg shadow-sm p-8 print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center mb-6 print:mb-4">
            <div className="text-xs text-slate-500 mb-2 print:hidden">(Print on Hospital Letterhead)</div>
            <h1 className="text-2xl font-bold text-slate-900">DISCHARGE SUMMARY</h1>
          </div>

          {/* Patient Info */}
          <div className="mb-4 pb-4 border-b-2 border-slate-300">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="font-semibold">UHID:</span> {caseData.patient?.uhid || 'N/A'}</div>
              <div><span className="font-semibold">Name:</span> {caseData.patient?.name || 'N/A'}</div>
              <div><span className="font-semibold">Age/Sex:</span> {caseData.patient?.age || 'N/A'} / {caseData.patient?.sex || 'N/A'}</div>
              <div><span className="font-semibold">Admission Date:</span> {caseData.patient?.arrival_datetime ? new Date(caseData.patient.arrival_datetime).toLocaleDateString('en-IN') : 'N/A'}</div>
            </div>
          </div>

          {/* MLC & Allergy */}
          <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">MLC:</span> {caseData.patient?.mlc ? 'Yes' : 'No'}</div>
            <div><span className="font-semibold">Allergy:</span> {caseData.history?.allergies?.join(', ') || 'NKDA'}</div>
          </div>

          {/* Vitals at Arrival - Single Line */}
          <div className="mb-4 text-sm">
            <span className="font-semibold">Vitals at the time of arrival: </span>
            <span>HR- {vitalsAtArrival.hr || '-'}, BP- {vitalsAtArrival.bp_systolic || '-'}/{vitalsAtArrival.bp_diastolic || '-'}, RR- {vitalsAtArrival.rr || '-'}, SpO2- {vitalsAtArrival.spo2 || '-'}%, GCS- {gcsTotal || '-'}, Pain Score- {vitalsAtArrival.pain_score || '-'}, GRBS- {vitalsAtArrival.grbs || '-'}, Temp- {vitalsAtArrival.temperature || '-'}°C</span>
          </div>

          {/* Presenting Complaints */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Presenting Complaints:</p>
            <p className="text-sm whitespace-pre-wrap">{caseData.presenting_complaint?.text || 'N/A'}</p>
          </div>

          {/* History of Present Illness */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">History of Present Illness:</p>
            <p className="text-sm whitespace-pre-wrap">{caseData.history?.hpi || 'N/A'}</p>
          </div>

          {/* Past Medical/Surgical Histories */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Past Medical/Surgical Histories:</p>
            <p className="text-sm">
              Medical: {caseData.history?.past_medical?.join(', ') || 'None'}
              <br />
              Surgical: {caseData.history?.past_surgical || 'None'}
            </p>
          </div>

          {/* Family / Gynae History */}
          <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Family / Gynae History: </span>
              {caseData.history?.family_history || caseData.history?.gyn_history || caseData.history?.family_gyn_additional_notes || 'Not significant'}
            </div>
            <div>
              <span className="font-semibold">LMP: </span>
              {caseData.history?.lmp || 'N/A'}
            </div>
          </div>

          {/* General Examination */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">General Examination / Systemic examination:</p>
            {isPediatric && caseData.pat ? (
              <p className="text-sm">
                PAT: Appearance - {caseData.pat.appearance_tone || 'Normal'}, Work of Breathing - {caseData.pat.work_of_breathing || 'Normal'}, Circulation to Skin - {caseData.pat.circulation_to_skin || 'Normal'}
              </p>
            ) : (
              <p className="text-sm">{buildSecondaryAssessment(caseData).split('\n')[0] || 'No abnormality detected'}</p>
            )}
          </div>

          {/* Primary Assessment */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Primary Assessment:</p>
            <p className="text-sm whitespace-pre-wrap">{buildPrimaryAssessment(caseData)}</p>
          </div>

          {/* Secondary Assessment */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Secondary Assessment:</p>
            <p className="text-sm whitespace-pre-wrap">{buildSecondaryAssessment(caseData)}</p>
          </div>

          {/* Course in Hospital */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Course in Hospital with Medications and Procedure:</p>
            <p className="text-sm whitespace-pre-wrap">{caseData.treatment?.course_in_hospital || caseData.er_observation?.notes || generateCourseInER(caseData)}</p>
          </div>

          {/* Investigations */}
          <div className="mb-3">
            <p className="font-semibold text-sm mb-1">Investigations:</p>
            <p className="text-sm">
              {caseData.investigations?.results_notes || 
               (caseData.investigations?.panels_selected?.length > 0 
                 ? `Ordered: ${caseData.investigations.panels_selected.join(', ')}`  
                 : 'Pending')}
            </p>
          </div>

          {/* Diagnosis at Discharge */}
          <div className="mb-4">
            <p className="font-semibold text-sm mb-1">Diagnosis at the time of discharge:</p>
            <p className="text-sm">{caseData.treatment?.differential_diagnoses?.join(', ') || 'N/A'}</p>
          </div>

          {/* EDITABLE SECTION - Discharge Medications */}
          <Card className="mb-4 print:border-0 print:shadow-none">
            <CardContent className="pt-4">
              <Label htmlFor="medications" className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Mic className="h-4 w-4 text-blue-600 print:hidden" />
                Discharge Medications: <span className="text-red-500">*</span>
              </Label>
              <VoiceTextarea
                id="medications"
                value={dischargeData.discharge_medications}
                onChange={(e) => setDischargeData({...dischargeData, discharge_medications: e.target.value})}
                placeholder="List all discharge medications with dosages and duration (required)..."
                rows={4}
                className="print:border-0"
                required
              />
            </CardContent>
          </Card>

          {/* EDITABLE - Disposition */}
          <div className="mb-4">
            <p className="font-semibold text-sm mb-2">Disposition: <span className="text-red-500">*</span></p>
            <div className="flex flex-col gap-2 text-sm print:flex-row print:gap-4">
              {['Normal Discharge', 'Discharge at Request', 'Discharge Against Medical Advice', 'Referred'].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`disp-${type}`}
                    checked={dischargeData.disposition_type === type}
                    onCheckedChange={() => setDischargeData({...dischargeData, disposition_type: type})}
                    className="print:hidden"
                  />
                  <span className="print:hidden">[</span>
                  <span className="print:inline hidden">{dischargeData.disposition_type === type ? '☑' : '☐'}</span>
                  <span className="print:hidden">]</span>
                  <Label htmlFor={`disp-${type}`} className="text-sm cursor-pointer">{type}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* EDITABLE - Condition at Discharge */}
          <div className="mb-3 text-sm">
            <span className="font-semibold">Condition at time of discharge: <span className="text-red-500">*</span> </span>
            <span className="print:hidden">
              <label className="mr-4">
                <input
                  type="radio"
                  checked={dischargeData.condition_at_discharge === 'STABLE'}
                  onChange={() => setDischargeData({...dischargeData, condition_at_discharge: 'STABLE'})}
                  className="mr-1"
                />
                STABLE
              </label>
              <label>
                <input
                  type="radio"
                  checked={dischargeData.condition_at_discharge === 'UNSTABLE'}
                  onChange={() => setDischargeData({...dischargeData, condition_at_discharge: 'UNSTABLE'})}
                  className="mr-1"
                />
                UNSTABLE
              </label>
            </span>
            <span className="hidden print:inline font-semibold">{dischargeData.condition_at_discharge}</span>
          </div>

          {/* EDITABLE - Vitals at Discharge */}
          <div className="mb-4">
            <p className="font-semibold text-sm mb-2">Vitals at the time of Discharge: <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-4 gap-2 text-sm print:grid-cols-8">
              {['hr', 'bp', 'rr', 'spo2', 'gcs', 'pain_score', 'grbs', 'temp'].map(vital => (
                <div key={vital} className="print:inline">
                  <span className="print:hidden">
                    <Label className="text-xs uppercase">{vital.replace('_', ' ')}</Label>
                    <Input
                      value={dischargeData.discharge_vitals[vital]}
                      onChange={(e) => setDischargeData({
                        ...dischargeData,
                        discharge_vitals: {...dischargeData.discharge_vitals, [vital]: e.target.value}
                      })}
                      className="h-8 text-sm"
                    />
                  </span>
                  <span className="hidden print:inline">
                    {vital.toUpperCase().replace('_', ' ')}- {dischargeData.discharge_vitals[vital] || '-'}
                    {vital !== 'temp' && ', '}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* EDITABLE - Follow-Up Advice */}
          <Card className="mb-6 print:border-0 print:shadow-none">
            <CardContent className="pt-4">
              <Label htmlFor="follow-up" className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Mic className="h-4 w-4 text-blue-600 print:hidden" />
                Follow-Up Advice: <span className="text-red-500">*</span>
              </Label>
              <VoiceTextarea
                id="follow-up"
                value={dischargeData.follow_up_advice}
                onChange={(e) => setDischargeData({...dischargeData, follow_up_advice: e.target.value})}
                placeholder="Follow-up instructions, red flags to watch for, when to return to ER (required)..."
                rows={3}
                className="print:border-0"
                required
              />
            </CardContent>
          </Card>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="text-sm">
              <p className="font-semibold">ED Resident: <span className="text-red-500">*</span></p>
              <p className="mt-1 print:hidden">
                <Input
                  value={dischargeData.ed_resident}
                  onChange={(e) => setDischargeData({...dischargeData, ed_resident: e.target.value})}
                  placeholder="Name"
                  className="h-8"
                />
              </p>
              <p className="hidden print:block mt-1">{dischargeData.ed_resident || caseData.em_resident}</p>
              <div className="mt-8 border-t border-slate-300 pt-1">
                <p className="text-xs text-slate-500">Sign and Time: {new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
              </div>
            </div>
            <div className="text-sm">
              <p className="font-semibold">ED Consultant: <span className="text-red-500">*</span></p>
              <p className="mt-1 print:hidden">
                <Input
                  value={dischargeData.ed_consultant}
                  onChange={(e) => setDischargeData({...dischargeData, ed_consultant: e.target.value})}
                  placeholder="Name"
                  className="h-8"
                />
              </p>
              <p className="hidden print:block mt-1">{dischargeData.ed_consultant || caseData.em_consultant}</p>
              <div className="mt-8 border-t border-slate-300 pt-1">
                <p className="text-xs text-slate-500">Sign and Time: {new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-center text-slate-500 mb-2">
            Date: {new Date().toLocaleDateString('en-IN', {timeZone: 'Asia/Kolkata'})}
          </div>

          {/* General Instructions - India Generic */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 text-xs text-slate-700">
            <p className="font-semibold mb-2">General Instructions:</p>
            <p className="mb-2">
              This discharge summary provides clinical information to facilitate continuity of patient care.
            </p>
            <p className="mb-1">For statutory purposes:</p>
            <ul className="list-disc ml-5 space-y-1 mb-2">
              <li>Treatment/discharge certificate available on request</li>
              <li>For disability certificate, approach a Government-constituted Medical Board</li>
            </ul>
            <p className="mb-1">Important reminders:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Keep all medications as prescribed</li>
              <li>Return to emergency department if symptoms worsen</li>
              <li>Follow up with your doctor as advised</li>
            </ul>
            <p className="mt-2 text-center">
              <span className="font-semibold">In case of emergency, contact your nearest hospital emergency department.</span>
            </p>
          </div>
        </div>
      </main>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          @page { margin: 1cm; size: A4; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:inline { display: inline !important; }
          .print\\:flex-row { flex-direction: row !important; }
          .print\\:gap-4 { gap: 1rem !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
          .print\\:py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
