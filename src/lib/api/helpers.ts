// Shared helpers for API file routes.
//
// API routes are at `src/routes/api/*.ts` and use
// `createServerFileRoute` from `@tanstack/react-start/server`. These helpers
// keep error shapes consistent and provide a graceful fallback to static
// data when Neon isn't configured (so the app works in dev without DB).

import { NeonNotConfigured } from "../db/queries";

export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, { status });
}

/**
 * Run a DB-backed callback; if Neon isn't configured (no NEON_DATABASE_URL),
 * fall through to the provided fallback so the UI keeps working in dev.
 */
export async function withDbFallback<T>(
  dbCallback: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await dbCallback();
  } catch (err) {
    if (err instanceof NeonNotConfigured) {
      return await fallback();
    }
    throw err;
  }
}

/** Today's date as YYYY-MM-DD in UTC. Used for the daily-rotation seed. */
export function todaySeed(): number {
  return Math.floor(Date.now() / 86400000);
}
