import { Input } from '@/components/ui/input';
import VoiceInput from '@/components/VoiceInput';

export function VoiceTextInput({ 
  value, 
  onChange, 
  placeholder, 
  id, 
  type = "text",
  className = "",
  disabled = false,
  ...props 
}) {
  const handleVoiceTranscript = (transcript, append) => {
    if (append && value) {
      onChange({ target: { value: `${value} ${transcript}` } });
    } else {
      onChange({ target: { value: transcript } });
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        {...props}
      />
      <VoiceInput onTranscript={handleVoiceTranscript} append={true} />
    </div>
  );
}

export function VoiceTextarea({ 
  value, 
  onChange, 
  placeholder, 
  id, 
  className = "",
  rows = 4,
  disabled = false,
  ...props 
}) {
  const handleVoiceTranscript = (transcript, append) => {
    if (append && value) {
      onChange({ target: { value: `${value} ${transcript}` } });
    } else {
      onChange({ target: { value: transcript } });
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${className}`}
        disabled={disabled}
        {...props}
      />
      <div className="flex justify-end">
        <VoiceInput onTranscript={handleVoiceTranscript} append={true} />
      </div>
    </div>
  );
}
