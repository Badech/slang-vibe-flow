// Fill-in-the-blank input (spec §5 type b).
//
// Accepts a case-insensitive match with light normalisation (collapses
// multiple spaces, strips trailing punctuation) so users aren't punished
// for typing "rn." vs "rn".

import { cn } from "@/lib/utils";

export interface QuestionFillProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (isCorrect: boolean) => void;
  expected: string;
  disabled: boolean;
}

export function normaliseAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?,;:]+$/g, "");
}

export function QuestionFill({ value, onChange, onSubmit, expected, disabled }: QuestionFillProps) {
  const handleSubmit = () => {
    const isCorrect = normaliseAnswer(value) === normaliseAnswer(expected);
    onSubmit(isCorrect);
  };

  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled && value.trim()) handleSubmit();
        }}
        disabled={disabled}
        placeholder="Type your answer…"
        autoFocus
        className={cn(
          "w-full px-4 py-3.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-lg font-mono",
          disabled && "opacity-70",
        )}
      />
      {!disabled && (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="w-full px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      )}
    </>
  );
}
