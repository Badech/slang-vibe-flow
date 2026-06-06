import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { XPBar } from "@/components/XPBar";
import { useApp } from "@/lib/store";
import { TERMS } from "@/lib/data/terms";
import { Flame, Sparkles, MessageCircle, BookOpen, Heart, Trophy, ArrowRight } from "lucide-react";
import { TermCard } from "@/components/TermCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SlangFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { xp, streak, progress, recordActivity, userName } = useApp();

  // Pick deterministic "today" featured terms
  const dayIndex = Math.floor(Date.now() / 86400000);
  const idioms = TERMS.filter((t) => t.type === "idiom");
  const slang = TERMS.filter((t) => t.type !== "idiom");
  const featuredIdiom = idioms[dayIndex % idioms.length];
  const featuredSlang = slang[dayIndex % slang.length];

  const stats = useMemo(() => {
    const values = Object.values(progress);
    return {
      learned: values.filter((p) => p.status === "learned" || p.status === "mastered").length,
      mastered: values.filter((p) => p.status === "mastered").length,
      review: values.filter((p) => p.status === "learning").length,
      favorites: values.filter((p) => p.favorited).length,
    };
  }, [progress]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8" onClick={recordActivity}>
        <div>
          <p className="text-muted-foreground text-sm">Welcome back{userName ? `, ${userName}` : ""} 👋</p>
          <h1 className="font-display text-4xl md:text-5xl">Your daily flow</h1>
        </div>

        {/* Top row: streak + XP */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-6 flex items-center gap-4">
            <div className="relative">
              <Flame className="w-14 h-14 text-accent animate-flicker" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Streak</div>
              <div className="font-display text-4xl text-foreground">{streak} <span className="text-base text-muted-foreground">days</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
            <XPBar xp={xp} />
          </div>
        </div>

        {/* Featured */}
        <div className="grid md:grid-cols-2 gap-4">
          <FeaturedCard
            label="TODAY'S IDIOM"
            term={featuredIdiom.term}
            phonetic={featuredIdiom.phonetic}
            definition={featuredIdiom.definition}
            to={featuredIdiom.id}
            tone="primary"
            icon={Sparkles}
          />
          <FeaturedCard
            label="TODAY'S TEXT SLANG"
            term={featuredSlang.term}
            phonetic={featuredSlang.phonetic}
            definition={featuredSlang.definition}
            to={featuredSlang.id}
            tone="accent"
            icon={MessageCircle}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Learned" value={stats.learned} icon={BookOpen} />
          <StatCard label="Mastered" value={stats.mastered} icon={Trophy} />
          <StatCard label="In review" value={stats.review} icon={Sparkles} />
          <StatCard label="Favorites" value={stats.favorites} icon={Heart} />
        </div>

        {/* Quick browse */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-2xl">Pick up where you left off</h2>
            <Link to="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
              Browse all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TERMS.slice(0, 6).map((t) => (
              <TermCard key={t.id} term={t} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FeaturedCard({
  label, term, phonetic, definition, to, tone, icon: Icon,
}: {
  label: string; term: string; phonetic?: string; definition: string; to: string;
  tone: "primary" | "accent"; icon: typeof Sparkles;
}) {
  const ring = tone === "primary" ? "border-primary/40 from-primary/15" : "border-accent/40 from-accent/15";
  const text = tone === "primary" ? "text-primary" : "text-accent";
  return (
    <Link
      to="/learn/$id"
      params={{ id: to }}
      className={`block rounded-2xl border bg-gradient-to-br to-transparent p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] transition-all ${ring}`}
    >
      <div className={`flex items-center gap-2 text-xs font-bold tracking-wider mb-3 ${text}`}>
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="font-display text-4xl mb-1">{term}</div>
      {phonetic && <div className="text-sm text-muted-foreground mb-3 font-mono">{phonetic}</div>}
      <p className="text-base text-muted-foreground">{definition}</p>
      <div className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${text}`}>
        Learn this term <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof BookOpen }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="font-display text-3xl">{value}</div>
    </div>
  );
}