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

## Tasks 19 to 21: translation, security, and the production pass

**The single translation pass (Task 19).** 676 keys into German, 675 into
English, every namespace. German uses Sie throughout, because the reader is a
company the EPC is paying. This clears every i18n debt line in CHANGELOG.md,
including the landing and auth keys outstanding since 20.07. de and en were
written as their own texts, not as Slovenian rendered word by word: the
Slovenian plural forms are four and the German and English forms are two, so
those messages were rebuilt rather than copied.

What survived untouched: the reverse-charge notes in lib/invoice-shared.ts, which
live in code precisely because they are statutory sentences and not wording
anybody may improve. A translation pass is exactly the moment somebody would have
improved them.

**And the test that had to come with it.** The parity test was proving something
that stopped being true the moment the pass landed. While de and en carried the
Slovenian string, identical keys plus non-empty strings really did mean the
catalogs agreed. Now they are three independent texts, and a broken plural or a
renamed placeholder in German would have reached the pilot customer before it
reached us. tests/messages-icu.test.ts compiles every message as ICU in all three
languages, compares each argument set against Slovenian, and fails on a dash.
Verified red first, on an unclosed plural and a {number} renamed to {nummer}.

The PDF sequence test also gained German, rendered LAST, after every Slovenian
glyph, because the font subset bug bites when new glyphs enter a warm process and
until today no document in the suite contained an umlaut. The assertion now
checks every word of the body rather than the first, since the corruption dropped
letters out of the middle of words.

**A live privilege escalation, found by sweeping (Task 20).** Fetching the seeded
crew link on production returned the EPC project token in the page HTML.
DevSwapBar, the dev convenience that jumps between the two connected views, was
never gated by anything. A crew link is designed to be forwarded to whoever turns
up on the roof, so every holder of one could step into the client's dashboard.

The gate went into getSiblingToken rather than at the two render sites: the
function hands its caller a capability, and a page that forgets the check would
ship the hole again. Tested, verified red by deleting the gate, deployed, and
re-probed on production in both directions.

**The rest of the security list.** Secret sweep by value shape clean. The only
log carrying a live credential is behind a NODE_ENV guard. All five buckets
private, with the signed-URL boundary probed rather than assumed: the public path
400s, a valid signature 200s, one changed character 400s, and the same link 400s
once its seconds are up. All five PDF routes refuse anonymously on production and
answer a non-member with the same 404 as a document that does not exist.

**Abandoned plan uploads swept**, clearing the wizard debt from 20.07. Every
upload that never became a project is a customer's construction plan sitting in
storage for no reason, so this is a retention rule before it is housekeeping.
Object deleted before row, deliberately: dying between the two lets the next
sweep retry, while the other order strands the file forever. Triggered on a new
upload rather than by a cron this codebase does not have, and global rather than
per-org so active EPCs clean up after inactive ones.

**The acceptance script, on production (Task 21), and it earned its keep.** Two
people signed in by magic link, every surface walked, and the entire closing
chain driven: handover requested by the subcontractor, acceptance conducted with
a defect, both on-screen signatures and the penalty reservation, invoice issued.
Every document was pulled back out of storage and read. Twelve-page completion
report with an intact text layer, the protocol carrying the reservation sentence
verbatim, the invoice printing the 76.a note with no VAT row anywhere. The font
fix holds on a warm serverless runtime, which is the only place it ever mattered.

**A seed that lied about resetting**, found by doing exactly what the runbook
tells the founder to do before every demo: walk the chain, then re-seed. The
upsert put the project back to active, but the final page reads the ACTIVITY
TRAIL to decide whether the handover was requested, so a leftover
finalization_requested row left a freshly seeded active project insisting it had
already been handed over. A completion report from the previous run reappeared on
the card too, dated and downloadable, describing days the seed had just deleted.
Only the closing events are cleared, never entry_submitted or
material_check_completed, because those ARE the live feed the demo opens on.

## Learned

- A test can stop testing what it used to test without changing a line. The
  parity test was correct on the day it was written and hollow the day the
  translations landed. When the assumption under a test changes, the test needs
  re-earning, not re-running.
- The bug worth finding is in the SEQUENCE, not the step. Every step of the
  finalization chain worked, and the seed worked; walking them in the order the
  founder will walk them is what exposed the reset that was not one.
- Driving a React form from injected JavaScript needs focusout, not blur. React
  delegates onBlur through focusout, so a dispatched blur silently persists
  nothing and looks exactly like a broken feature. Cost one wrong bug report to
  myself before checking.

## Failed, then fixed

- Wrote scripts/sweep-plans.ts as a second entry point to the sweep, then deleted
  it: the data module is server-only, so a tsx script cannot import it, and
  duplicating the deletion path is worse than not having a second trigger.
- The first production QA harness POSTed the magic-link confirm form directly.
  Next server actions need their action id, so nothing happened and five checks
  failed against a working app. Re-driven in a real browser.

## Outstanding

- **Founder action:** rotate the Supabase service-role key, updating Vercel AND
  .env.local in the same sitting, since a stale local key silently breaks the
  seed. It is the one step here nobody but the account holder can take.
- **Founder action:** capture the landing screenshots from the seeded demo into
  public/landing/. Each slot is already the right shape and renders as a framed
  captioned panel until the file lands.
- One wizard upload on production has not been driven from this session, because
  a real file picker is needed. The parser is unchanged since the founder's own
  production upload on 10.08, and it is the first beat of the runbook anyway.
