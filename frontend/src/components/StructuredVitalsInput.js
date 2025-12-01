import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/api/axios';

const VITAL_PROMPTS = [
  { key: 'hr', label: 'Heart Rate', prompt: 'Heart rate?', unit: 'bpm', field: 'hr', range: [40, 180] },
  { key: 'bp', label: 'Blood Pressure', prompt: 'Blood pressure?', unit: 'mmHg', fields: ['bp_systolic', 'bp_diastolic'], range: [[70, 200], [40, 120]] },
  { key: 'rr', label: 'Respiratory Rate', prompt: 'Respiratory rate?', unit: '/min', field: 'rr', range: [8, 40] },
  { key: 'spo2', label: 'SpO2', prompt: 'Oxygen saturation?', unit: '%', field: 'spo2', range: [70, 100] },
  { key: 'temperature', label: 'Temperature', prompt: 'Temperature?', unit: '°C or °F', field: 'temperature', range: [35, 42] },
  { key: 'gcs', label: 'GCS', prompt: 'GCS - Eye, Verbal, Motor?', unit: 'E/V/M', fields: ['gcs_e', 'gcs_v', 'gcs_m'], range: [[1,4], [1,5], [1,6]] }
];

export default function StructuredVitalsInput({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vitalsData, setVitalsData] = useState({});
  const [currentValue, setCurrentValue] = useState('');
  const [warnings, setWarnings] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  const currentPrompt = VITAL_PROMPTS[currentStep];

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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
        await processVoiceInput();
      };
      
      mediaRecorder.start();
      setIsListening(true);
      
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processVoiceInput = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeResponse = await api.post('/transcribe-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (transcribeResponse.data.success) {
        const transcription = transcribeResponse.data.transcription.trim();
        setCurrentValue(transcription);
        
        // Parse the value based on current prompt
        parseVitalValue(transcription);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process voice input');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const parseVitalValue = (text) => {
    const prompt = currentPrompt;
    const newData = { ...vitalsData };
    const newWarnings = [...warnings];

    // Parse based on vital type
    if (prompt.key === 'hr') {
      const match = text.match(/\d+/);
      if (match) {
        const value = parseInt(match[0]);
        newData.hr = value;
        if (value < prompt.range[0] || value > prompt.range[1]) {
          newWarnings.push(`⚠️ HR ${value} is outside normal range (${prompt.range[0]}-${prompt.range[1]})`);
        }
      }
    } else if (prompt.key === 'bp') {
      const match = text.match(/(\d+)\s*(?:over|\/)\s*(\d+)/i) || text.match(/(\d+)\s+(\d+)/);
      if (match) {
        const systolic = parseInt(match[1]);
        const diastolic = parseInt(match[2]);
        newData.bp_systolic = systolic;
        newData.bp_diastolic = diastolic;
        if (systolic < prompt.range[0][0] || systolic > prompt.range[0][1]) {
          newWarnings.push(`⚠️ Systolic BP ${systolic} is outside normal range (${prompt.range[0][0]}-${prompt.range[0][1]})`);
        }
        if (diastolic < prompt.range[1][0] || diastolic > prompt.range[1][1]) {
          newWarnings.push(`⚠️ Diastolic BP ${diastolic} is outside normal range (${prompt.range[1][0]}-${prompt.range[1][1]})`);
        }
      }
    } else if (prompt.key === 'rr') {
      const match = text.match(/\d+/);
      if (match) {
        const value = parseInt(match[0]);
        newData.rr = value;
        if (value < prompt.range[0] || value > prompt.range[1]) {
          newWarnings.push(`⚠️ RR ${value} is outside normal range (${prompt.range[0]}-${prompt.range[1]})`);
        }
      }
    } else if (prompt.key === 'spo2') {
      const match = text.match(/\d+/);
      if (match) {
        const value = parseInt(match[0]);
        newData.spo2 = value;
        if (value < prompt.range[0]) {
          newWarnings.push(`🚨 CRITICAL: SpO2 ${value}% - Consider oxygen supplementation!`);
        }
      }
    } else if (prompt.key === 'temperature') {
      const match = text.match(/(\d+\.?\d*)/);
      if (match) {
        const value = parseFloat(match[1]);
        // Convert F to C if needed
        const tempC = value > 50 ? (value - 32) * 5/9 : value;
        newData.temperature = tempC;
        if (tempC < prompt.range[0] || tempC > prompt.range[1]) {
          newWarnings.push(`⚠️ Temperature ${tempC.toFixed(1)}°C is abnormal`);
        }
      }
    } else if (prompt.key === 'gcs') {
      const match = text.match(/[eE]\s*(\d+).*?[vV]\s*(\d+).*?[mM]\s*(\d+)/i) || 
                    text.match(/(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        const e = parseInt(match[1]);
        const v = parseInt(match[2]);
        const m = parseInt(match[3]);
        newData.gcs_e = e;
        newData.gcs_v = v;
        newData.gcs_m = m;
        const total = e + v + m;
        if (total < 9) {
          newWarnings.push(`🚨 CRITICAL: GCS ${total} (E${e}V${v}M${m}) - Severe impairment!`);
        } else if (total < 13) {
          newWarnings.push(`⚠️ GCS ${total} (E${e}V${v}M${m}) - Moderate impairment`);
        }
      }
    }

    setVitalsData(newData);
    setWarnings(newWarnings);
  };

  const handleNext = () => {
    if (currentStep < VITAL_PROMPTS.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentValue('');
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentValue('');
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = () => {
    onComplete({
      vitals: vitalsData,
      warnings: warnings
    });
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const progress = ((currentStep + 1) / VITAL_PROMPTS.length) * 100;

  return (
    <Card className="border-2 border-green-400 bg-green-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-green-900 mb-1">
              🎯 Structured Vitals Input
            </h3>
            <p className="text-sm text-green-700">
              AI will ask for each vital one by one
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center text-gray-600">
            Step {currentStep + 1} of {VITAL_PROMPTS.length}
          </p>

          {/* Current Prompt */}
          <div className="p-4 bg-white rounded-lg border-2 border-green-500">
            <p className="text-2xl font-bold text-green-900 mb-2">
              {currentPrompt.prompt}
            </p>
            <p className="text-sm text-gray-600">
              {currentPrompt.label} ({currentPrompt.unit})
            </p>
          </div>

          {/* Voice Input */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleMicClick}
              disabled={isProcessing}
              variant={isListening ? "destructive" : "default"}
              size="lg"
              className={`w-32 h-32 rounded-full ${isListening ? 'animate-pulse' : ''}`}
            >
              {isProcessing ? (
                <Loader2 className="h-12 w-12 animate-spin" />
              ) : isListening ? (
                <MicOff className="h-12 w-12" />
              ) : (
                <Mic className="h-12 w-12" />
              )}
            </Button>
            <p className="text-sm font-semibold">
              {isProcessing ? 'Processing...' : isListening ? 'Listening... Speak now!' : 'Click to speak'}
            </p>
          </div>

          {/* Current Value */}
          {currentValue && (
            <div className="p-3 bg-blue-50 border border-blue-300 rounded">
              <p className="text-sm font-semibold text-blue-900">Heard:</p>
              <p className="text-lg text-blue-700">{currentValue}</p>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-400 rounded space-y-1">
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-sm text-amber-900">{warning}</p>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            <Button onClick={handlePrevious} disabled={currentStep === 0} variant="outline" className="flex-1">
              Previous
            </Button>
            <Button onClick={handleSkip} variant="outline" className="flex-1">
              Skip
            </Button>
            <Button onClick={handleNext} className="flex-1 bg-green-600 hover:bg-green-700">
              {currentStep === VITAL_PROMPTS.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>

          <Button onClick={onCancel} variant="ghost" className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
