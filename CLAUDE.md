# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check (tsc --noEmit)
```

No test suite is configured. Verify changes by running the dev server.

## Architecture

**JamaaAmanah** is a French-language charitable donation platform built with Next.js 14 (App Router), Supabase (Postgres + Auth + Edge Functions), and Stripe.

### Key layers

- **`app/(auth)/`** — Protected pages (admin/leader). Guarded by `AppShell.tsx`, which redirects unauthenticated users.
- **`app/don/`** — Public donation form. Accepts `?ref=slug` (leader) and optionally `?project=id` (pre-selects a project). Without `?project`, shows a project selector. Handles card (Stripe Elements), cash, and monthly SEPA flows.
- **`app/api/`** — Next.js API routes for Stripe PaymentIntent creation and webhook handling. The webhook is the authoritative source for recording card payments.
- **`supabase/functions/`** — Deno Edge Functions that mirror the API routes (alternative deployment path).
- **`supabase/migrations/`** — SQL migrations defining all tables and RLS policies.
- **`src/contexts/AuthContext.tsx`** — Central auth state (user, session, profile). Consumed via `useAuth()` throughout the app.
- **`src/lib/supabase.ts`** — Supabase anon client (browser). `src/lib/supabase/server.ts` — server-side client.
- **`src/components/`** — UI components for public pages (home page cards, grids, etc.).
- **`src/types/`** — `database.ts` has Supabase-generated types; `index.ts` has app-level type aliases; `project.ts` has `ProjectWithStats`.
- **`src/services/`** — Data-fetching helpers (e.g. `projects.service.ts` queries Supabase).

### Data model (core tables)

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`; holds role (`super_admin` \| `leader`) |
| `leaders` | Fundraisers with a unique `slug` used in donation URLs |
| `projects` | Charitable campaigns with a fundraising goal |
| `donors` | Non-authenticated donors created at donation time |
| `donations` | Links donor → leader → project; `method` (`stripe`\|`cash`), `status` (`paid`\|`pending`\|`cash_validated`) |

RLS is enabled on all tables. Webhook handlers use `SERVICE_ROLE_KEY` to bypass RLS.

### Card payment flow

1. `/don` calls `POST /api/create-payment-intent` with amount (in cents) and metadata (donor name, leader id, project id).
2. Stripe Elements collects card details; `stripe.confirmPayment()` confirms the intent.
3. Stripe sends a `payment_intent.succeeded` webhook to `POST /api/stripe-webhook`.
4. Webhook verifies the Stripe signature, then inserts into `donors` and `donations`.

### Cash payment flow

The `/don` page posts directly to Supabase, creating a `donors` row and a `donations` row with `method: 'cash'` and `status: 'pending'`. A leader or admin later validates it, setting `status: 'cash_validated'`.

## Conventions

- All UI text and error messages are in **French**.
- Currency amounts are always in **EUR**; Stripe receives amounts in **cents** (`Math.round(amount * 100)`).
- Format amounts with `.toLocaleString('fr-FR')` (space thousands separator, comma decimal).
- Path alias `@/*` maps to `./src/` (configured in `tsconfig.json`), so `@/lib/supabase` resolves to `src/lib/supabase.ts`.
- Most page components are `'use client'` and fetch data directly from Supabase using the anon client from `src/lib/supabase.ts`.
- Primary colors: emerald (`#059669`) and amber (`#fbbf24`); border radius: `rounded-2xl`.
- **Tailwind content paths** must include `'./src/**/*.{js,ts,jsx,tsx,mdx}'` — components in `src/` are not scanned otherwise and their classes are silently dropped.

## Environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (public) |
| `STRIPE_SECRET_KEY` | API route: create-payment-intent |
| `STRIPE_WEBHOOK_SECRET` | API route: stripe-webhook signature verification |

Stripe secrets must not be committed. They are stored in `.env` (git-ignored) locally and in Supabase Edge Function environment variables for the deployed Edge Function variant.
