// Toggle between normal (0.85) and slow (0.6) playback rates.
// Visual indicator shows which mode is active (spec §2).

import { Turtle, Rabbit } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlowModeToggleProps {
  slow: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function SlowModeToggle({ slow, onToggle, disabled, className }: SlowModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={slow}
      aria-label={slow ? "Slow mode on" : "Slow mode off"}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        slow
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
        className,
      )}
    >
      {slow ? <Turtle className="w-4 h-4" /> : <Rabbit className="w-4 h-4" />}
      <span>{slow ? "Slow" : "Normal"}</span>
      <span
        className={cn(
          "ml-1 text-[10px] font-mono rounded px-1.5 py-0.5",
          slow ? "bg-accent/20" : "bg-muted",
        )}
      >
        {slow ? "0.6×" : "0.85×"}
      </span>
    </button>
  );
}
