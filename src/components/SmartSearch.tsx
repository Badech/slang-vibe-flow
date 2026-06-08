// Smart search bar (spec §8).
//
// Features:
//   - 300ms debounced query
//   - Match highlighting in results (via `highlightMatch` export used by TermCard)
//   - Recent searches in localStorage (`slangflow-recent-searches`), shown as chips
//   - Filter persistence in localStorage (`slangflow-filters`) via useSavedFilters
//   - Empty state with "Did you mean …?" suggestion using Levenshtein
//
// This component is presentational — it owns the input + chips and calls
// `onQueryChange(debouncedValue)` upward. The parent (browse.tsx) does the
// filtering and rendering of results.

import { Search, X, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { closestMatch } from "@/lib/levenshtein";

const RECENT_KEY = "slangflow-recent-searches";
const RECENT_MAX = 5;

export interface SmartSearchProps {
  /** Initial value. */
  defaultValue?: string;
  /** Fires after 300ms debounce. */
  onQueryChange: (q: string) => void;
  /** Candidate terms used for "did you mean" suggestions. */
  candidates: string[];
  /** Live result count — used to render the empty state. */
  resultCount: number;
  placeholder?: string;
  className?: string;
}

export function SmartSearch({
  defaultValue = "",
  onQueryChange,
  candidates,
  resultCount,
  placeholder = "Search idioms, slang, or definitions…",
  className,
}: SmartSearchProps) {
  const [raw, setRaw] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [recent, setRecent] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  // Load recents on mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      // Ignore parse errors; storage will be repaired on next save.
    }
  }, []);

  // Debounce input (300ms per spec).
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebounced(raw), 300) as unknown as number;
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [raw]);

  // Propagate debounced value upward.
  useEffect(() => {
    onQueryChange(debounced);
  }, [debounced, onQueryChange]);

  // Save to recents when the user stops typing AND results were found.
  useEffect(() => {
    if (!debounced.trim() || resultCount === 0) return;
    setRecent((prev) => {
      const next = [debounced, ...prev.filter((r) => r.toLowerCase() !== debounced.toLowerCase())].slice(0, RECENT_MAX);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable (private mode); ignore.
      }
      return next;
    });
  }, [debounced, resultCount]);

  // "Did you mean …?" — only when query is non-empty AND zero results.
  const suggestion = useMemo(() => {
    if (!debounced.trim() || resultCount > 0) return null;
    const best = closestMatch(debounced, candidates);
    if (!best) return null;
    // Only suggest if distance is plausibly close (≤ 40% of query length).
    if (best.distance > Math.max(2, Math.floor(debounced.length * 0.4))) return null;
    return best.match;
  }, [debounced, resultCount, candidates]);

  const handleClear = () => {
    setRaw("");
    setDebounced("");
  };

  const handleRecentClick = (q: string) => setRaw(q);

  const handleClearRecents = () => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden />
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          aria-label="Search SlangFlow"
          className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-card border border-border focus:border-primary outline-none transition-colors text-foreground"
        />
        {raw && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Did-you-mean — render only when query non-empty + zero results */}
      {debounced.trim() && resultCount === 0 && suggestion && (
        <div className="text-sm text-muted-foreground">
          No results for <span className="text-foreground font-semibold">"{debounced}"</span> — did you mean{" "}
          <button
            type="button"
            onClick={() => setRaw(suggestion)}
            className="text-primary hover:underline font-semibold"
          >
            {suggestion}
          </button>
          ?
        </div>
      )}
      {debounced.trim() && resultCount === 0 && !suggestion && (
        <div className="text-sm text-muted-foreground">
          No results for <span className="text-foreground font-semibold">"{debounced}"</span>.
        </div>
      )}

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
            <Clock className="w-3 h-3" /> Recent
          </span>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRecentClick(r)}
              className="px-3 py-1 rounded-full text-xs border border-border bg-card hover:border-primary/50 hover:text-primary transition-colors"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearRecents}
            className="text-xs text-muted-foreground hover:text-foreground ml-1"
            aria-label="Clear recent searches"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ── Highlight helper used by TermCard for substring highlighting ────────────

export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/30 text-accent-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Saved filters hook (localStorage persistence per spec §8) ───────────────

const FILTERS_KEY = "slangflow-filters";

export interface SavedFilters {
  type?: string;
  category?: string;
  difficulty?: number | "all";
  status?: string;
  sort?: string;
}

export function loadSavedFilters(): SavedFilters {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    return raw ? (JSON.parse(raw) as SavedFilters) : {};
  } catch {
    return {};
  }
}

export function saveFilters(f: SavedFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    // Storage may be unavailable; non-fatal.
  }
}
