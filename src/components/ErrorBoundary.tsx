// Per-route error fallback component used by TanStack Router's
// `errorComponent` field (spec §9: "Error boundaries on every route").
//
// We re-use the SSR error reporter from `lib/lovable-error-reporting` so
// crashes show up in the same telemetry as server errors.

import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { reportLovableError } from "@/lib/lovable-error-reporting";

export interface RouteErrorProps {
  error: Error;
  reset: () => void;
  /** Optional context for the error reporter (e.g. "learn-detail"). */
  boundary?: string;
}

export function RouteError({ error, reset, boundary = "route" }: RouteErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary });
  }, [error, boundary]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-5">
      <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
      <h1 className="font-display text-3xl">Something didn't load</h1>
      <p className="text-muted-foreground text-sm">
        {error?.message || "An unexpected error occurred on this page."}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:scale-[1.02] transition-transform"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border font-semibold text-sm hover:border-primary/50"
        >
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>
    </div>
  );
}

/** Factory that pre-binds a boundary label, so each route gets distinct telemetry. */
export function makeRouteError(boundary: string) {
  return function BoundRouteError(props: { error: Error; reset: () => void }) {
    return <RouteError {...props} boundary={boundary} />;
  };
}
