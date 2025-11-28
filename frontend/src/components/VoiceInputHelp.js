import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, AlertCircle, CheckCircle } from 'lucide-react';

export default function VoiceInputHelp() {
  return (
    <Card className="bg-gradient-to-br from-sky-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sky-900">
          <Mic className="h-5 w-5" />
          Voice Input Quick Guide
        </CardTitle>
        <CardDescription>How to use voice dictation effectively</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Getting Started
          </h4>
          <ul className="text-sm text-slate-700 space-y-1 ml-6 list-disc">
            <li>Click the <Mic className="h-3 w-3 inline" /> icon next to any text field</li>
            <li>Allow microphone access when prompted</li>
            <li>Wait for "Listening..." notification</li>
            <li>Speak clearly at normal pace</li>
            <li>Click microphone again to stop</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Tips for Best Results
          </h4>
          <ul className="text-sm text-slate-700 space-y-1 ml-6 list-disc">
            <li>Speak in a quiet environment</li>
            <li>Use clear pronunciation for medical terms</li>
            <li>Say "period" or "comma" for punctuation</li>
            <li>Mix voice and keyboard as needed</li>
            <li>Review and edit after dictation</li>
          </ul>
        </div>

        <div className="pt-3 border-t border-sky-200">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Privacy:</span> Voice processing happens locally in your browser. 
            No audio recordings are stored.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
