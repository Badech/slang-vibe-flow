// Server-only DB query helpers. These are the only place the API routes
// touch Drizzle directly — keeping the SQL surface small and testable.
//
// All functions degrade gracefully when NEON_DATABASE_URL isn't set: they
// throw a typed `NeonNotConfigured` error which the API routes catch and
// translate into a fallback response that serves the static TERMS data.

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb, schema } from "./client";
import type { Term, TermType } from "../types";

export class NeonNotConfigured extends Error {
  constructor() {
    super("NEON_DATABASE_URL is not configured.");
    this.name = "NeonNotConfigured";
  }
}

function ensureConfigured() {
  if (!process.env.NEON_DATABASE_URL) throw new NeonNotConfigured();
}

// ── Term row → Term (UI shape) ──────────────────────────────────────────────
function rowToTerm(row: typeof schema.terms.$inferSelect, examples: Array<{ sentence: string; context: string }> = [], related: string[] = []): Term {
  return {
    id: row.id,
    term: row.term,
    phonetic: row.phonetic ?? undefined,
    type: row.type as TermType,
    definition: row.definition,
    origin: row.origin,
    category: row.category,
    difficulty: (row.difficulty as 1 | 2 | 3) ?? 1,
    region: row.region,
    examples,
    nativeTip: {
      whenToUse: row.nativeTip,
      toneRegister: row.toneRegister,
      whoSaysIt: row.whoSaysIt,
      redFlag: row.redFlag,
      upgrade: row.upgradePhrase,
    },
    commonMistake: row.commonMistake,
    related,
    toneRegister: row.toneRegister,
    whoSaysIt: row.whoSaysIt,
    redFlag: row.redFlag,
    upgradePhrase: row.upgradePhrase,
    textingEquivalent: row.textingEquivalent ?? undefined,
    spokenEquivalent: row.spokenEquivalent ?? undefined,
    platformOrigin: row.platformOrigin ?? undefined,
    formalityWarning: row.formalityWarning,
  };
}

// ── Terms (list + detail) ───────────────────────────────────────────────────

export interface ListTermsParams {
  q?: string;
  type?: TermType | "all";
  category?: string;
  difficulty?: 1 | 2 | 3;
  region?: string;
  limit?: number;
  offset?: number;
}

export interface ListTermsResult {
  items: Term[];
  total: number;
}

export async function listTerms(params: ListTermsParams = {}): Promise<ListTermsResult> {
  ensureConfigured();
  const db = getDb();

  const conditions = [];
  if (params.q) {
    conditions.push(
      or(
        ilike(schema.terms.term, `%${params.q}%`),
        ilike(schema.terms.definition, `%${params.q}%`),
      ),
    );
  }
  if (params.type && params.type !== "all") {
    conditions.push(eq(schema.terms.type, params.type));
  }
  if (params.category) conditions.push(eq(schema.terms.category, params.category));
  if (params.difficulty) conditions.push(eq(schema.terms.difficulty, params.difficulty));
  if (params.region) conditions.push(eq(schema.terms.region, params.region));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const limit = Math.min(params.limit ?? 50, 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const [rows, totalRow] = await Promise.all([
    db.select().from(schema.terms).where(whereClause).orderBy(asc(schema.terms.term)).limit(limit).offset(offset),
    db.select({ c: count() }).from(schema.terms).where(whereClause),
  ]);

  return {
    items: rows.map((r) => rowToTerm(r)),
    total: Number(totalRow[0]?.c ?? 0),
  };
}

export async function getTermById(id: string): Promise<Term | null> {
  ensureConfigured();
  const db = getDb();

  const [row] = await db.select().from(schema.terms).where(eq(schema.terms.id, id)).limit(1);
  if (!row) return null;

  const [exampleRows, relatedRows] = await Promise.all([
    db.select().from(schema.examples).where(eq(schema.examples.termId, id)).orderBy(asc(schema.examples.position)),
    db.select().from(schema.relatedTerms).where(eq(schema.relatedTerms.termId, id)),
  ]);

  return rowToTerm(
    row,
    exampleRows.map((e) => ({ sentence: e.sentence, context: e.context })),
    relatedRows.map((r) => r.relatedId),
  );
}

export async function getDailyTerms(seed: number): Promise<{ idiom: Term | null; slang: Term | null }> {
  ensureConfigured();
  const db = getDb();

  const [idioms, slang] = await Promise.all([
    db.select().from(schema.terms).where(eq(schema.terms.type, "idiom")).orderBy(asc(schema.terms.id)),
    db.select().from(schema.terms).where(inArray(schema.terms.type, ["text_slang", "abbreviation"])).orderBy(asc(schema.terms.id)),
  ]);

  return {
    idiom: idioms.length ? rowToTerm(idioms[seed % idioms.length]) : null,
    slang: slang.length ? rowToTerm(slang[seed % slang.length]) : null,
  };
}

// ── User progress ───────────────────────────────────────────────────────────

export interface UpsertProgressParams {
  userId: string;
  termId: string;
  status?: "unlearned" | "learning" | "learned" | "mastered";
  favorited?: boolean;
}

export async function upsertProgress(params: UpsertProgressParams) {
  ensureConfigured();
  const db = getDb();
  const learnedAt = params.status === "learned" || params.status === "mastered" ? new Date() : null;

  await db
    .insert(schema.userProgress)
    .values({
      userId: params.userId,
      termId: params.termId,
      status: params.status ?? "learning",
      favorited: params.favorited ?? false,
      learnedAt,
    })
    .onConflictDoUpdate({
      target: [schema.userProgress.userId, schema.userProgress.termId],
      set: {
        ...(params.status !== undefined && { status: params.status }),
        ...(params.favorited !== undefined && { favorited: params.favorited }),
        ...(learnedAt && { learnedAt }),
        updatedAt: new Date(),
      },
    });
}

export async function listUserProgress(userId: string) {
  ensureConfigured();
  const db = getDb();
  return db.select().from(schema.userProgress).where(eq(schema.userProgress.userId, userId));
}

// ── Quiz sessions ───────────────────────────────────────────────────────────

export interface SaveQuizSessionParams {
  id: string;
  userId: string;
  score: number;
  total: number;
  xpEarned: number;
  perfect: boolean;
}

export async function saveQuizSession(params: SaveQuizSessionParams) {
  ensureConfigured();
  const db = getDb();
  await db.insert(schema.quizSessions).values(params).onConflictDoNothing();
}

// ── User stats + streak ─────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export interface StreakBumpInput {
  userId: string;
  /** XP earned by this activity (added to total). */
  xpDelta: number;
  /** True if this activity should count toward today's "completed a quiz" threshold. */
  isQuiz?: boolean;
  /** True if this activity should count toward today's "learned a term" threshold (5+ = streak). */
  isLearnedTerm?: boolean;
}

