// POST /api/community/submit — submit a new term for review (spec §4 + §7).

import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireServerAuth } from "@/lib/auth.server";
import { createSubmission } from "@/lib/db/queries";

const Body = z.object({
  term: z.string().min(1).max(64),
  type: z.enum(["idiom", "text_slang", "abbreviation"]),
  definition: z.string().min(1).max(500),
  example: z.string().max(500).default(""),
  context: z.string().max(200).default(""),
  platformSource: z.string().max(120).optional(),
});

export const ServerRoute = createServerFileRoute("/api/community/submit").methods({
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

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await createSubmission({ id, submittedBy: auth.userId, ...parsed.data });
      return jsonResponse({ ok: true, id });
    } catch (err) {
      console.error("[POST /api/community/submit]", err);
      return errorResponse("Failed to save submission");
    }
  },
});
