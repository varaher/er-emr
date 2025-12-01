import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { WhisperTextarea } from '@/components/WhisperVoiceInput';

export default function WhisperTest() {
  const navigate = useNavigate();
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [text3, setText3] = useState('');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">🎤 Whisper Voice Input Test</h1>
              <p className="text-sm text-slate-600">Test continuous voice recording with OpenAI Whisper</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">✨ How to Test:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal ml-5">
            <li>Click the "Record" button (microphone icon)</li>
            <li>Start speaking - you can talk continuously for minutes</li>
            <li>Click "Stop" when done</li>
            <li>Wait 2-3 seconds for AI transcription</li>
            <li>Your text will appear automatically!</li>
          </ol>
          <div className="mt-3 p-2 bg-blue-100 rounded">
            <p className="text-xs text-blue-900">
              <strong>💡 Tip:</strong> No more disconnections! Speak as long as you need. Whisper AI handles medical terminology excellently.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Test Field 1 - Chief Complaint */}
          <Card>
            <CardHeader>
              <CardTitle>Test 1: Chief Complaint</CardTitle>
              <CardDescription>Try dictating a patient's chief complaint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Chief Complaint</Label>
                <WhisperTextarea
                  value={text1}
                  onChange={(e) => setText1(e.target.value)}
                  placeholder="Record: 'Patient presents with chest pain radiating to left arm, associated with shortness of breath for 2 hours...'"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Field 2 - History of Present Illness */}
          <Card>
            <CardHeader>
              <CardTitle>Test 2: History of Present Illness (Long Form)</CardTitle>
              <CardDescription>Test continuous recording for 1-2 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>HOPI</Label>
                <WhisperTextarea
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  placeholder="Record a detailed history - speak for 1-2 minutes continuously..."
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Field 3 - Course in Hospital */}
          <Card>
            <CardHeader>
              <CardTitle>Test 3: Course in Hospital</CardTitle>
              <CardDescription>Test with medical procedures and medications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Course in Hospital</Label>
                <WhisperTextarea
                  value={text3}
                  onChange={(e) => setText3(e.target.value)}
                  placeholder="Record: 'Patient received IV normal saline 500ml stat, injection pantoprazole 40mg IV...'"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          <Card className="bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">📋 Transcription Results</CardTitle>
              <CardDescription className="text-green-700">All your recorded text appears here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {text1 && (
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-xs font-semibold text-green-800 mb-1">Field 1:</p>
                    <p className="text-sm">{text1}</p>
                  </div>
                )}
                {text2 && (
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-xs font-semibold text-green-800 mb-1">Field 2:</p>
                    <p className="text-sm">{text2}</p>
                  </div>
                )}
                {text3 && (
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-xs font-semibold text-green-800 mb-1">Field 3:</p>
                    <p className="text-sm">{text3}</p>
                  </div>
                )}
                {!text1 && !text2 && !text3 && (
                  <p className="text-sm text-slate-500 italic">Start recording to see transcription results...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
