// GET /api/stats/:userId — streak, total learned, mastered, XP, level
// (spec §4).

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireServerAuth } from "@/lib/auth.server";
import { getUserStats } from "@/lib/db/queries";
import { levelFor } from "@/lib/types";

export const ServerRoute = createServerFileRoute("/api/stats/$userId").methods({
  GET: async ({ request, params }) => {
    const auth = await requireServerAuth();
    if (auth.userId !== params.userId) return errorResponse("Forbidden", 403);
    try {
      const stats = await getUserStats(params.userId);
      const level = levelFor(stats.xp);
      return jsonResponse({ ...stats, level: level.name, levelEmoji: level.emoji });
    } catch (err) {
      console.error(`[GET /api/stats/${params.userId}]`, err);
      return errorResponse("Failed to load stats");
    }
  },
});
