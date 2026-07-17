# Pre-phase-1b code audit, 2026-07-17

Full-repository audit run before starting phase 1b, at the founder's request. Method: four independent reviewers (correctness and security; architecture and types; performance and schema; i18n and accessibility) reviewed the whole codebase blind to each other, plus a separate deep read by the lead of the security-critical and data files. The i18n reviewer failed to execute, so that lens was done by the lead directly. Baseline at audit time: 28 unit tests pass, tsc clean, no `any` types anywhere.

This document is written BEFORE any fix (part 1, Findings). The remediation is recorded in part 2 after the fixes land.

## What was checked and found sound

- Authorization pattern: every server action and data function resolves the actor from the token first and never trusts a client-supplied projectId or role. No missing auth checks.
- Service-role key containment: only in `import "server-only"` modules, never importable by a client component. Verified.
- Signed-upload path minting: safe from cross-project traversal, collision and overwrite (path is server-prefixed with the resolved actor's projectId and suffixed with a fresh uuid per file).
- No SQL injection (parameterized supabase-js everywhere, no raw SQL, no dangerouslySetInnerHTML). Token format validation is reasonable and tested. The weighted progress computation is correct and tested. i18n key parity holds. No em or en dashes anywhere.

The gap is one layer deeper than auth: once a request is authorized, the values inside the payload are not validated against what the actor may reference, and the multi-write flows are not atomic.

---

## Part 1: Findings (ranked)

Severity: HIGH = correctness, security or data-integrity risk, or a real crew-facing failure; MEDIUM = cheaper to fix now than after four more modules copy the pattern; LOW = minor or deferred. "Source" names which reviewer(s) surfaced it.

### HIGH

**H1. submitDailyReport trusts client-supplied identifiers (cross-project data contamination).**
File: lib/data/reports.ts (payload used at 166, 178-185, 187-192). Source: security review.
`photoPaths`, `quantities[].scopeItemId` and `entryDate` are written with no check that they belong to the actor's project or match the server's today. A sub holding a valid token for project A, who has seen a signed photo URL from project B (the storage path is embedded in that URL), can call the server action directly with a project B photo path, and it renders inside project A's daily log, the very document this app exists to make trustworthy. Same call can backdate the construction diary or reference a foreign scope item.
Fix: server-side, reject photo paths not prefixed with `${actor.projectId}/`, validate every scopeItemId against the project's own scope_items, and compute entryDate on the server instead of trusting the payload.

**H2. submitDailyReport is not atomic: partial writes orphan photos silently.**
File: lib/data/reports.ts:150-201. Source: security, architecture, performance, lead read.
Four independent writes (entry, quantities, photos, activity) with no transaction. Deterministic repro: a payload with real uploaded photos plus one non-existent scopeItemId saves the entry, then throws on the quantities foreign key before photos are linked. The crew sees the button revert with no error (the form has a `finally` but no `catch`), the uploaded photos are orphaned forever, and because the id is regenerated per attempt (see H4) a retry writes a fresh entry instead of repairing the broken one. The activity insert also never checks its error. This breaks the explicit promise to never lose a crew entry.
Fix: one transactional Postgres function (db.rpc) that validates then writes entry, quantities, photos and activity atomically; surface a visible error in the form on failure.

**H3. TOCTOU race in updateProjectStatus corrupts status and the audit trail.**
File: lib/data/projects.ts:87-111. Source: security review.
Reads current status, validates the transition against that snapshot, then issues an unconditional update with no `WHERE status = current` guard, and always appends an activity row. In the product's own two-device topology (EPC on laptop, sub on phone, same project), a near-simultaneous "request review" and "pause" both read active, both pass, both write; last write wins, but both activity rows are inserted, so the legal audit trail permanently records a transition that never took effect, and the losing caller is told ok.
Fix: compare-and-swap (`.eq("status", current)`), insert the activity row only if a row actually changed, else return ok:false so the caller refreshes.

**H4. client_generated_id is regenerated on every submit attempt, so idempotency never protects against network retries.**
File: components/crew/CrewReportForm.tsx:33. Source: performance review.
The id is created inside onSubmit, so a lost response on weak LTE followed by a re-tap generates a new id and writes a duplicate daily entry, defeating the unique constraint in exactly the conditions it exists for.
Fix: generate the id once per report draft (useRef), reset only after a confirmed success.

**H5. Weather is fetched on the critical submit path with no timeout.**
Files: lib/data/reports.ts:153-158, lib/weather.ts:11-33. Source: architecture, lead read.
submitDailyReport awaits an external Open-Meteo call before writing the entry. It never throws but has no timeout, so on weak rural LTE the crew's "Send" can hang on a third party before anything saves, violating the under-30-seconds law.
Fix: AbortController with a short timeout (about 2.5s); the write to Frankfurt must never wait on Open-Meteo.

**H6. Progress is computed by scanning the project's entire quantity history on every load, and the EPC page does it twice.**
Files: lib/data/reports.ts:60-63, lib/data/projects.ts:46-48, app/[locale]/p/[token]/page.tsx:32-34. Source: performance, architecture.
Both data functions pull every entry_quantity row ever logged into Node and sum them to produce about one number per scope item; cost grows for the whole life of the project (thousands of rows on a multi-month roof), on every load, and the crew screen and EPC dashboard both reload constantly. The EPC page calls both functions, so the scan runs twice per load plus redundant project and scope queries.
Fix: push the aggregate into Postgres (a grouped `scope_installed(project)` function returning one row per scope item), and build the EPC view from a single call.

**H7. Photo downscale decodes every selected file in parallel and never frees the bitmaps (mobile crash risk).**
File: components/crew/PhotoCapture.tsx:28-44, 72. Source: performance review.
Up to 12 full-resolution phone photos decode at once (about 48 MB RGBA each, roughly 500 to 600 MB live), and neither the ImageBitmap nor the canvas is released. Mobile Safari kills the tab well below that, so a crew selecting many photos on a roof can crash or silently lose them.
Fix: decode sequentially (at most one full-size bitmap alive), close the bitmap and release the canvas per file, keep the per-file failure isolation.

**H8. The project token is threaded through every client component and server action, which contradicts the stated M1 auth-swap promise.**
Files: app/[locale]/p/[token]/actions.ts, the three client components, page.tsx. Source: architecture review.
The read path is clean (pages resolve the actor once and pass Actor into data functions). The write path prop-drills the raw token into client components and back into every server action, which re-resolve it. DECISIONS.md promises M1 swaps to a session actor "without touching module code"; that will not hold, because M1 actions read the session server-side and need no client-passed credential, so every action signature and component prop changes.
Decision, not an immediate fix: this is the number-one architecture item to resolve when M1 (auth) is built, done once together with the session actor rather than twice. See part 3.

### MEDIUM

**M1. "Today" is UTC, not the project's local day; entryDate is trusted.**
Files: lib/data/reports.ts:41-43, 167. Source: architecture, performance, security, lead. Rolled into H1 and the submit rewrite.
Fix: derive the day from the project's timezone (by country), clamp entryDate server-side.

**M2. EPC page double-fetches the project (rolled into H6).**
Fix: build the EPC view from one data call.

**M3. Project, scope and progress fetching and aggregation are duplicated across getProjectSummary and getCrewHome.**
Files: lib/data/projects.ts:31-83, lib/data/reports.ts:45-148. Source: architecture, performance.
The two have already drifted and compute progress two ways; every coming module needs "project core plus computed progress," so two copies become five and the headline metric risks diverging across screens and PDFs.
Fix: one getProjectCore(actor) that both compose.

**M4. Two divergent types model the same concept (CrewScopeStatus vs ScopeItemSummary).**
Source: architecture. Fix: one ScopeItemStatus, callers pick fields.

**M5. status:string to union casts have no runtime guard.**
Files: lib/data/projects.ts:74,99, lib/data/reports.ts:139. Source: architecture.
Sound only while the SQL CHECK and the PROJECT_STATUSES const stay identical; they were out of sync once already.
Fix: a small asProjectStatus() narrower that validates against PROJECT_STATUSES and fails loudly.

**M6. A failed submit is silent and leaves orphaned photos (UX side of H2).**
File: components/crew/CrewReportForm.tsx:29-69. Fix: catch and show a visible error, keep the form populated for retry.

**M7. Count interpolations have no plural rules ("1 delavcev" is wrong Slovenian).**
Files: messages/{sl,de,en}.json crew.postSummary etc. Source: architecture, lead.
Fix: restructure to a plural-safe label form, or ICU plural syntax.

**M8. Signed photo URLs are re-minted every render, and the changing token defeats the browser image cache.**
Files: lib/data/reports.ts:122, lib/storage.ts:31-44. Source: performance.
On weak LTE the crew and the live EPC dashboard re-download every photo on every refresh.
Fix: cache the mint per path just under the expiry (unstable_cache), or serve via a stable image route.

**M9. getCrewHome makes an avoidable extra round-trip and reads today's quantities twice (rolled into the H6 refactor).**
Fix: join today's quantities and photos into the first parallel batch by project and date.

**M10. The status menu does not close on outside click or Escape and is not keyboard-operable.**
File: components/project/ProjectStatusControl.tsx. Source: lead (i18n/a11y lens).
Fix: close on outside click and Escape, focus management.

**M11. ProjectStatusControl seeds local state from a prop and never re-syncs.**
File: components/project/ProjectStatusControl.tsx:24. Source: architecture.
After a router.refresh triggered by the other party (relevant once live sync lands in 1b) the pill will not reflect the new server status. Same stale-state class as the Stepper bug already fixed.
Fix: sync on the incoming prop.

**M12. entry_photos insert is not idempotent while the entry upsert is (offline-retry duplicate risk).**
File: lib/data/reports.ts:187-192. Source: architecture. Handled by the transactional rewrite (delete-then-insert per entry).

**M13. material_checks has no "latest / active" model (product decision for 1b).**
Table: material_checks. Source: performance.
The Stueckliste gate needs "is this project checked," but the table is an append log with nothing marking the current check. Decision needed in 1b: history log (add a (project_id, checked_at desc) index, latest wins, supports re-checks on deliveries) versus one authoritative check per project (unique index). Default taken now: history-log index, revisited when the material-check UI is built.

### LOW (fix the cheap ones, note the rest)

- L1. last_used_at is written fire-and-forget on every token resolution (unreliable in serverless, a write on the hot path). Drop it or await. Source: performance, architecture, lead.
- L2. Stepper aria-labels are hardcoded English. Localize. Source: architecture.
- L3. lib/supabase/client.ts comment says "publishable key" but reads NEXT_PUBLIC_SUPABASE_ANON_KEY. Fix the comment. Source: architecture.
- L4. Duplicate i18n strings across project.* and crew.* (installedOfTarget, progress). Consolidate carefully. Source: architecture.
- L5. photoCount derives from photoUrls.length, so a failed signed-URL generation undercounts photos. Source: architecture.
- L6. Person foreign-key columns are unindexed (activity.actor_person etc.); a person delete seq-scans. Add indexes when person deletion is introduced. Source: performance.
- L7. CrewReportForm re-renders the whole form on each keystroke. Revisit only if field testing shows lag. Source: performance.
- L8. hour_sheets/change_orders number = max+1 will race under concurrency when those modules are built. Use a counter or sequence. Source: performance.
- L9. scope_items ordered by sort_order against a project_id-only index leaves a tiny in-memory sort. Negligible. Source: performance.
- L10. entryClientId used as a storage-path segment is not validated as a uuid (low risk, namespaced under the trusted projectId). Source: architecture, security.
- L11. Tap-to-remove-photo gesture is non-obvious and has no confirm. Source: lead.
- L12. actor.orgId and actor.tokenId are populated but unused (kept for the per-org compliance vault). No action. Source: architecture.
- L13. weatherCodeToKey and the weather.* catalog are unused until the 1b dashboard wires them. No action. Source: architecture.

---

## Part 2: Remediation (what was fixed and how)

All HIGH findings and most MEDIUM findings were fixed in one pass. tsc clean, 31 unit tests pass (added project-time tests), production build compiles. The security and reliability fixes were verified directly against the database, because that is where they live and the preview browser was drifting between pages during the check.

Data-layer and database:
- H1, H2, M1, M12: submitDailyReport now calls one transactional Postgres function, `submit_daily_report` (migration 20260717240000). It validates that every scope item and every photo path belongs to the acting project before writing, computes the site-local entry date server-side (Europe/Ljubljana, Berlin or Vienna by country, via lib/project-time.ts), and writes the entry, quantities, photos and activity together, idempotent on the client-generated id, replacing quantities and photos so a retry cannot duplicate them. Verified: a valid call wrote 2 quantities, 2 photos and the activity row and the aggregate rose correctly; a foreign scope id and a foreign photo path were each rejected and rolled back with zero orphan rows.
- H3: updateProjectStatus is now a compare-and-swap (`.eq("status", current)`), and the activity row is written only if the swap changed a row, so two devices racing can no longer corrupt the status or leave a phantom audit entry.
- H6, M2, M3, M9: progress is computed by a grouped Postgres aggregate, `scope_installed` (returns one row per scope item, not the whole history). A single getProjectCore(actor) is composed by both views, so the EPC page fetches the project once instead of twice, and getCrewHome's today queries run in one parallel batch keyed by project and date.
- M4: one ScopeItemStatus type replaces the two divergent scope shapes.
- M5: asProjectStatus() narrows the DB string and throws on an unknown value, so a drift between the SQL CHECK and the union is caught, not silently cast.
- H5: fetchWeatherSnapshot has a 2.5s AbortController timeout, so a slow Open-Meteo can never hang the crew's submit.
- L1: the unreliable fire-and-forget last_used_at write was removed.
- M8: signed photo URLs are cached (unstable_cache, just under expiry), so a refresh no longer re-downloads every photo.
- M13: added the (project_id, checked_at desc) index for the coming material-check "latest" lookup.

Client and UI:
- H4: the idempotency id is generated once per draft (useRef) and reset only after a confirmed success, so a retry on weak LTE reuses it.
- H7: photos are decoded one at a time, and each bitmap and canvas is released, so a burst of large phone photos cannot pile up hundreds of MB and crash the tab.
- M6: a failed submit now shows a visible error and keeps the form populated for retry.
- M10, M11: the status menu closes on click-away and Escape, and re-syncs when the other party changes the status.
- M7: ICU plural rules for the crew summary; Slovenian now renders 1 delavec, 2 delavca, 3 delavci, 5 delavcev correctly (verified on screen).
- L2: the stepper's screen-reader labels are localized.
- M3, M4 (rendering): the duplicated today's-posts block is one shared TodayPosts component, the EPC view is its own EpcHome component, and the token page is a thin role router.

## Part 3: Deferred decisions and remaining low items (with reasoning)

- H8, token transport (deferred to M1, deliberately). The token is currently passed into client components and back into server actions. The clean fix (a request-scoped identity seam so actions read the actor from context, not a client-passed token) is best done together with the M1 magic-link auth work, when the session actor arrives, rather than twice. Refactoring it now would introduce cookie or middleware identity plumbing right before the demo for no user-visible gain. Locked as the number-one architecture task to do at the start of M1.
- M13, material-check model (decide in 1b). History log versus one authoritative check per project is a product decision that belongs with the material-check screen in phase 1b. The safe default (history log with a latest-lookup index) is in place, so the decision is not blocked and nothing needs redoing whichever way it goes.
- Remaining LOW items left as noted, not changed: person-foreign-key indexes (add when person deletion is introduced), the whole-form re-render on keystroke (revisit only if field testing shows lag), the hour-sheet number-assignment race (address when that module is built), the scope_items (project_id, sort_order) micro-index, entryClientId uuid validation (low risk, namespaced), photoCount deriving from photoUrls.length, and the tap-to-remove-photo affordance. Each is recorded in Part 1 so the next session can pick them up.
