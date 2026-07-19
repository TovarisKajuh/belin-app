# Session 2026-07-19 (fourth): executing the PoC master plan with Opus

## What the founder asked

"cool, you can execute." Autonomous execution of the master plan written earlier
this evening (docs/superpowers/plans/2026-07-19-poc-stueckliste-polish-livesync.md):
Stückliste screens both sides, optimization and polish, live sync, PoC done.

## Done: all 12 plan tasks, shipped to production

- Task 1: hardened submit_material_check (idempotent on a client draft id, never
  reassigns checked_at on retry, derives completeness server side, binds doc
  paths to the check's own folder) and added the cross-project upsert guard to
  submit_daily_report; fixed the seed defect (checked_at from the DB clock).
  Verified every property at the database level.
- Task 2: lib/materials-shared.ts (membership-first re-check signal, payload
  validation, comma-decimal parse) and hhmm, 17 tests.
- Task 3: the data layer (getMaterialState, submitMaterialCheck, addMaterialItem,
  createMaterialDocTargets with a UUID guard, the server-side report gate, the
  dashboard material extension with merged doc signing).
- Task 4: the three server actions with UUID guards.
- Task 5: the crew gate and check UI with the escapable "not arrived" path.
- Task 6: the EPC material panel, the shared Lightbox extraction, add-item.
- Task 7: deployed and verified the material loop live (founder checkpoint).
- Task 8: optimization (folded the duplicate projects read, deleted the dead
  activity query, parallelized page fetches, confirmed image sizing and query
  plans).
- Task 9: polish (em dash, enterkeyhint, pending pills, focus-visible, reduced
  motion, all-locale 375px sweep, demo path).
- Task 10: live sync (contentless broadcast pings, a pure tested reducer,
  LiveRefresh with the badge).
- Task 11: verified the whole live-sync chain and fixed a bug it exposed.
- Task 12: full gate run, production acceptance beats, demo runbook, rituals.

## The most valuable thing that happened: a real bug the verification caught

Live-sync testing required submitting a daily report with no photos. It failed
with SQLSTATE 22004, "upper bound of FOR loop cannot be null". submit_daily_report
looped `for i in 1 .. array_length(p_photo_paths, 1)`, and an empty (non-null)
photo array has array_length NULL. The bug predates all this work: the original
shipped RPC had it, and the empty-photo path had simply never been exercised
(the founder always tested with photos). My Task 1 migration had faithfully
copied it. Fixed in migration 20260719180000 by coalescing the bound to 0, the
pattern the material check RPC already used. This is the payoff of driving the
real flow instead of trusting the types: a latent crew-facing crash that would
have hit the first photo-less report, found and fixed before the demo.

## Verification honesty

- Everything schema-level was proven against the live Frankfurt DB via the
  connector (idempotency, derived completeness, four rejection paths, the seed
  ordering).
- The crew and EPC UIs were driven at 375px: gate replaces form, escape writes
  an empty check and unlocks, Vse prispelo derives complete, the comma decimal
  3,5 stores 3.50, an empty Delno blocks with badQty, the re-check loop shows
  the novo badge, and the settled scenario has no false banner.
- Live sync: the broadcast REST endpoint returns 202, the client subscribes,
  the ping is delivered to the client, and a wake-driven refresh re-fetched and
  changed the panel after a DB edit. The preview renderer reports the tab as
  permanently document.hidden=true, so the automatic visible-tab refresh could
  only be shown by simulating the wake; on a real device a visible ping
  refreshes at once. realtime.send confirmed present as the fallback, not
  needed.
- Photo UPLOAD through the crew UI could not be driven here: injecting File
  objects does not reliably fire a React file input's onChange in the
  backgrounded renderer, and createImageBitmap is throttled. The upload wiring
  is identical to the proven CrewReportForm pattern and the RPC doc path is
  DB-verified; the founder confirms real photos on a phone.

## Preview-environment quirks worth remembering

- The preview tab is permanently document.hidden=true / visibilityState hidden /
  hasFocus false, even when fronted. Any code path gated on visibility (like the
  live-refresh dirty flag) will behave as if hidden. Simulate wake by dispatching
  a focus event.
- Driving an async server-action submit in a BACKGROUND preview tab is
  unreliable (the write may never complete). Front the writer tab, or drive the
  write server-side.
- The multi-statement SQL connector returns only the last statement's rows;
  check earlier results in separate queries.
- `grep -c` on a page counts the serialized i18n bundle too, so a message string
  appears even when its element does not render. Check the rendered element
  class, not the payload.

## Decisions logged (DECISIONS.md)

- The material gate is escapable ("Material še ni prispel"), amending the
  2026-07-17 hard-gate decision, because a hard gate locked out day-one crews.
- The EPC add-item is an explicit stopgap until plan-PDF extraction.
- Live sync is a contentless ping, not a data channel; the public-channel
  injection surface is accepted debt for the PoC.

## Debt carried (all pre-existing, tracked)

- The demo login (hardcoded credentials, public site) removed with magic-link
  auth in phase 3 before 27.07.
- de/en i18n placeholders (crew.material, dashboard.material, landing, auth) to
  be translated in one pass before 27.07.
- The DEV swap pill and the dev party-swap removed at launch.
- The exposed service_role key rotated before the pilot.

## Next

Founder reviews the PoC on a phone against docs/demo/2026-07-20-demo-script.md.
After the demo, the plan's own "out of scope" names the next block: the automatic
project report PDF, then phase 3 (magic-link auth, orgs, invites).
