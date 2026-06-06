import { levelFor, LEVELS } from "@/lib/types";

export function XPBar({ xp }: { xp: number }) {
  const level = levelFor(xp);
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const min = level.min;
  const max = next ? next.min : level.min + 1000;
  const pct = Math.min(100, ((xp - min) / (max - min)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Level</div>
          <div className="font-display text-2xl text-primary">{level.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">XP</div>
          <div className="font-semibold text-lg">{xp.toLocaleString()}</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {next && (
        <div className="text-xs text-muted-foreground">
          {max - xp} XP to <span className="text-foreground font-medium">{next.name}</span>
        </div>
      )}
    </div>
  );
}