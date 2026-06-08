import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Home, Search, Trophy, User, LogIn, Users } from "lucide-react";
import { SignInButton, UserButton } from "@clerk/tanstack-react-start";

import { StreakFlame } from "@/components/StreakFlame";
import { useAuthState } from "@/hooks/useAuthState";
import { useApp } from "@/lib/store";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/quiz", label: "Quiz", icon: Trophy },
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const clerkEnabled = Boolean(import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY);

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const auth = useAuthState();
  const streak = useApp((s) => s.streak);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-2xl tracking-wider text-primary group-hover:scale-105 transition-transform">
              SLANG<span className="text-accent">FLOW</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {auth.isSignedIn && (
              <div className="hidden sm:block">
                <StreakFlame streak={streak} size="sm" />
              </div>
            )}
            <AuthControl isSignedIn={auth.isSignedIn} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden sticky bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-lg">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-2.5 text-xs gap-0.5 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-border py-6 text-center text-xs text-muted-foreground">
        SlangFlow — sound like a native, not a textbook. © 2026
      </footer>
    </div>
  );
}

// ── Auth control ────────────────────────────────────────────────────────────
// When Clerk is configured: use the real <SignInButton> / <UserButton>.
// When Clerk is absent: render local zustand-backed fallbacks so the dev UX
// (no env vars) still has working sign-in/out for testing protected routes.
function AuthControl({ isSignedIn }: { isSignedIn: boolean }) {
  if (!clerkEnabled) {
    return isSignedIn ? <FallbackUserButton /> : <FallbackSignInButton />;
  }
  return isSignedIn ? (
    <UserButton afterSignOutUrl="/" />
  ) : (
    <SignInButton mode="modal">
      <button
        type="button"
        className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary-glow transition-colors flex items-center gap-1.5"
      >
        <LogIn className="w-4 h-4" /> Sign in
      </button>
    </SignInButton>
  );
}

function FallbackSignInButton() {
  const signIn = useApp((s) => s.signIn);
  return (
    <button
      type="button"
      onClick={() => signIn("Learner")}
      className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary-glow transition-colors flex items-center gap-1.5"
    >
      <LogIn className="w-4 h-4" /> Sign in
    </button>
  );
}

function FallbackUserButton() {
  const userName = useApp((s) => s.userName);
  const signOut = useApp((s) => s.signOut);
  return (
    <button
      type="button"
      onClick={signOut}
      title="Sign out"
      className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center hover:scale-105 transition-transform"
    >
      {(userName || "L").charAt(0).toUpperCase()}
    </button>
  );
}
