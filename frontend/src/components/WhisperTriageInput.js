import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/api/axios';

export default function WhisperTriageInput({ 
  value, 
  onChange, 
  onExtractedData,
  className = "" 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,  // Higher quality for medical accuracy
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true  // Auto-adjust volume for consistent quality
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        await transcribeAndExtract();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.info('🎤 Recording started', { duration: 2000 });
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const transcribeAndExtract = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded');
      return;
    }
    
    try {
      // Step 1: Transcribe audio
      setIsTranscribing(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeResponse = await api.post('/transcribe-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (transcribeResponse.data.success) {
        const transcription = transcribeResponse.data.transcription;
        const newText = value ? `${value} ${transcription}` : transcription;
        onChange({ target: { value: newText } });
        toast.success('✅ Transcription complete', { duration: 2000 });
        
        setIsTranscribing(false);
        
        // Step 2: Extract structured data
        setIsExtracting(true);
        toast.info('🤖 AI extracting data...', { duration: 2000 });
        
        const extractResponse = await api.post('/extract-triage-data', {
          text: transcription
        });
        
        if (extractResponse.data.success) {
          setExtractedData(extractResponse.data.data);
          setShowPreview(true);
          toast.success('✅ Data extracted! Review and apply', { duration: 3000 });
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Process failed';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
      setIsExtracting(false);
      audioChunksRef.current = [];
    }
  };

  const handleApplyExtraction = () => {
    if (extractedData && onExtractedData) {
      onExtractedData(extractedData);
      setShowPreview(false);
      setExtractedData(null);
      toast.success('✅ Data applied successfully!', { duration: 2000 });
    }
  };

  const handleRejectExtraction = () => {
    setShowPreview(false);
    setExtractedData(null);
    toast.info('Extraction rejected', { duration: 2000 });
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Format preview data
  const formatPreview = () => {
    if (!extractedData) return null;

    const vitals = [];
    const symptoms = [];

    // Format vitals
    if (extractedData.vitals) {
      const v = extractedData.vitals;
      if (v.hr) vitals.push(`HR: ${v.hr} bpm`);
      if (v.bp_systolic && v.bp_diastolic) vitals.push(`BP: ${v.bp_systolic}/${v.bp_diastolic} mmHg`);
      if (v.rr) vitals.push(`RR: ${v.rr}/min`);
      if (v.spo2) vitals.push(`SpO2: ${v.spo2}%`);
      if (v.temperature) vitals.push(`Temp: ${v.temperature}°C`);
      if (v.gcs_e || v.gcs_v || v.gcs_m) {
        vitals.push(`GCS: E${v.gcs_e || '-'}/V${v.gcs_v || '-'}/M${v.gcs_m || '-'}`);
      }
      if (v.capillary_refill) vitals.push(`CRT: ${v.capillary_refill}s`);
    }

    // Format symptoms (only true ones)
    if (extractedData.symptoms) {
      const symptomLabels = {
        obstructed_airway: 'Obstructed Airway',
        facial_burns: 'Facial Burns',
        stridor: 'Stridor',
        severe_respiratory_distress: 'Severe Resp Distress',
        moderate_respiratory_distress: 'Moderate Resp Distress',
        mild_respiratory_symptoms: 'Mild Resp Symptoms',
        cyanosis: 'Cyanosis',
        apnea: 'Apnea',
        shock: 'Shock',
        severe_bleeding: 'Severe Bleeding',
        cardiac_arrest: 'Cardiac Arrest',
        chest_pain: 'Chest Pain',
        chest_pain_with_hypotension: 'Chest Pain + Hypotension',
        seizure_ongoing: 'Seizure (Ongoing)',
        seizure_controlled: 'Seizure (Controlled)',
        confusion: 'Confusion',
        focal_deficits: 'Focal Deficits',
        lethargic_unconscious: 'Lethargic/Unconscious',
        major_trauma: 'Major Trauma',
        moderate_trauma: 'Moderate Trauma',
        minor_injury: 'Minor Injury',
        severe_burns: 'Severe Burns',
        anaphylaxis: 'Anaphylaxis',
        suspected_stroke: 'Suspected Stroke',
        sepsis: 'Sepsis',
        gi_bleed: 'GI Bleed',
        fever: 'Fever',
        non_blanching_rash: 'Non-blanching Rash',
        severe_dehydration: 'Severe Dehydration',
        moderate_dehydration: 'Moderate Dehydration',
        abdominal_pain_severe: 'Severe Abdominal Pain',
        abdominal_pain_moderate: 'Moderate Abdominal Pain',
        abdominal_pain_mild: 'Mild Abdominal Pain'
      };

      Object.entries(extractedData.symptoms).forEach(([key, value]) => {
        if (value === true) {
          symptoms.push(symptomLabels[key] || key);
        }
      });
    }

    return { vitals, symptoms };
  };

  const preview = showPreview ? formatPreview() : null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Button
          type="button"
          onClick={handleMicClick}
          disabled={isTranscribing || isExtracting}
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
          className={`absolute right-2 top-2 z-10 ${isRecording ? 'animate-pulse' : ''}`}
        >
          {isTranscribing || isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {isTranscribing ? 'Transcribing...' : 'Extracting...'}
            </>
          ) : isRecording ? (
            <>
              <MicOff className="h-4 w-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-1" />
              Record
            </>
          )}
        </Button>
        
        <textarea
          value={value}
          onChange={onChange}
          className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${className}`}
          style={{ paddingRight: '140px' }}
        />
        
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            <span className="font-medium">Recording... Speak continuously</span>
          </div>
        )}
        
        {isExtracting && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>AI is extracting vitals and symptoms...</span>
          </div>
        )}
      </div>

      {/* Preview Card */}
      {showPreview && preview && (
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <Sparkles className="h-5 w-5" />
                <span>AI Extracted Data</span>
              </div>

              {preview.vitals.length > 0 && (
                <div className="bg-white rounded p-3">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">📊 Vitals:</h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.vitals.map((vital, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        {vital}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preview.symptoms.length > 0 && (
                <div className="bg-white rounded p-3">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">🩺 Symptoms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.symptoms.map((symptom, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preview.vitals.length === 0 && preview.symptoms.length === 0 && (
                <p className="text-sm text-slate-600 italic">No vitals or symptoms detected in the recording.</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleApplyExtraction}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply to Form
                </Button>
                <Button
                  onClick={handleRejectExtraction}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
