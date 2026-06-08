// GET /api/community/pending — admin-only list of pending submissions
// (spec §4 + §7).

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireAdmin } from "@/lib/auth.server";
import { listPendingSubmissions } from "@/lib/db/queries";

export const ServerRoute = createServerFileRoute("/api/community/pending").methods({
  GET: async ({ request }) => {
    await requireAdmin();
    try {
      const items = await listPendingSubmissions();
      return jsonResponse({ items });
    } catch (err) {
      console.error("[GET /api/community/pending]", err);
      return errorResponse("Failed to load pending submissions");
    }
  },
});
