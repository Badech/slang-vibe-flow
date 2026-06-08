// Helpers for the recurring SlangFlow toast vocabulary (spec §6, §9).
//
// All milestones go through these wrappers so copy, emoji, and durations stay
// consistent across the quiz, learn page, and dashboard.

import { toast } from "sonner";

export function toastLearned(termName: string, xp: number) {
  toast.success(`Learned "${termName}"`, { description: `+${xp} XP` });
}

export function toastFavorited(termName: string, xp: number) {
  toast(`Added "${termName}" to favorites`, { icon: "❤️", description: `+${xp} XP` });
}

export function toastQuizComplete(xp: number) {
  toast.success(`Quiz complete — +${xp} XP`);
}

export function toastPerfectQuiz(xp: number) {
  toast.success("💯 Perfect quiz!", { description: `+${xp} XP`, duration: 6000 });
}

export function toastLevelUp(newLevel: string) {
  toast.success(`🏆 Level up: ${newLevel}!`, { duration: 6000 });
}

export function toastStreakMilestone(streakDays: number) {
  toast(`🔥 ${streakDays}-day streak!`, { duration: 5000 });
}

export function toastSubmissionSent() {
  toast.success("Submission sent for review 🎉");
}

export function toastSubmissionError(err: unknown) {
  toast.error("Couldn't reach the server — saved locally", {
    description: err instanceof Error ? err.message : String(err),
  });
}

/** Fire the streak toast only on the spec's recognized milestone days. */
const STREAK_MILESTONES = new Set([3, 5, 7, 10, 14, 21, 30, 50, 100, 200, 365]);
export function maybeToastStreak(streak: number) {
  if (STREAK_MILESTONES.has(streak)) toastStreakMilestone(streak);
}
