import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, FileText, Printer } from 'lucide-react';

export default function DischargeSummary() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable discharge summary fields
  const [dischargeData, setDischargeData] = useState({
    differential_diagnoses: '',
    treatment_given: '',
    follow_up_advice: ''
  });

  useEffect(() => {
    fetchCaseAndSummary();
  }, [caseId]);

  useEffect(() => {
    // Auto-fill treatment notes from case sheet if available
    if (caseData && !dischargeData.treatment_given) {
      setDischargeData(prev => ({
        ...prev,
        treatment_given: caseData.treatment?.intervention_notes || '',
        differential_diagnoses: caseData.treatment?.differential_diagnoses?.join(', ') || ''
      }));
    }
  }, [caseData]);

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

  const handlePrint = () => {
    window.print();
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
            <Button onClick={() => navigate('/')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/case/${id}`)}
                data-testid="back-to-case"
              >
                Back to Case Sheet
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discharge Summary</h1>
                <p className="text-sm text-slate-600">{caseData.patient.name} - {caseData.patient.uhid || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!summary && (
                <Button 
                  onClick={handleGenerate} 
                  disabled={generating}
                  data-testid="generate-summary-button"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate with AI'}
                </Button>
              )}
              {summary && (
                <Button 
                  variant="outline" 
                  onClick={handlePrint}
                  data-testid="print-button"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!caseData ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading case data...</p>
          </div>
        ) : !summary ? (
          <Card>
            <CardHeader>
              <CardTitle>No Discharge Summary Available</CardTitle>
              <CardDescription>Generate an AI-powered discharge summary for this case</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">
                Click the button above to automatically generate a comprehensive discharge summary using AI
              </p>
              <Button 
                size="lg" 
                onClick={handleGenerate} 
                disabled={generating}
                data-testid="generate-summary-button-center"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {generating ? 'Generating Summary...' : 'Generate Discharge Summary'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="print:shadow-none print:border-0">
            <CardHeader className="print:pb-4">
              <div className="text-center border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Emergency Department Discharge Summary
                </h1>
                <p className="text-slate-600">Hospital Name - Emergency Department</p>
              </div>
              
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
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Vitals at Arrival */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Vitals at Time of Arrival
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs uppercase">HR</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.hr || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase">BP</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.bp_systolic || 'N/A'}/{caseData.vitals_at_arrival.bp_diastolic || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase">RR</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.rr || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase">SpO2</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.spo2 || 'N/A'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase">Temp</div>
                    <div className="font-data font-semibold text-slate-900">
                      {caseData.vitals_at_arrival.temperature || 'N/A'}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase">GCS</div>
                    <div className="font-data font-semibold text-slate-900">
                      E{caseData.vitals_at_arrival.gcs_e || '-'}V{caseData.vitals_at_arrival.gcs_v || '-'}M{caseData.vitals_at_arrival.gcs_m || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Generated Summary */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                  Clinical Summary
                </h3>
                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
{summary.summary_text}
                  </pre>
                </div>
              </div>

              {/* Disposition */}
              {caseData.disposition && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                    Disposition
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">Type:</span>
                      <span className="ml-2 capitalize">{caseData.disposition.type.replace('-', ' ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Condition at Discharge:</span>
                      <span className="ml-2">{caseData.disposition.condition_at_discharge}</span>
                    </div>
                    {caseData.disposition.advice && (
                      <div>
                        <span className="font-semibold text-slate-700">Follow-up Advice:</span>
                        <p className="mt-1 text-slate-700">{caseData.disposition.advice}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="font-semibold text-slate-700">EM Resident</p>
                    <p className="mt-2 text-slate-900">{caseData.em_resident}</p>
                    <div className="mt-4 border-t border-slate-300 pt-1">
                      <p className="text-xs text-slate-500">Signature</p>
                    </div>
                  </div>
                  {caseData.em_consultant && (
                    <div>
                      <p className="font-semibold text-slate-700">EM Consultant</p>
                      <p className="mt-2 text-slate-900">{caseData.em_consultant}</p>
                      <div className="mt-4 border-t border-slate-300 pt-1">
                        <p className="text-xs text-slate-500">Signature</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  <p>Generated on: {new Date(summary.generated_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <style jsx>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
