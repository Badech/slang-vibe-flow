import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProgressStatus, QuizSession, Submission, UserProgress } from "./types";

interface AppState {
  // Auth (mock until Clerk is wired)
  isSignedIn: boolean;
  userName: string;
  signIn: (name: string) => void;
  signOut: () => void;

  // XP & Streak
  xp: number;
  streak: number;
  lastActiveDate: string | null; // ISO date YYYY-MM-DD
  streakHistory: string[]; // ISO dates of active days
  addXp: (amount: number) => void;
  recordActivity: () => void;

  // Progress
  progress: Record<string, UserProgress>;
  setStatus: (termId: string, status: ProgressStatus) => void;
  toggleFavorite: (termId: string) => void;

  // Quiz history
  quizSessions: QuizSession[];
  recordQuizSession: (s: QuizSession) => void;

  // Community submissions
  submissions: Submission[];
  addSubmission: (s: Submission) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86400000);
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      isSignedIn: false,
      userName: "",
      signIn: (name) => set({ isSignedIn: true, userName: name || "Learner" }),
      signOut: () => set({ isSignedIn: false, userName: "" }),

      xp: 0,
      streak: 0,
      lastActiveDate: null,
      streakHistory: [],
      addXp: (amount) => set({ xp: get().xp + amount }),
      recordActivity: () => {
        const t = today();
        const last = get().lastActiveDate;
        const history = new Set(get().streakHistory);
        history.add(t);
        let streak = get().streak;
        if (!last) streak = 1;
        else {
          const diff = daysBetween(last, t);
          if (diff === 0) {
            /* same day, no change */
          } else if (diff === 1) streak = streak + 1;
          else streak = 1;
        }
        set({ lastActiveDate: t, streak, streakHistory: Array.from(history) });
      },

      progress: {},
      setStatus: (termId, status) =>
        set({
          progress: {
            ...get().progress,
            [termId]: {
              termId,
              status,
              favorited: get().progress[termId]?.favorited ?? false,
              learnedAt: status === "learned" || status === "mastered" ? Date.now() : get().progress[termId]?.learnedAt,
            },
          },
        }),
      toggleFavorite: (termId) =>
        set({
          progress: {
            ...get().progress,
            [termId]: {
              termId,
              status: get().progress[termId]?.status ?? "unlearned",
              favorited: !(get().progress[termId]?.favorited ?? false),
              learnedAt: get().progress[termId]?.learnedAt,
            },
          },
        }),

      quizSessions: [],
      recordQuizSession: (s) => set({ quizSessions: [s, ...get().quizSessions].slice(0, 50) }),

      submissions: [],
      addSubmission: (s) => set({ submissions: [s, ...get().submissions] }),
    }),
    { name: "slangflow-store" },
  ),
);