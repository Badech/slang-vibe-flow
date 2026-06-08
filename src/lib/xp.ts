// Central XP + streak rules for SlangFlow (spec §6).
//
// Keeping these in one module means the client (UI toasts, optimistic
// updates) and the server (`/api/progress`, `/api/quiz/session`) award the
// same XP for the same actions.

export const XP_RULES = {
  /** +10 per term marked learned. */
  LEARN_TERM: 10,
  /** +5 per term favorited. */
  FAVORITE_TERM: 5,
  /** +50 per completed quiz. */
  QUIZ_COMPLETE: 50,
  /** +100 per perfect quiz (added on top of QUIZ_COMPLETE). */
  PERFECT_QUIZ_BONUS: 100,
  /** +15 per community submission (engagement bonus — not in spec but matches existing store). */
  COMMUNITY_SUBMIT: 15,
} as const;

/** Streak rule per spec §6: increments if user learns ≥5 terms OR ≥1 quiz that calendar day. */
export const STREAK_TRIGGERS = {
  TERMS_LEARNED_TODAY: 5,
  QUIZZES_TODAY: 1,
} as const;

export function quizXp(score: number, total: number): { xp: number; perfect: boolean } {
  const perfect = score > 0 && score === total;
  const xp = XP_RULES.QUIZ_COMPLETE + (perfect ? XP_RULES.PERFECT_QUIZ_BONUS : 0);
  return { xp, perfect };
}

/** Tier the streak flame intensity should reach (used by StreakFlame component). */
export function flameTier(streak: number): "low" | "mid" | "high" | "max" {
  if (streak >= 30) return "max";
  if (streak >= 10) return "high";
  if (streak >= 5) return "mid";
  return "low";
}

export function qualifiesForStreak(termsToday: number, quizzesToday: number): boolean {
  return (
    termsToday >= STREAK_TRIGGERS.TERMS_LEARNED_TODAY ||
    quizzesToday >= STREAK_TRIGGERS.QUIZZES_TODAY
  );
}
