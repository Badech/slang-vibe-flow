// Per-answer feedback card (spec §5: "After each answer: show full
// explanation + SoundLikeNative mini-card").
//
// We re-use the full <SoundLikeNative> card but pass a `compact` flag via the
// className (it's already responsive — the wrapping styles in this card
// constrain max-height for a tighter quiz feel).

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import { SoundLikeNative } from "@/components/SoundLikeNative";
import type { Term } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface AnswerExplanationProps {
  correct: boolean;
  term: Term;
  /** Correct value to display when the user's answer was wrong. */
  correctValue?: string;
  /** What the user typed/picked. */
  userValue?: string;
  onNext: () => void;
  /** Label for the next button (e.g. "Next" or "See results"). */
  nextLabel?: string;
  className?: string;
}

export function AnswerExplanation({
  correct,
  term,
  correctValue,
  userValue,
  onNext,
  nextLabel = "Next",
  className,
}: AnswerExplanationProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-4 animate-float-up",
        correct
          ? "border-primary/40 bg-primary/5"
          : "border-destructive/40 bg-destructive/5",
        className,
      )}
    >
      <header className="flex items-center gap-2 font-bold">
        {correct ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-primary">Nailed it!</span>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">Not quite</span>
          </>
        )}
      </header>

      <div className="text-sm text-foreground space-y-1">
        <p>
          <span className="font-display text-lg">{term.term}</span>{" "}
          <span className="text-muted-foreground">— {term.definition}</span>
        </p>
        {!correct && correctValue && (
          <p className="text-xs text-muted-foreground">
            Correct answer: <span className="text-foreground font-semibold">{correctValue}</span>
            {userValue && (
              <>
                {" · "}
                Your answer: <span className="line-through">{userValue}</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Mini Sound-Like-A-Native card — same component as /learn/:id, just
          tucked inside a constrained box so the quiz flow stays tight. */}
      <details className="rounded-xl bg-card/40 border border-border" open={!correct}>
        <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Sound like a native ↓
        </summary>
        <div className="p-3 max-h-[55vh] overflow-y-auto">
          <SoundLikeNative term={term} />
        </div>
      </details>

      <button
        onClick={onNext}
        className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:scale-[1.02] transition-transform"
      >
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
