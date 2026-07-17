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

## Design laws

1. The sub side must never feel like extra work: every crew action under 30 seconds, one-handed, on a phone, on a roof. When in doubt, remove a field.
2. Stupidly easy for the EPC: zero manual data entry wherever possible, extract from uploaded PDFs, EPC reviews instead of types.
3. Elite 2026-Q3 visual quality, built on the AVE-DC design system (C:\DevEnv\AVE-DC\dashboard\app\globals.css), pushed further in design, animation, responsiveness.
4. German UI first, all strings through i18n keys from day one. EU data hosting. Fast on weak rural LTE. Boring reliable tech.

## Stack

Not yet finalized. Leading candidate per HANDOFF.md section 10: Next.js (App Router) + Supabase (EU, Frankfurt) + Vercel + Resend, PWA from day one. Confirm with the founder before scaffolding.

## Reference repos (read-only, never modify)

- C:\DevEnv\Belin 1.0.0: earlier CRM plus marketplace attempt. Harvest list in HANDOFF.md section 5.
- C:\DevEnv\AVE-DC: visual identity source, Poljubinj dashboard. Harvest list in HANDOFF.md section 6.
