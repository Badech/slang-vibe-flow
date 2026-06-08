// Server-only auth helpers.
//
// Uses `auth()` from `@clerk/tanstack-react-start/server`, which reads from
// the request context set up by `clerkMiddleware` in `src/start.ts`.
//
// Why this module exists alongside Clerk's own `auth()`:
//   1. Throws typed 401/403 Responses (caught by API routes for clean JSON).
//   2. Falls back to "anonymous, no user" when CLERK_SECRET_KEY isn't set so
//      the app boots in dev without provisioning Clerk.
//   3. Resolves the admin flag from Clerk `publicMetadata.role === "admin"`
//      in one place (spec §7).

import process from "node:process";

export interface ServerAuth {
  userId: string | null;
  sessionId: string | null;
  isAdmin: boolean;
}

const ANON: ServerAuth = { userId: null, sessionId: null, isAdmin: false };

function clerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export async function getServerAuth(): Promise<ServerAuth> {
  if (!clerkConfigured()) return ANON;
  try {
    const { auth, clerkClient } = await import("@clerk/tanstack-react-start/server");
    const session = await auth();
    if (!session?.userId) return ANON;

    let isAdmin = false;
    try {
      const client = clerkClient();
      const user = await client.users.getUser(session.userId);
      isAdmin = user.publicMetadata?.role === "admin";
    } catch {
      // Treat lookup failures as "not admin" — the request still has a userId.
    }

    return { userId: session.userId, sessionId: session.sessionId ?? null, isAdmin };
  } catch (err) {
    console.error("[auth] getServerAuth failed:", err);
    return ANON;
  }
}

export async function requireServerAuth(): Promise<ServerAuth & { userId: string }> {
  const a = await getServerAuth();
  if (!a.userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return a as ServerAuth & { userId: string };
}

export async function requireAdmin(): Promise<ServerAuth & { userId: string }> {
  const a = await requireServerAuth();
  if (!a.isAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return a;
}
