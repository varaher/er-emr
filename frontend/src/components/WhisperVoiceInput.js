import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/api/axios';

export default function WhisperVoiceInput({ value, onChange, className = "" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await transcribeAudio();
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      toast.info('🎤 Recording started - speak continuously', { duration: 2000 });
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded');
      return;
    }
    
    try {
      setIsTranscribing(true);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to backend
      const response = await api.post('/transcribe-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const transcription = response.data.transcription;
        
        // Append to existing text
        const newText = value ? `${value} ${transcription}` : transcription;
        onChange({ target: { value: newText } });
        
        toast.success('✅ Transcription complete', { duration: 2000 });
      }
      
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Transcription failed';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={handleMicClick}
        disabled={isTranscribing}
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        className={`absolute right-2 top-2 z-10 ${isRecording ? 'animate-pulse' : ''}`}
      >
        {isTranscribing ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Transcribing...
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
        style={{ paddingRight: '120px' }}
      />
      
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
          <span className="font-medium">Recording... Speak continuously</span>
        </div>
      )}
      
      {isTranscribing && (
        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing audio with Whisper AI...</span>
        </div>
      )}
    </div>
  );
}

// Whisper-enabled textarea component (replaces VoiceTextarea)
export function WhisperTextarea({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  rows = 4, 
  className = "",
  required = false,
  ...props 
}) {
  return (
    <div className="relative">
      <WhisperVoiceInput 
        value={value}
        onChange={onChange}
        className={`min-h-[${rows * 24}px] ${className}`}
      />
    </div>
  );
}
