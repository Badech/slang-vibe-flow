# SlangFlow

> Learn American idioms, slang & texting language. Sound like a native — not a textbook.

SlangFlow is a TanStack Start (React + Vite + Tailwind 4) app backed by Neon Postgres and Clerk auth. It teaches 110+ idioms, slang terms, and texting abbreviations with native pronunciation, contextual examples, and adaptive quizzes.

---

## Stack

| Layer | Tech |
|---|---|
| UI | React 19, Tailwind 4, shadcn/ui (Radix), lucide-react, framer-motion, sonner |
| Routing / SSR | TanStack Router + TanStack Start (Nitro → Vercel preset) |
| Data fetching | TanStack Query (React Query) |
| Database | Neon (serverless Postgres) via `@neondatabase/serverless` + Drizzle ORM |
| Auth | Clerk (`@clerk/tanstack-react-start`) |
| PWA | `vite-plugin-pwa` (Workbox), offline-cached term details |
| Hosting | Vercel (preset configured in `vite.config.ts`) |

---

## Quick start

```bash
bun install
cp .env.example .env       # then fill in the keys below
bun run db:generate        # produce drizzle migration SQL
bun run db:migrate         # apply to your Neon DB
bun run db:seed            # insert the 110+ canonical terms
bun dev                    # http://localhost:5173
```

`bun` is required because the project uses `@lovable.dev/vite-tanstack-config`, which is hosted on Lovable's scoped registry and only resolves with `bun install`.

---

## Environment variables

All four are required for production. Local dev works without them — the app degrades gracefully (mock auth, static terms data).

| Variable | Scope | Notes |
|---|---|---|
| `NEON_DATABASE_URL` | server | Use the **pooled** connection string (host ends with `-pooler.<region>.neon.tech`). |
| `VITE_CLERK_PUBLISHABLE_KEY` | client + server | Safe to expose. |
| `CLERK_SECRET_KEY` | server only | Required for server-side `auth()` / admin role checks. |
| `VITE_APP_URL` | client | Used by canonical / og:url tags on `/learn/:id`. |

`VITE_*` prefix is mandatory for client-exposed vars in Vite (this is **not** Next.js — `NEXT_PUBLIC_*` is ignored).

---

## Project layout

```
src/
├── routes/
│   ├── __root.tsx          # ClerkAuthProvider + QueryClient + Sonner Toaster
│   ├── index.tsx           # marketing landing
│   ├── browse.tsx          # filterable catalog + SmartSearch
│   ├── learn.$id.tsx       # term detail (SoundLikeNative + pronunciation)
│   ├── dashboard.tsx       # daily picks + XP + stats (Clerk-gated)
│   ├── quiz.tsx            # adaptive 10-question quiz
│   ├── profile.tsx         # streak heatmap + learned/favorites
│   ├── submit.tsx          # community submission form
│   ├── community.tsx       # public monthly leaderboard
│   ├── admin.submissions.tsx  # admin review queue
│   └── api/                # 11 server file routes (REST)
├── lib/
│   ├── db/                 # Drizzle schema + queries + Neon client
│   ├── quiz/               # session builder + adaptive difficulty
│   ├── auth.ts             # client-side requireAuth() guard
│   ├── auth.server.ts      # Clerk getServerAuth / requireAdmin
│   ├── queries.ts          # React Query hooks (use* + mutations)
│   ├── tts.ts              # Web Speech helpers + abbreviation expansion
│   ├── xp.ts               # canonical XP rules + streak triggers
│   ├── levenshtein.ts      # "did you mean…" support for SmartSearch
│   ├── types.ts            # Term, LEVELS, resolve* helpers
│   └── data/terms.ts       # static fallback dataset
├── components/
│   ├── SoundLikeNative.tsx # the core feature (spec §3)
│   ├── SpeakerButton.tsx, SlowModeToggle.tsx, VoiceSelector.tsx, PhoneticDisplay.tsx
│   ├── SmartSearch.tsx     # debounced + Levenshtein + recents
│   ├── StreakFlame.tsx     # tiered flame animation
│   ├── MilestoneToasts.ts  # canonical Sonner copy
│   ├── ErrorBoundary.tsx   # per-route error fallback
│   ├── skeletons/          # loading placeholders
│   ├── ClerkAuthProvider.tsx, Layout.tsx, TermCard.tsx, XPBar.tsx
│   └── quiz/               # Question* components + AnswerExplanation
├── hooks/
│   ├── usePronunciation.ts # voice loading + slow mode + speaking state
│   ├── useAuthState.ts     # unified Clerk + local store auth state
│   └── use-mobile.tsx
├── start.ts                # TanStack Start middleware registration
└── server.ts               # SSR entry (unchanged from scaffold)

scripts/seed.ts             # Neon seed runner (idempotent)
drizzle.config.ts           # Drizzle-Kit config
vercel.json                 # caching headers + framework hint
vite.config.ts              # PWA plugin + Nitro vercel preset
```

---

## API surface

All endpoints are TanStack Start server file routes (real REST URLs).

