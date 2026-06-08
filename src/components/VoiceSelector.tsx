// Dropdown of available en-US voices (spec §2).
//
// Renders nothing if no voices have loaded yet (avoids an empty <select> that
// looks broken — voices populate asynchronously via `voiceschanged`).

import { Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  onChange: (voice: SpeechSynthesisVoice | null) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceSelector({
  voices,
  voice,
  onChange,
  disabled,
  className,
}: VoiceSelectorProps) {
  if (voices.length === 0) return null;

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm",
        disabled && "opacity-50",
        className,
      )}
    >
      <Mic2 className="w-4 h-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">Voice</span>
      <select
        value={voice?.voiceURI ?? ""}
        onChange={(e) => {
          const next = voices.find((v) => v.voiceURI === e.target.value) ?? null;
          onChange(next);
        }}
        disabled={disabled}
        className="bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[14rem] truncate"
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}
