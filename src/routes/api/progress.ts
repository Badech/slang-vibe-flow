// POST /api/progress — upsert one term's progress for the signed-in user
// (spec §4). Body: { termId, status?, favorited? }.

import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireServerAuth } from "@/lib/auth.server";
import { bumpStats, upsertProgress } from "@/lib/db/queries";

const Body = z.object({
  termId: z.string().min(1),
  status: z.enum(["unlearned", "learning", "learned", "mastered"]).optional(),
  favorited: z.boolean().optional(),
});

export const ServerRoute = createServerFileRoute("/api/progress").methods({
  POST: async ({ request }) => {
    const auth = await requireServerAuth();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    const parsed = Body.safeParse(payload);
    if (!parsed.success) return errorResponse("Invalid payload", 400);

    try {
      await upsertProgress({ userId: auth.userId, ...parsed.data });

      // XP rules (spec §6): +10 learned, +5 favorited.
      const becameLearned = parsed.data.status === "learned" || parsed.data.status === "mastered";
      const xpDelta = (becameLearned ? 10 : 0) + (parsed.data.favorited === true ? 5 : 0);
      if (xpDelta > 0) {
        await bumpStats({
          userId: auth.userId,
          xpDelta,
          isLearnedTerm: becameLearned,
        });
      }
      return jsonResponse({ ok: true, xpDelta });
    } catch (err) {
      console.error("[POST /api/progress]", err);
      return errorResponse("Failed to save progress");
    }
  },
});
