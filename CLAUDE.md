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

**Amanah** is a French-language charitable donation platform built with Next.js 14 (App Router), Supabase (Postgres + Auth + Edge Functions), and Stripe.

### Key layers

- **`app/(auth)/`** — Protected pages (admin/leader). Guarded by `AppShell.tsx`. Pages: `dashboard`, `historique`, `ajouter-don`, `mon-espace`, `projets`, `responsables`.
- **`app/page.tsx`** — Public home page. Shows a project list (`ProjectGrid` → `ProjectCard`). Each card expands an inline `DonationForm` accordion. Accepts `?ref=slug` (pre-selects a leader).
- **`app/api/`** — Next.js API routes: `create-payment-intent`, `create-setup-intent`, `create-sepa-payment`, `cancel-payment`, `stripe-webhook`. The webhook is the authoritative source for recording card and SEPA payments.
- **`supabase/functions/`** — Deno Edge Functions mirroring `create-payment-intent` and `stripe-webhook` (alternative deployment path).
- **`supabase/migrations/`** — SQL migrations defining all tables and RLS policies.
- **`src/contexts/AuthContext.tsx`** — Central auth state (user, session, profile). Consumed via `useAuth()` throughout the app.
- **`src/lib/supabase.ts`** — Supabase anon client (browser). `src/lib/supabase/server.ts` — server-side client. `src/lib/supabase/admin.ts` — admin client with `SERVICE_ROLE_KEY` (bypasses RLS).
- **`src/lib/stripe/server.ts`** — Stripe singleton for server-side use (API routes, services). **`src/lib/stripe/client.ts`** — `loadStripeClient()` wrapper for browser use (mockable).
- **`src/services/`** — Pure DB/API access layer (no business logic): `projects.service.ts`, `leaders.service.ts`, `donors.service.ts`, `donations.service.ts`, `stripe.service.ts`, `dashboard.service.ts`.
- **`src/actions/`** — Next.js Server Actions (`'use server'`): `donor.actions.ts`, `donation.actions.ts`. These orchestrate services and are the only layer imported by client components.
- **`src/components/`** — UI components. `src/components/home/` holds public page components; `src/components/ui/` holds shared primitives.
- **`src/types/`** — `database.ts` has Supabase-generated types; `index.ts` has app-level type aliases; `project.ts` has `ProjectWithStats`.

### Layering rule

**service → Server Action → client component.** Client components must never import from `src/services/` or call Supabase directly. Services are called only from Server Actions or server components/API routes.

> Exception: some legacy admin pages (`projets`, `responsables`) still call Supabase directly from client components. New code must follow the layering rule.

### Data model (core tables)

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`; holds role (`super_admin` \| `leader`) |
| `leaders` | Fundraisers with a unique `slug` used in donation URLs |
| `projects` | Charitable campaigns with a fundraising goal and optional `image_url` |
| `donors` | Non-authenticated donors; fields: `nom`, `pseudo`, `email`, `telephone`, `pin_hash`, `pin_salt`, `stripe_customer_id`, `stripe_payment_method_id` |
| `donations` | Links donor → leader → project; `methode` (`card` \| `prelevement_sepa` \| `cash`), `statut` (`processing` \| `paid` \| `failed` \| `cancelled` \| `refunded`) |

RLS is enabled on all tables. Webhook handlers and admin operations use `createAdminClient()` from `src/lib/supabase/admin.ts` to bypass RLS.

### Card payment flow

1. `DonationForm` calls `POST /api/create-payment-intent` with amount (in cents) and metadata (donor name, leader id, project id).
2. Stripe Elements collects card details; `stripe.confirmPayment()` confirms the intent.
3. Stripe sends a `payment_intent.succeeded` webhook to `POST /api/stripe-webhook`.
4. Webhook verifies the Stripe signature, then upserts into `donors` and `donations`.

### SEPA (prélèvement) flow

1. `AccountCheckStep` identifies the donor (existing via PIN, or new registration).
2. For new donors: `initSepaForNewDonor` action creates the donor row, creates a Stripe Customer, then calls `POST /api/create-setup-intent` to get a `SetupIntent` client secret.
3. `SepaSetupStep` collects IBAN via Stripe Elements and confirms the mandate.
4. `SepaPaymentStep` calls `POST /api/create-sepa-payment` with the stored `payment_method_id` to charge immediately (off-session).
5. Stripe webhook records the payment.

### Cash payment flow

`submitCashDonation` Server Action creates a `donors` row and a `donations` row with `methode: 'cash'` and `statut: 'paid'`. No validation step is needed.

## Conventions

- All UI text and error messages are in **French**.
- Currency amounts are always in **EUR**; Stripe receives amounts in **cents** (`Math.round(amount * 100)`).
- Format amounts with `.toLocaleString('fr-FR')` (space thousands separator, comma decimal).
- Path alias `@/*` maps to `./src/` (configured in `tsconfig.json`), so `@/lib/supabase` resolves to `src/lib/supabase.ts`.
- Client components import Server Actions from `@/actions/`, never services or Supabase directly.
- Primary colors: emerald (`#059669`) and amber (`#fbbf24`); border radius: `rounded-2xl`.
- **Tailwind content paths** must include `'./src/**/*.{js,ts,jsx,tsx,mdx}'` — components in `src/` are not scanned otherwise and their classes are silently dropped.

## Environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` — RLS bypass |
| `STRIPE_SECRET_KEY` | `src/lib/stripe/server.ts` — all server-side Stripe calls |
| `STRIPE_WEBHOOK_SECRET` | API route: stripe-webhook signature verification |

Stripe secrets must not be committed. They are stored in `.env` (git-ignored) locally and in Supabase Edge Function environment variables for the deployed Edge Function variant.
