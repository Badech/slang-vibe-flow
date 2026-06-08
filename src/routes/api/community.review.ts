// POST /api/community/review — admin-only approve/reject of a submission
// (spec §7: "Approved submissions get added to terms table automatically
// via admin action").
//
// Body: { id, action: "approve" | "reject" }
//
// On approve: inserts the submission as a new row in `terms` (auto-slugged
// id, default category/difficulty). On reject: marks the submission as
// rejected. Both also stamp `reviewed_at` + `reviewed_by`.

import { createServerFileRoute } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { errorResponse, jsonResponse } from "@/lib/api/helpers";
import { requireAdmin } from "@/lib/auth.server";
import { getDb, schema } from "@/lib/db/client";

const Body = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export const ServerRoute = createServerFileRoute("/api/community/review").methods({
  POST: async ({ request }) => {
    const auth = await requireAdmin();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    const parsed = Body.safeParse(payload);
    if (!parsed.success) return errorResponse("Invalid payload", 400);

    const db = getDb();

    const [submission] = await db
      .select()
      .from(schema.communitySubmissions)
      .where(eq(schema.communitySubmissions.id, parsed.data.id))
      .limit(1);
    if (!submission) return errorResponse("Submission not found", 404);

    try {
      if (parsed.data.action === "approve") {
        const slug = slugify(submission.term) || `term-${Date.now()}`;
        // Insert as a new term; conflict-do-nothing in case the slug clashes
        // with an existing seed entry.
        await db
          .insert(schema.terms)
          .values({
            id: slug,
            term: submission.term,
            type: submission.type,
            definition: submission.definition,
            origin: submission.platformSource ?? "Community submission",
            category: "Community",
            difficulty: 1,
            region: "US",
            nativeTip: submission.context ?? "",
            toneRegister: "casual",
            whoSaysIt: "Community-submitted",
            redFlag: "",
            upgradePhrase: "",
            commonMistake: "",
          })
          .onConflictDoNothing();

        if (submission.example) {
          await db.insert(schema.examples).values({
            termId: slug,
            sentence: submission.example,
            context: submission.context ?? "",
            position: 0,
          });
        }

        await db
          .update(schema.communitySubmissions)
          .set({
            status: "approved",
            approvedTermId: slug,
            reviewedAt: new Date(),
            reviewedBy: auth.userId,
          })
          .where(eq(schema.communitySubmissions.id, submission.id));

        return jsonResponse({ ok: true, approvedTermId: slug });
      }

      // reject
      await db
        .update(schema.communitySubmissions)
        .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: auth.userId })
        .where(eq(schema.communitySubmissions.id, submission.id));
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error("[POST /api/community/review]", err);
      return errorResponse("Failed to process review");
    }
  },
});
