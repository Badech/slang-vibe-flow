// Shared domain types for SlangFlow.
//
// The `nativeTip` object is preserved for back-compat with the existing learn
// page, but the spec also requires discrete top-level fields. Both shapes coexist
// here; new code should prefer the top-level discrete fields where present and
// fall back to `nativeTip` otherwise (see helpers below).

export type TermType = "idiom" | "text_slang" | "abbreviation";
export type Difficulty = 1 | 2 | 3;

export type ToneRegister =
  | "formal"
  | "casual"
  | "sarcastic"
  | "affectionate"
  | "urgent"
  | "neutral";

export type PlatformOrigin =
  | "Twitter"
  | "TikTok"
  | "Gaming"
  | "SMS"
  | "Reddit"
  | "General"
  | "Internet";

export interface Example {
  sentence: string;
  context: string;
}

export interface NativeTip {
  /** When the term is appropriate to use. */
  whenToUse: string;
  /** Free-text tone description (legacy). Prefer `toneRegister` field on Term. */
  toneRegister: string;
  /** Demographic blurb. Prefer `whoSaysIt` on Term. */
  whoSaysIt: string;
  /** When NOT to use it. Prefer `redFlag` on Term. */
  redFlag: string;
  /** Natural follow-up. Prefer `upgradePhrase` on Term. */
  upgrade: string;
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

  // Legacy bundled tip (kept for back-compat with existing rendering)
  nativeTip: NativeTip;

  /** What learners typically get wrong. */
  commonMistake: string;
  /** IDs of related terms. */
  related?: string[];

  // ── Discrete "Sound Like a Native" fields (spec) ──
  /** Canonical machine tone, used for the spectrum bar color. */
  toneRegister?: ToneRegister;
  /** Demographic chip text (e.g. "Gen Z, Nationwide"). */
  whoSaysIt?: string;
  /** When NOT to use it. */
  redFlag?: string;
  /** Natural follow-up phrase shown in the "upgrade" chat bubble. */
  upgradePhrase?: string;

