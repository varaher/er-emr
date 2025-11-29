import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, StopCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function ContinuousVoiceRecorder({ onTranscriptComplete, caseSheetId }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef('');

  const languages = [
    // English
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
    
    // Indian Languages
    { code: 'hi-IN', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'Bengali (বাংলা)', flag: '🇮🇳' },
    { code: 'te-IN', name: 'Telugu (తెలుగు)', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'Marathi (मराठी)', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'Malayalam (മലയാളം)', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🇮🇳' },
    { code: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)', flag: '🇮🇳' },
    { code: 'as-IN', name: 'Assamese (অসমীয়া)', flag: '🇮🇳' },
    { code: 'ur-IN', name: 'Urdu (اردو)', flag: '🇮🇳' },
    
    // Other Languages
    { code: 'es-ES', name: 'Spanish (Español)', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'French (Français)', flag: '🇫🇷' },
    { code: 'de-DE', name: 'German (Deutsch)', flag: '🇩🇪' },
    { code: 'ar-SA', name: 'Arabic (العربية)', flag: '🇸🇦' },
    { code: 'zh-CN', name: 'Chinese (中文)', flag: '🇨🇳' },
    { code: 'ja-JP', name: 'Japanese (日本語)', flag: '🇯🇵' },
    { code: 'pt-BR', name: 'Portuguese (Português)', flag: '🇧🇷' },
    { code: 'ru-RU', name: 'Russian (Русский)', flag: '🇷🇺' },
    { code: 'ko-KR', name: 'Korean (한국어)', flag: '🇰🇷' }
  ];

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success('Recording started. Speak naturally...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      if (finalTranscript) {
        fullTranscriptRef.current += finalTranscript;
        setTranscript(fullTranscriptRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        // Restart if still in recording mode
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, [selectedLanguage]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not initialized');
      return;
    }

    fullTranscriptRef.current = '';
    setTranscript('');
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        setIsRecording(false);
        recognitionRef.current.stop();
        
        if (fullTranscriptRef.current.trim()) {
          toast.info('Processing transcript with AI...');
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('No transcript to process');
      return;
    }

    if (!caseSheetId) {
      toast.error('Please save the case first');
      return;
    }

    setIsProcessing(true);

    try {
      // Call backend AI endpoint to parse transcript and populate fields
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/parse-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          case_sheet_id: caseSheetId,
          transcript: transcript,
          source_language: selectedLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process transcript');
      }

      const result = await response.json();
      
      toast.success('Transcript processed! Case sheet fields updated.');
      onTranscriptComplete(result.parsed_data);
      
      // Clear transcript
      fullTranscriptRef.current = '';
      setTranscript('');
    } catch (error) {
      console.error('Transcript processing error:', error);
      toast.error('Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-purple-600" />
          Continuous Voice Recording with Auto-population
        </CardTitle>
        <CardDescription>
          Record patient history continuously and AI will automatically populate relevant case sheet fields
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language-select" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Select Language
          </Label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-600">
            AI will translate and extract information regardless of language spoken
          </p>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isProcessing}
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Continuous Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {/* Live Transcript Display */}
        {(isRecording || transcript) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Live Transcript:</Label>
              {isRecording && (
                <span className="flex items-center gap-2 text-red-600 text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Recording...
                </span>
              )}
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {transcript || 'Listening...'}
              </p>
            </div>
          </div>
        )}

        {/* Process Button */}
        {transcript && !isRecording && (
          <Button
            onClick={handleProcessTranscript}
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing with AI...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Process Transcript & Auto-populate Fields
              </>
            )}
          </Button>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">💡 How it works:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Click &ldquo;Start Continuous Recording&rdquo; and speak naturally</li>
            <li>Take patient history in any supported language</li>
            <li>Click &ldquo;Stop Recording&rdquo; when done</li>
            <li>AI will parse the transcript and auto-fill: HPI, symptoms, past medical history, examination findings, etc.</li>
            <li>Review and edit auto-populated fields as needed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
