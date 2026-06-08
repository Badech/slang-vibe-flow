// Public community page — monthly contributor leaderboard (spec §7).
//
// Falls back to a friendly empty state when the leaderboard API returns
// nothing (either DB not configured or no approved submissions this month).

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { Layout } from "@/components/Layout";
import { makeRouteError } from "@/components/ErrorBoundary";

interface LeaderboardEntry {
  userId: string;
  approved: number;
}

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — SlangFlow" },
      { name: "description", content: "Top contributors building SlangFlow's slang dictionary." },
    ],
  }),
  errorComponent: makeRouteError("community"),
  component: Community,
});

function Community() {
  const { data, isLoading } = useQuery({
    queryKey: ["community", "leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/community/leaderboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: LeaderboardEntry[] }>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <p className="text-accent text-sm font-semibold tracking-wider">COMMUNITY</p>
          <h1 className="font-display text-4xl md:text-5xl">Top contributors this month</h1>
          <p className="text-muted-foreground mt-2">
            Approved community submissions, ranked. Want a spot? <Link to="/submit" className="text-primary hover:underline">Submit a term</Link>.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Leaderboard
          </h2>
          {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No approved submissions yet this month. <Link to="/submit" className="text-primary hover:underline">Be the first</Link>!
            </p>
          )}
          <ul className="space-y-2">
            {items.map((entry, i) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : i === 1
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm text-foreground" title={entry.userId}>
                    {redactUserId(entry.userId)}
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">{entry.approved} approved</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Show a friendly suffix of the Clerk user id rather than the full opaque
 * `user_xxx…` string. We don't have display names available without an extra
 * Clerk lookup; this keeps the leaderboard public-safe.
 */
function redactUserId(id: string): string {
  if (id.length <= 8) return `@${id}`;
  return `@${id.slice(-6)}`;
}
