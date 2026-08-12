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

## Next

Task 3 continues: the purchase_orders data layer with the five conditional transitions, NarocilnicaDocument, the PDF route under the access matrix, PoBuilder for the EPC and PoView for the sub office with the sha256 hash binding on acceptance. Then Task 4 (bell) onwards. The plan file carries every interface, all copy and every verification step.

Per the founder's own workflow (plan on Fable, execute on Opus), the remaining execution belongs in a fresh Opus session pointed at the plan file.
