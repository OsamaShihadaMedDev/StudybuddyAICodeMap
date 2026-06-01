# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project identity

StudyBuddy — AI-powered study platform for medical students (USMLE-focused). Live at studyybuddyai.com. Solo developer. Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase + Vercel. Primary build tool is Claude Code.
Read graphify-out/GRAPH_REPORT.md at the start of every session for architecture context.

---

## Common commands

```bash
npm run dev          # Vite dev server on http://localhost:8080 (host "::")
npm run build        # Production build
npm run build:dev    # Build with mode=development (keeps lovable-tagger)
npm run lint         # ESLint over the repo
npm run test         # Vitest run (jsdom env, setup at src/test/setup.ts)
npm run test:watch   # Vitest watch
npx vitest run path/to/file.test.ts             # single file
npx vitest run -t "test name substring"         # single test by name
```

Playwright is configured via `lovable-agent-playwright-config` — used by Lovable's cloud agent only, not a local script.

---

## Environment & secrets

`.env` is gitignored. Keys in use:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — read by `src/integrations/supabase/client.ts`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` — edge functions + `scripts/rag-spike`
- `VITE_NCBI_API_KEY` — PubMed citations

⚠️ Canonical Supabase project ID: `ebjfzdslgixhudswxeaz` (confirmed live — serves studyybuddyai.com). config.toml has been updated to match. Always use this ID.

---

## Architecture

### Frontend

Single-page React 18 + TypeScript app, Vite, Tailwind + shadcn/ui (Radix primitives in `src/components/ui`).

**Routing & providers** (`src/App.tsx`): `BrowserRouter` → `QueryClientProvider` → `TooltipProvider` → `SidebarProvider`. QBank routes (`/qbank`, `/qbank/session`, `/qbank/summary`) share a `QBankProvider` via `<Outlet />` parent so session state survives navigation between them. No other routes get this provider.

**Entry behavior** (`src/pages/Index.tsx`): `/` checks `APP_STORAGE_KEYS` in localStorage and redirects returning users to `/dashboard`. If you add client-side storage that should mark a user as "returning," add its key to that list.

**Path alias** — `@/*` → `src/*` in vite.config.ts, vitest.config.ts, tsconfig.app.json, components.json.

### Auth model

(`src/hooks/use-auth.ts`) — anonymous-first. App auto-calls `supabase.auth.signInAnonymously()` if no session exists — every user has a Supabase ID from the start. `signUp` upgrades the anonymous user (preserving their id) via `updateUser({ email, password })` then runs two migrations: `migrateLocalCardsToServer` and `migrateLocalStudyHistoryToServer`. `signIn` reconciles `usage_records` from the anon id into the real account.

**Pattern for new anon-compatible features:** write to localStorage with a known key → add a migration step on signup. Follow existing pattern exactly.

### AI model routing

Model routing is controlled by a single `ACTIVE_MODEL` constant. Two tiers:
- **Free users** → GPT-OSS 20B via Groq/Cerebras (via OpenRouter)
- **Pro users** → Gemini 2.5 Flash (via OpenRouter)

Pro user preference is stored in `profiles.preferred_model` (`"flash"` | `"gpt-oss"`). The `medical-notes` edge function honors `isPro` + `preferredModel`. Response headers `x-model-used` and `x-is-premium` tell the client which model ran (declared in `Access-Control-Expose-Headers`).

⚠️ Do NOT add direct Gemini API calls or any new model provider. All AI routing goes through OpenRouter.

### Three study tools

**Sheets** (`src/pages/Sheets.tsx`, `SheetGenerator.tsx`, `use-sheets-stats.ts`) — generated study sheets via the `medical-notes` edge function.

**Flashcards** (`src/pages/Flashcards.tsx`, `FlashcardsGenerator.tsx`, `use-flashcard-deck.ts`) — decks/cards in Supabase, with `studybuddy_decks_v1` localStorage fallback for anon users. SM-2-lite spaced repetition in `src/lib/spacedRepetition.ts`. Features: exam mode, manual save-to-library, library pagination, `GoProModal` (replaces inline contact links).

**QBank** (`src/pages/QBank.tsx` + `QBankSession.tsx` + `QBankSummary.tsx`, `contexts/QBankContext.tsx`, `use-qbank.ts`) — MCQ engine. Pulls from `questions` + `question_media` + `media` tables. Sessions persisted to `sb_qbank_session` localStorage on every answer/navigation (24h TTL, `restoreSession()` validates and rehydrates). On `endSession`, summary → `qbank_sessions`, answers → `user_attempts`; navigation to `/qbank/summary?session=<id>` only after DB write succeeds.

React Query keys to invalidate when mutating QBank data: `["qbank-count"]`, `["qbank-domains"]`, `["qbank-meta"]`, `["qbank-sessions"]`.

### Edge functions (`supabase/functions/`)

- `medical-notes` — Gemini-backed generator for sheets and flashcards. Modes: `cardsOnly`/`cardCount`, `explainMode` + `focusCard`.
- `get-citations` — PubMed lookups via NCBI E-utilities API (`src/lib/citation*.ts`, `src/hooks/use-citation-usage.ts`). Specialty-aware journal filtering. Three-tier entitlement matrix.

### Usage / quota model

`usage_records` table keyed on `(user_id, kind, usage_date)` — daily counts. `profiles.premium_used` is a lifetime counter (not reset on sign-in/out). `use-usage-limit.ts` and `use-citation-usage.ts` query it.

### Supabase / database rules

- All schema changes are **ADDITIVE ONLY** — never drop columns or tables. This app migrated off Lovable; the schema has layered history.
- Never use raw SQL outside of migration files — use helpers in `/lib/db/`.
- `profiles` table is the source of truth for per-user state (`premium_used`, `preferred_model`).
- Server-side usage tracking only — never track usage client-side.

---

## Active feature branch: QBank (`Qbank-Studdybuddy`)

Current work on this branch:
- Session creator UI: domain toggle chips, dynamic question count slider
- localStorage-based session resume flow
- QBank question pipeline: `scripts/planBlock.ts` → `scripts/generateBlock.ts`

**QBank question pipeline:**
- Questions generated in versioned batches grounded in First Aid 2025 screenshots
- Current prompt version: **V8**
- Target: USMLE Step 1 cardiology, 40-question pilot
- Planned architecture: multi-agent Writer → Reviewers → Editor loop (not yet implemented)

---

## RAG spike (isolated — do not touch)

`scripts/rag-spike/` is a standalone experiment. It ingests NICE NG136 PDF into `guideline_chunks` (pgvector via migration `20260511000000_rag_spike_pgvector.sql`). It has its own `package.json` and `node_modules`.

⚠️ Do NOT import anything from `scripts/rag-spike/` into the main app. It is deliberately isolated and does not affect the deployed app. See `scripts/rag-spike/README.md`.

---

## Hard constraints

- **No Stripe** — payment infrastructure is intentionally not implemented (banking access constraints). Do not suggest or scaffold Stripe integration.
- **No Canva** — design work is done directly in Claude. Do not reference Canva.
- **Pro codes** — retained as a hidden admin feature. Do not surface in any UI.
- **No new model providers** — all AI goes through OpenRouter. Do not add direct API clients for Anthropic, OpenAI, or Gemini.
- **TS is permissive** — `tsconfig.app.json` has `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`. Do not introduce strict-mode patterns that break the existing codebase.

---

## Design system

- Brand colors: dark navy `#0A1628` + cyan `#00D4FF`
- Aesthetic: cinematic, minimal
- shadcn/ui components in `src/components/ui/`, baseColor: slate, no prefix
- ESLint disables `@typescript-eslint/no-unused-vars`

---

## Conventions

- `tsconfig.app.json` is permissive — don't rely on strict-mode behavior.
- When adding anon-compatible features: localStorage key → migration on signup.
- When mutating QBank data: invalidate the four React Query keys listed above.
- QBankProvider wraps only the three `/qbank/*` routes — don't add it to other routes.

---

## Slash commands (save these in `.claude/commands/`)

**`/catchup`** — run at session start on `Qbank-Studdybuddy`:
```
Read all files modified on the current branch compared to main:
$ git diff --name-only main
For each changed file, understand what was modified and why.
Summarize: what's been implemented, what's still open, and what the next priority is.
```

**`/transfer-context`** — run when a session starts degrading:
```
Dump a structured handoff:
1. What was completed this session (files changed, decisions made)
2. Open decisions still unresolved
3. Traps / gotchas discovered this session
4. Relevant file paths for the next session
5. Next 3 concrete steps

Output as markdown.
```
