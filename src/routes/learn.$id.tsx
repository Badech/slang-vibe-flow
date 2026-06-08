import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { Heart, CheckCircle2, AlertTriangle } from "lucide-react";

import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import { LearnDetailSkeleton } from "@/components/skeletons";
import { makeRouteError } from "@/components/ErrorBoundary";
import { PhoneticDisplay } from "@/components/PhoneticDisplay";
import { SlowModeToggle } from "@/components/SlowModeToggle";
import { SoundLikeNative } from "@/components/SoundLikeNative";
import { SpeakerButton } from "@/components/SpeakerButton";
import { VoiceSelector } from "@/components/VoiceSelector";
import { useAuthState } from "@/hooks/useAuthState";
import { usePronunciation } from "@/hooks/usePronunciation";
import { getTerm, TERMS_BY_ID } from "@/lib/data/terms";
import { useUpsertProgress } from "@/lib/queries";
import { useApp } from "@/lib/store";
import { speakableText } from "@/lib/tts";

export const Route = createFileRoute("/learn/$id")({
  loader: ({ params }) => {
    const t = getTerm(params.id);
    if (!t) throw notFound();
    return t;
  },
  head: ({ params }) => {
    const t = TERMS_BY_ID[params.id];
    const appUrl = (import.meta.env?.VITE_APP_URL as string | undefined) ?? "";
    const canonical = appUrl ? `${appUrl.replace(/\/$/, "")}/learn/${params.id}` : undefined;
    if (!t) return { meta: [{ title: "Term — SlangFlow" }] };
    const title = `${t.term} — meaning, examples & pronunciation | SlangFlow`;
    const description = `${t.term}: ${t.definition} Hear native pronunciation, see real examples, and learn when (and when not) to use it.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    };
  },
  component: LearnDetail,
  pendingComponent: () => (
    <Layout>
      <LearnDetailSkeleton />
    </Layout>
  ),
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl">Term not found</h1>
        <Link to="/browse" className="text-primary hover:underline mt-4 inline-block">← Back to browse</Link>
      </div>
    </Layout>
  ),
  errorComponent: makeRouteError("learn-detail"),
});

function LearnDetail() {
  const { id } = useParams({ from: "/learn/$id" });
  const term = getTerm(id);
  const { progress, setStatus, toggleFavorite, addXp, recordActivity } = useApp();
  const auth = useAuthState();
  const upsert = useUpsertProgress(auth.userId);

  // Pronunciation: hook owns voice list, slow mode, and speaking state. We
  // ALWAYS speak the expanded form (NGL → "Not gonna lie") via speakableText,
  // per spec §2.
  const tts = usePronunciation();

  if (!term) return null;
  const p = progress[term.id];
  const isFav = p?.favorited;
  const isLearned = p?.status === "learned" || p?.status === "mastered";

  const handleSpeak = () => tts.speak(speakableText(term));

  const handleLearned = () => {
    if (isLearned) return;
    setStatus(term.id, "learned");
    addXp(10); // spec §6: +10 per term marked learned
    recordActivity();
    toast.success(`Learned "${term.term}" — +10 XP`);
    if (auth.userId) {
      upsert.mutate({ termId: term.id, status: "learned" });
    }
  };

  const handleFavorite = () => {
    const willFavorite = !isFav;
    toggleFavorite(term.id);
    if (willFavorite) {
      addXp(5); // spec §6: +5 per favorited
      toast(`Added to favorites — +5 XP`, { icon: "❤️" });
    }
    if (auth.userId) {
      upsert.mutate({ termId: term.id, favorited: willFavorite });
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← All terms</Link>

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge
              text={term.type === "idiom" ? "IDIOM" : term.type === "abbreviation" ? "ABBREVIATION" : "TEXT SLANG"}
              tone={term.type === "idiom" ? "primary" : "accent"}
            />
            <Badge text={term.category} tone="muted" />
            <Badge text={`Level ${term.difficulty}`} tone="muted" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-none">{term.term}</h1>

          <div className="flex flex-wrap items-center gap-3">
            <PhoneticDisplay phonetic={term.phonetic} />
            {term.type !== "idiom" && (
              <span className="text-sm text-muted-foreground italic">
                Spoken: <span className="font-mono not-italic text-foreground">"{speakableText(term)}"</span>
              </span>
            )}
          </div>

          {/* TTS Controls */}
          <div className="flex flex-wrap gap-3 items-center pt-2">
            <SpeakerButton
              onClick={handleSpeak}
              isSpeaking={tts.isSpeaking}
              disabled={!tts.supported}
              size="lg"
              label={tts.isSpeaking ? "Speaking…" : "Hear it"}
            />
            <SlowModeToggle slow={tts.slow} onToggle={tts.toggleSlow} disabled={!tts.supported} />
            <VoiceSelector voices={tts.voices} voice={tts.voice} onChange={tts.setVoice} />
            {!tts.supported && (
              <span className="text-xs text-muted-foreground">
                Pronunciation playback isn't supported in this browser.
              </span>
            )}
          </div>
        </div>

        {/* Definition */}
        <Card>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Definition</h2>
          <p className="text-xl text-foreground">{term.definition}</p>
          {term.origin && (
            <p className="text-sm text-muted-foreground mt-3 italic">Origin: {term.origin}</p>
          )}
        </Card>

        {/* Examples */}
        <div>
          <h2 className="font-display text-2xl mb-3">In the wild</h2>
          <div className="space-y-3">
            {term.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <p className="text-lg text-foreground">"{ex.sentence}"</p>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{ex.context}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How NOT to use */}
        <Card tone="destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-1" />
            <div>
              <h2 className="font-display text-xl mb-1.5">How NOT to use it</h2>
              <p className="text-muted-foreground">{term.commonMistake}</p>
            </div>
          </div>
        </Card>

        {/* Sound Like a Native — the core feature (spec §3) */}
        <SoundLikeNative term={term} />

        {/* Related */}
        {term.related && term.related.length > 0 && (
          <div>
            <h2 className="font-display text-2xl mb-3">Related terms</h2>
            <div className="flex flex-wrap gap-2">
              {term.related.map((rid) => {
                const r = getTerm(rid);
                if (!r) return null;
                return (
                  <Link
                    key={rid}
                    to="/learn/$id"
                    params={{ id: rid }}
                    className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {r.term}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 sticky bottom-20 md:bottom-6 z-30 bg-background/80 backdrop-blur p-3 -mx-3 rounded-2xl border border-border">
          <button
            onClick={handleLearned}
            className={`flex-1 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isLearned ? "bg-primary/15 text-primary border border-primary/30" : "bg-primary text-primary-foreground hover:scale-[1.02]"
            }`}
          >
            <CheckCircle2 className="w-5 h-5" /> {isLearned ? "Learned" : "Mark as learned"}
          </button>
          <button
            onClick={handleFavorite}
            className={`px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors ${
              isFav ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-accent hover:border-accent/50"
            }`}
          >
            <Heart className={`w-5 h-5 ${isFav ? "fill-accent" : ""}`} /> {isFav ? "Favorited" : "Favorite"}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Badge({ text, tone }: { text: string; tone: "primary" | "accent" | "muted" }) {
  const cls = tone === "primary" ? "bg-primary/15 text-primary border-primary/30"
    : tone === "accent" ? "bg-accent/15 text-accent border-accent/30"
    : "bg-secondary text-muted-foreground border-border";
  return <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded border ${cls}`}>{text}</span>;
}

function Card({ children, tone }: { children: React.ReactNode; tone?: "destructive" }) {
  const cls = tone === "destructive" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card";
  return <div className={`rounded-2xl border p-6 ${cls}`}>{children}</div>;
}
