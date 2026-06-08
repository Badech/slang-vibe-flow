// Drizzle schema for SlangFlow's Neon Postgres database.
//
// Tables (per spec section 1):
//   terms                  — canonical dictionary entries
//   examples               — N example sentences per term
//   related_terms          — many-to-many adjacency between terms
//   user_progress          — per-user, per-term learning state + favorites
//   quiz_sessions          — quiz history with XP earned
//   community_submissions  — user-submitted terms awaiting review
//   user_stats             — aggregated per-user XP / streak / last_active
//
// User IDs are Clerk `user_xxx` strings, so we use `text` (not uuid) for them.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ───────────────────────────────────────────────────────────────────
export const termTypeEnum = pgEnum("term_type", [
  "idiom",
  "text_slang",
  "abbreviation",
]);

export const toneRegisterEnum = pgEnum("tone_register", [
  "formal",
  "casual",
  "sarcastic",
  "affectionate",
  "urgent",
  "neutral",
]);

export const platformOriginEnum = pgEnum("platform_origin", [
  "Twitter",
  "TikTok",
  "Gaming",
  "SMS",
  "Reddit",
  "General",
  "Internet",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "unlearned",
  "learning",
  "learned",
  "mastered",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
]);

// ── terms ───────────────────────────────────────────────────────────────────
export const terms = pgTable(
  "terms",
  {
    id: text("id").primaryKey(), // slug, e.g. "break-a-leg"
    term: text("term").notNull(),
    phonetic: text("phonetic"),
    type: termTypeEnum("type").notNull(),
    definition: text("definition").notNull(),
    origin: text("origin").notNull().default(""),
    category: text("category").notNull(),
    difficulty: smallint("difficulty").notNull().default(1),
    region: text("region").notNull().default("US"),

    // Sound Like a Native fields (spec §3)
    nativeTip: text("native_tip").notNull().default(""),
    toneRegister: toneRegisterEnum("tone_register").notNull().default("casual"),
    whoSaysIt: text("who_says_it").notNull().default(""),
    redFlag: text("red_flag").notNull().default(""),
    upgradePhrase: text("upgrade_phrase").notNull().default(""),
    commonMistake: text("common_mistake").notNull().default(""),

    // Text-slang-only fields (spec §1 "TEXT SLANG & ABBREVIATIONS")
    textingEquivalent: text("texting_equivalent"),
    spokenEquivalent: text("spoken_equivalent"),
    platformOrigin: platformOriginEnum("platform_origin"),
    formalityWarning: boolean("formality_warning").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("terms_type_idx").on(t.type),
    categoryIdx: index("terms_category_idx").on(t.category),
    difficultyIdx: index("terms_difficulty_idx").on(t.difficulty),
    // Trigram-style search via lower(term) — keeps the migration portable.
    termLowerIdx: index("terms_term_lower_idx").on(sql`lower(${t.term})`),
  }),
);

// ── examples ────────────────────────────────────────────────────────────────
export const examples = pgTable(
  "examples",
  {
    id: serial("id").primaryKey(),
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    context: text("context").notNull().default(""),
    position: smallint("position").notNull().default(0),
  },
  (t) => ({
    byTermIdx: index("examples_term_id_idx").on(t.termId),
  }),
);

// ── related_terms (many-to-many) ────────────────────────────────────────────
export const relatedTerms = pgTable(
  "related_terms",
  {
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    relatedId: text("related_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.termId, t.relatedId] }),
    byRelatedIdx: index("related_terms_related_idx").on(t.relatedId),
  }),
);

// ── user_progress ───────────────────────────────────────────────────────────
export const userProgress = pgTable(
  "user_progress",
  {
    userId: text("user_id").notNull(), // Clerk user id
    termId: text("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    status: progressStatusEnum("status").notNull().default("unlearned"),
    favorited: boolean("favorited").notNull().default(false),
    learnedAt: timestamp("learned_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.termId] }),
    byUserIdx: index("user_progress_user_idx").on(t.userId),
  }),
);

// ── quiz_sessions ───────────────────────────────────────────────────────────
export const quizSessions = pgTable(
  "quiz_sessions",
  {
    id: text("id").primaryKey(), // client-generated uuid or nanoid
    userId: text("user_id").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    xpEarned: integer("xp_earned").notNull(),
    perfect: boolean("perfect").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUserIdx: index("quiz_sessions_user_idx").on(t.userId),
  }),
);

// ── community_submissions ───────────────────────────────────────────────────
export const communitySubmissions = pgTable(
  "community_submissions",
  {
    id: text("id").primaryKey(),
    submittedBy: text("submitted_by").notNull(),
    term: text("term").notNull(),
    type: termTypeEnum("type").notNull(),
    definition: text("definition").notNull(),
    example: text("example").notNull().default(""),
    context: text("context").notNull().default(""),
    platformSource: text("platform_source"),
    status: submissionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    /** When approved, the resulting term id (FK is loose — term may be deleted). */
    approvedTermId: text("approved_term_id"),
  },
  (t) => ({
    byStatusIdx: index("community_submissions_status_idx").on(t.status),
    byUserIdx: index("community_submissions_user_idx").on(t.submittedBy),
  }),
);

// ── user_stats ──────────────────────────────────────────────────────────────
// One row per user. Materializes streak so we don't recompute on every read.
export const userStats = pgTable(
  "user_stats",
  {
    userId: text("user_id").primaryKey(),
    xp: integer("xp").notNull().default(0),
    streakCount: integer("streak_count").notNull().default(0),
    lastActiveDate: text("last_active_date"), // YYYY-MM-DD
    termsLearnedToday: integer("terms_learned_today").notNull().default(0),
    quizzesToday: integer("quizzes_today").notNull().default(0),
    totalLearned: integer("total_learned").notNull().default(0),
    totalMastered: integer("total_mastered").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    xpIdx: uniqueIndex("user_stats_user_idx").on(t.userId),
  }),
);

// ── Types ───────────────────────────────────────────────────────────────────
export type TermRow = typeof terms.$inferSelect;
export type NewTermRow = typeof terms.$inferInsert;
export type ExampleRow = typeof examples.$inferSelect;
export type NewExampleRow = typeof examples.$inferInsert;
export type UserProgressRow = typeof userProgress.$inferSelect;
export type QuizSessionRow = typeof quizSessions.$inferSelect;
export type CommunitySubmissionRow = typeof communitySubmissions.$inferSelect;
export type UserStatsRow = typeof userStats.$inferSelect;
