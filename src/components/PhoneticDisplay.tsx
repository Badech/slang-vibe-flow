// Styled IPA phonetic badge displayed next to the speaker button (spec §2).
//
// Renders nothing if no phonetic string is provided — keeps the layout clean
// for terms that don't have one.

import { cn } from "@/lib/utils";

export interface PhoneticDisplayProps {
  phonetic?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PhoneticDisplay({ phonetic, className, size = "md" }: PhoneticDisplayProps) {
  if (!phonetic) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/60 font-mono text-muted-foreground",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className,
      )}
      aria-label={`Phonetic spelling ${phonetic}`}
    >
      {phonetic}
    </span>
  );
}
