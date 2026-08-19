# CLAUDE.md

Read HANDOFF.md first: it carries the full founding context (strategy, product spec, audits of Belin 1.0.0 and AVE-DC, market research, legal approach). Then check DECISIONS.md.

## What this is

Belin: the collaboration app between solar EPCs and their installation subcontractors (Germany, Austria, Slovenia). EPC pays, subs free. Five v1 modules: projects and parties, compliance vault, daily log, Regiestunden, Nachträge and Abnahme. Full spec in HANDOFF.md section 3.

## How to work with the founder

- Non-developer. Explain important decisions in plain language before acting.
- Phases with hard stops. STOP means stop and wait.
- Plan before code, small steps, commit often, clear messages.
- Ask before anything destructive, costly, or hard to reverse.
- Never use em dashes or en dashes in any produced text (UI, docs, emails, PDFs, chat). Use commas, colons, periods.
- Log every significant decision in DECISIONS.md with one line of reasoning and a date.

## Working discipline (founder mandate, 2026-07-17)

BE EXTREMELY CAREFUL AND THOUGHTFUL WHEN WRITING CODE AND BUILDING THE SCAFFOLD, TO PREVENT FUTURE BUGS.

- BUILD IN SLOVENIAN ONLY (founder mandate, 2026-07-19). While a feature is still being designed and iterated, write and review it in Slovenian only. Do not craft German and English wording for anything that is still changing: it makes every iteration slower and burns tokens on text that gets thrown away. New i18n keys are still added to all three catalogs so the parity test keeps guarding the structure, but de and en carry the Slovenian string as a placeholder until the feature is settled. Translate deliberately in one pass when the founder says a feature is done. Pending translations are tracked as debt in CHANGELOG.md.
- Plan before code: write down data shapes and interfaces before implementing.
- Small verified steps: run and look at every change, on a phone viewport for crew-facing screens.
- No quick hacks in foundation code (schema, access layer, i18n, design tokens). Any knowingly taken shortcut is logged as debt in CHANGELOG.md immediately.
- Log every change in CHANGELOG.md (date, what, why), in the same commit as the change.
- Log every chat session in docs/sessions/ (one file per session: done, learned, failed, succeeded, next).
- Session start ritual: read CLAUDE.md, DECISIONS.md, recent CHANGELOG.md entries and the latest session log before touching anything.
- Session end ritual: update the session log, CHANGELOG.md and DECISIONS.md.

## Design laws

1. The sub side must never feel like extra work: every crew action under 30 seconds, one-handed, on a phone, on a roof. When in doubt, remove a field.
2. Stupidly easy for the EPC: zero manual data entry wherever possible, extract from uploaded PDFs, EPC reviews instead of types.
3. Elite 2026-Q3 visual quality, built on the AVE-DC design system (C:\DevEnv\AVE-DC\dashboard\app\globals.css), pushed further in design, animation, responsiveness.
4. UI in Slovenian, German and English from the first commit, all strings through i18n keys. Generated PDFs render in the project's language. EU data hosting. Fast on weak rural LTE. Boring reliable tech.

## Stack (decided 2026-07-17)

Next.js (App Router) + Supabase (EU region Frankfurt: Postgres, Storage, Realtime) + Vercel + Resend, PWA from day one, trilingual i18n (sl, de, en). Approved demo design: docs/specs/2026-07-17-monday-demo-design.md. Build order and discipline: docs/specs/2026-07-17-v1-build-order.md. Two deadlines: Slovenian demo Monday 20.07 (Slovenian EPC prospect), full v1 with accounts done Sunday 26.07 evening, German EPC tests from Monday 27.07 (HANDOFF.md section 4).

## Commands

- `npm run dev` (localhost:3000), `npm test` (vitest), `npm run lint` (tsc --noEmit), `npm run build`
- `npm run seed` (rerunnable demo seed), `npm run gen:types` (after schema changes), `npm run icons`
- Schema changes: apply via the Supabase connector (project ref xrwncpngjajosstvkign, Frankfurt) and keep a matching file in supabase/migrations/. Deploy: push to main, Vercel auto-deploys (project belin-app). Secrets live only in .env.local and Vercel env vars, never committed.

## Going to market (the launch mentor)

Every go-to-market question (selling, pricing, LinkedIn, outreach, calls, demos, events, positioning) runs through `docs/gtm/`, starting at `docs/gtm/INDEX.md`. Do not improvise GTM advice when the base has a file on it, and say plainly when the base does not.

- **Research before advising** (founder mandate, 2026-08-13). Verify tools, prices, law and market facts before recommending them. If unverified, say so.
- **Three epistemic tiers**, defined in INDEX.md: FACT needs a source and date, PATTERN names its inputs once, J (judgment, instinct) is legitimate and gets its outcomes tracked in `docs/gtm/field-log.md`. Experts run on calibrated instinct; the honesty comes from keeping score, not from banning it.
- **Say the uncomfortable thing.** A mentor that only encourages is a liability. Weak post, stalling prospect, skipped follow-ups: name it.
- Buildout plan and its phases: `docs/superpowers/plans/2026-08-19-gtm-mentor-buildout.md`.

## Reference repos (read-only, never modify)

- C:\DevEnv\Belin 1.0.0: earlier CRM plus marketplace attempt. Harvest list in HANDOFF.md section 5.
- C:\DevEnv\AVE-DC: visual identity source, Poljubinj dashboard. Harvest list in HANDOFF.md section 6.
