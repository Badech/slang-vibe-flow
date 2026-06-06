## Plan — SlangFlow

### Design System & Assets
- Update `src/styles.css` with dark-first navy + electric yellow + coral palette
- Load Bebas Neue + DM Sans Google Fonts in `src/routes/__root.tsx`
- Create custom shadcn variants (hero, accent, ghost-accent)
- Generate a hero image for the landing page

### Project Setup
- Install `zustand`, `lucide-react`, `framer-motion`, `recharts`
- Wire Google Fonts `<link>` tags in root route head
- Keep TanStack Router (already scaffolded)

### Data Layer (Mock for now — Clerk/Neon later)
- Create `src/lib/data/terms.ts` with all 110+ seed idioms/slang terms, fully typed
- Create `src/lib/data/examples.ts` with related examples
- Create `src/lib/store.ts` (Zustand) for auth state, user progress, streak, XP, favorites, quiz state
- Create `src/lib/types.ts` for Term, Example, UserProgress, QuizSession, Submission

### Pages & Routes
1. **Landing** (`/`) — Hero, feature grid, CTA, footer
2. **Dashboard** (`/dashboard`) — Protected layout; streak flame, XP bar, level badge, featured cards, progress stats, quick-access tabs
3. **Learn Detail** (`/learn/$id`) — Term hero, phonetic, TTS controls (Web Speech API), definition, context badges, examples, "How NOT to use", Sound Like a Native section, related chips, learned/favorite actions
4. **Browse** (`/browse`) — Search, filter tabs/chips, sort, infinite scroll card grid
5. **Quiz** (`/quiz`) — 4 question type components, session flow, adaptive difficulty, immediate feedback, end screen with confetti
6. **Profile** (`/profile`) — Level badge, XP bar, learned/favorites lists, streak calendar heatmap, weekly progress Recharts bar chart, community submissions tab
7. **Community Submit** (`/submit`) — Submission form, pending list, leaderboard

### Shared Components
- `Layout` with responsive nav + mobile drawer
- `StreakFlame` animated component
- `XPBar` animated fill component
- `TermCard` (browse grid)
- `FeaturedCard` (dashboard)
- `AudioPlayer` (TTS with Web Speech API, slow mode, voice selector)
- `QuizQuestion` wrappers for each type
- `Confetti` end-screen overlay
- `LevelBadge` component

### Auth Integration (TODO stubs)
- `src/lib/clerk.ts` placeholder
- `src/routes/_authenticated` layout stub (redirects to `/auth` when not signed in)
- Sign-in/sign-up modal shell (Clerk `<SignIn />` / `<SignUp />` components ready to drop in)

### Responsiveness
- Mobile-first Tailwind breakpoints
- Grid collapses to single column on <640px
- Bottom nav on mobile, top nav on desktop

### Performance
- `defaultPreloadStaleTime: 0` already set
- Route-level code splitting via TanStack Router
- Lazy load Recharts + quiz components
