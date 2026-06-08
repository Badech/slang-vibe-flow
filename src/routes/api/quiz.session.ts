// POST /api/quiz/session — save quiz result, compute XP, update streak
// (spec §4 + §6).
//
// XP rules:
//   +50 per quiz completed
//   +100 bonus if perfect score
//
// The route returns the computed { xpEarned, levelUp } so the client can fire
// the right celebration toasts without re-fetching stats.

import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireServerAuth } from "@/lib/auth.server";
import { bumpStats, getUserStats, saveQuizSession } from "@/lib/db/queries";
import { levelFor } from "@/lib/types";

const Body = z.object({
  id: z.string().min(1),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

export const ServerRoute = createServerFileRoute("/api/quiz/session").methods({
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

    const { id, score, total } = parsed.data;
    const perfect = score === total && total > 0;
    const xpEarned = 50 + (perfect ? 100 : 0);

    try {
      const before = await getUserStats(auth.userId);
      const beforeLevel = levelFor(before.xp).name;

      await saveQuizSession({ id, userId: auth.userId, score, total, xpEarned, perfect });
      await bumpStats({ userId: auth.userId, xpDelta: xpEarned, isQuiz: true });

      const after = await getUserStats(auth.userId);
      const afterLevel = levelFor(after.xp).name;
      const levelUp = beforeLevel !== afterLevel;

      return jsonResponse({
        ok: true,
        xpEarned,
        perfect,
        levelUp,
        newLevel: afterLevel,
        streak: after.streakCount,
        totalXp: after.xp,
      });
    } catch (err) {
      console.error("[POST /api/quiz/session]", err);
      return errorResponse("Failed to save quiz session");
    }
  },
});
