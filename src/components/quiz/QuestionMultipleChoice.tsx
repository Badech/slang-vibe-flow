// Multiple-choice + reverse-lookup + context-pick share an identical UI —
// pick one of N options. Differences are in the prompt + correct index,
// which the parent supplies. So we have ONE component that backs three of
// the four question types (spec §5 a, c, d).

import { cn } from "@/lib/utils";

export interface QuestionOptionsProps {
  options: string[];
  correctIndex: number;
  picked: number | null;
  onPick: (index: number, isCorrect: boolean) => void;
  disabled: boolean;
}

export function QuestionOptions({ options, correctIndex, picked, onPick, disabled }: QuestionOptionsProps) {
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const isPicked = picked === i;
        const isRight = i === correctIndex;
        const reveal = disabled;
        const cls = !reveal
          ? "border-border hover:border-primary/50 hover:bg-card"
          : isRight
            ? "border-primary bg-primary/10 text-foreground"
            : isPicked
              ? "border-destructive bg-destructive/10 text-foreground"
              : "border-border opacity-50";
        return (
          <button
            key={`${i}-${opt}`}
            disabled={disabled}
            onClick={() => onPick(i, i === correctIndex)}
            className={cn(
              "w-full text-left px-4 py-3.5 rounded-xl border transition-all",
              cls,
            )}
          >
            <span className="font-semibold text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