  // ── Text-slang-only discrete fields (spec) ──
  /** Typed form, e.g. "ngl", "rn", "asap". */
  textingEquivalent?: string;
  /** Spoken expansion, e.g. "Not gonna lie" for NGL. */
  spokenEquivalent?: string;
  /** Where the term originated culturally. */
  platformOrigin?: PlatformOrigin;
  /** True if inappropriate in professional contexts. */
  formalityWarning?: boolean;
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

// ── Levels (per spec) ───────────────────────────────────────────────────────
// Rookie 0–200 | Street-Smart 201–500 | Fluent 501–1000 |
// Native Vibes 1001–2000 | Slang God 2001+
//
// `max` is exclusive (the next level's `min`).
export const LEVELS = [
  { name: "Rookie", min: 0, max: 201, emoji: "🟤", color: "var(--muted-foreground)" },
  { name: "Street-Smart", min: 201, max: 501, emoji: "🔵", color: "oklch(0.7 0.18 240)" },
  { name: "Fluent", min: 501, max: 1001, emoji: "🟣", color: "oklch(0.65 0.22 300)" },
  { name: "Native Vibes", min: 1001, max: 2001, emoji: "🟡", color: "oklch(0.85 0.18 95)" },
  { name: "Slang God", min: 2001, max: Number.POSITIVE_INFINITY, emoji: "🔴", color: "oklch(0.65 0.25 25)" },
] as const;

export type Level = (typeof LEVELS)[number];

export function levelFor(xp: number): Level {
  return LEVELS.find((l) => xp >= l.min && xp < l.max) ?? LEVELS[LEVELS.length - 1];
}

// ── Sound Like a Native helpers ─────────────────────────────────────────────
// These resolve the discrete spec fields against legacy data without forcing
// us to rewrite the full 100+ entry dataset in one pass.

const TONE_KEYWORDS: Array<{ match: RegExp; tone: ToneRegister }> = [
  { match: /sarcas/i, tone: "sarcastic" },
  { match: /affect|warm|sweet|endear/i, tone: "affectionate" },
  { match: /urgen|asap|immediate/i, tone: "urgent" },
  { match: /formal|professional|polite/i, tone: "formal" },
  { match: /casual|chill|hype|playful|fun|low-?key/i, tone: "casual" },
];

export function resolveToneRegister(term: Term): ToneRegister {
  if (term.toneRegister) return term.toneRegister;
  const blob = `${term.nativeTip?.toneRegister ?? ""} ${term.category}`.toLowerCase();
  for (const { match, tone } of TONE_KEYWORDS) {
    if (match.test(blob)) return tone;
  }
  return "casual";
}

export function resolveWhoSaysIt(term: Term): string {
  return term.whoSaysIt ?? term.nativeTip?.whoSaysIt ?? "All ages";
}

export function resolveRedFlag(term: Term): string {
  return term.redFlag ?? term.nativeTip?.redFlag ?? "Avoid in highly formal contexts.";
}

export function resolveUpgradePhrase(term: Term): string {
  return term.upgradePhrase ?? term.nativeTip?.upgrade ?? "";
}

export function resolveWhenToUse(term: Term): string {
  return term.nativeTip?.whenToUse ?? "";
}

export function resolveTextingEquivalent(term: Term): string | undefined {
  if (term.textingEquivalent) return term.textingEquivalent;
  if (term.type === "idiom") return undefined;
  return term.term.toLowerCase();
}

const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  asap: "As soon as possible",
  rn: "Right now",
  ngl: "Not gonna lie",
  imo: "In my opinion",
  imho: "In my humble opinion",
  tbh: "To be honest",
  tbf: "To be fair",
  idk: "I don't know",
  idc: "I don't care",
  irl: "In real life",
  afk: "Away from keyboard",
  brb: "Be right back",
  smh: "Shaking my head",
  lmao: "Laughing my ass off",
  lol: "Laughing out loud",
  rofl: "Rolling on the floor laughing",
  fyi: "For your information",
  lmk: "Let me know",
  hmu: "Hit me up",
  wyd: "What you doing",
  wya: "Where you at",
  iykyk: "If you know, you know",
  npc: "Non-player character",
  pov: "Point of view",
  ofc: "Of course",
  ikr: "I know, right",
  istg: "I swear to god",
  iirc: "If I recall correctly",
  fwiw: "For what it's worth",
  icymi: "In case you missed it",
  til: "Today I learned",
  eta: "Estimated time of arrival",
  otp: "One true pairing",
  fyp: "For you page",
  grwm: "Get ready with me",
  nvm: "Never mind",
  omg: "Oh my god",
  omw: "On my way",
  btw: "By the way",
  ttyl: "Talk to you later",
  gtg: "Got to go",
  jk: "Just kidding",
  fr: "For real",
  frfr: "For real, for real",
  ong: "On god",
  iont: "I don't",
  ijbol: "I just burst out laughing",
  wdym: "What do you mean",
  aight: "Alright",
};

export function resolveSpokenEquivalent(term: Term): string {
  if (term.spokenEquivalent) return term.spokenEquivalent;
  if (term.type === "idiom") return term.term;
  const key = term.term.toLowerCase().replace(/[^a-z]/g, "");
  return ABBREVIATION_EXPANSIONS[key] ?? term.term;
}

export function resolvePlatformOrigin(term: Term): PlatformOrigin {
  if (term.platformOrigin) return term.platformOrigin;
  const origin = (term.origin ?? "").toLowerCase();
  if (origin.includes("twitter")) return "Twitter";
  if (origin.includes("tiktok")) return "TikTok";
  if (origin.includes("gaming") || origin.includes("game")) return "Gaming";
  if (origin.includes("sms") || origin.includes("text")) return "SMS";
  if (origin.includes("reddit")) return "Reddit";
  if (origin.includes("internet") || origin.includes("online")) return "Internet";
  return "General";
}

export function resolveFormalityWarning(term: Term): boolean {
  if (typeof term.formalityWarning === "boolean") return term.formalityWarning;
  if (term.type === "idiom") return false;
  const blob = `${term.nativeTip?.redFlag ?? ""} ${term.category}`.toLowerCase();
  return /formal|work|professional|interview|boss/.test(blob);
}
