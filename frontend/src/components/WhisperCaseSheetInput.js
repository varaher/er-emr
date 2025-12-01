import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/api/axios';

export default function WhisperCaseSheetInput({ 
  value, 
  onChange, 
  onExtractedData,
  section, // 'history', 'examination', or 'primary_assessment'
  placeholder = "Click 'Record' and speak...",
  rows = 4,
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
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
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
        
        // Step 2: Extract structured data (if section is provided)
        if (section && onExtractedData) {
          setIsExtracting(true);
          toast.info('🤖 AI extracting data...', { duration: 2000 });
          
          const extractResponse = await api.post('/extract-casesheet-data', {
            text: transcription,
            section: section
          });
          
          if (extractResponse.data.success) {
            setExtractedData(extractResponse.data.data);
            setShowPreview(true);
            toast.success('✅ Data extracted! Review and apply', { duration: 3000 });
          }
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

  // Format preview data based on section
  const formatPreview = () => {
    if (!extractedData) return null;

    const items = [];
    
    Object.entries(extractedData).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (Array.isArray(value) && value.length > 0) {
        items.push({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value.join(', ')
        });
      } else if (typeof value === 'string' && value.trim().length > 0) {
        items.push({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value
        });
      } else if (typeof value === 'boolean' && value === true) {
        items.push({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: 'Present'
        });
      }
    });

    return items;
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
          placeholder={placeholder}
          rows={rows}
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
            <span>AI is extracting medical data...</span>
          </div>
        )}
      </div>

      {/* Preview Card */}
      {showPreview && preview && preview.length > 0 && (
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <Sparkles className="h-5 w-5" />
                <span>AI Extracted Data</span>
              </div>

              <div className="bg-white rounded p-3 space-y-2">
                {preview.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-semibold text-slate-700">{item.label}:</span>
                    <span className="ml-2 text-slate-600">{item.value}</span>
                  </div>
                ))}
              </div>

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

      {showPreview && preview && preview.length === 0 && (
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600 italic">No extractable data found in the recording.</p>
            <Button
              onClick={handleRejectExtraction}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
