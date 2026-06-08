// GET /api/terms — paginated list with filters (spec §4).
//
// Query params:
//   q          - full-text-ish search on term + definition
//   type       - "idiom" | "text_slang" | "abbreviation" | "all"
//   category   - exact match
//   difficulty - 1 | 2 | 3
//   region     - exact match
//   status     - "unlearned" | "learned" | "favorited" (server-side only when
//                a valid Clerk user is on the request)
//   limit      - default 50, max 200
//   offset     - default 0
//
// Falls back to the static TERMS array when NEON_DATABASE_URL isn't set so
// the app is usable in dev without provisioning a database.

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse, withDbFallback } from "@/lib/api/helpers";
import { listTerms } from "@/lib/db/queries";
import { TERMS } from "@/lib/data/terms";
import type { TermType } from "@/lib/types";

const VALID_TYPES = new Set<TermType | "all">(["idiom", "text_slang", "abbreviation", "all"]);

export const ServerRoute = createServerFileRoute("/api/terms").methods({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || undefined;
    const typeParam = (url.searchParams.get("type") ?? "all").trim() as TermType | "all";
    const type = VALID_TYPES.has(typeParam) ? typeParam : "all";
    const category = url.searchParams.get("category")?.trim() || undefined;
    const difficultyParam = url.searchParams.get("difficulty");
    const difficulty = difficultyParam ? (Number(difficultyParam) as 1 | 2 | 3) : undefined;
    const region = url.searchParams.get("region")?.trim() || undefined;
    const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
    const offset = clampInt(url.searchParams.get("offset"), 0, 0, 10_000);

    try {
      const result = await withDbFallback(
        () => listTerms({ q, type, category, difficulty, region, limit, offset }),
        () => filterStatic({ q, type, category, difficulty, region, limit, offset }),
      );
      return jsonResponse(result);
    } catch (err) {
      console.error("[GET /api/terms]", err);
      return errorResponse("Failed to list terms");
    }
  },
});

function clampInt(raw: string | null, fallback: number, min: number, max: number) {
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function filterStatic({
  q,
  type,
  category,
  difficulty,
  region,
  limit,
  offset,
}: {
  q?: string;
  type: TermType | "all";
  category?: string;
  difficulty?: 1 | 2 | 3;
  region?: string;
  limit: number;
  offset: number;
}) {
  const qLower = q?.toLowerCase();
  const filtered = TERMS.filter((t) => {
    if (type !== "all" && t.type !== type) return false;
    if (category && t.category !== category) return false;
    if (difficulty && t.difficulty !== difficulty) return false;
    if (region && t.region !== region) return false;
    if (qLower) {
      const hay = `${t.term} ${t.definition}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    return true;
  });
  const sorted = filtered.slice().sort((a, b) => a.term.localeCompare(b.term));
  return { items: sorted.slice(offset, offset + limit), total: filtered.length };
}
