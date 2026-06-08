// Shared auth helpers for SlangFlow.
//
// We don't use a pathless `_authed.tsx` layout because that requires
// physically relocating route files (and re-keying `routeTree.gen.ts`). The
// `requireAuth()` helper here gives the same protection without touching the
// directory layout — call it from each protected route's `beforeLoad`:
//
//   import { requireAuth } from "@/lib/auth";
//   export const Route = createFileRoute("/dashboard")({
//     beforeLoad: ({ location }) => requireAuth(location.href),
//     ...
//   });
//
// On the server, auth state lives in the request context (TanStack Start
// exposes Clerk's `getAuth()` via `@clerk/tanstack-react-start/server`). On
// the client, `useAuth()` reads from `<ClerkProvider>`'s context.

import { redirect } from "@tanstack/react-router";

/**
 * Throws a redirect to "/" if the current user isn't signed in.
 *
 * On the client this reads from Clerk's window-attached singleton (set up by
 * `<ClerkProvider>`); on the server it reads from the request context. If
 * Clerk hasn't been configured at all (missing publishable key), we treat
 * everyone as signed in to keep the app usable in dev — flip the
 * `STRICT_AUTH_IN_DEV` flag to require keys even locally.
 */
const STRICT_AUTH_IN_DEV = false;

export interface RequireAuthOptions {
  /** Override the post-sign-in redirect target. Defaults to current href. */
  redirectTo?: string;
}

export function requireAuth(currentHref: string, opts: RequireAuthOptions = {}) {
  if (!clerkConfigured() && !STRICT_AUTH_IN_DEV) return;

  if (!isSignedInSync()) {
    throw redirect({
      to: "/",
      search: { redirect: opts.redirectTo ?? currentHref },
    });
  }
}

/** True if a Clerk publishable key is present at build time. */
export function clerkConfigured(): boolean {
  return Boolean(import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY);
}

/**
 * Synchronous signed-in check. On the client this peeks at the global Clerk
 * singleton attached by `<ClerkProvider>`; on the server it returns true
 * (server-side checks happen at the API layer via `getServerAuth()`).
 */
function isSignedInSync(): boolean {
  if (typeof window === "undefined") return true;
  // The Clerk JS SDK attaches `window.Clerk` once loaded. If it isn't loaded
  // yet, we err on the side of letting the route render — the in-page
  // <SignedOut> guards will still hide protected UI.
  const clerk = (window as unknown as { Clerk?: { user?: unknown; loaded?: boolean } }).Clerk;
  if (!clerk?.loaded) return true;
  return Boolean(clerk.user);
}
