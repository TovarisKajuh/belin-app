# Session, 2026-10-05: the plan for the meeting on Tuesday 06.10

Ran on Opus with ultracode. One deliverable: a plan, executable cold by a fresh session, that makes Belin presentable and usable for a Slovenian EPC meeting about 20 hours away. Nothing in the product was changed. The founder asked for the plan only and will say when to execute.

The founder's answers at the start: the buyer is a Slovenian EPC, the meeting is in Slovenian, in person with laptop and phone, the pitch is both AVESOL as subcontractor and Belin as the product, and the buyer must be able to sign up alone afterwards.

## Done

1. **Twelve read-only audit agents**, then two live ones once the database was back: landing, EPC side, crew and subcontractor side on phones, every PDF, infrastructure and data, language, the design system, spec against code, server code paths, the meeting itself, the market, and ideas. Their reports are in `docs/audits/2026-10-05-demo-recon/`.
2. **The Supabase project was resumed** (it had been paused for inactivity; the whole app, production included, was down). Founder approved in chat; `restore_project` at about 19:00 UTC, healthy at 19:13 UTC. This is the only change made to any system in this session.
3. **Nine writer agents** produced one section per wave, with exact files, code, Slovenian copy and verification steps. Several tested their own code against scratch copies of the repo (Wave 6: 459 tests green with all its tasks applied; Wave 2: 52 tests and a dry run of the new seed against the live database).
4. **Eight reviewers** (security, data integrity, UX and the meeting, two cold-start executability passes, schedule, Slovenian language and legal, plus a separate Wave 6 review) and fold agents applied about 170 findings.
5. **The plan**: `docs/superpowers/plans/2026-10-05-demo-day-readiness.md` (117 tasks, assembled after midnight once the Wave 6 fold finished; its 42 findings were applied and its tonight tasks were proven on a staged copy: tsc clean, 444 tests green). The Wave 6 reference code sits in `docs/superpowers/plans/2026-10-06-wave6-code/` with a `.txt` suffix on every code file, so tsc and the Vercel build never compile it.
6. The local dev server started for the audit (20:35) was stopped at 00:00; execution starts its own lanes.

## Learned

- **Infrastructure fails silently between sessions.** In three weeks without a session, the free Supabase project paused, the Resend domain lost its DKIM record, and getbelin.com kept serving the old Belin 1.0.0 site. None of it was visible from the code. A session that starts with the app should start by checking the services, not the repo.
- **The demo hid two product gaps by construction.** The seed hand-writes progress items and coordinates, so the demo never showed that a project made through the wizard has neither. A real buyer uploading a plan would have met a project stuck at 0 percent with no weather.
- **Page views write to the database.** Opening dashboards persists deemed approvals and sends reminders. The audit's own page views used up the demo's hour-sheet countdown. Any rehearsal does the same, which decides when the final reseed may run.
- **Parallel writers converge on the same problem four different ways.** Four sections independently solved "Slovenian placeholders break the parity test" with four incompatible edits to one test file. Shared rules have to be written into the index before writers start, not reconciled after.
- **A plan written at full detail is about 112 agent hours.** The schedule review turned that into a 46 hour minimum cut with tiers, checkpoints and a rollback ledger. Without that, a cold executor would have been hours behind by the first gate with no rule for what to drop.

## Failed

- **Wave 6 was reviewed late.** Its writer finished after the main review round had started, so it got a separate review. The reviews written without it raised false "no Wave 6 section" blockers, which had to be reconciled by hand.
- **Messages to running workflow agents mostly did not arrive.** Only two of eight agents received the "database is back" message; the rest finished their recon against a dead database, which is why a second live round was needed.

## Succeeded

- The audit found, before the buyer could: a real private customer's home address on the public landing page, a real Slovenian EPC's name on every demo document, AVESOL's real price on the naročilnica, the paused database, the failed email domain, and the old site on the domain every PDF prints.
- Two security holes were confirmed on the live database (a table readable and writable with the public key; a privileged function callable without signing in) and planned as must-fix before signups open.
- The run of show is written in Slovenian, minute by minute, with a fallback line for every beat and honest objection answers marked by evidence tier.

## Next

- The founder reads the chat summary, answers Wave 0 (domains, DKIM, approvals, legal entity details, the email budget), vetoes any of D1 to D20, and says when to execute.
- Execution follows the plan's Timeline in a fresh Opus session, starting with R0 and Task 1.1.
