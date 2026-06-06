import { Link } from "@tanstack/react-router";
import type { Term } from "@/lib/types";
import { Heart, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/store";

const TYPE_COLORS: Record<string, string> = {
  idiom: "bg-primary/15 text-primary border-primary/30",
  text_slang: "bg-accent/15 text-accent border-accent/30",
  abbreviation: "bg-chart-3/15 text-chart-3 border-chart-3/30",
};
const TYPE_LABEL: Record<string, string> = {
  idiom: "IDIOM",
  text_slang: "TEXT SLANG",
  abbreviation: "ABBR",
};

export function TermCard({ term, highlight }: { term: Term; highlight?: string }) {
  const progress = useApp((s) => s.progress[term.id]);
  const isLearned = progress?.status === "learned" || progress?.status === "mastered";
  const isFav = progress?.favorited;

  const diffDots = [1, 2, 3].map((n) => (
    <span
      key={n}
      className={`w-1.5 h-1.5 rounded-full ${n <= term.difficulty ? "bg-primary" : "bg-muted"}`}
    />
  ));

  const renderHighlighted = (text: string) => {
    if (!highlight) return text;
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    return text.split(re).map((part, i) =>
      re.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <Link
      to="/learn/$id"
      params={{ id: term.id }}
      className="group relative block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${TYPE_COLORS[term.type]}`}>
          {TYPE_LABEL[term.type]}
        </span>
        <div className="flex items-center gap-1">{diffDots}</div>
      </div>
      <h3 className="font-display text-2xl leading-tight text-foreground mb-1.5">
        {renderHighlighted(term.term)}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {renderHighlighted(term.definition)}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{term.category}</span>
        <div className="flex items-center gap-2">
          {isFav && <Heart className="w-3.5 h-3.5 text-accent fill-accent" />}
          {isLearned && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
        </div>
      </div>
    </Link>
  );
}