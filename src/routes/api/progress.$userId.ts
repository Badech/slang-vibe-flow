// GET /api/progress/:userId — all progress rows for a user (spec §4).
// Only the owner can read their own progress.

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireServerAuth } from "@/lib/auth.server";
import { listUserProgress } from "@/lib/db/queries";

export const ServerRoute = createServerFileRoute("/api/progress/$userId").methods({
  GET: async ({ request, params }) => {
    const auth = await requireServerAuth();
    if (auth.userId !== params.userId) return errorResponse("Forbidden", 403);
    try {
      const rows = await listUserProgress(params.userId);
      return jsonResponse({ items: rows });
    } catch (err) {
      console.error(`[GET /api/progress/${params.userId}]`, err);
      return errorResponse("Failed to load progress");
    }
  },
});