| Method + Path | Auth | Description |
|---|---|---|
| `GET  /api/terms` | public | List with `?q&type&category&difficulty&region&limit&offset` |
| `GET  /api/terms/:id` | public | Term detail + examples + related |
| `GET  /api/terms/daily` | public | Date-hash rotated idiom + slang of the day |
| `POST /api/progress` | required | Upsert progress + XP (+10 learned, +5 favorited) |
| `GET  /api/progress/:userId` | owner | All progress rows |
| `POST /api/quiz/session` | required | Save quiz, compute XP (+50, +100 perfect), update streak |
| `GET  /api/stats/:userId` | owner | Streak, XP, level, totals |
| `POST /api/community/submit` | required | New submission (status=pending) |
| `GET  /api/community/pending` | admin | Review queue |
| `POST /api/community/review` | admin | `{ id, action: "approve"\|"reject" }` |
| `GET  /api/community/leaderboard` | public | Top 10 by approved count this month |

Admin = Clerk `publicMetadata.role === "admin"`. Set this from the Clerk dashboard.

---

## Database

Drizzle schema lives in `src/lib/db/schema.ts`. Seven tables:
- `terms` — canonical dictionary entries (110+ rows)
- `examples` — N examples per term
- `related_terms` — M2M adjacency
- `user_progress` — per-user, per-term state + favorites
- `quiz_sessions` — quiz history
- `community_submissions` — user-submitted terms
- `user_stats` — aggregated XP + streak + daily counters

### Commands

```bash
bun run db:generate    # drizzle-kit generate
bun run db:migrate     # drizzle-kit migrate
bun run db:push        # drizzle-kit push (dev / iteration)
bun run db:studio      # browse data in Drizzle Studio
bun run db:seed        # scripts/seed.ts — idempotent upsert
bun run build:seed     # alias for db:seed (matches spec naming)
```

---

## Deployment (Vercel)

1. **Push to GitHub** and import the repo in Vercel.
2. **Framework preset**: leave it on _Other_ — `vercel.json` already declares the build/install commands.
3. **Environment variables**: add `NEON_DATABASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_APP_URL` in the Vercel dashboard.
4. **Build & deploy**. The Nitro `vercel` preset (set in `vite.config.ts`) outputs to `.output/` which Vercel picks up automatically.
5. **First deploy**: SSH into Vercel's runtime isn't possible, so run `bun run db:migrate && bun run db:seed` locally against the same `NEON_DATABASE_URL` before going live.

### PWA notes

- Service worker is `/sw.js`, registered automatically by `vite-plugin-pwa`.
- Offline cache rules:
  - Term details (`/api/terms/:id`) — NetworkFirst, 50 entries, 24h TTL
  - Term listings (`/api/terms?…`) — StaleWhileRevalidate, 20 entries, 1h TTL
  - Google Fonts — CacheFirst, 1y TTL
- Dev mode disables the SW so HMR isn't bypassed.
- Generate the manifest icons from `public/icons/icon.svg` — see `public/icons/README.md`.

---

## Gamification rules (spec §6)

Defined once in `src/lib/xp.ts`:

| Action | XP |
|---|---|
| Mark term learned | +10 |
| Favorite a term | +5 |
| Complete a quiz | +50 |
| Perfect quiz bonus | +100 |
| Community submission | +15 |

| Level | XP range | Emoji |
|---|---|---|
| Rookie | 0–200 | 🟤 |
| Street-Smart | 201–500 | 🔵 |
| Fluent | 501–1000 | 🟣 |
| Native Vibes | 1001–2000 | 🟡 |
| Slang God | 2001+ | 🔴 |

Streak increments when a user logs **≥5 learned terms OR ≥1 quiz** in a calendar day (UTC). Flame intensity tiers at 0 / 5 / 10 / 30 days.

---

## Local dev troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module @clerk/...` | Missed `bun install` | `rm -rf node_modules bun.lock && bun install` |
| `createServerFileRoute is not exported` | Old `@tanstack/react-start` | Bump to `^1.168.0` in `package.json` |
| Auth checks always return 401 | `CLERK_SECRET_KEY` not set | Add to `.env`, restart dev server |
| API routes return static data | `NEON_DATABASE_URL` not set (graceful fallback) | Add to `.env`, restart |
| New `/api/*` routes 404 | `routeTree.gen.ts` stale | `rm src/routeTree.gen.ts && bun dev` |
| Service worker stuck on old version | autoUpdate didn't activate | DevTools → Application → Unregister, hard reload |

---

## Spec coverage map

Each section of the original product spec maps to a turn (T1–T5):

| Spec § | Topic | Turn |
|---|---|---|
| 1 | DB layer + seed | T1 |
| 2 | Pronunciation engine | T2 |
| 3 | Sound Like a Native card | T2 |
| 4 | API routes | T3 |
| 5 | Quiz engine | T4 |
| 6 | Gamification | T1 (LEVELS) + T3 (server) + T4 (client) |
| 7 | Community + admin | T3 (submit) + T5 (admin + leaderboard) |
| 8 | Smart search | T4 |
| 9 | Performance + PWA | T3 (React Query) + T5 (PWA, skeletons, error boundaries) |
| 10 | Env vars | T1 (.env.example) |
| 11 | Deployment | T5 (vercel.json + preset) |

---

© 2026 SlangFlow.
