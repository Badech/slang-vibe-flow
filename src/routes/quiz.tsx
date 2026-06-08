// Quiz route (spec §5).
//
// Architecture:
//   - Session construction lives in `lib/quiz/buildSession.ts`
//   - Adaptive difficulty (3-in-a-row bump) lives in `lib/quiz/adaptive.ts`
//   - Per-answer feedback uses <AnswerExplanation> with mini SoundLikeNative
//   - XP rules come from `lib/xp.ts` (single source of truth)
//   - Milestone toasts are centralised in `components/MilestoneToasts.ts`
//
// This file is intentionally lean — orchestration + render only.

import { createFileRoute, Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { CheckCircle2, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AnswerExplanation } from "@/components/quiz/AnswerExplanation";
import { QuestionFill } from "@/components/quiz/QuestionFill";
import { QuestionOptions } from "@/components/quiz/QuestionMultipleChoice";
import { Layout } from "@/components/Layout";
import { StreakFlame } from "@/components/StreakFlame";
import {
  maybeToastStreak,
  toastLevelUp,
  toastPerfectQuiz,
  toastQuizComplete,
} from "@/components/MilestoneToasts";
import { useAuthState } from "@/hooks/useAuthState";
import { requireAuth } from "@/lib/auth";
import {
  adaptiveAdvance,
  createAdaptiveState,
  type AdaptiveState,
} from "@/lib/quiz/adaptive";
import {
  buildQuestion,
  buildSession,
  shuffle,
  type Question,
} from "@/lib/quiz/buildSession";
import { TERMS } from "@/lib/data/terms";
import { useSubmitQuiz } from "@/lib/queries";
import { useApp } from "@/lib/store";
import { LEVELS, levelFor, type Difficulty } from "@/lib/types";
import { quizXp } from "@/lib/xp";

export const Route = createFileRoute("/quiz")({
  beforeLoad: ({ location }) => requireAuth(location.href),
  head: () => ({ meta: [{ title: "Quiz — SlangFlow" }] }),
  errorComponent: makeRouteError("quiz"),
  component: Quiz,
});

const SESSION_SIZE = 10;

function Quiz() {
  // ── Session state ────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>(() => buildSession({ size: SESSION_SIZE }));
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState<boolean[]>([]);
  const [fillInput, setFillInput] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [adaptive, setAdaptive] = useState<AdaptiveState>(() => createAdaptiveState(1));

  const { xp: currentXp, addXp, recordQuizSession, recordActivity } = useApp();
  const auth = useAuthState();
  const submitQuiz = useSubmitQuiz(auth.userId);

  const q = questions[idx];
  const score = correct.filter(Boolean).length;
  const progressPct = (idx / questions.length) * 100;

  // Optionally swap the upcoming question to one at the bumped difficulty.
  // We only do this when we're still mid-session AND the adaptive difficulty
  // moved up — keeps the user feeling the climb.
  const onPickAnswer = (isCorrect: boolean) => {
    setAnswered(true);
    setCorrect((c) => [...c, isCorrect]);
    setAdaptive((a) => {
      const nextAdaptive = adaptiveAdvance(a, isCorrect);
      // If difficulty was bumped, re-pick the NEXT question at the new tier.
      if (nextAdaptive.nextDifficulty > a.nextDifficulty) {
        retargetNextQuestion(nextAdaptive.nextDifficulty);
      }
      return nextAdaptive;
    });
  };

  function retargetNextQuestion(newDifficulty: Difficulty) {
    const nextIdx = idx + 1;
    if (nextIdx >= questions.length) return;
    const candidates = TERMS.filter(
      (t) =>
        Math.abs(t.difficulty - newDifficulty) <= 1 &&
        !questions.slice(0, nextIdx + 1).some((q) => q.term.id === t.id),
    );
    if (candidates.length === 0) return;
    const newTerm = shuffle(candidates)[0];
    const newType = questions[nextIdx].type;
    setQuestions((qs) => {
      const out = qs.slice();
      out[nextIdx] = buildQuestion(newTerm, newType);
      return out;
    });
  }

  // ── End-of-session ───────────────────────────────────────────────────────
  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setAnswered(false);
      setPicked(null);
      setFillInput("");
      return;
    }

    const finalCorrect = correct.filter(Boolean).length;
    const total = questions.length;
    const { xp, perfect } = quizXp(finalCorrect, total);
    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Detect level-up locally for the optimistic toast (server confirms it too
    // when authed; we de-dupe by checking newLevel against beforeLevel).
    const beforeLevel = levelFor(currentXp).name;
    addXp(xp);
    const afterLevel = levelFor(currentXp + xp).name;

    recordActivity();
    recordQuizSession({ id: sessionId, score: finalCorrect, total, xpEarned: xp, completedAt: Date.now() });

    if (perfect) toastPerfectQuiz(xp);
    else toastQuizComplete(xp);

    if (finalCorrect >= 7) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ["#FFD700", "#FF6B6B", "#F5F5F0"] });
    }
    if (perfect) {
      confetti({ particleCount: 220, spread: 140, origin: { y: 0.5 }, colors: ["#FFD700", "#A78BFA", "#FF6B6B"] });
    }
    if (afterLevel !== beforeLevel) toastLevelUp(afterLevel);

    if (auth.userId) {
      submitQuiz.mutate(
        { id: sessionId, score: finalCorrect, total },
        {
          onSuccess: (res) => {
            if (res.levelUp && res.newLevel !== afterLevel) toastLevelUp(res.newLevel);
            maybeToastStreak(res.streak);
          },
        },
      );
    }

    setDone(true);
  };

  // ── End screen ───────────────────────────────────────────────────────────
  if (done) return <QuizEndScreen score={score} questions={questions} correct={correct} />;

  // ── Render current question ──────────────────────────────────────────────
  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {idx + 1} of {questions.length}</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Sparkles className="w-4 h-4" /> {score} correct
            </span>
            {adaptive.inARow >= 2 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                🔥 {adaptive.inARow} in a row
              </span>
            )}
          </span>
        </div>

        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 animate-float-up" key={q.id}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-accent">{q.type.toUpperCase()}</span>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
              Level {q.term.difficulty}
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl leading-snug">{q.prompt}</h2>

          {q.type === "fill" ? (
            <QuestionFill
              value={fillInput}
              onChange={setFillInput}
              disabled={answered}
              expected={q.answer ?? ""}
              onSubmit={onPickAnswer}
            />
          ) : (
            <QuestionOptions
              options={q.options ?? []}
              correctIndex={q.correctIndex ?? -1}
              picked={picked}
              disabled={answered}
              onPick={(i, isCorrect) => {
                setPicked(i);
                onPickAnswer(isCorrect);
              }}
            />
          )}

          {answered && (
            <AnswerExplanation
              correct={correct[correct.length - 1]}
              term={q.term}
              correctValue={
                q.type === "fill"
                  ? q.answer
                  : q.options?.[q.correctIndex ?? -1]
              }
              userValue={
                q.type === "fill"
                  ? fillInput
                  : picked != null ? q.options?.[picked] : undefined
              }
              onNext={next}
              nextLabel={idx + 1 < questions.length ? "Next" : "See results"}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── End screen ──────────────────────────────────────────────────────────────

function QuizEndScreen({
  score,
  questions,
  correct,
}: {
  score: number;
  questions: Question[];
  correct: boolean[];
}) {
  const total = questions.length;
  const { xp } = quizXp(score, total);
  const perfect = score === total;
  const { xp: totalXpBefore } = useApp();
  const previousLevel = useMemo(() => levelFor(totalXpBefore - xp), [totalXpBefore, xp]);
  const currentLevel = levelFor(totalXpBefore);
  const leveledUp = previousLevel.name !== currentLevel.name;

  const toReview = questions.filter((_, i) => !correct[i]).map((qq) => qq.term);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <div className="text-center space-y-4">
          <Trophy
            className={`w-20 h-20 mx-auto ${perfect ? "text-accent animate-flicker-max" : "text-primary animate-flicker"}`}
          />
          <h1 className="font-display text-5xl">{perfect ? "Perfect run! 💯" : score >= 7 ? "Crushed it!" : "Nice try!"}</h1>
          <p className="text-xl text-muted-foreground">
            You scored <span className="text-primary font-bold">{score}/{total}</span> and earned{" "}
            <span className="text-accent font-bold">+{xp} XP</span>
          </p>

          {leveledUp && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold animate-float-up">
              🏆 Level up: {currentLevel.emoji} {currentLevel.name}
            </div>
          )}
        </div>

        {/* Level progress bar */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">{currentLevel.emoji} {currentLevel.name}</span>
            <span className="text-muted-foreground">{totalXpBefore} XP</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${levelProgressPct(totalXpBefore, currentLevel)}%` }}
            />
          </div>
        </div>

        {/* Terms to review */}
        {toReview.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" /> Terms to review
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {toReview.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/learn/$id"
                    params={{ id: t.id }}
                    className="block px-3 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-card transition-colors"
                  >
                    <div className="font-semibold">{t.term}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.definition}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {perfect && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="font-display text-2xl mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Clean sweep
            </h2>
            <p className="text-muted-foreground text-sm">
              You got every single answer right. That's a +100 XP bonus on top of the base +50.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-xl border border-border font-semibold hover:border-primary/50"
          >
            Dashboard
          </Link>
        </div>

        <div className="text-center">
          <StreakFlame streak={useApp.getState().streak} size="lg" />
        </div>
      </div>
    </Layout>
  );
}

function levelProgressPct(xp: number, level: (typeof LEVELS)[number]): number {
  if (!Number.isFinite(level.max)) return 100;
  const span = level.max - level.min;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((xp - level.min) / span) * 100));
}
