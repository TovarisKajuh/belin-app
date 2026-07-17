# Session log: 2026-07-17 (night), project status control and pre-phase-1b audit

Closing entry for this session. Earlier phases of the same session are logged in 2026-07-17-scope-and-build-order.md, 2026-07-17-phase-0-foundations.md and 2026-07-17-phase-1a-crew-report.md.

## What was done

- Built the project status control both parties see: a tested state machine (draft, active, paused, reviewing, finished, cancelled), the sub requests review and the EPC accepts or sends back, enforced in the UI and server-side, every change logged to activity. Verified both roles end to end, deployed.
- Added photo thumbnails to today's entries on both the crew and EPC views (founder feedback), and fixed the silent photo-decode failure and the DEV pill placement from the earlier round.
- Ran a full-repository pre-phase-1b audit: four independent reviewers (correctness and security; architecture; performance and schema; i18n and accessibility) reviewed the whole codebase blind to each other, plus a lead deep read of the security-critical files. Logged all findings in docs/audits/2026-07-17-pre-phase-1b-audit.md BEFORE any fix, as the founder required.
- Remediated every high-severity finding and most mediums, then wrote the remediation log (part 2) and the deferred-decisions log (part 3) in the same document. Verified the security and reliability fixes directly against the database.

## What we learned

- Independent multi-reviewer review earns its keep on code you wrote yourself. The reviewers caught real issues the author had underweighted or missed: a duplicate-entry-on-retry bug (the idempotency id was regenerated per attempt), cross-project photo-path injection into the daily log, a two-device status race that corrupts the audit trail, progress computed by scanning the whole history on every load, and a photo decoder that could crash a phone from memory. None was a missing auth check; all were missing input validation, atomicity or efficiency one layer below auth.
- Always confirm a subagent actually did the work: the i18n reviewer returned in 3.5 seconds with zero tool calls and a garbled result, so that lens was redone by the lead. Check tool_uses, not just that a result came back.
- For backend correctness, verify at the database, not only through the UI. The preview pane drifted between pages during the long session, so a UI submit silently did not land; calling the Postgres function directly (valid case plus negative cases for foreign scope and foreign path) proved atomicity and validation reliably, including that failed attempts left zero orphan rows.
- supabase-js has no client-side multi-statement transaction, so a Postgres function called via rpc is the right tool for any multi-write that must be atomic. This pattern will repeat for hour sheets, change orders and acceptance.
- The heavy Next dev cache corrupts after large file churn; stop server, delete .next, restart. Production build is unaffected.

## Where we failed

- One of the four review agents produced nothing (0 tool calls). Caught and covered, but a reminder that a returned result is not proof of work.
- The first UI verification of the refactored submit did not register because the preview navigated away mid-submit; switched to database-level verification.

## Where we succeeded

- Findings logged before any fix, exactly as instructed; remediation logged after, with reasoning for what was deferred.
- Every high-severity finding fixed and proven: the atomic validated submit rejects foreign scope ids and photo paths and rolls back cleanly, the status race is closed by compare-and-swap, the retry-duplicate and photo-memory and weather-hang risks are gone, and progress is now a grouped aggregate. Build, tsc and 31 tests green.
- The founder's differentiator got faster and safer at once: progress no longer scans history, and it can no longer be corrupted by a forged or foreign input.

## Deferred (recorded, not lost)

- H8, token transport: refactor at the start of M1 together with the session actor, not twice.
- M13, material-check model: decide with the material-check screen in phase 1b (safe default index in place).
- The remaining LOW items are listed in the audit doc part 1 for the next session.

## Standing debt (unchanged, carry forward)

1. Rotate the Supabase service_role key before the 27.07 German pilot (exposed in chat).
2. Rotate the two demo tokens before real project data.
3. Remove the dev party-swap bar at launch.
4. Attach projekt.getbelin.com (vercel.app fine for now).
5. Reset demo data (daily_entries) before the Monday demo; the seed project carries this session's test entries. Project status was reset to active.

## Next

Phase 1b, in a fresh session for the full context window: the EPC dashboard on the AVE-DC design (hero, cumulative chart, photo gallery with lightbox, activity feed, history beyond today), the live-sync moment (crew submit appears on the dashboard within seconds), and the Stueckliste material-check gate with its automatic EPC notification. Then Regiestunden, then the auto-generated final report.
