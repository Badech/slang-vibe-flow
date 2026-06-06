import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Flame, Home, Search, Trophy, User, PlusCircle, LogIn, LogOut } from "lucide-react";
import { useApp } from "@/lib/store";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/quiz", label: "Quiz", icon: Trophy },
  { to: "/submit", label: "Submit", icon: PlusCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isSignedIn, signIn, signOut, streak } = useApp();

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
            {isSignedIn && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30">
                <Flame className="w-4 h-4 text-accent animate-flicker" />
                <span className="text-sm font-semibold">{streak}</span>
              </div>
            )}
            {isSignedIn ? (
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <button
                onClick={() => signIn("Learner")}
                className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary-glow transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </button>
            )}
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