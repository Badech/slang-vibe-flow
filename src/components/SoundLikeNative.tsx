// "Sound Like a Native" card — the core feature (spec §3).
//
// Six sub-sections, in order:
//   1. 📍 When To Use It           — icon+text rows derived from `nativeTip.whenToUse`
//   2. 🎭 Tone & Register          — color-coded spectrum bar
//   3. 👥 Who Says This             — chip tags from `whoSaysIt`
//   4. 🚩 Red Flags                 — amber warning card from `redFlag`
//   5. ⚡ Upgrade Your Response     — chat-bubble mockup using last example + `upgradePhrase`
//   6. 📱 Text vs. Speech           — only renders when type !== "idiom"

import {
  MessageCircle,
  Briefcase,
  Users,
  Smartphone,
  AlertTriangle,
  Sparkles,
  ArrowDown,
  Mic2,
  Globe2,
} from "lucide-react";

import type { Term, ToneRegister } from "@/lib/types";
import {
  resolveFormalityWarning,
  resolvePlatformOrigin,
  resolveRedFlag,
  resolveSpokenEquivalent,
  resolveTextingEquivalent,
  resolveToneRegister,
  resolveUpgradePhrase,
  resolveWhenToUse,
  resolveWhoSaysIt,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SoundLikeNativeProps {
  term: Term;
  className?: string;
}

export function SoundLikeNative({ term, className }: SoundLikeNativeProps) {
  const tone = resolveToneRegister(term);
  const whoSaysIt = resolveWhoSaysIt(term);
  const redFlag = resolveRedFlag(term);
  const upgrade = resolveUpgradePhrase(term);
  const whenToUse = resolveWhenToUse(term);
  const isSlang = term.type !== "idiom";

  return (
    <section
      aria-label="Sound like a native"
      className={cn(
        "rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 space-y-6",
        className,
      )}
    >
      <header className="flex items-center gap-2 text-primary text-xs font-bold tracking-wider">
        <Sparkles className="w-4 h-4" />
        SOUND LIKE A NATIVE
      </header>

      <WhenToUseSection term={term} whenToUse={whenToUse} />
      <ToneRegisterSection tone={tone} />
      <WhoSaysItSection whoSaysIt={whoSaysIt} />
      <RedFlagSection redFlag={redFlag} />
      <UpgradeSection term={term} upgrade={upgrade} />
      {isSlang && <TextVsSpeechSection term={term} />}
    </section>
  );
}

// ── 1. When To Use It ───────────────────────────────────────────────────────
function WhenToUseSection({ term, whenToUse }: { term: Term; whenToUse: string }) {
  const contexts = deriveContexts(term, whenToUse);
  return (
    <SubSection title="When to use it" icon="📍">
      <ul className="space-y-2">
        {contexts.map((c) => (
          <li
            key={c.text}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-2"
          >
            <span aria-hidden className="text-lg leading-none mt-0.5">
              {c.icon}
            </span>
            <span className="text-sm text-foreground">{c.text}</span>
          </li>
        ))}
      </ul>
    </SubSection>
  );
}

interface ContextRow {
  icon: string;
  text: string;
}

function deriveContexts(term: Term, whenToUse: string): ContextRow[] {
  // Always show the canonical "when to use" first.
  const rows: ContextRow[] = [{ icon: "🧑‍🤝‍🧑", text: whenToUse || "Casual conversation with friends." }];

  const formal = resolveFormalityWarning(term);
  if (formal) {
    rows.push({ icon: "💼", text: "Avoid at work or in job interviews." });
  } else if (term.type === "idiom") {
    rows.push({ icon: "💼", text: "Generally safe in informal work chats." });
  }

  if (term.type !== "idiom") {
    rows.push({ icon: "💬", text: "Perfect for texting and DMs." });
  } else {
    rows.push({ icon: "🗣️", text: "Common in spoken English." });
  }

  // Cap at 4 for visual rhythm.
  return rows.slice(0, 4);
}

// ── 2. Tone & Register ──────────────────────────────────────────────────────
const TONE_META: Record<
  ToneRegister,
  { label: string; color: string; bg: string; position: number }
> = {
  formal: { label: "Formal", color: "text-blue-300", bg: "bg-blue-500", position: 5 },
  neutral: { label: "Neutral", color: "text-muted-foreground", bg: "bg-muted-foreground", position: 35 },
  casual: { label: "Casual", color: "text-green-300", bg: "bg-green-500", position: 65 },
  affectionate: { label: "Affectionate", color: "text-pink-300", bg: "bg-pink-500", position: 80 },
  sarcastic: { label: "Sarcastic", color: "text-orange-300", bg: "bg-orange-500", position: 90 },
  urgent: { label: "Urgent", color: "text-red-300", bg: "bg-red-500", position: 50 },
};

function ToneRegisterSection({ tone }: { tone: ToneRegister }) {
  const meta = TONE_META[tone];
  return (
    <SubSection title="Tone & register" icon="🎭">
      <div className="space-y-2">
        <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-500/40 via-muted-foreground/30 to-green-500/40 overflow-visible">
          <div
            className={cn("absolute -top-1.5 w-6 h-6 rounded-full border-2 border-background shadow-lg transition-all", meta.bg)}
            style={{ left: `calc(${meta.position}% - 0.75rem)` }}
            aria-label={`Tone marker at ${meta.label}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Very formal</span>
          <span className={cn("font-bold", meta.color)}>{meta.label}</span>
          <span>Very casual</span>
        </div>
      </div>
    </SubSection>
  );
}

// ── 3. Who Says This ────────────────────────────────────────────────────────
function WhoSaysItSection({ whoSaysIt }: { whoSaysIt: string }) {
  const chips = splitChips(whoSaysIt);
  return (
    <SubSection title="Who says this" icon="👥">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            <Users className="w-3 h-3" />
            {chip}
          </span>
        ))}
      </div>
    </SubSection>
  );
}

function splitChips(input: string): string[] {
  if (!input) return ["All ages"];
  return input
    .split(/[,;/]|\sand\s/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── 4. Red Flags ────────────────────────────────────────────────────────────
function RedFlagSection({ redFlag }: { redFlag: string }) {
  return (
    <SubSection title="Don't say this when…" icon="🚩">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">{redFlag || "Use with care in highly formal settings."}</p>
      </div>
    </SubSection>
  );
}

// ── 5. Upgrade Your Response (chat-bubble mockup) ───────────────────────────
function UpgradeSection({ term, upgrade }: { term: Term; upgrade: string }) {
  const seed = term.examples?.[0]?.sentence ?? `Hey, I'm so ${term.term.toLowerCase()} right now.`;
  return (
    <SubSection title="Upgrade your response" icon="⚡">
      <div className="space-y-2.5">
        <ChatBubble side="left" speaker="You">
          {seed}
        </ChatBubble>
        <div className="flex justify-center text-muted-foreground/60">
          <ArrowDown className="w-4 h-4" />
        </div>
        <ChatBubble side="right" speaker="Native" accent>
          {upgrade || "Totally — same here."}
        </ChatBubble>
        <p className="text-xs text-muted-foreground pt-1">
          A natural follow-up makes you sound like part of the conversation, not a translator.
        </p>
      </div>
    </SubSection>
  );
}

function ChatBubble({
  side,
  speaker,
  accent,
  children,
}: {
  side: "left" | "right";
  speaker: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", side === "right" && "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm relative",
          side === "left"
            ? "bg-card border border-border text-foreground rounded-bl-sm"
            : accent
              ? "bg-accent text-accent-foreground rounded-br-sm"
              : "bg-primary text-primary-foreground rounded-br-sm",
        )}
      >
        <div
          className={cn(
            "absolute -top-4 text-[10px] uppercase tracking-wider font-bold",
            side === "right" ? "right-2 text-accent" : "left-2 text-muted-foreground",
          )}
        >
          {speaker}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 6. Text vs. Speech (slang-only) ─────────────────────────────────────────
function TextVsSpeechSection({ term }: { term: Term }) {
  const typed = resolveTextingEquivalent(term) ?? term.term.toLowerCase();
  const spoken = resolveSpokenEquivalent(term);
  const platform = resolvePlatformOrigin(term);

  return (
    <SubSection title="Text vs. speech" icon="📱">
      <div className="grid sm:grid-cols-2 gap-3">
        <SideCard
          label="Texting form"
          value={typed}
          icon={<Smartphone className="w-4 h-4" />}
          accent="accent"
        />
        <SideCard
          label="Spoken form"
          value={spoken}
          icon={<Mic2 className="w-4 h-4" />}
          accent="primary"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Globe2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">From</span>
        <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground">
          {platform}
        </span>
      </div>
    </SubSection>
  );
}

function SideCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "accent";
}) {
  const ring = accent === "primary" ? "border-primary/40 bg-primary/5" : "border-accent/40 bg-accent/5";
  const text = accent === "primary" ? "text-primary" : "text-accent";
  return (
    <div className={cn("rounded-xl border p-3", ring)}>
      <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mb-1", text)}>
        {icon}
        {label}
      </div>
      <div className="font-display text-xl text-foreground break-words">{value}</div>
    </div>
  );
}

// ── Shared sub-section frame ────────────────────────────────────────────────
function SubSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
        <span aria-hidden className="text-base">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Re-export icons mentioned in props for tree-shaking friendliness — keeps the
// component a single import for consumers.
export { MessageCircle, Briefcase };
