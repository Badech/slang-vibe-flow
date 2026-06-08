import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useApp } from "@/lib/store";
import { TERMS_BY_ID } from "@/lib/data/terms";
import { XPBar } from "@/components/XPBar";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Heart, BookOpen, CalendarDays, MessageSquarePlus } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { makeRouteError } from "@/components/ErrorBoundary";
import { ProfileSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => requireAuth(location.href),
  head: () => ({ meta: [{ title: "Profile — SlangFlow" }] }),
  pendingComponent: ProfileSkeleton,
  errorComponent: makeRouteError("profile"),
  component: Profile,
});

function Profile() {
  const { xp, progress, streakHistory, quizSessions, submissions, userName } = useApp();
  const [tab, setTab] = useState<"learned" | "favorites" | "subs">("learned");
  const [typeFilter, setTypeFilter] = useState<"all" | "idiom" | "slang">("all");

  const learned = useMemo(
    () => Object.values(progress).filter((p) => p.status === "learned" || p.status === "mastered"),
    [progress],
  );
  const favorites = useMemo(() => Object.values(progress).filter((p) => p.favorited), [progress]);

  const filterByType = (id: string) => {
    if (typeFilter === "all") return true;
    const t = TERMS_BY_ID[id];
    if (!t) return false;
    if (typeFilter === "idiom") return t.type === "idiom";
    return t.type !== "idiom";
  };

  // Weekly XP chart from last 7 days of activity
  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const sessionsXp = quizSessions
        .filter((s) => new Date(s.completedAt).toISOString().slice(0, 10) === key)
        .reduce((sum, s) => sum + s.xpEarned, 0);
      return { day: d.toLocaleDateString("en-US", { weekday: "short" }), xp: sessionsXp };
    });
    return days;
  }, [quizSessions]);

  // Heatmap (last 84 days = 12 weeks)
  const heatmap = useMemo(() => {
    const setH = new Set(streakHistory);
    const days: { date: string; active: boolean }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, active: setH.has(key) });
    }
    return days;
  }, [streakHistory]);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">Profile</p>
            <h1 className="font-display text-4xl md:text-5xl">{userName || "Learner"}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <XPBar xp={xp} />
        </div>

        {/* Heatmap */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Streak history</h2>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
            {heatmap.map((d) => (
              <div
                key={d.date}
                title={d.date}
                className={`w-3 h-3 rounded-sm ${d.active ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {/* Weekly chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl mb-4">Weekly XP</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis dataKey="day" stroke="oklch(0.7 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.045 265)", border: "1px solid oklch(1 0 0 / 12%)", borderRadius: 8 }} />
                <Bar dataKey="xp" fill="oklch(0.88 0.18 95)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {([["learned", "Learned", BookOpen], ["favorites", "Favorites", Heart], ["subs", "My Submissions", MessageSquarePlus]] as const).map(([k, l, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {l}
            </button>
          ))}
        </div>

        {(tab === "learned" || tab === "favorites") && (
          <div className="flex gap-2 mb-2">
            {(["all", "idiom", "slang"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1 rounded-full ${
                  typeFilter === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {t === "all" ? "All" : t === "idiom" ? "Idioms" : "Text slang"}
              </button>
            ))}
          </div>
        )}

        {tab === "learned" && (
          <TermList ids={learned.filter((p) => filterByType(p.termId)).map((p) => p.termId)} empty="Mark some terms as learned to see them here." />
        )}
        {tab === "favorites" && (
          <TermList ids={favorites.filter((p) => filterByType(p.termId)).map((p) => p.termId)} empty="Favorite some terms to build your shortlist." />
        )}
        {tab === "subs" && (
          <div className="space-y-3">
            {submissions.length === 0 && <p className="text-muted-foreground">No submissions yet. <Link to="/submit" className="text-primary hover:underline">Submit one</Link>.</p>}
            {submissions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-xl">{s.term}</span>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">{s.status.toUpperCase()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{s.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TermList({ ids, empty }: { ids: string[]; empty: string }) {
  if (ids.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid sm:grid-cols-2 gap-2">
      {ids.map((id) => {
        const t = TERMS_BY_ID[id];
        if (!t) return null;
        return (
          <li key={id}>
            <Link to="/learn/$id" params={{ id }} className="block px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="font-semibold">{t.term}</div>
              <div className="text-xs text-muted-foreground truncate">{t.definition}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}