/**
 * Bump XP + streak atomically. Per spec §6:
 *   - Streak increments if user learns 5+ terms OR completes 1 quiz that day.
 *   - Stored as streak_count + last_active_date.
 */
export async function bumpStats(input: StreakBumpInput) {
  ensureConfigured();
  const db = getDb();
  const today = todayISO();

  const [existing] = await db
    .select()
    .from(schema.userStats)
    .where(eq(schema.userStats.userId, input.userId))
    .limit(1);

  if (!existing) {
    await db.insert(schema.userStats).values({
      userId: input.userId,
      xp: input.xpDelta,
      streakCount: input.isQuiz ? 1 : 0,
      lastActiveDate: today,
      termsLearnedToday: input.isLearnedTerm ? 1 : 0,
      quizzesToday: input.isQuiz ? 1 : 0,
    });
    return;
  }

  const isNewDay = existing.lastActiveDate !== today;
  const termsToday = isNewDay ? (input.isLearnedTerm ? 1 : 0) : existing.termsLearnedToday + (input.isLearnedTerm ? 1 : 0);
  const quizzesToday = isNewDay ? (input.isQuiz ? 1 : 0) : existing.quizzesToday + (input.isQuiz ? 1 : 0);

  // Streak trigger: 5+ terms learned today OR 1+ quiz completed today.
  const earnsStreakToday = termsToday >= 5 || quizzesToday >= 1;

  let nextStreak = existing.streakCount;
  if (earnsStreakToday) {
    if (!existing.lastActiveDate) {
      nextStreak = 1;
    } else {
      const diff = dayDiff(existing.lastActiveDate, today);
      if (diff === 0) {
        // Same day — only bump streak if today's first qualifying activity
        // happens right now (not already counted).
        const wasAlreadyQualifying =
          existing.termsLearnedToday >= 5 || existing.quizzesToday >= 1;
        if (!wasAlreadyQualifying) nextStreak = existing.streakCount + (existing.streakCount === 0 ? 1 : 0);
      } else if (diff === 1) {
        nextStreak = existing.streakCount + 1;
      } else if (diff > 1) {
        nextStreak = 1;
      }
    }
  }

  await db
    .update(schema.userStats)
    .set({
      xp: existing.xp + input.xpDelta,
      streakCount: nextStreak,
      lastActiveDate: today,
      termsLearnedToday: termsToday,
      quizzesToday: quizzesToday,
      updatedAt: new Date(),
    })
    .where(eq(schema.userStats.userId, input.userId));
}

export async function getUserStats(userId: string) {
  ensureConfigured();
  const db = getDb();
  const [row] = await db.select().from(schema.userStats).where(eq(schema.userStats.userId, userId)).limit(1);
  if (!row) {
    return {
      userId,
      xp: 0,
      streakCount: 0,
      lastActiveDate: null,
      termsLearnedToday: 0,
      quizzesToday: 0,
      totalLearned: 0,
      totalMastered: 0,
    };
  }
  // Compute totals on demand from user_progress.
  const totals = await db
    .select({
      learned: sql<number>`count(*) filter (where ${schema.userProgress.status} in ('learned','mastered'))`,
      mastered: sql<number>`count(*) filter (where ${schema.userProgress.status} = 'mastered')`,
    })
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));

  return {
    userId,
    xp: row.xp,
    streakCount: row.streakCount,
    lastActiveDate: row.lastActiveDate,
    termsLearnedToday: row.termsLearnedToday,
    quizzesToday: row.quizzesToday,
    totalLearned: Number(totals[0]?.learned ?? 0),
    totalMastered: Number(totals[0]?.mastered ?? 0),
  };
}

// ── Community submissions ───────────────────────────────────────────────────

export interface CreateSubmissionParams {
  id: string;
  submittedBy: string;
  term: string;
  type: TermType;
  definition: string;
  example: string;
  context: string;
  platformSource?: string;
}

export async function createSubmission(params: CreateSubmissionParams) {
  ensureConfigured();
  const db = getDb();
  await db.insert(schema.communitySubmissions).values({
    ...params,
    platformSource: params.platformSource ?? null,
    status: "pending",
  });
}

export async function listPendingSubmissions() {
  ensureConfigured();
  const db = getDb();
  return db
    .select()
    .from(schema.communitySubmissions)
    .where(eq(schema.communitySubmissions.status, "pending"))
    .orderBy(desc(schema.communitySubmissions.createdAt));
}
