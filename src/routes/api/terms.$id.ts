// GET /api/terms/:id — full term with examples + related (spec §4).

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse, withDbFallback } from "@/lib/api/helpers";
import { getTerm } from "@/lib/data/terms";
import { getTermById } from "@/lib/db/queries";

export const ServerRoute = createServerFileRoute("/api/terms/$id").methods({
  GET: async ({ params }) => {
    try {
      const term = await withDbFallback(
        () => getTermById(params.id),
        () => getTerm(params.id) ?? null,
      );
      if (!term) return errorResponse("Term not found", 404);
      return jsonResponse(term);
    } catch (err) {
      console.error(`[GET /api/terms/${params.id}]`, err);
      return errorResponse("Failed to load term");
    }
  },
});
