import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { getTerm, TERMS_BY_ID } from "@/lib/data/terms";
import { Heart, CheckCircle2, Volume2, Turtle, Sparkles, AlertTriangle, Users, Wand2, ArrowUpRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { listEnglishVoices, speak, stopSpeaking } from "@/lib/tts";

export const Route = createFileRoute("/learn/$id")({
  loader: ({ params }) => {
    const t = getTerm(params.id);
    if (!t) throw notFound();
    return t;
  },
  head: ({ params }) => {
    const t = TERMS_BY_ID[params.id];
    return { meta: [{ title: t ? `${t.term} — SlangFlow` : "Term — SlangFlow" }, { name: "description", content: t?.definition }] };
  },
  component: LearnDetail,
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl">Term not found</h1>
        <Link to="/browse" className="text-primary hover:underline mt-4 inline-block">← Back to browse</Link>
      </div>
    </Layout>
  ),
  errorComponent: ({ error }) => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Couldn't load this term</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
      </div>
    </Layout>
  ),
});

function LearnDetail() {
  const { id } = useParams({ from: "/learn/$id" });
  const term = getTerm(id);
  const { progress, setStatus, toggleFavorite, addXp, recordActivity } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [slow, setSlow] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");

  useEffect(() => {
    const load = () => {
      const list = listEnglishVoices();
      setVoices(list);
      if (!voiceURI && list[0]) setVoiceURI(list.find((v) => v.lang === "en-US")?.voiceURI ?? list[0].voiceURI);
    };
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => stopSpeaking();
  }, [voiceURI]);

  if (!term) return null;
  const p = progress[term.id];
  const isFav = p?.favorited;
  const isLearned = p?.status === "learned" || p?.status === "mastered";

  const handleSpeak = () => {
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? null;
    const u = speak(term.term, { rate: slow ? 0.55 : 1, voice });
    if (u) {
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
    }
  };

  const handleLearned = () => {
    setStatus(term.id, "learned");
    addXp(20);
    recordActivity();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← All terms</Link>

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge text={term.type === "idiom" ? "IDIOM" : term.type === "abbreviation" ? "ABBREVIATION" : "TEXT SLANG"} tone={term.type === "idiom" ? "primary" : "accent"} />
            <Badge text={term.category} tone="muted" />
            <Badge text={`Level ${term.difficulty}`} tone="muted" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-none">{term.term}</h1>
          {term.phonetic && (
            <p className="font-mono text-lg text-muted-foreground">{term.phonetic}</p>
          )}

          {/* TTS Controls */}
          <div className="flex flex-wrap gap-3 items-center pt-2">
            <button
              onClick={handleSpeak}
              className={`px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:scale-105 transition-transform ${speaking ? "animate-pulse-glow" : ""}`}
            >
              <Volume2 className="w-4 h-4" /> Hear it
            </button>
            <button
              onClick={() => setSlow(!slow)}
              className={`px-4 py-3 rounded-xl border font-semibold flex items-center gap-2 transition-colors ${
                slow ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Turtle className="w-4 h-4" /> Slow mode
            </button>
            {voices.length > 0 && (
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                className="px-3 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:border-primary outline-none"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Definition */}
        <Card>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Definition</h2>
          <p className="text-xl text-foreground">{term.definition}</p>
          <p className="text-sm text-muted-foreground mt-3 italic">Origin: {term.origin}</p>
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

        {/* Sound Like a Native */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 space-y-5">
          <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-wider">
            <Sparkles className="w-4 h-4" /> SOUND LIKE A NATIVE
          </div>
          <NativeRow icon={Wand2} title="When to use it" text={term.nativeTip.whenToUse} />
          <NativeRow icon={Volume2} title="Tone & register" text={term.nativeTip.toneRegister} />
          <NativeRow icon={Users} title="Who says this" text={term.nativeTip.whoSaysIt} />
          <NativeRow icon={AlertTriangle} title="Red flags" text={term.nativeTip.redFlag} tone="accent" />
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-accent mb-2">
              <ArrowUpRight className="w-4 h-4" /> UPGRADE
            </div>
            <p className="text-foreground">Natives often follow up with: <span className="font-semibold text-accent">"{term.nativeTip.upgrade}"</span></p>
          </div>
        </div>

        {/* Related */}
        {term.related && term.related.length > 0 && (
          <div>
            <h2 className="font-display text-2xl mb-3">Related terms</h2>
            <div className="flex flex-wrap gap-2">
              {term.related.map((rid) => {
                const r = getTerm(rid);
                if (!r) return null;
                return (
                  <Link key={rid} to="/learn/$id" params={{ id: rid }} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
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
            onClick={() => toggleFavorite(term.id)}
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

function NativeRow({ icon: Icon, title, text, tone }: { icon: typeof Wand2; title: string; text: string; tone?: "accent" }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-1 ${tone === "accent" ? "text-accent" : "text-primary"}`} />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-foreground">{text}</div>
      </div>
    </div>
  );
}