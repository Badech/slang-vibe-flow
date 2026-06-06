export type TermType = "idiom" | "text_slang" | "abbreviation";
export type Difficulty = 1 | 2 | 3;

export interface Example {
  sentence: string;
  context: string;
}

export interface Term {
  id: string;
  term: string;
  phonetic?: string;
  type: TermType;
  definition: string;
  origin: string;
  category: string;
  difficulty: Difficulty;
  region: string;
  examples: Example[];
  nativeTip: {
    whenToUse: string;
    toneRegister: string;
    whoSaysIt: string;
    redFlag: string;
    upgrade: string;
  };
  commonMistake: string;
  related?: string[];
}

export type ProgressStatus = "unlearned" | "learning" | "learned" | "mastered";

export interface UserProgress {
  termId: string;
  status: ProgressStatus;
  favorited: boolean;
  learnedAt?: number;
}

export interface QuizSession {
  id: string;
  score: number;
  total: number;
  xpEarned: number;
  completedAt: number;
}

export interface Submission {
  id: string;
  term: string;
  type: TermType;
  definition: string;
  example: string;
  context: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  submittedBy?: string;
}

export const LEVELS = [
  { name: "Rookie", min: 0, max: 500 },
  { name: "Street-Smart", min: 500, max: 1500 },
  { name: "Fluent", min: 1500, max: 3500 },
  { name: "Native Vibes", min: 3500, max: Infinity },
] as const;

export function levelFor(xp: number) {
  return LEVELS.find((l) => xp >= l.min && xp < l.max) ?? LEVELS[LEVELS.length - 1];
}