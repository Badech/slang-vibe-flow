import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Layout } from "@/components/Layout";
import { SmartSearch, loadSavedFilters, saveFilters } from "@/components/SmartSearch";
import { TermCard } from "@/components/TermCard";
import { TERMS } from "@/lib/data/terms";
import { useApp } from "@/lib/store";
import { makeRouteError } from "@/components/ErrorBoundary";
import { BrowseSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/browse")({
  head: () => ({ meta: [{ title: "Browse — SlangFlow" }] }),
  pendingComponent: BrowseSkeleton,
  errorComponent: makeRouteError("browse"),
  component: Browse,
});

type TypeFilter = "all" | "idiom" | "slang";
type Status = "all" | "unlearned" | "learned" | "favorited";
type Sort = "popularity" | "alpha" | "recent" | "difficulty";

function Browse() {
  // Load persisted filters on mount (spec §8: "Filter persistence: save last
  // active filters to localStorage").
  const saved = useMemo(() => loadSavedFilters(), []);

  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>((saved.type as TypeFilter) || "all");
  const [category, setCategory] = useState<string>(saved.category || "all");
  const [difficulty, setDifficulty] = useState<number | "all">(saved.difficulty ?? "all");
  const [status, setStatus] = useState<Status>((saved.status as Status) || "all");
  const [sort, setSort] = useState<Sort>((saved.sort as Sort) || "alpha");
  const [limit, setLimit] = useState(24);

  // Persist filters on every change.
  useEffect(() => {
    saveFilters({ type, category, difficulty, status, sort });
  }, [type, category, difficulty, status, sort]);

  const progress = useApp((s) => s.progress);

  const categories = useMemo(() => Array.from(new Set(TERMS.map((t) => t.category))), []);

  const filtered = useMemo(() => {
    let list = TERMS.filter((t) => {
      if (type === "idiom" && t.type !== "idiom") return false;
      if (type === "slang" && t.type === "idiom") return false;
      if (category !== "all" && t.category !== category) return false;
      if (difficulty !== "all" && t.difficulty !== difficulty) return false;
      if (q && !`${t.term} ${t.definition}`.toLowerCase().includes(q.toLowerCase())) return false;
      const p = progress[t.id];
      if (status === "learned" && !(p?.status === "learned" || p?.status === "mastered")) return false;
      if (status === "unlearned" && (p?.status === "learned" || p?.status === "mastered")) return false;
      if (status === "favorited" && !p?.favorited) return false;
      return true;
    });
    if (sort === "alpha") list = list.slice().sort((a, b) => a.term.localeCompare(b.term));
    if (sort === "difficulty") list = list.slice().sort((a, b) => a.difficulty - b.difficulty);
    return list;
  }, [q, type, category, difficulty, status, sort, progress]);

  // Candidate list for "did you mean…" suggestions (just term names).
  const candidateNames = useMemo(() => TERMS.map((t) => t.term), []);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Browse</h1>
          <p className="text-muted-foreground mt-1">Every idiom, slang term & abbreviation in SlangFlow.</p>
        </div>

        <SmartSearch
          onQueryChange={setQ}
          candidates={candidateNames}
          resultCount={filtered.length}
        />

        <div className="flex flex-wrap gap-2">
          {(["all", "idiom", "slang"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {t === "all" ? "All" : t === "idiom" ? "Idioms" : "Text slang & Abbr"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center text-sm">
          <Pill
            label="Category"
            value={category}
            onChange={setCategory}
            options={[["all", "All"], ...categories.map((c) => [c, c] as [string, string])]}
          />
          <Pill
            label="Difficulty"
            value={String(difficulty)}
            onChange={(v) => setDifficulty(v === "all" ? "all" : (Number(v) as 1 | 2 | 3))}
            options={[
              ["all", "All"],
              ["1", "Beginner"],
              ["2", "Intermediate"],
              ["3", "Advanced"],
            ]}
          />
          <Pill
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as Status)}
            options={[
              ["all", "All"],
              ["unlearned", "Unlearned"],
              ["learned", "Learned"],
              ["favorited", "Favorited"],
            ]}
          />
          <Pill
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={[
              ["alpha", "A → Z"],
              ["difficulty", "Difficulty"],
              ["popularity", "Popular"],
              ["recent", "Recent"],
            ]}
          />
        </div>

        <div className="text-sm text-muted-foreground">{filtered.length} terms</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.slice(0, limit).map((t) => (
            <TermCard key={t.id} term={t} highlight={q} />
          ))}
        </div>

        {limit < filtered.length && (
          <div className="text-center py-6">
            <button
              onClick={() => setLimit(limit + 24)}
              className="px-6 py-3 rounded-xl border border-border hover:border-primary/50 transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Pill<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-card border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:border-primary outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
