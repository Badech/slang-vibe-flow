// Skeleton placeholders shown while routes / queries are loading
// (spec §9: "Skeleton loading states on all cards and detail pages").
//
// All shapes use Tailwind's existing `animate-pulse` (built-in) plus muted
// bg tokens so they match the dark theme automatically.

import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("h-4 rounded bg-muted/60 animate-pulse", className)} />;
}

export function TermCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex gap-2">
        <Bar className="h-3 w-12" />
        <Bar className="h-3 w-16" />
      </div>
      <Bar className="h-6 w-3/4" />
      <Bar className="h-3 w-1/2" />
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-5/6" />
    </div>
  );
}

export function TermCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <TermCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-10 w-72" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Bar className="h-24 rounded-2xl" />
        <Bar className="h-24 rounded-2xl md:col-span-2" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Bar className="h-36 rounded-2xl" />
        <Bar className="h-36 rounded-2xl" />
      </div>
      <TermCardSkeletonGrid count={6} />
    </div>
  );
}

export function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <Bar className="h-10 w-48" />
      <Bar className="h-12 rounded-xl" />
      <div className="flex gap-2">
        <Bar className="h-8 w-20 rounded-full" />
        <Bar className="h-8 w-20 rounded-full" />
        <Bar className="h-8 w-20 rounded-full" />
      </div>
      <TermCardSkeletonGrid count={12} />
    </div>
  );
}

export function LearnDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <Bar className="h-3 w-24" />
      <div className="flex gap-2">
        <Bar className="h-5 w-16" />
        <Bar className="h-5 w-20" />
      </div>
      <Bar className="h-14 w-3/4" />
      <Bar className="h-6 w-40" />
      <div className="flex gap-2">
        <Bar className="h-12 w-32 rounded-xl" />
        <Bar className="h-12 w-28 rounded-xl" />
      </div>
      <Bar className="h-32 rounded-2xl" />
      <Bar className="h-48 rounded-2xl" />
      <Bar className="h-72 rounded-2xl" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <Bar className="h-10 w-48" />
      <Bar className="h-24 rounded-2xl" />
      <Bar className="h-40 rounded-2xl" />
      <Bar className="h-48 rounded-2xl" />
    </div>
  );
}
