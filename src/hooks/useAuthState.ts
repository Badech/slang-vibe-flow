// Unified auth state hook for SlangFlow.
//
// Returns `{ isSignedIn, userId, displayName }` regardless of whether Clerk
// is configured. When Clerk is absent the local zustand `useApp()` store
// provides the values (dev mode), so the rest of the app never needs to
// branch on "is Clerk set up".

import { useEffect } from "react";

import { useApp } from "@/lib/store";

const clerkPublishableKey = (import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ?? "";
const clerkEnabled = Boolean(clerkPublishableKey);

export interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  displayName: string;
  isLoaded: boolean;
}

export function useAuthState(): AuthState {
  // Local store (dev/mock path). Use atomic selectors so the snapshot is
  // referentially stable — returning an object literal here would cause
  // React to log "getSnapshot should return a cached value" and re-render
  // every tick.
  const localIsSignedIn = useApp((s) => s.isSignedIn);
  const localUserName = useApp((s) => s.userName);
  const setLocalAuth = useApp((s) => s.signIn);

  // Clerk path: read from window-attached singleton without a hard import
  // (so the bundle doesn't require the package to be installed).
  const clerkState = useClerkSingleton();

  // Sync Clerk's userId into the local store so legacy code (zustand
  // selectors in Layout/Dashboard/etc.) stays consistent.
  useEffect(() => {
    if (!clerkEnabled) return;
    if (clerkState.isSignedIn && clerkState.displayName) {
      setLocalAuth(clerkState.displayName);
    }
  }, [clerkState.isSignedIn, clerkState.displayName, setLocalAuth]);

  if (!clerkEnabled) {
    return {
      isSignedIn: localIsSignedIn,
      userId: localIsSignedIn ? "local-user" : null,
      displayName: localUserName || "Learner",
      isLoaded: true,
    };
  }

  return clerkState;
}

interface ClerkUserShape {
  id: string;
  firstName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string } | null;
}

interface ClerkSingleton {
  loaded?: boolean;
  user?: ClerkUserShape | null;
}

import { useSyncExternalStore } from "react";

/**
 * Read Clerk's window-attached state via `useSyncExternalStore` so React
 * subscribes to user changes (sign-in/out) without us needing to import the
 * Clerk SDK directly.
 */
function useClerkSingleton(): AuthState {
  const subscribe = (cb: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    const interval = window.setInterval(cb, 500);
    return () => window.clearInterval(interval);
  };
  const getSnapshot = (): string => {
    if (typeof window === "undefined") return "ssr";
    const c = (window as unknown as { Clerk?: ClerkSingleton }).Clerk;
    if (!c?.loaded) return "loading";
    return c.user?.id ?? "anon";
  };
  const getServerSnapshot = () => "ssr";
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window === "undefined" || key === "ssr") {
    return { isSignedIn: false, userId: null, displayName: "Learner", isLoaded: false };
  }
  const c = (window as unknown as { Clerk?: ClerkSingleton }).Clerk;
  if (key === "loading") return { isSignedIn: false, userId: null, displayName: "Learner", isLoaded: false };

  const user = c?.user;
  if (!user) return { isSignedIn: false, userId: null, displayName: "Learner", isLoaded: true };
  const displayName = user.firstName || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Learner";
  return { isSignedIn: true, userId: user.id, displayName, isLoaded: true };
}
