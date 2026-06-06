import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useApp } from "@/lib/store";
import type { TermType } from "@/lib/types";
import { PlusCircle, Trophy } from "lucide-react";

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Submit — SlangFlow" }] }),
  component: Submit,
});

const MOCK_LEADERBOARD = [
  { name: "@native_nina", count: 42 },
  { name: "@brooklynbri", count: 31 },
  { name: "@tx_talker", count: 24 },
  { name: "@slang_savant", count: 18 },
  { name: "@gen.z.glossary", count: 12 },
];

function Submit() {
  const { addSubmission, submissions, userName, addXp } = useApp();
  const [form, setForm] = useState({
    term: "",
    type: "idiom" as TermType,
    definition: "",
    example: "",
    context: "",
  });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.term.trim() || !form.definition.trim()) return;
    addSubmission({
      id: String(Date.now()),
      ...form,
      status: "pending",
      createdAt: Date.now(),
      submittedBy: userName || "anonymous",
    });
    addXp(15);
    setSent(true);
    setForm({ term: "", type: "idiom", definition: "", example: "", context: "" });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        <div>
          <p className="text-accent text-sm font-semibold tracking-wider">COMMUNITY</p>
          <h1 className="font-display text-4xl md:text-5xl">Heard something in the wild?</h1>
          <p className="text-muted-foreground mt-2">Submit slang, idioms, or texting language you've spotted. Top contributors get featured.</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Field label="Term">
            <input
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              maxLength={64}
              required
              className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary outline-none"
              placeholder="e.g. 'side-quest'"
            />
          </Field>
          <Field label="Type">
            <div className="flex gap-2">
              {(["idiom", "text_slang", "abbreviation"] as TermType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                    form.type === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {t === "text_slang" ? "Text slang" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Definition">
            <textarea
              value={form.definition}
              onChange={(e) => setForm({ ...form, definition: e.target.value })}
              maxLength={300}
              required
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary outline-none resize-none"
              placeholder="What does it mean in plain English?"
            />
          </Field>
          <Field label="Example sentence">
            <textarea
              value={form.example}
              onChange={(e) => setForm({ ...form, example: e.target.value })}
              maxLength={300}
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary outline-none resize-none"
              placeholder='"He went on a whole side-quest just to find the perfect coffee."'
            />
          </Field>
          <Field label="Where did you hear it?">
            <input
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              maxLength={120}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary outline-none"
              placeholder="TikTok comment / friends at brunch / etc."
            />
          </Field>
          <button type="submit" className="w-full px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-[1.01] transition-transform flex items-center justify-center gap-2">
            <PlusCircle className="w-5 h-5" /> Submit for review (+15 XP)
          </button>
          {sent && <p className="text-primary text-sm text-center">🎉 Submitted! It's in review.</p>}
        </form>

        {/* Pending */}
        <div>
          <h2 className="font-display text-2xl mb-3">Your submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">You haven't submitted anything yet.</p>
          ) : (
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li key={s.id} className="px-4 py-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.term}</div>
                    <div className="text-xs text-muted-foreground">{s.definition}</div>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-secondary text-muted-foreground">{s.status.toUpperCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Top contributors this month</h2>
          <ul className="space-y-2">
            {MOCK_LEADERBOARD.map((u, i) => (
              <li key={u.name} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                <span className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" : i === 1 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                  }`}>{i + 1}</span>
                  <span className="font-semibold">{u.name}</span>
                </span>
                <span className="text-muted-foreground text-sm">{u.count} submissions</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      {children}
    </label>
  );
}