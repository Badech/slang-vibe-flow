// Admin-only review queue for community submissions (spec §7).
//
// Route: /admin/submissions
//
// Auth: protected by `requireAuth` at the client edge AND `requireAdmin` at
// the API layer (the pending-list and review endpoints both gate on Clerk
// `publicMetadata.role === "admin"`). Non-admins who somehow land here will
// see an empty list and any review actions will 403.

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import { makeRouteError } from "@/components/ErrorBoundary";
import { requireAuth } from "@/lib/auth";

interface PendingItem {
  id: string;
  term: string;
  type: string;
  definition: string;
  example?: string;
  context?: string;
  submittedBy: string;
  createdAt: string;
}

export const Route = createFileRoute("/admin/submissions")({
  beforeLoad: ({ location }) => requireAuth(location.href),
  head: () => ({ meta: [{ title: "Admin · Submissions — SlangFlow" }] }),
  errorComponent: makeRouteError("admin-submissions"),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["community", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/community/pending");
      if (res.status === 403) throw new Error("Not authorized — admin role required.");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: PendingItem[] }>;
    },
    staleTime: 30 * 1000,
  });

  const review = useMutation({
    mutationFn: async (body: { id: string; action: "approve" | "reject" }) => {
      const res = await fetch("/api/community/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ ok: true; approvedTermId?: string }>;
    },
    onSuccess: (res, vars) => {
      if (vars.action === "approve") {
        toast.success(res.approvedTermId ? `Approved → /learn/${res.approvedTermId}` : "Approved");
      } else {
        toast(`Rejected`);
      }
      qc.invalidateQueries({ queryKey: ["community", "pending"] });
      qc.invalidateQueries({ queryKey: ["community", "leaderboard"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to review"),
  });

  const items = data?.items ?? [];
  const forbidden = error instanceof Error && error.message.includes("admin role required");

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <p className="text-accent text-sm font-semibold tracking-wider">ADMIN</p>
          <h1 className="font-display text-4xl md:text-5xl">Submission queue</h1>
        </div>

        {forbidden && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Admin access required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set <code className="font-mono">publicMetadata.role = "admin"</code> on your Clerk user to access this page.
              </p>
            </div>
          </div>
        )}

        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        {!isLoading && !forbidden && items.length === 0 && (
          <p className="text-muted-foreground">No pending submissions. 🎉</p>
        )}

        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-2xl">{s.term}</span>
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {s.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{s.definition}</p>
                  {s.example && (
                    <p className="text-sm text-muted-foreground italic mt-2">"{s.example}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {s.context && <span>Source: {s.context} · </span>}
                    Submitted by <span className="font-mono">{s.submittedBy.slice(-8)}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: s.id, action: "approve" })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] disabled:opacity-50 transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: s.id, action: "reject" })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
