# Session 2026-07-19 (third): the PoC master plan, planned with Fable, to be executed with Opus

## What the founder asked

"do it, then optimize and polish everything. then implement live sync. i want
proof of concept done after this task, so i'm turning on fable and supercode for
you to create a master plan. send me the plan when you overthink it, and then i
will execute it with opus. (dont execute on your own)"

A new working mode: this session PLANS only. The deliverable is
docs/superpowers/plans/2026-07-19-poc-stueckliste-polish-livesync.md, executed
later by Opus in a fresh session.

## Method: recon, draft, adversarial review

Three parallel recon agents pinned the exact current state of every file the
plan touches (crew flow and actions, EPC dashboard and CSS, i18n and tests and
config), so the plan cites verified facts with file and line references instead
of guesses. Then the full draft. Then four parallel adversarial reviewers with
distinct lenses attacked it: data integrity, security, UX and design laws, and
cold start executability. Roughly twenty findings survived and were folded into
the final revision.

## What the review caught, and why the method paid for itself

Three genuine blockers that would have shipped:

1. **A retry could rewrite the evidence record.** The idempotent upsert stamped
   `checked_at = now()` on retry, so a phone that lost its response could later
   resurrect its old "all present" check as the newest record, erasing a
   shortfall attested in between by the other phone. Fixed: a retry never
   touches the timestamp.
2. **An item added while the crew's form was open vanished.** The submitted
   check omitted it, and the timestamp based "changed since check" comparison
   never flagged it, because the item's updated_at predated the check's
   checked_at. Fixed: the re-check signal is membership based, items not
   covered by the latest check count as outstanding.
3. **The seeded demo booted into a false state.** The seed pinned the current
   project's check two weeks back while bumping every item's updated_at to
   seed time, so the settled Trenutno scenario would show a false "7 changed"
   banner on first load. Deterministic; the very first demo run would have hit
   it. Fixed: the seed stamps the check at seed run time.

The UX reviewer added a fourth that mattered as much: **the material gate
locked out a real day one crew.** Scaffolding and setup happen before pallets
arrive, and the hard gate blocked all daily reporting until material existed to
check, with the only workaround being a false "all missing" alarm. Resolved
with an escape: "Material še ni prispel" records a truthful empty check,
unlocks reporting, notifies the EPC (which is the day one signal the original
gate decision wanted), and the membership rule keeps a standing prompt until a
real check happens. Flagged prominently on the plan's veto list because it
amends a founder decision from 17.07.

Security findings folded in: completeness is now DERIVED in the database from
the per line statuses instead of trusted from the client (a hand rolled request
could previously store "complete" alongside shortfall lines); the idempotency
upsert gained a cross project guard, applied to the shipped daily report RPC as
well, which carried the same flaw; delivery note paths are bound to their own
check's folder; the gate is enforced server side; and the live sync debt note
now honestly covers ping injection, not just listening.

Executability findings: the live sync fallback had a silent hole (the add item
path broadcast nothing under the fallback, exactly the moment the acceptance
test verifies), the dash sweep command was not executable in this shell as
written, the seed reset before the waiting state verification was a soft
"prefer" where it must be mandatory, and the new column was missing from the
Row types.

## Also this session

- Copy register: the flow says "Prispelo / Vse prispelo" (arrival language) and
  "preverjanje" (a quick check), not "prisotno" (attendance) or "prevzem" (a
  formal goods acceptance the crew is not performing). The reviewer caught the
  draft narrating arrival while labeling attendance.
- The Slovenian plurals in the plan survived review, including dual forms with
  noun, adjective and verb agreement.
- Flipped one of my own defaults on review evidence: the EPC dashboard now
  carries a minimal "V živo" badge, because a silently degraded live channel
  during the demo climax reads as a bug, while a visible state indicator makes
  a delay read as receiving.
- The plan file itself is em and en dash clean, including its own embedded
  dash sweep command, which builds its regex from unicode escapes so the file
  never contains the literal characters.

## Process notes

- One session restart mid review: all four reviewer agents were resumed from
  their saved transcripts with SendMessage rather than relaunched; no work was
  lost or repeated.
- The first dash sweep attempt silently failed (`grep -P` unicode classes
  error in this shell) and the failure looked like a pass. Re-ran with node.
  The plan encodes the working command so Opus does not rediscover this.

## Next

The founder reviews the plan summary and the six defaults on its veto list,
then executes with Opus: fresh session, session start ritual, then the plan
file, task by task. Nothing was executed here beyond the plan document itself,
per instruction.
