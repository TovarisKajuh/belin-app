# Session: the v1 completion plan, and the first three tasks of it

Date: 2026-08-12. Model: Fable (planning), then execution in the same session at the founder's instruction.

## Done

**Assessment first.** The founder asked whether the app is practically demo ready. Verified rather than agreed: 307 tests green and tsc clean, but Parts C through J of the July master plan were entirely unbuilt. No PDF engine (@react-pdf was not even a dependency), no notifications, no incidents, no requests, no Regiestunden app code, no change orders, no finalization, no invoice, no portfolio. Half of v1, and specifically the half a paying EPC most wants to see.

**The plan.** docs/superpowers/plans/2026-08-12-v1-completion-plan.md, 21 tasks. It supersedes the task sections of the 2026-07-20 master plan, which had gone stale in ways that would have cost real time: its M3 migration would have failed (email_log already exists since 20260720210000), it plans an xlsx path that was deliberately deleted, it re-plans the finished wizard, and it sends the executor to Settings for subcontractor invites that moved onto the project. Part 0 of the new file is a verified inventory of what exists with exact interfaces, so an executor never rebuilds shipped work.

**Task 1, PDF engine.** @react-pdf/renderer 4.5.1, the Inter TTF copied from AVE-DC, lib/pdf/theme.tsx with the paper palette and the primitives every document will use. The smoke test renders a document and reads its own bytes back with unpdf: that loop is what later lets us assert on day numbering, the penalty reservation sentence and the reverse charge invoice.

**Task 2, notifications engine.** Migration 20260812100000 (incidents, incident_photos, notifications, widened activity kinds), lib/notify.ts with emitEvent and emitEventDeferred, all 17 kinds of email copy, and the first two events wired at the data layer. Verified against the live database with a real crew submission: exactly one activity row, one notification to the EPC Bauleiter, the fake demo address refused and logged.

**Task 3, started.** lib/po-shared.ts, the money core, 13 tests.

## Learned

- **The plan's own staleness was the biggest risk, and only re-verification found it.** Three weeks of shipped code invalidated specific instructions in a document that still read as authoritative. Re-deriving the ground truth cost half an hour and would have cost a day inside execution.
- **TDD paid immediately on money.** 2.5 x 19.99 is held as 49.974999999999994 and rounds down to 49.97, a cent short. The test pinned the commercially correct 49.98 before any implementation existed, so the fix (normalize the product to ten decimals before rounding to cents) landed in the first version rather than in a support conversation about a wrong naročilnica.
- **Slovenian CLDR does not group four digit numbers.** Intl gives "1000,00" for sl and "1.000,00" for de. Right for prose, wrong for a money column, so grouping is forced in formatMoney.
- **A complete material check should notify nobody.** Mailing the EPC about every expected case is how a notification system trains its users to ignore it. The event fires only on a shortfall; the dashboard still gets its ping.
- **sendEmail needed a refusal mode.** The engine has to be able to say "this mail must not go out" (no base URL means every link is dead) while still writing the attempt to email_log. The alternative was an invisible skip or an email with a dead button, and the 2026-07-20 outage is precisely why the log row matters.
- **Environment traps confirmed again:** screenshots time out in the hidden preview pane (trap 7), and clicking by ref went wrong once because coordinates went stale. Dispatched bubbling MouseEvents DO reach React here (the headcount stepper moved 1 to 2 under a dispatched click), which is a cheaper way to drive the crew screen than pointer sequences. Note this is clicks, not the pointer enter/leave case trap 4 warns about.

## Failed, then fixed

- First draft of the no-base-url branch passed empty HTML to sendEmail, which would have SENT a blank email rather than refusing. Fixed by adding refuseReason to the sender instead of hacking the caller.
- First draft of the material check wiring invented a `silentPing` option that did not exist on the event input. Replaced with an explicit branch: emit on shortfall, plain ping otherwise.

## Noticed, not acted on

The migration ledger in the database and the files in supabase/migrations/ do not line up by name: the database has create_project_from_review_country_check and create_project_from_review_with_roofs, the repo has create_project_from_review_baseline. The schema itself is consistent with the code (types and tests are green), so this is a naming and record drift rather than a behaviour bug, but it is exactly the drift the 2026-07-20 rule was written to prevent and it deserves a deliberate reconciliation pass.

## Continued in the same session, at the founder's instruction

The founder answered three open questions before I continued: two vetoes (finalization becomes its own office-only action; the demo seed DOES stage sent and accepted naročilnice), screenshots for the landing to be captured with the Browser pane visible when Task 18 arrives, and the migration drift to be reconciled immediately.

**Drift reconciliation, and it was not a naming problem.** create_project_from_review existed TWICE, as a seven argument version and the roofs-aware eight argument one, in the database AND in the repo, because "create or replace function" does not replace a function whose signature changed: it adds an overload beside it. Nothing called the stale body only because the wizard always sends p_roofs and PostgREST resolves overloads by argument name. One forgotten argument would have created a project with its material list intact and its roofs missing, returning a normal looking id with no error at all. The overload is dropped and p_roofs is now required in the types, so the shape is impossible from both ends.

**Task 3, the naročilnica, complete and verified.** Data layer with five single conditional transitions, the document, the PDF route, the EPC builder, the sub office acceptance. Verified against the live database: priced from plan-prefilled data (245.7 kWp, Kranj), sent, a real PDF stored whose hash matches its stored bytes exactly, accepted by the sub admin through her own session in the same browser, both sides notified and logged. A real leak surfaced by probing rather than reading: the page served a crew LINK session, which would have shown the agreed contract price to anyone holding a forwarded link or watching the QR code at a demo. Non person actors are now refused.

**Task 4, the bell, complete and verified.** Two bugs found by driving it: the panel hung off the left edge of a 375px screen because it was anchored to the bell rather than the viewport, and marking everything read rebuilt the page underneath the open panel so the list flickered away mid read. A missing translation surfaced the same way.

**A seed gap closed on the way.** The demo EPC company had only a Bauleiter, and a Bauleiter does not sign orders, so nobody in the demo could price a naročilnica at all. Nina Hribar, admin at Sonce Energija, now exists for the same reason a real EPC has someone in that chair.

**Also decided:** a sent naročilnica does not print its own hash, because a document cannot contain the hash of itself. The hash covers the exact sent bytes and lives on the row; the template keeps the field for the acceptance copy, which is a different document describing an accepted original.

## Next

Tasks 1 to 4 are done and verified, plus the drift reconciliation. Task 5 (crew incident capture) is next, then 6 (dashboard panels), 7 (requests), 8 to 11 (Regiestunden and change orders), 12 to 15 (finalization, completion report, acceptance, invoice), 16 (portfolio), 17 to 21 (seeds, landing, translations, security, QA). The two vetoes are folded into Tasks 12 and 17 of the plan file.

Execution continued on Fable at the founder's explicit instruction rather than moving to Opus.
