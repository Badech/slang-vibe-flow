// Big "Hear it" button. Pulses while the utterance is mid-flight (spec §2:
// "animates with CSS pulse keyframes while utterance is active").
//
// Decoupled from the hook so it can be reused in mini player contexts (e.g.
// quiz answer explanation, term cards) — just pass `isSpeaking` + `onClick`.

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpeakerButtonProps {
  onClick: () => void;
  isSpeaking: boolean;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SpeakerButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-6 py-3.5 text-base",
};

const ICON_SIZES: Record<NonNullable<SpeakerButtonProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-5 h-5",
};

export function SpeakerButton({
  onClick,
  isSpeaking,
  disabled = false,
  label = "Hear it",
  size = "md",
  className,
}: SpeakerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isSpeaking ? "Speaking…" : label}
      aria-live="polite"
      className={cn(
        "relative inline-flex items-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-transform",
        "hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        isSpeaking && "animate-speak-pulse shadow-[0_0_0_4px_rgba(255,255,255,0.08)]",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Animated ring while speaking — purely decorative, behind the button. */}
      {isSpeaking && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl animate-speak-ring bg-primary/40"
        />
      )}
      <span className="relative flex items-center gap-2">
        {disabled ? (
          <VolumeX className={ICON_SIZES[size]} />
        ) : (
          <Volume2 className={cn(ICON_SIZES[size], isSpeaking && "animate-bounce-mini")} />
        )}
        {label}
      </span>
    </button>
  );
}
