// Build a quiz session per spec §5.
//
//   - 10 questions per session
//   - Equally drawn from idiom + text-slang/abbreviation pools
//   - 4 question types (randomized): multiple, fill, context, reverse
//   - Distractors picked from the SAME category for plausibility
//
// We expose two entry points:
//   - `buildSession(pool?)` — picks 10 questions up-front (used at quiz start)
//   - `buildQuestion(term, type)` — generates a single question for a term
//     (used by adaptive flow to re-pick questions mid-session)

import type { Difficulty, Example, Term, TermType } from "../types";
import { TERMS } from "../data/terms";
import { resolveSpokenEquivalent, resolveTextingEquivalent } from "../types";

export type QType = "multiple" | "fill" | "context" | "reverse";

export interface Question {
  id: string;
  type: QType;
  term: Term;
  prompt: string;
  options?: string[];
  /** Index in `options` (multiple / context / reverse). */
  correctIndex?: number;
  /** Plain-text answer for fill-in (lowercased on compare). */
  answer?: string;
}

export interface BuildSessionOptions {
  /** Total questions (default 10). */
  size?: number;
  /** Restrict to a difficulty level (otherwise sampled across all). */
  difficulty?: Difficulty;
  /** Custom term pool (default TERMS). */
  pool?: Term[];
}

// ── Public API ──────────────────────────────────────────────────────────────

export function buildSession(opts: BuildSessionOptions = {}): Question[] {
  const size = opts.size ?? 10;
  const pool = opts.pool ?? TERMS;

  const idioms = filterByDifficulty(pool.filter((t) => t.type === "idiom"), opts.difficulty);
  const slang = filterByDifficulty(
    pool.filter((t) => t.type !== "idiom"),
    opts.difficulty,
  );

  // 50/50 split with rounding bias toward idioms when odd.
  const idiomCount = Math.ceil(size / 2);
  const slangCount = size - idiomCount;

  const sampledIdioms = sampleN(idioms, Math.min(idiomCount, idioms.length));
  const sampledSlang = sampleN(slang, Math.min(slangCount, slang.length));

  // If a pool came up short, top up from the other side so we always emit `size` questions.
  const shortfall = size - sampledIdioms.length - sampledSlang.length;
  const topup = shortfall > 0 ? sampleN(pool, shortfall, [...sampledIdioms, ...sampledSlang]) : [];

  const chosen = shuffle([...sampledIdioms, ...sampledSlang, ...topup]);

  return chosen.map((term, i) => {
    // Force at least one of each question type when possible by rotating.
    const types: QType[] = ["multiple", "fill", "context", "reverse"];
    const preferredType = types[i % types.length];
    const finalType = chooseTypeFor(term, preferredType);
    return buildQuestion(term, finalType, pool);
  });
}

