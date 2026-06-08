// GET /api/community/leaderboard — top 10 contributors for the current
// month, ranked by approved submission count (spec §7).
//
// Public endpoint — the leaderboard is shown on the /community page.

import { createServerFileRoute } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { errorResponse, jsonResponse, withDbFallback } from "@/lib/api/helpers";
import { getDb, schema } from "@/lib/db/client";

export const ServerRoute = createServerFileRoute("/api/community/leaderboard").methods({
  GET: async () => {
    try {
      const items = await withDbFallback(
        async () => {
          const db = getDb();
          const monthStart = new Date();
          monthStart.setUTCDate(1);
          monthStart.setUTCHours(0, 0, 0, 0);
          const rows = await db
            .select({
              userId: schema.communitySubmissions.submittedBy,
              count: count(),
            })
            .from(schema.communitySubmissions)
            .where(
              and(
                eq(schema.communitySubmissions.status, "approved"),
                gte(schema.communitySubmissions.reviewedAt, monthStart),
              ),
            )
            .groupBy(schema.communitySubmissions.submittedBy)
            .orderBy(desc(count()))
            .limit(10);
          return rows.map((r) => ({ userId: r.userId, approved: Number(r.count) }));
        },
        // Fallback when Neon isn't set: empty leaderboard with helpful note.
        () => [] as Array<{ userId: string; approved: number }>,
      );
      return jsonResponse({ items });
    } catch (err) {
      console.error("[GET /api/community/leaderboard]", err);
      return errorResponse("Failed to load leaderboard");
    }
  },
});
