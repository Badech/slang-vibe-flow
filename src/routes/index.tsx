import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero.jpg";
import { Layout } from "@/components/Layout";
import { Sparkles, Volume2, MessageCircle, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SlangFlow — Stop sounding like a textbook" },
      { name: "description", content: "Learn American idioms, slang & texting language. Sound like a native speaker, not a translator." },
      { property: "og:title", content: "SlangFlow — Talk like a native" },
      { property: "og:description", content: "American idioms, slang, and texting language — with native pronunciation, real examples, and quizzes." },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: Sparkles, title: "125+ Real Terms", text: "Idioms, slang, and texting abbreviations natives actually use." },
    { icon: Volume2, title: "Native Pronunciation", text: "Hear every term spoken by an American voice. Slow mode for hard ones." },
    { icon: MessageCircle, title: "Sound Right In Context", text: "Learn the tone, register, and red flags so you never sound off." },
    { icon: Trophy, title: "Quiz & Streak", text: "Daily streaks, XP, and adaptive quizzes that level up with you." },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-float-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold tracking-wide mb-6">
              <Zap className="w-3.5 h-3.5" /> American English, the way it's really spoken
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
              Stop sounding<br />
              like a <span className="text-gradient-primary">textbook.</span><br />
              Start talking like<br />
              a <span className="text-accent">native.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Master 125+ American idioms, slang, and texting abbreviations — with native pronunciation, real examples, and quizzes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:scale-105 hover:shadow-[var(--shadow-glow)] transition-all"
              >
                Start Learning Free →
              </Link>
              <Link
                to="/browse"
                className="px-6 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:border-primary/50 hover:bg-secondary transition-all"
              >
                Browse all terms
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div><span className="text-primary font-bold text-xl">50+</span> Idioms</div>
              <div><span className="text-accent font-bold text-xl">75+</span> Text Slang</div>
              <div><span className="text-foreground font-bold text-xl">4</span> Quiz modes</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
            <img
              src={heroImage}
              alt="Slang terms in graffiti style: lowkey, no cap, spill the tea"
              width={1536}
              height={1024}
              className="relative rounded-3xl border border-border shadow-[var(--shadow-elegant)]"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:-translate-y-1 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 p-10 md:p-16 text-center">
          <h2 className="font-display text-4xl md:text-5xl">
            Ready to <span className="text-accent">spill the tea?</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Your American friends won't have to translate for you anymore. Start your streak today.
          </p>
          <Link
            to="/dashboard"
            className="inline-block mt-8 px-7 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 hover:shadow-[var(--shadow-glow)] transition-all"
          >
            Get started — it's free
          </Link>
        </div>
      </section>
    </Layout>
  );
}
  );
}
