import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { VoiceTextarea } from '@/components/VoiceTextInput';
import { toast } from 'sonner';
import { ArrowLeft, Save, Printer, FileText, Mic, Download } from 'lucide-react';
import { generateDischargeSummaryPDF } from '@/utils/pdfGenerator';

export default function DischargeSummaryNew() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState(null);
  
  // Editable discharge summary fields
  const [dischargeData, setDischargeData] = useState({
    // Auto-filled from case sheet
    mlc: '',
    allergies: '',
    presenting_complaint: '',
    hopi: '',
    past_history: '',
    family_gynae_history: '',
    lmp: '',
    general_examination: '',
    primary_assessment: '',
    secondary_assessment: '',
    course_in_hospital: '',
    investigations: '',
    diagnosis: '',
    
    // Editable fields
    discharge_medications: '',
    disposition_type: 'Normal Discharge',
    condition_at_discharge: 'STABLE',
    discharge_vitals: {
      hr: '',
      bp: '',
      rr: '',
      spo2: '',
      gcs: '',
      pain_score: '',
      grbs: '',
      temp: ''
    },
    follow_up_advice: '',
    ed_resident: '',
    ed_consultant: ''
  });

  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cases/${caseId}`);
      const data = response.data;
      setCaseData(data);
      
      // Auto-fill all fields from case sheet
      const isPediatric = data.case_type === 'pediatric';
      
      setDischargeData(prev => ({
        ...prev,
        // Patient info
        mlc: data.patient?.mlc ? 'Yes' : 'No',
        allergies: data.history?.allergies?.join(', ') || data.sample?.allergies?.join(', ') || 'NKDA',
        
        // Clinical presentation
        presenting_complaint: data.presenting_complaint?.text || '',
        hopi: data.history?.hpi || data.sample?.events_hopi || '',
        past_history: `Medical: ${data.history?.past_medical?.join(', ') || data.sample?.past_medical_history || 'None'}\nSurgical: ${data.history?.past_surgical || data.sample?.past_surgeries || 'None'}`,
        family_gynae_history: data.history?.family_gyn_additional_notes || data.sample?.family_gynae_history || 'Not significant',
        lmp: data.history?.last_meal_lmp || data.sample?.last_meal_time || 'N/A',
        
        // Examination
        general_examination: buildGeneralExamination(data, isPediatric),
        primary_assessment: buildPrimaryAssessment(data, isPediatric),
        secondary_assessment: buildSecondaryAssessment(data, isPediatric),
        
        // Treatment & Course
        course_in_hospital: data.treatment?.course_in_hospital || '',
        investigations: data.investigations?.results_notes || buildInvestigationsSummary(data),
        diagnosis: data.treatment?.differential_diagnoses?.join(', ') || '',
        
        // Disposition
        ed_resident: data.em_resident || '',
        ed_consultant: data.em_consultant || ''
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
      // Save discharge summary data
      await api.post('/discharge-summary', {
        case_sheet_id: caseId,
        ...dischargeData
      });
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
    try {
      toast.info('Generating discharge summary PDF...', { duration: 2000 });
      
      const summaryData = {
        presenting_complaint: caseData.presenting_complaint?.text || 'N/A',
        clinical_course: caseData.history?.hpi || 'N/A',
        investigations_summary: caseData.investigations?.panels_selected?.join(', ') || 'N/A',
        final_diagnosis: dischargeData.differential_diagnoses || 'N/A',
        treatment_given: dischargeData.treatment_given || 'N/A',
        condition_at_discharge: dischargeData.discharge_condition || 'Stable',
        discharge_instructions: `Medications: ${dischargeData.medications || 'N/A'}\n\nFollow-up Advice: ${dischargeData.follow_up_advice || 'N/A'}\nFollow-up Date: ${dischargeData.follow_up_date || 'N/A'}`
      };

      const pdf = generateDischargeSummaryPDF(summaryData, caseData);
      const fileName = `DischargeSummary_${caseData.patient?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('✅ Discharge Summary PDF Downloaded!', {
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

  const handleDownloadWord = () => {
    try {
      toast.info('Generating Word document...', { duration: 2000 });
      
      const get = (obj, path, defaultValue = 'N/A') => {
        try {
          const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
          return value !== null && value !== undefined && value !== '' ? value : defaultValue;
        } catch {
          return defaultValue;
        }
      };

      const content = `
DISCHARGE SUMMARY
(Print on Hospital Letterhead)
Generated: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST

================================================================================

PATIENT INFORMATION
================================================================================
UHID:                  ${get(caseData, 'patient.uhid')}
Name:                  ${get(caseData, 'patient.name')}
Age/Sex:               ${get(caseData, 'patient.age')} / ${get(caseData, 'patient.sex')}
Admission Date:        ${caseData.patient?.arrival_datetime ? new Date(caseData.patient.arrival_datetime).toLocaleDateString('en-IN') : 'N/A'}
Discharge Date:        ${new Date().toLocaleDateString('en-IN')}

================================================================================

PRESENTING COMPLAINT
================================================================================
${dischargeData.presenting_complaint || caseData.presenting_complaint?.text || 'N/A'}

================================================================================

CLINICAL COURSE / COURSE IN ER
================================================================================
${dischargeData.clinical_course || caseData.history?.hpi || 'N/A'}

================================================================================

INVESTIGATIONS & RESULTS
================================================================================
${dischargeData.investigations_summary || caseData.investigations?.panels_selected?.join(', ') || 'N/A'}

================================================================================

FINAL DIAGNOSIS / DIFFERENTIAL DIAGNOSES
================================================================================
${dischargeData.differential_diagnoses || 'N/A'}

================================================================================

TREATMENT GIVEN
================================================================================
${dischargeData.treatment_given || caseData.treatment?.interventions?.join(', ') || 'N/A'}

================================================================================

CONDITION AT DISCHARGE
================================================================================
${dischargeData.discharge_condition || 'Stable'}

================================================================================

DISCHARGE INSTRUCTIONS & FOLLOW-UP
================================================================================
Medications: ${dischargeData.medications || 'N/A'}

Follow-up Advice: ${dischargeData.follow_up_advice || 'N/A'}

Follow-up Date: ${dischargeData.follow_up_date || 'N/A'}

================================================================================

SIGNATURES
================================================================================

_______________________              _______________________
EM Resident Signature                EM Consultant Signature

Dr. ${get(caseData, 'em_resident')}              Dr. ${get(caseData, 'em_consultant')}


Generated: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST
      `.trim();

      const blob = new Blob([content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DischargeSummary_${caseData.patient?.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.doc`;
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

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading case data...</p>
        </div>
      </div>
    );
  }

  const gcsTotal = (caseData.vitals_at_arrival.gcs_e || 0) + (caseData.vitals_at_arrival.gcs_v || 0) + (caseData.vitals_at_arrival.gcs_m || 0);

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
                onClick={() => navigate(`/case/${caseId}`)}
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Case
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discharge Summary</h1>
                <p className="text-sm text-slate-600">{caseData.patient.name} - {caseData.patient.uhid || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                className="border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                data-testid="download-pdf-button"
                title="Download discharge summary as PDF for printing on hospital letterhead"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
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
                onClick={handleSave}
                disabled={loading}
                data-testid="save-discharge-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Summary'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Auto-Filled Discharge Summary</h3>
                <p className="text-sm text-blue-700">
                  Patient data, vitals, complaints, examination, and investigations are auto-populated from the case sheet.
                  <span className="font-medium"> Complete the treatment details, differential diagnoses, and follow-up advice below.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Discharge Summary Document */}
          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                  EMERGENCY DEPARTMENT DISCHARGE SUMMARY
                </h2>
                <p className="text-slate-600">Hospital Name - Emergency Department</p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {/* Patient Demographics - Auto-filled */}
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700">Patient Name:</span>
                    <span className="ml-2">{caseData.patient.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Age/Sex:</span>
                    <span className="ml-2">{caseData.patient.age} / {caseData.patient.sex}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">UHID:</span>
                    <span className="ml-2 font-data">{caseData.patient.uhid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">MLC:</span>
                    <span className="ml-2">{caseData.patient.mlc ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-700">Arrival Date & Time:</span>
                    <span className="ml-2">{new Date(caseData.patient.arrival_datetime).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Vitals at Arrival - Auto-filled */}
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Vitals at Time of Arrival</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">HR</div>
                    <div className="font-data font-semibold text-slate-900">{caseData.vitals_at_arrival.hr || 'N/A'} bpm</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">BP</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.bp_systolic || 'N/A'}/{caseData.vitals_at_arrival.bp_diastolic || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">RR</div>
                    <div className="font-data font-semibold text-slate-900">{caseData.vitals_at_arrival.rr || 'N/A'} /min</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">SpO2</div>
                    <div className="font-data font-semibold text-slate-900">{caseData.vitals_at_arrival.spo2 || 'N/A'}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">Temp</div>
                    <div className="font-data font-semibold text-slate-900">{caseData.vitals_at_arrival.temperature || 'N/A'}°C</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase font-medium">GCS</div>
                    <div className="font-data font-semibold text-slate-900">
                      {gcsTotal > 0 ? `${gcsTotal}/15` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Presenting Complaint - Auto-filled */}
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Presenting Complaint</h3>
                <p className="text-sm text-slate-700">{caseData.presenting_complaint.text}</p>
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Duration:</span> {caseData.presenting_complaint.duration} | 
                  <span className="font-medium ml-2">Onset:</span> {caseData.presenting_complaint.onset_type} | 
                  <span className="font-medium ml-2">Course:</span> {caseData.presenting_complaint.course}
                </div>
              </div>

              {/* History - Auto-filled */}
              {caseData.history?.hpi && (
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">History of Present Illness</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{caseData.history.hpi}</p>
                </div>
              )}

              {/* Past Medical History - Auto-filled */}
              {caseData.history?.past_medical?.length > 0 && (
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Past Medical History</h3>
                  <p className="text-sm text-slate-700">{caseData.history.past_medical.join(', ')}</p>
                </div>
              )}

              {/* Physical Examination - Auto-filled */}
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Physical Examination</h3>
                <div className="space-y-2 text-sm">
                  {caseData.examination?.general_notes && (
                    <div><span className="font-medium">General:</span> {caseData.examination.general_notes}</div>
                  )}
                  {caseData.examination?.cvs_status && (
                    <div>
                      <span className="font-medium">CVS:</span> {caseData.examination.cvs_status}
                      {caseData.examination.cvs_status === 'Abnormal' && caseData.examination.cvs_s1_s2 && 
                        ` - ${caseData.examination.cvs_s1_s2} ${caseData.examination.cvs_pulse || ''}`}
                    </div>
                  )}
                  {caseData.examination?.respiratory_status && (
                    <div>
                      <span className="font-medium">Respiratory:</span> {caseData.examination.respiratory_status}
                      {caseData.examination.respiratory_status === 'Abnormal' && caseData.examination.respiratory_findings && 
                        ` - ${caseData.examination.respiratory_findings}`}
                    </div>
                  )}
                  {caseData.examination?.abdomen_status && (
                    <div>
                      <span className="font-medium">Abdomen:</span> {caseData.examination.abdomen_status}
                      {caseData.examination.abdomen_status === 'Abnormal' && caseData.examination.abdomen_findings && 
                        ` - ${caseData.examination.abdomen_findings}`}
                    </div>
                  )}
                  {caseData.examination?.cns_status && (
                    <div>
                      <span className="font-medium">CNS:</span> {caseData.examination.cns_status}
                      {caseData.examination.cns_status === 'Abnormal' && caseData.examination.cns_findings && 
                        ` - ${caseData.examination.cns_findings}`}
                    </div>
                  )}
                  {caseData.examination?.extremities_status && (
                    <div>
                      <span className="font-medium">Extremities:</span> {caseData.examination.extremities_status}
                      {caseData.examination.extremities_status === 'Abnormal' && caseData.examination.extremities_findings && 
                        ` - ${caseData.examination.extremities_findings}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Investigations - Auto-filled */}
              {caseData.investigations?.panels_selected?.length > 0 && (
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Investigations</h3>
                  <div className="text-sm">
                    <p className="font-medium text-slate-700 mb-2">Panels Ordered:</p>
                    <p className="text-slate-700">{caseData.investigations.panels_selected.join(', ')}</p>
                    {caseData.investigations.results_notes && (
                      <div className="mt-3">
                        <p className="font-medium text-slate-700 mb-1">Results:</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{caseData.investigations.results_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EDITABLE SECTION - Treatment Given */}
              <div className="border-b border-slate-200 pb-4 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  Course in ER & Treatment Given
                  <span className="text-xs font-normal text-amber-600 print:hidden">⚠ Complete this section</span>
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="treatment-given" className="flex items-center gap-2">
                      Treatment Details
                      <Mic className="h-3 w-3 text-slate-400" />
                    </Label>
                    <VoiceTextarea
                      id="treatment-given"
                      value={dischargeData.treatment_given}
                      onChange={(e) => setDischargeData({...dischargeData, treatment_given: e.target.value})}
                      placeholder="Document all treatments, medications given, procedures performed..."
                      rows={6}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="medications">Medications Administered</Label>
                    <Input
                      id="medications"
                      value={dischargeData.medications}
                      onChange={(e) => setDischargeData({...dischargeData, medications: e.target.value})}
                      placeholder="List all medications with doses..."
                    />
                  </div>
                </div>
              </div>

              {/* Provisional Diagnosis - Auto-filled */}
              {caseData.treatment?.provisional_diagnoses?.length > 0 && (
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Provisional Diagnosis</h3>
                  <p className="text-sm text-slate-700">{caseData.treatment.provisional_diagnoses.join(', ')}</p>
                </div>
              )}

              {/* EDITABLE SECTION - Differential Diagnosis */}
              <div className="border-b border-slate-200 pb-4 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  Differential Diagnoses
                  <span className="text-xs font-normal text-amber-600 print:hidden">⚠ Add differential diagnoses</span>
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="differential-diagnoses" className="flex items-center gap-2">
                    List of Differential Diagnoses
                    <Mic className="h-3 w-3 text-slate-400" />
                  </Label>
                  <VoiceTextarea
                    id="differential-diagnoses"
                    value={dischargeData.differential_diagnoses}
                    onChange={(e) => setDischargeData({...dischargeData, differential_diagnoses: e.target.value})}
                    placeholder="List differential diagnoses considered and ruled out..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Disposition - Auto-filled */}
              {caseData.disposition && (
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Disposition</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">Type:</span>
                      <span className="ml-2 capitalize">{caseData.disposition.type.replace('-', ' ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Condition at Discharge:</span>
                      <span className="ml-2">{caseData.disposition.condition_at_discharge}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EDITABLE SECTION - Follow-up Advice */}
              <div className="border-b border-slate-200 pb-4 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  Follow-up Advice & Discharge Instructions
                  <span className="text-xs font-normal text-amber-600 print:hidden">⚠ Complete this section</span>
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="follow-up-advice" className="flex items-center gap-2">
                      Follow-up Instructions
                      <Mic className="h-3 w-3 text-slate-400" />
                    </Label>
                    <VoiceTextarea
                      id="follow-up-advice"
                      value={dischargeData.follow_up_advice}
                      onChange={(e) => setDischargeData({...dischargeData, follow_up_advice: e.target.value})}
                      placeholder="Medications to continue, follow-up appointments, warning signs to watch for, activity restrictions..."
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="follow-up-date">Follow-up Date</Label>
                      <Input
                        id="follow-up-date"
                        type="date"
                        value={dischargeData.follow_up_date}
                        onChange={(e) => setDischargeData({...dischargeData, follow_up_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discharge-condition">Discharge Condition</Label>
                      <select
                        id="discharge-condition"
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={dischargeData.discharge_condition}
                        onChange={(e) => setDischargeData({...dischargeData, discharge_condition: e.target.value})}
                      >
                        <option value="Stable">Stable</option>
                        <option value="Improved">Improved</option>
                        <option value="Unchanged">Unchanged</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4">
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="font-semibold text-slate-700">EM Resident</p>
                    <p className="mt-2 text-slate-900">{caseData.em_resident}</p>
                    <div className="mt-4 border-t border-slate-300 pt-1">
                      <p className="text-xs text-slate-500">Signature & Date</p>
                    </div>
                  </div>
                  {caseData.em_consultant && (
                    <div>
                      <p className="font-semibold text-slate-700">EM Consultant</p>
                      <p className="mt-2 text-slate-900">{caseData.em_consultant}</p>
                      <div className="mt-4 border-t border-slate-300 pt-1">
                        <p className="text-xs text-slate-500">Signature & Date</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  <p>Prepared on: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
