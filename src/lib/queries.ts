// React Query hooks for the SlangFlow API.
//
// Each hook returns the static TERMS data as `initialData` / `placeholderData`
// so the UI is never empty even if the network is slow or the API isn't
// configured (graceful dev mode). Cache uses stale-while-revalidate semantics
// (spec §9).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TERMS, TERMS_BY_ID, getTerm as getStaticTerm } from "./data/terms";
import { LEVELS, type Term, type TermType } from "./types";

const TEN_MIN = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Terms list ──────────────────────────────────────────────────────────────

export interface UseTermsParams {
  q?: string;
  type?: TermType | "all";
  category?: string;
  difficulty?: 1 | 2 | 3;
  region?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useTerms(params: UseTermsParams = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.type && params.type !== "all") qs.set("type", params.type);
  if (params.category) qs.set("category", params.category);
  if (params.difficulty) qs.set("difficulty", String(params.difficulty));
  if (params.region) qs.set("region", params.region);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));

  return useQuery({
    queryKey: ["terms", params],
    queryFn: () => fetchJSON<{ items: Term[]; total: number }>(`/api/terms?${qs.toString()}`),
    staleTime: TEN_MIN,
    placeholderData: (prev) => prev,
    enabled: params.enabled !== false,
  });
}

// ── Term detail ─────────────────────────────────────────────────────────────

export function useTerm(id: string | undefined) {
  return useQuery({
    queryKey: ["term", id],
    queryFn: () => fetchJSON<Term>(`/api/terms/${id}`),
    enabled: Boolean(id),
    staleTime: ONE_HOUR,
    initialData: () => (id ? getStaticTerm(id) : undefined),
  });
}

// ── Daily terms ─────────────────────────────────────────────────────────────

export function useDailyTerms() {
  return useQuery({
    queryKey: ["terms", "daily"],
    queryFn: () => fetchJSON<{ idiom: Term | null; slang: Term | null; seed: number }>(`/api/terms/daily`),
    staleTime: ONE_HOUR,
    initialData: () => {
      const seed = Math.floor(Date.now() / 86400000);
      const idioms = TERMS.filter((t) => t.type === "idiom");
      const slang = TERMS.filter((t) => t.type !== "idiom");
      return {
        idiom: idioms.length ? idioms[seed % idioms.length] : null,
        slang: slang.length ? slang[seed % slang.length] : null,
        seed,
      };
    },
  });
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface UserProgressRow {
  userId: string;
  termId: string;
  status: "unlearned" | "learning" | "learned" | "mastered";
  favorited: boolean;
  learnedAt: string | null;
}

export function useUserProgress(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["progress", userId],
    queryFn: () => fetchJSON<{ items: UserProgressRow[] }>(`/api/progress/${userId}`),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

export interface UpsertProgressBody {
  termId: string;
  status?: "unlearned" | "learning" | "learned" | "mastered";
  favorited?: boolean;
}

export function useUpsertProgress(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertProgressBody) =>
      fetchJSON<{ ok: true; xpDelta: number }>(`/api/progress`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", userId] });
      qc.invalidateQueries({ queryKey: ["stats", userId] });
    },
  });
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface UserStats {
  userId: string;
  xp: number;
  streakCount: number;
  lastActiveDate: string | null;
  totalLearned: number;
  totalMastered: number;
  level: string;
  levelEmoji: string;
}

export function useUserStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fetchJSON<UserStats>(`/api/stats/${userId}`),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    initialData: () =>
      userId
        ? {
            userId,
            xp: 0,
            streakCount: 0,
            lastActiveDate: null,
            totalLearned: 0,
            totalMastered: 0,
            level: LEVELS[0].name,
            levelEmoji: LEVELS[0].emoji,
          }
        : undefined,
  });
}

// ── Quiz session ────────────────────────────────────────────────────────────

export interface SubmitQuizBody {
  id: string;
  score: number;
  total: number;
}

export interface SubmitQuizResult {
  ok: true;
  xpEarned: number;
  perfect: boolean;
  levelUp: boolean;
  newLevel: string;
  streak: number;
  totalXp: number;
}

export function useSubmitQuiz(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitQuizBody) =>
      fetchJSON<SubmitQuizResult>(`/api/quiz/session`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats", userId] });
    },
  });
}

// ── Community submissions ───────────────────────────────────────────────────

export interface SubmitCommunityBody {
  term: string;
  type: TermType;
  definition: string;
  example: string;
  context: string;
  platformSource?: string;
}

export function useSubmitCommunityTerm() {
  return useMutation({
    mutationFn: (body: SubmitCommunityBody) =>
      fetchJSON<{ ok: true; id: string }>(`/api/community/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function usePendingSubmissions(enabled = true) {
  return useQuery({
    queryKey: ["community", "pending"],
    queryFn: () =>
      fetchJSON<{ items: Array<{ id: string; term: string; status: string; definition: string }> }>(
        `/api/community/pending`,
      ),
    enabled,
    staleTime: 30 * 1000,
  });
}

// ── Convenience: resolve a term by id with synchronous fallback ─────────────
export function getTermSafe(id: string): Term | undefined {
  return TERMS_BY_ID[id];
}
