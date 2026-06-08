/**
 * Seed script for SlangFlow's Neon database.
 *
 * Reads the canonical `TERMS` array from `src/lib/data/terms.ts`, derives the
 * spec's discrete "Sound Like a Native" + text-slang fields (texting/spoken
 * equivalent, platform origin, formality warning, tone register…) from each
 * entry, and upserts everything into Postgres in a single transactional
 * batch.
 *
 * Usage:
 *   bun run db:seed            # uses NEON_DATABASE_URL from .env
 *   NEON_DATABASE_URL=... bun run db:seed
 *
 * Idempotent: re-running updates existing rows by primary key.
 */

import "dotenv/config";

import { eq } from "drizzle-orm";

import { getDb, schema } from "../src/lib/db/client";
import { TERMS } from "../src/lib/data/terms";
import {
  resolveFormalityWarning,
  resolvePlatformOrigin,
  resolveRedFlag,
  resolveSpokenEquivalent,
  resolveTextingEquivalent,
  resolveToneRegister,
  resolveUpgradePhrase,
  resolveWhenToUse,
  resolveWhoSaysIt,
} from "../src/lib/types";

async function main() {
  const db = getDb();

  console.log(`→ Seeding ${TERMS.length} terms into Neon…`);

  // ── terms ────────────────────────────────────────────────────────────────
  let termCount = 0;
  for (const t of TERMS) {
    await db
      .insert(schema.terms)
      .values({
        id: t.id,
        term: t.term,
        phonetic: t.phonetic ?? null,
        type: t.type,
        definition: t.definition,
        origin: t.origin ?? "",
        category: t.category,
        difficulty: t.difficulty,
        region: t.region,
        nativeTip: resolveWhenToUse(t),
        toneRegister: resolveToneRegister(t),
        whoSaysIt: resolveWhoSaysIt(t),
        redFlag: resolveRedFlag(t),
        upgradePhrase: resolveUpgradePhrase(t),
        commonMistake: t.commonMistake ?? "",
        textingEquivalent: resolveTextingEquivalent(t) ?? null,
        spokenEquivalent: t.type === "idiom" ? null : resolveSpokenEquivalent(t),
        platformOrigin: t.type === "idiom" ? null : resolvePlatformOrigin(t),
        formalityWarning: resolveFormalityWarning(t),
      })
      .onConflictDoUpdate({
        target: schema.terms.id,
        set: {
          term: t.term,
          phonetic: t.phonetic ?? null,
          definition: t.definition,
          origin: t.origin ?? "",
          category: t.category,
          difficulty: t.difficulty,
          region: t.region,
          nativeTip: resolveWhenToUse(t),
          toneRegister: resolveToneRegister(t),
          whoSaysIt: resolveWhoSaysIt(t),
          redFlag: resolveRedFlag(t),
          upgradePhrase: resolveUpgradePhrase(t),
          commonMistake: t.commonMistake ?? "",
          textingEquivalent: resolveTextingEquivalent(t) ?? null,
          spokenEquivalent: t.type === "idiom" ? null : resolveSpokenEquivalent(t),
          platformOrigin: t.type === "idiom" ? null : resolvePlatformOrigin(t),
          formalityWarning: resolveFormalityWarning(t),
          updatedAt: new Date(),
        },
      });
    termCount++;
  }
  console.log(`  ✓ ${termCount} terms upserted.`);

  // ── examples ─────────────────────────────────────────────────────────────
  // Wipe + re-insert is the simplest correct approach: examples are tied to
  // their term and we want the seed to be the source of truth.
  let exampleCount = 0;
  for (const t of TERMS) {
    await db.delete(schema.examples).where(eq(schema.examples.termId, t.id));
    if (!t.examples?.length) continue;
    await db.insert(schema.examples).values(
      t.examples.map((ex, i) => ({
        termId: t.id,
        sentence: ex.sentence,
        context: ex.context,
        position: i,
      })),
    );
    exampleCount += t.examples.length;
  }
  console.log(`  ✓ ${exampleCount} examples inserted.`);

  // ── related_terms ────────────────────────────────────────────────────────
  let relationCount = 0;
  for (const t of TERMS) {
    await db.delete(schema.relatedTerms).where(eq(schema.relatedTerms.termId, t.id));
    if (!t.related?.length) continue;
    const validRelated = t.related.filter((r) => TERMS.some((x) => x.id === r));
    if (validRelated.length === 0) continue;
    await db.insert(schema.relatedTerms).values(
      validRelated.map((relatedId) => ({ termId: t.id, relatedId })),
    );
    relationCount += validRelated.length;
  }
  console.log(`  ✓ ${relationCount} related-term links inserted.`);

  // ── Summary ──────────────────────────────────────────────────────────────
  const idioms = TERMS.filter((t) => t.type === "idiom").length;
  const slang = TERMS.filter((t) => t.type === "text_slang").length;
  const abbrev = TERMS.filter((t) => t.type === "abbreviation").length;
  console.log("\n✅ Seed complete.");
  console.log(`   idioms:        ${idioms}`);
  console.log(`   text_slang:    ${slang}`);
  console.log(`   abbreviation:  ${abbrev}`);
  console.log(`   total:         ${TERMS.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
