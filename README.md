# Belin

Collaboration app between solar EPCs and their installation subcontractors (Germany, Austria, Slovenia). EPC pays, subs ride free.

Read CLAUDE.md and HANDOFF.md first. Decisions live in DECISIONS.md, changes in CHANGELOG.md, session logs in docs/sessions/.

## Stack

Next.js App Router, Supabase (EU, Frankfurt: Postgres, Storage, Realtime), Vercel, Resend. PWA. Trilingual UI (sl, de, en) via next-intl.

## Commands

- `npm run dev` : dev server on http://localhost:3000
- `npm test` : unit tests (vitest)
- `npm run lint` : type check (tsc --noEmit)
- `npm run build` : production build
- `npm run seed` : apply the rerunnable demo seed to the linked database
- `npm run gen:types` : regenerate lib/database.types.ts from the live schema
- `npm run icons` : regenerate PWA icons from scripts/generate-icons.mjs

## Environment

Copy `.env.example` to `.env.local` and fill values from the Supabase project settings (Project URL, anon key, service role key) and Resend. `.env.local` is never committed.
