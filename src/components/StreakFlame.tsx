// Animated flame whose flicker intensity scales with streak length
// (spec §6: 3→5→10→30 days = bigger flame).
//
// Tiers (see lib/xp.ts → flameTier()):
//   low   (0-4)   - tame flicker, muted color
//   mid   (5-9)   - faster flicker, accent color
//   high  (10-29) - hot flicker, glow
//   max   (30+)   - intense flicker, glow + extra accent layer

import { Flame } from "lucide-react";

import { flameTier } from "@/lib/xp";
import { cn } from "@/lib/utils";

export interface StreakFlameProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const SIZE: Record<NonNullable<StreakFlameProps["size"]>, { icon: string; pad: string; text: string }> = {
  sm: { icon: "w-4 h-4", pad: "px-2.5 py-1", text: "text-sm" },
  md: { icon: "w-5 h-5", pad: "px-3 py-1.5", text: "text-base" },
  lg: { icon: "w-7 h-7", pad: "px-4 py-2", text: "text-xl" },
};

export function StreakFlame({ streak, size = "md", showCount = true, className }: StreakFlameProps) {
  const tier = flameTier(streak);

  const ringCls = {
    low: "border-border bg-card text-muted-foreground",
    mid: "border-accent/30 bg-accent/10 text-accent",
    high: "border-accent bg-accent/15 text-accent shadow-[0_0_15px_rgba(255,107,107,0.4)]",
    max: "border-primary bg-gradient-to-br from-accent/30 via-primary/20 to-transparent text-primary shadow-[0_0_25px_rgba(255,215,0,0.55)]",
  }[tier];

  const flameAnim = {
    low: "animate-flicker",
    mid: "animate-flicker-mid",
    high: "animate-flicker-high",
    max: "animate-flicker-max",
  }[tier];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all",
        SIZE[size].pad,
        ringCls,
        className,
      )}
      title={`${streak}-day streak (${tier} tier)`}
      aria-label={`${streak}-day streak`}
    >
      <span className="relative inline-block">
        <Flame className={cn(SIZE[size].icon, flameAnim)} />
        {tier === "max" && (
          <Flame
            aria-hidden
            className={cn(SIZE[size].icon, "absolute inset-0 text-accent opacity-60 animate-flicker-high")}
          />
        )}
      </span>
      {showCount && <span className={cn("font-bold", SIZE[size].text)}>{streak}</span>}
    </div>
  );
}
