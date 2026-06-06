import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { TERMS } from "@/lib/data/terms";
import type { Term } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Trophy, CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/quiz")({
  head: () => ({ meta: [{ title: "Quiz — SlangFlow" }] }),
  component: Quiz,
});

type QType = "multiple" | "fill" | "context" | "reverse";

interface Question {
  type: QType;
  term: Term;
  options?: string[]; // for multiple/reverse/context
  correctIndex?: number;
  answer?: string;
  prompt: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSession(): Question[] {
  const pool = shuffle(TERMS).slice(0, 10);
  const types: QType[] = ["multiple", "fill", "context", "reverse"];
  return pool.map((term) => {
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === "multiple") {
      const wrong = shuffle(TERMS.filter((t) => t.id !== term.id)).slice(0, 3).map((t) => t.definition);
      const options = shuffle([term.definition, ...wrong]);
      return { type, term, options, correctIndex: options.indexOf(term.definition), prompt: `What does "${term.term}" mean?` };
    }
    if (type === "reverse") {
      const wrong = shuffle(TERMS.filter((t) => t.id !== term.id)).slice(0, 3).map((t) => t.term);
      const options = shuffle([term.term, ...wrong]);
      return { type, term, options, correctIndex: options.indexOf(term.term), prompt: `Which term means: "${term.definition}"?` };
    }
    if (type === "context") {
      const ctx = term.examples[0]?.context ?? term.nativeTip.whenToUse;
      const wrong = shuffle(TERMS.filter((t) => t.id !== term.id)).slice(0, 2).map((t) => t.nativeTip.whenToUse);
      const options = shuffle([ctx, ...wrong]);
      return { type, term, options, correctIndex: options.indexOf(ctx), prompt: `When would you use "${term.term}"?` };
    }
    // fill in the blank
    const sentence = term.examples[0]?.sentence ?? `I love using "${term.term}".`;
    const re = new RegExp(term.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const blanked = sentence.replace(re, "______");
    return { type, term, answer: term.term, prompt: `Fill the blank: "${blanked}"` };
  });
}

function Quiz() {
  const [questions] = useState<Question[]>(() => buildSession());
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean>(false);
  const [correct, setCorrect] = useState<boolean[]>([]);
  const [fillInput, setFillInput] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const { addXp, recordQuizSession, recordActivity } = useApp();

  const q = questions[idx];
  const score = correct.filter(Boolean).length;

  const submit = (isCorrect: boolean) => {
    setAnswered(true);
    setCorrect((c) => [...c, isCorrect]);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      const finalCorrect = correct.filter(Boolean).length;
      const xp = finalCorrect * 10;
      addXp(xp);
      recordActivity();
      recordQuizSession({ id: String(Date.now()), score: finalCorrect, total: questions.length, xpEarned: xp, completedAt: Date.now() });
      if (finalCorrect >= 7) {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ["#FFD700", "#FF6B6B", "#F5F5F0"] });
      }
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setAnswered(false);
    setPicked(null);
    setFillInput("");
  };

  if (done) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
          <Trophy className="w-20 h-20 mx-auto text-primary animate-flicker" />
          <h1 className="font-display text-5xl">{score >= 7 ? "Crushed it!" : "Nice try!"}</h1>
          <p className="text-xl text-muted-foreground">You scored <span className="text-primary font-bold">{score}/{questions.length}</span> and earned <span className="text-accent font-bold">+{score * 10} XP</span></p>
          <div className="space-y-2 text-left bg-card border border-border rounded-2xl p-5">
            <h3 className="font-display text-xl mb-2">Review</h3>
            {questions.map((qq, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <Link to="/learn/$id" params={{ id: qq.term.id }} className="hover:text-primary">{qq.term.term}</Link>
                {correct[i] ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <Link to="/dashboard" className="px-6 py-3 rounded-xl border border-border font-semibold">Dashboard</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const renderQuestion = () => {
    if (q.type === "fill") {
      const isCorrect = fillInput.trim().toLowerCase() === (q.answer ?? "").toLowerCase();
      return (
        <>
          <input
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            disabled={answered}
            placeholder="Type your answer…"
            className="w-full px-4 py-3.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-lg"
          />
          {!answered ? (
            <button onClick={() => submit(isCorrect)} disabled={!fillInput.trim()} className="w-full px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
              Submit
            </button>
          ) : (
            <Feedback correct={correct[correct.length - 1]} term={q.term} onNext={next} />
          )}
        </>
      );
    }
    const options = q.options ?? [];
    return (
      <>
        <div className="space-y-2">
          {options.map((opt, i) => {
            const isPicked = picked === i;
            const isRight = i === q.correctIndex;
            const reveal = answered;
            const cls = !reveal
              ? "border-border hover:border-primary/50 hover:bg-card"
              : isRight
              ? "border-primary bg-primary/10"
              : isPicked
              ? "border-destructive bg-destructive/10"
              : "border-border opacity-50";
            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => {
                  setPicked(i);
                  submit(i === q.correctIndex);
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {answered && <Feedback correct={correct[correct.length - 1]} term={q.term} onNext={next} />}
      </>
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {idx + 1} of {questions.length}</span>
          <span className="flex items-center gap-1 text-primary font-semibold"><Sparkles className="w-4 h-4" /> {score} correct</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 animate-float-up" key={idx}>
          <span className="text-[10px] font-bold tracking-wider text-accent">{q.type.toUpperCase()}</span>
          <h2 className="font-display text-2xl md:text-3xl">{q.prompt}</h2>
          {renderQuestion()}
        </div>
      </div>
    </Layout>
  );
}

function Feedback({ correct, term, onNext }: { correct: boolean; term: Term; onNext: () => void }) {
  return (
    <div className={`rounded-xl p-4 border ${correct ? "border-primary/30 bg-primary/10" : "border-destructive/30 bg-destructive/10"}`}>
      <div className="flex items-center gap-2 font-bold mb-1">
        {correct ? (
          <><CheckCircle2 className="w-5 h-5 text-primary" /> <span className="text-primary">Nailed it!</span></>
        ) : (
          <><XCircle className="w-5 h-5 text-destructive" /> <span className="text-destructive">Not quite</span></>
        )}
      </div>
      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{term.term}</span> — {term.definition}</p>
      <button onClick={onNext} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1.5">
        Next <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}