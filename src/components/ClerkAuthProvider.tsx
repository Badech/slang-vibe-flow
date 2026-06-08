// Wraps the app with Clerk when configured, or renders children directly
// when Clerk isn't set up (graceful dev mode).
//
// Why we use a direct import (not React.lazy):
//   React.lazy + Suspense breaks during SSR — TanStack Start renders the
//   component tree synchronously and `lazy` returns a thenable. The first
//   render throws, the error bubbles to the root error boundary, and you
//   see "This page didn't load".
//
//   Clerk is a regular npm dep now (no longer optional), so a direct import
//   is safe — Vite will tree-shake it if Clerk is never rendered.

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/tanstack-react-start";

const publishableKey =
  (import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ?? "";

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    // Dev mode without Clerk: render children unchanged. The Layout / route
    // guards will treat everyone as signed-in (see `src/lib/auth.ts`).
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
