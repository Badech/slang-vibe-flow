// GET /api/terms/daily — today's featured idiom + featured text slang
// (spec §4). Uses a deterministic date-hash so every user sees the same pair
// for the same UTC day.

import { createServerFileRoute } from "@tanstack/react-start/server";

import { errorResponse, jsonResponse, todaySeed, withDbFallback } from "@/lib/api/helpers";
import { TERMS } from "@/lib/data/terms";
import { getDailyTerms } from "@/lib/db/queries";

export const ServerRoute = createServerFileRoute("/api/terms/daily").methods({
  GET: async () => {
    const seed = todaySeed();
    try {
      const result = await withDbFallback(
        () => getDailyTerms(seed),
        () => {
          const idioms = TERMS.filter((t) => t.type === "idiom");
          const slang = TERMS.filter((t) => t.type !== "idiom");
          return {
            idiom: idioms.length ? idioms[seed % idioms.length] : null,
            slang: slang.length ? slang[seed % slang.length] : null,
          };
        },
      );
      return jsonResponse({ ...result, seed });
    } catch (err) {
      console.error("[GET /api/terms/daily]", err);
      return errorResponse("Failed to load daily terms");
    }
  },
});