export function buildQuestion(term: Term, type: QType, pool: Term[] = TERMS): Question {
  const id = `q_${term.id}_${type}_${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case "multiple":
      return buildMultiple(id, term, pool);
    case "fill":
      return buildFill(id, term);
    case "context":
      return buildContext(id, term, pool);
    case "reverse":
      return buildReverse(id, term, pool);
  }
}

// ── Question builders ───────────────────────────────────────────────────────

function buildMultiple(id: string, term: Term, pool: Term[]): Question {
  const distractors = pickDistractors(term, pool, 3).map((d) => d.definition);
  const options = shuffle([term.definition, ...distractors]);
  return {
    id,
    type: "multiple",
    term,
    prompt: `What does "${term.term}" mean?`,
    options,
    correctIndex: options.indexOf(term.definition),
  };
}

function buildFill(id: string, term: Term): Question {
  // Use the first example sentence as the cloze source. Replace the term
  // (case-insensitively) with a blank; if it isn't present in the sentence,
  // fall back to a generic cloze.
  const ex = term.examples?.[0] ?? null;
  const target = preferredFillForm(term);
  const sentence = ex?.sentence ?? `Quick — I need this ____ (${term.definition.toLowerCase()}).`;
  const re = new RegExp(`\\b${escapeRegExp(term.term)}\\b`, "gi");
  const blanked = sentence.match(re)
    ? sentence.replace(re, "_____")
    : `${sentence.replace(/[.!?]\s*$/, "")} — ${term.definition} (____).`;
  return {
    id,
    type: "fill",
    term,
    prompt: `Fill in the blank: "${blanked}"`,
    answer: target,
  };
}

function buildContext(id: string, term: Term, pool: Term[]): Question {
  // Show 3 scenarios; the correct one is built from this term's `when to use`
  // / first example; distractors borrow other terms' example contexts.
  const correct = scenarioFromTerm(term);
  const others = pickDistractors(term, pool, 2)
    .map((d) => scenarioFromTerm(d))
    .filter((s) => s !== correct);
  const options = shuffle([correct, ...others]).slice(0, 3);
  return {
    id,
    type: "context",
    term,
    prompt: `When would you naturally say "${term.term}"?`,
    options,
    correctIndex: options.indexOf(correct),
  };
}

function buildReverse(id: string, term: Term, pool: Term[]): Question {
  // Show the definition; pick the term that matches.
  const distractors = pickDistractors(term, pool, 3).map((d) => d.term);
  const options = shuffle([term.term, ...distractors]);
  return {
    id,
    type: "reverse",
    term,
    prompt: `Which term means: "${term.definition}"`,
    options,
    correctIndex: options.indexOf(term.term),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function filterByDifficulty(arr: Term[], difficulty?: Difficulty): Term[] {
  if (!difficulty) return arr;
  // Allow ±1 around target so we don't starve at the highest levels.
  return arr.filter((t) => Math.abs(t.difficulty - difficulty) <= 1);
}

function pickDistractors(target: Term, pool: Term[], n: number): Term[] {
  // Prefer same category, then same type, then anything.
  const sameCategory = pool.filter((p) => p.id !== target.id && p.category === target.category);
  const sameType = pool.filter((p) => p.id !== target.id && p.type === target.type && p.category !== target.category);
  const others = pool.filter((p) => p.id !== target.id);

  const chosen: Term[] = [];
  const used = new Set<string>();
  for (const bucket of [sameCategory, sameType, others]) {
    for (const t of shuffle(bucket)) {
      if (chosen.length >= n) break;
      if (used.has(t.id)) continue;
      chosen.push(t);
      used.add(t.id);
    }
    if (chosen.length >= n) break;
  }
  return chosen;
}

function preferredFillForm(term: Term): string {
  // Slang/abbreviations: the typed form ("rn" not "Right now"). Idioms: the term itself.
  if (term.type === "idiom") return term.term;
  return resolveTextingEquivalent(term) ?? term.term;
}

function scenarioFromTerm(term: Term): string {
  // Build a one-liner scenario the user can recognise.
  const ex: Example | undefined = term.examples?.[0];
  if (ex?.context) {
    return `${ex.context}: "${ex.sentence}"`;
  }
  return `When you'd say: ${term.definition}`;
}

function chooseTypeFor(term: Term, preferred: QType): QType {
  // Fill-in requires a usable target form — fine for everything, but skip
  // for terms where the term IS the answer in a multiple-choice round.
  // The preferred type works for any term in practice; this hook is here
  // so future rules (e.g. "no reverse for very short terms") can slot in.
  if (preferred === "fill" && term.term.length < 2) return "multiple";
  return preferred;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sampleN<T extends { id: string }>(arr: T[], n: number, exclude: T[] = []): T[] {
  const excludeIds = new Set(exclude.map((e) => e.id));
  return shuffle(arr.filter((t) => !excludeIds.has(t.id))).slice(0, n);
}

// Re-export so consumers don't have to also import from types.
export { resolveSpokenEquivalent, resolveTextingEquivalent };
export type { Term, TermType };
