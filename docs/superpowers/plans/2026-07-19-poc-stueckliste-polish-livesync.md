# PoC Master Plan: Stückliste screens, optimization and polish, live sync

Status: authored 2026-07-19 evening by the planning session, for execution by Opus in a fresh session. Revised the same evening after four adversarial review passes (data integrity, security, UX and design laws, cold start executability); three blockers and some twenty findings were folded in. Founder order: "do it, then optimize and polish everything, then implement live sync. i want proof of concept done after this task." Defaults chosen on the founder's behalf are listed at the end and can be vetoed before or during execution.

Execution kickoff: run the session start ritual (CLAUDE.md, DECISIONS.md, recent CHANGELOG.md, latest session log), then execute tasks in order. Every task ends with its verification and a commit. Pushes deploy to production automatically; every push in this plan is safe to deploy because the feature is additive and the migration has no existing callers.

## The acceptance test: PoC is done when this script passes on production

On a phone, on belin-app.vercel.app, in Slovenian:

1. Open the installed PWA. Dark splash (3x4 mark), landing page, log in as 54321.
2. Switch to Dan 1. The crew screen shows the material gate instead of the report form.
3. Complete the material check: mark one line Delno with a missing quantity, everything else through Vse prispelo, attach one material photo and one dobavnica photo, submit. Under 30 seconds of interaction; camera capture time excluded from the budget.
4. The report form unlocks. Submit a daily report with a photo and quantities.
5. On a second device or browser: log in as 12345, switch to Dan 1. The material panel shows the shortfall line, the two documents, the check time. The submitted report is visible.
6. While the EPC dashboard is open and untouched, the crew submits another report. The dashboard updates within a few seconds, no reload, with the live indicator present.
7. EPC adds a material item. The crew screen, refreshed or live, shows the re-check banner. Crew re-checks; the EPC panel returns to settled.
8. Switch both sides to Trenutno: the half-built project renders exactly as before this plan, with the material panel showing the seeded completed check and NO re-check banner anywhere.
9. Quality gates: `npm run lint` clean, `npm test` green, `npm run build` clean, messages parity green, no horizontal overflow at 375px in any locale, no console errors, zero em or en dashes in messages, app, components, lib, and in this plan file itself.

## Global constraints

- CLAUDE.md discipline applies in full: plan is written, steps are small and verified, CHANGELOG.md in the same commit as every change, session log at start and end, no em or en dashes in any produced text including UI strings and this file's edits.
- Slovenian only (founder mandate 2026-07-19): all new UI strings are written in Slovenian; de.json and en.json receive the identical Slovenian string as a placeholder. Add one CHANGELOG debt line for the new keys. The parity test requires all three catalogs to gain identical key sets with no empty strings.
- Load the frontend-design skill BEFORE writing any UI code in Tasks 5, 6, and 9 (saved memory: skipping it cost two chart rebuilds).
- The dark system is the only system: new UI uses the existing `--e-*` tokens and `.belin-dark` scoping. New panels on the dashboard use `section.e-sec.e-reveal` (the scroll reveal system), never `.e-fadein` (the hero-only system).
- A change request has two axes, what is shown and how it looks. The visual language of the dashboard and crew screen is founder approved: extend it, do not redesign it.
- Error convention for the new server actions: follow the report path (throw on failure, client catches, shows localized error, preserves state for retry), not the status path's `{ ok: false }` convention.
- Freshness convention: there is no `revalidatePath` anywhere in the codebase; clients call `router.refresh()` after successful mutations. Follow it.

### Environment traps, all hit this week, all mandatory to respect

1. Never run `npm run build` while the dev server is running: both write `.next` and the dev server dies with phantom `vendor-chunks` module errors. Stop the server first.
2. `read_console_messages` returns accumulated history. A stale error is not a current error. Verify against the current DOM (`read_page`, `javascript_tool`), never against console history alone.
3. The session cookie is httpOnly: `document.cookie` cannot see it. Do not "verify" cookie state from page JavaScript.
4. Drive events the way React listens: `form.requestSubmit()` for forms, `pointermove` on a single surface for scrub interactions. Synthetic `pointerenter` and `pointerleave` do not reach React handlers.
5. Measure the element that carries the value: a bar's fill width, an input's rendered height, not the container or the text near it.
6. CSS: later rules of equal specificity win. The safe-area block and the raised-pill overrides sit at the END of globals.css deliberately; anything appended after them must not re-declare their properties.
7. Screenshots time out in the preview (backgrounded renderer). Verify with text and geometry probes. The founder verifies motion on a real phone.
8. The preview tab can drift to another URL between probes; assert `location.pathname` inside every probe that depends on it.
9. Two-role testing in one browser: the cookie session is browser-global, so use the token routes (`/sl/p/demo-epc-...` and `/sl/p/demo-sub-...`) to hold both roles in two tabs at once.
10. `npm run gen:types` is guarded (scripts/gen-types.mjs) and the Supabase CLI is absent in this environment, so it fails loudly and leaves the file intact. Add new types to lib/database.types.ts manually, mirroring the existing style.
11. After schema changes, re-run `npm run seed` (rerunnable) and re-verify the RPCs at the database level via the Supabase connector, including rejection probes, then clean probe rows out.
12. `grep -c` counts lines, not occurrences; minified output is one line. Use `grep -o | wc -l` when counting matters. `grep -P` with unicode classes errors in this shell unless prefixed with `LC_ALL=C.UTF-8`; the dash sweep below uses a node one liner instead, which is proven in this environment.

## Existing building blocks (recon verified 2026-07-19, with locations)

- Tables `material_items`, `material_checks`, `material_check_items` exist since the init migration; `material_check_docs` and the RPC `submit_material_check` exist since migration 20260719150000. The RPC validates item ownership, status values, and the `projectId/` path prefix, and writes the `material_check_completed` activity row. It is NOT idempotent and trusts the client's completeness flag (Task 1 fixes both).
- `material_items` has a moddatetime trigger (init migration line 389): `updated_at` bumps automatically on update.
- Seed: 7 material lines exist on both projects (`materialRows` in scripts/seed-demo.mjs); the current project carries one completed check (CHECK_CURRENT) whose `checked_at` is currently pinned two weeks back, which Task 1 must fix (see the seed defect below); ground zero carries none. Re-running the seed resets ground zero to checkless.
- SEED DEFECT (found in review, must fix in Task 1): the seed upserts `material_items` at run time, so their `updated_at` is always seed time, while CHECK_CURRENT.checked_at is pinned to `dates[0] + "T06:40:00Z"`, roughly two weeks past. Any "changed since check" logic would see all 7 items as changed and the settled Trenutno demo would boot with a false banner. Fix: set CHECK_CURRENT `checked_at` to the seed run's own timestamp, inserted AFTER the material items upsert, so it always postdates their `updated_at`. The check date then displays as today, which is acceptable.
- Actions live colocated at `app/[locale]/p/[token]/actions.ts` with a `requireSubActor(token)` helper (actions.ts:8). Material actions go in the colocated file; add a `requireEpcActor` sibling.
- The crew form pattern to mirror (components/crew/CrewReportForm.tsx): one `crypto.randomUUID()` draft id in a `useRef`, minted once and reused across retries, reset only after confirmed success; `requestPhotoTargets(token, draftId, count)` mints signed upload targets server side; `createBrowserClient().storage.from("photos").uploadToSignedUrl(path, tok, blob)`; partial upload failures tolerated; on success clear state, new draft id, `router.refresh()`.
- `PhotoCapture` (components/crew/PhotoCapture.tsx) is reusable as is: props `{ blobs, onChange, addLabel }`, camera capture, HEIC fallback, 1600px downscale, JPEG 0.8, sequential decode.
- `Stepper` props: `{ value, onChange, min, max, step, ariaLabel }`.
- lib/storage.ts: `createPhotoUploadTargets(projectId, entryClientId, count)` writes to bucket `photos` with paths `${projectId}/${entryClientId}/${i}-${uuid}.jpg`; `getSignedPhotoUrlMap(paths)` batch-signs with a 3600s expiry behind a 3000s `unstable_cache`. It signs whatever it is handed with the service role; Task 3 adds a comment forbidding client influenced paths.
- EpcDashboard panel order (components/epc/EpcDashboard.tsx): hero, ProjectionPanel, ScopeByPhase (line 83), StatRow, LatestOnSite, DailyLogFeed, PhotoGallery. The material panel slots after ScopeByPhase. `getEpcDashboard` runs a five way `Promise.all` at epc-dashboard.ts:65; material queries join that batch. The error gate at line 94 currently ignores `subRes.error` (Task 8.1 fixes).
- Scope row classes for visual reference: `.e-srow .e-sname .e-strack .e-sfill .e-snums .e-spct` (globals.css:988-1008). Alert banner classes: `.e-alert .e-alert-in .e-alert-ic .e-alert-t`, plus `.e-alert-b`, a styled alert action button currently unused; Tasks 5 and 6 adopt `.e-alert-b` for banner buttons, so it is NOT dead CSS and must not be deleted. Badge: `.e-proj-badge` and `.e-proj-badge.late`. Live dot: `.e-live` (1031), with the existing key `dashboard.live` = "V živo". No segmented control exists anywhere; it is net new CSS built from `--e-surface`, `--e-line`, `--e-gold`.
- Z-index map: grain 0, e-wrap 1, command bar 20, status menu 40, pills 60, lightbox 100. New overlays sit below 100; the material lightbox reuses the existing one.
- PhotoGallery is coupled to `{ url, date }` with a hard coded `ddmm` label. Task 6 extracts a shared lightbox rather than widening it.
- There is no realtime, no polling, and no activity feed UI anywhere. `EpcDashboardData.activity` is queried and returned but never rendered (dead weight, removed in Task 8). The browser Supabase client (lib/supabase/client.ts) exists, is RLS deny all, and is already used in production for signed uploads, so the anon key is proven present in the deployed environment; realtime broadcast needs nothing new in env.
- `getCrewHome` returns `CrewHomeData` (lib/data/reports.ts:15-26); `getProjectCore` supplies progress and scope. The `projects` row is currently read twice per dashboard load (core + subName embed); Task 8 folds them.
- i18n: namespaces `common, project, crew, weather, dashboard, status, landing, auth`. The parity test enforces identical key sets and no empty strings across sl, de, en. No HH:MM formatter exists anywhere (Task 3 adds one). The Slovenian plural patterns to follow are `crew.postSummary` and `dashboard.buffer` (four forms: one, two, few, other).
- One shipped dash rule violation: components/epc/dashboard/TempoChart.tsx:115 renders an em dash as a null placeholder (Task 9 fixes).

## Data shapes (decided before code)

```ts
// lib/materials-shared.ts (pure, no imports from server code, fully unit tested)
export type MaterialCheckStatus = "present" | "partial" | "missing";

export interface MaterialItemRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  sortOrder: number;
  updatedAt: string; // ISO timestamptz from the DB
}

export interface MaterialCheckItemRow {
  materialItemId: string;
  status: MaterialCheckStatus;
  missingQty: number | null;
}

export interface MaterialDocRow {
  kind: "material_photo" | "delivery_note";
  storagePath: string;
  sortOrder: number;
}

export interface LatestCheck {
  id: string;
  isComplete: boolean;
  note: string | null;
  checkedAt: string; // ISO
  items: MaterialCheckItemRow[]; // empty array means the "material not arrived yet" escape state
  docs: MaterialDocRow[];
}

export interface MaterialState {
  items: MaterialItemRow[];
  latest: LatestCheck | null;
  needsFirstCheck: boolean;   // latest === null: the crew gate (escapable, see Task 5)
  // Items NOT COVERED by the latest check (no check item row for them) plus
  // items whose updatedAt postdates checkedAt. Membership first, timestamps
  // second: an item added while the crew's form was open has no row in the
  // submitted check and MUST count even though its updatedAt predates
  // checkedAt (review finding: the pure timestamp comparison silently
  // swallowed exactly that item). The escape state (empty items) therefore
  // counts ALL items as uncovered, which keeps a standing prompt until a real
  // check covers the list. That is intended.
  uncoveredOrChanged: number;
}

export function buildMaterialState(
  items: MaterialItemRow[],
  latest: LatestCheck | null
): MaterialState;
// Timestamp comparisons via Date.parse, never string comparison.

// Client draft -> RPC payload items. Validation rules:
// - every item id in `items` must have a resolved status, else { ok: false, error: "unresolved" }
// - partial requires missingQty with 0 < missingQty < qty STRICTLY (missing
//   everything is "missing", not "partial"), else { ok: false, error: "badQty" }
// - missing defaults missingQty to the full qty when qty > 0 (editable down to 1),
//   null when qty <= 0
// - items with qty <= 0 offer only present or missing, never partial
// - present carries missingQty null
// - numeric parsing: the input accepts a comma or a period as the decimal
//   separator (Slovenian keyboards produce commas); parse by replacing the
//   comma with a period, Number(), reject NaN, round to 2 decimals to match
//   the numeric(12,2) column. Tests MUST include the input "3,5".
export type CheckDraft = Record<string, { status: MaterialCheckStatus | null; missingQty: number | null }>;
export function buildCheckItemsPayload(
  items: MaterialItemRow[],
  draft: CheckDraft
):
  | { ok: true; items: { material_item_id: string; status: MaterialCheckStatus; missing_qty: number | null }[]; isComplete: boolean }
  | { ok: false; error: "unresolved" | "badQty" };
// isComplete here is for optimistic UI display only. The database derives its
// own completeness and is the authority (security finding: the previous design
// let a hand rolled client claim complete=true alongside shortfall lines).

export function shortfallCount(items: MaterialCheckItemRow[]): number; // status !== present
```

```ts
// lib/data/materials.ts (server)
export async function getMaterialState(actor: Actor): Promise<MaterialState | null>;
// Two queries in Promise.all:
//   material_items: id, name, qty, unit, sort_order, updated_at, ordered by sort_order
//   material_checks: id, is_complete, note, checked_at,
//     material_check_items (material_item_id, status, missing_qty),
//     material_check_docs (kind, storage_path, sort_order)
//     .order("checked_at", { ascending: false }).limit(1).maybeSingle()
// Then buildMaterialState. Docs stay as storage paths here; signing happens where needed.

export interface SubmitMaterialCheckPayload {
  clientGeneratedId: string;
  note: string;
  items: { material_item_id: string; status: MaterialCheckStatus; missing_qty: number | null }[];
  // an empty items array IS valid: it records the "material not arrived yet"
  // escape state (see Task 5); the RPC stores it as a check with no items and
  // is_complete false
  materialPhotoPaths: string[];
  deliveryNotePaths: string[];
}
// NOTE: no isComplete field. The RPC derives completeness server side.
export async function submitMaterialCheck(actor: Actor, payload: SubmitMaterialCheckPayload): Promise<string>;

export async function addMaterialItem(
  actor: Actor,
  item: { name: string; qty: number; unit: string }
): Promise<void>;
// insert with sort_order = current max + 1; trims name, requires qty > 0 and nonempty unit
```

```ts
// lib/storage.ts additions
export async function createMaterialDocTargets(
  projectId: string,
  checkClientId: string, // MUST be validated as a UUID before path interpolation
  photoCount: number, // clamped 0..6
  noteCount: number   // clamped 0..6
): Promise<{ photos: UploadTarget[]; notes: UploadTarget[] }>;
// Bucket "photos" (both kinds are camera photos in the PoC; PDF dobavnica is out of scope).
// Paths: `${projectId}/material/${checkClientId}/photo-${i}-${uuid}.jpg`
//    and `${projectId}/material/${checkClientId}/note-${i}-${uuid}.jpg`
// The RPC validates the FULL `${projectId}/material/${clientId}/` prefix
// (Task 1), so a check can only reference its own uploads, not another
// check's documents or a daily report photo (review finding).
```

```ts
// lib/project-time.ts addition
export function hhmm(iso: string, country: string | null | undefined): string;
// site-local HH:MM via projectZone(country), Intl.DateTimeFormat, hour12: false
```

```ts
// EpcDashboardData extension (lib/data/epc-dashboard.ts)
export interface MaterialPanelDoc { kind: "material_photo" | "delivery_note"; url: string }
export interface MaterialPanelData {
  items: MaterialItemRow[];
  latest: (Omit<LatestCheck, "docs"> & { docs: MaterialPanelDoc[] }) | null;
  needsFirstCheck: boolean;
  uncoveredOrChanged: number;
}
// EpcDashboardData gains: material: MaterialPanelData
// Doc paths are signed in the SAME getSignedPhotoUrlMap call as the gallery:
// dedupe the merged path array first, then split back out by the DB rows'
// kind. The panel's doc COUNT must derive from successfully signed URLs, not
// from raw rows, so a row whose path fails signing can never show a count
// with a missing thumbnail (review finding).
```

Server actions (app/[locale]/p/[token]/actions.ts):

```ts
export async function requestMaterialDocTargets(
  token: string, checkClientId: string, photoCount: number, noteCount: number
): Promise<{ photos: UploadTarget[]; notes: UploadTarget[] }>;
// requireSubActor; rejects checkClientId that is not a plausible UUID
// (regex check) BEFORE it reaches a storage path; clamps counts server side.
// Apply the same UUID guard to the existing requestPhotoTargets entryClientId
// in the same commit (one line, closes the same latent foot-gun).

export async function submitMaterialCheckAction(
  token: string, payload: SubmitMaterialCheckPayload
): Promise<{ ok: true; checkId: string }>; // requireSubActor, throws on failure

export async function addMaterialItemAction(
  token: string, item: { name: string; qty: number; unit: string }
): Promise<{ ok: true }>; // requireEpcActor (new helper, mirror of requireSubActor)
```

Gate enforcement, server side: `submitDailyReport` (lib/data/reports.ts) gains a precondition, one `exists` query on `material_checks` for the project; if no check exists it throws. The UI gate alone is decoration a hand rolled request bypasses (review finding); the escape state satisfies the precondition because it IS a check row. The seeded CURRENT project has a check, so nothing regresses.

## Task 1: fix the material check RPC (idempotency, derived completeness, path binding) and the seed

Migration file `supabase/migrations/20260719170000_material_check_idempotent.sql`, applied via the Supabase connector (project xrwncpngjajosstvkign) and kept in the repo:

1. `alter table public.material_checks add column client_generated_id uuid unique;`
2. `drop function public.submit_material_check(uuid, boolean, text, jsonb, text[], text[]);` This DROP is mandatory: creating a new signature without it would create an OVERLOAD and PostgREST RPC calls would become ambiguous.
3. Recreate as `submit_material_check(p_project uuid, p_client_id uuid, p_note text, p_items jsonb, p_material_photos text[], p_delivery_notes text[])`. Note there is NO completeness parameter any more. Body rules, each one review driven:
   - Insert with `on conflict (client_generated_id) do update set note = excluded.note where material_checks.project_id = excluded.project_id returning id into v_check;`. Two deliberate properties: the conflict update does NOT touch `checked_at` (a retry must keep its original position in the latest wins ordering; reassigning it let a stale retry resurrect an old check as the newest record and erase a later attested shortfall), and the `where` guard means a client id collision from another project updates nothing, after which `v_check is null` raises an exception instead of silently corrupting a foreign project's check.
   - Delete and reinsert children (`material_check_items`, `material_check_docs`) exactly like the daily report's replace semantics.
   - Count items and shortfall while looping; then `update material_checks set is_complete = (v_item_count > 0 and v_shortfall = 0) where id = v_check;`. Completeness is DERIVED, never accepted from the client, and an empty check (the not arrived escape) is never "complete".
   - Document path validation tightens from `${p_project}/` to the full `${p_project}/material/${p_client_id}/` prefix for both kinds.
   - Activity insert unchanged (kind `material_check_completed`, payload now built from the derived values). A retry inserts a second activity row; the daily report has the same property; accepted and consistent.
4. In the same migration, add the identical project guard to `submit_daily_report`'s conflict clause (`where daily_entries.project_id = excluded.project_id` plus a null check raising), since the review showed the shipped report RPC carries the same cross project upsert flaw.

Seed fix in the same task (scripts/seed-demo.mjs): insert CHECK_CURRENT with `checked_at: new Date().toISOString()` AFTER the material items upsert, replacing the pinned `dates[0]` timestamp, so the settled state is deterministic on every run (see SEED DEFECT above).

Types: in lib/database.types.ts, update the `submit_material_check` Args (drop `p_is_complete`, add `p_client_id`), and add `client_generated_id: string | null` to the `material_checks` Row, Insert, and Update blocks, mirroring `daily_entries`.

Verify at the database level via the connector:
- same `p_client_id` submitted twice: ONE check row, the second call's items and note, and `checked_at` UNCHANGED from the first call
- a submit with honest shortfall items: `is_complete` false regardless of anything the client sends; all present: true; empty items array: a check row with zero items and `is_complete` false
- foreign material item, invalid status: rejected, zero partial writes
- doc path with the right project but the wrong subfolder (`${project}/seed/photo-0.jpg` and `${project}/material/${otherUuid}/x.jpg`): rejected
- a conflicting client id from the OTHER project: raises, the original row untouched
- `npm run seed` runs clean; the CURRENT project then has `checked_at` newer than every material item's `updated_at` (assert with one SQL comparison), and ground zero has zero checks
- delete every probe row afterwards

Commit: migration file, seed change, types, CHANGELOG.

## Task 2: pure material logic, test first

`lib/materials-shared.ts` exactly as specified in Data shapes, plus `tests/materials.test.ts`:

- buildMaterialState: no check gives needsFirstCheck true; check covering all items with no later updates gives 0 uncovered; an item WITHOUT a row in the latest check counts as uncovered even when its updatedAt PREDATES checkedAt (the mid flight add scenario, the exact hole the review found); an item updated after checkedAt counts; the empty check (escape state) counts every item; a fresh full check returns to 0. Timestamp tests use differing timezone offset formats to prove Date.parse comparison.
- buildCheckItemsPayload: all present gives ok with isComplete true; one partial with valid qty gives ok, isComplete false; partial with missingQty null, zero, negative, EQUAL to qty, or above qty gives badQty; unresolved status gives unresolved; missing defaults to full qty; qty 0 item cannot be partial; comma decimal "3,5" parses to 3.5; "abc" rejects.
- shortfallCount counts partial and missing, not present.
- hhmm in lib/project-time.ts with tests (06:40Z in July in Europe/Ljubljana is 08:40), injectable like projectToday.

Run `npm test`: green before any UI exists. Commit.

## Task 3: data layer

`lib/data/materials.ts` and the `createMaterialDocTargets` addition to lib/storage.ts, per Data shapes. `submitMaterialCheck` calls the RPC with `p_client_id` and returns the check id. The gate precondition lands in `submitDailyReport` (one exists query, throws a localized-by-the-client error when no check exists). Extend `getEpcDashboard`: material queries join the existing `Promise.all`, results checked in the same error gate, docs deduped and signed in the merged batch per Data shapes. Add the one line comment on `getSignedPhotoUrlMap` stating it must never receive client influenced paths.

Verify: `npm run lint` clean; a node probe confirms `getMaterialState` returns 7 items with a latest check on the current project and `needsFirstCheck: true` on ground zero. Commit.

## Task 4: server actions

In `app/[locale]/p/[token]/actions.ts`: add `requireEpcActor`, then the three actions per Data shapes, including the UUID guard on `checkClientId` and the same guard retrofitted onto `requestPhotoTargets`. The RPC revalidates ids, statuses, and paths; completeness is not accepted from the client at all.

Verify with lint; the actions are exercised end to end in Task 5. Commit (CHANGELOG entries distinct from Task 5's).

## Task 5: crew Stückliste UI and the gate

Load the frontend-design skill first. All strings Slovenian.

New client component `components/crew/MaterialCheck.tsx` plus wiring in `components/crew/CrewHome.tsx`:

- CrewHome receives a new `material: MaterialState` prop. Both pages fetch `getMaterialState(actor)` in `Promise.all` with the existing `getCrewHome(actor)` call.
- Gate: when `needsFirstCheck`, render the material card INSTEAD of the report form and today posts. The card explains why in one sentence (gateBody). The card carries a secondary, visually quieter action: "Material še ni prispel". Tapping it submits the ESCAPE state (empty items array, no docs required, same draft id machinery), which unlocks reporting immediately and truthfully records that nothing has arrived. This resolves the review's field blocker (day one is often scaffolding and setup with pallets landing day two or three; the old hard gate locked those crews out of reporting entirely, and the only workaround wrote a false "all missing" alarm). The EPC is notified either way, which is exactly the day one signal the original gate decision wanted. After the escape, `uncoveredOrChanged` keeps a standing banner until a real check covers the list.
- Re-check banner: when `uncoveredOrChanged > 0` and a check exists, an alert strip (`.e-alert` family, with `.e-alert-b` as the button style) above the summary card: count via recheckBody, button (recheckAction) expands the check UI with uncovered or changed lines carrying a "novo" badge. The banner region has `role="status"` and `aria-live="polite"` so its live sync appearance is announced.
- Settled state: compact summary card above the report form: Material popoln, shortfall count, or the not arrived state; checked date and time; a quiet "Preveri znova" button expanding the full check UI (the crew's permanent entry point on any delivery day).
- The check UI, built for a thumb on a roof:
  - "Vse prispelo" quick action at the top: one tap resolves every line to present. Rows start UNRESOLVED so an all present submission is an explicit attestation, one tap, not a silent default. (Flagged on the veto list: the photos, not the row states, carry most of the evidentiary weight; the founder may prefer present by default.)
  - One row per line: name, `qty unit`, three state segmented control, Prispelo, Delno, Manjka. New CSS under `.belin-dark`: minimum 44px targets, `--e-surface-2` resting, gold tinted active, `role="radiogroup"` per row with the item name as the accessible label (from data, like the Stepper's ariaLabel), `role="radio"` with `aria-checked` per option, keyboard accessible.
  - Delno reveals an inline numeric input (inputMode decimal, 16px font so iOS does not zoom, accepts comma or period per the parse rule) and MOVES FOCUS to it. Manjka fills the missing quantity with the full target, editable. A stepper is wrong here: forty missing modules must not take forty taps.
  - Two document slots, each a `PhotoCapture` with its own label: Fotografija materiala, Dobavnica. Both optional (veto list), cap 6 each.
  - Note field: reuses the existing `crew.note` and `crew.notePlaceholder` keys and `.b-field` styling.
  - Submit mirrors CrewReportForm exactly: one draft id in a useRef, `requestMaterialDocTargets`, `uploadToSignedUrl` for both slots, `submitMaterialCheckAction`, success collapses to the summary state with a fresh draft id and `router.refresh()`; failure shows the localized error (`role="alert"`) with state fully preserved.
  - Validation before submit: `buildCheckItemsPayload`; unresolved rows scroll the first offender into view and show the unresolved message.
  - The gate to form transition region carries `aria-live="polite"` so the unlock is announced.

i18n keys, all three catalogs (de and en carry the Slovenian string, one CHANGELOG debt line). The flow's language is deliberately the light "preverjanje" (a quick arrival check), not "prevzem" (a formal goods acceptance with legal weight the crew is not performing); the review flagged the draft's mixed metaphor. Namespace `crew.material`:
title "Preverjanje materiala", gateTitle "Najprej preverite material", gateBody "Pred prvim dnevnim poročilom potrdite, kaj je prispelo na gradbišče.", notArrived "Material še ni prispel", allPresent "Vse prispelo", present "Prispelo", partial "Delno", missing "Manjka", missingQty "Koliko manjka?", photoLabel "Fotografija materiala", deliveryNoteLabel "Dobavnica", submit "Potrdi preverjanje", submitting "Pošiljam...", submitted "Preverjanje zabeleženo", submitFailed "Preverjanja ni bilo mogoče poslati. Poskusite znova.", unresolved "Označite vse postavke.", summaryComplete "Material popoln", summaryShort "{count, plural, one {# postavka manjka} two {# postavki manjkata} few {# postavke manjkajo} other {# postavk manjka}}", summaryNotArrived "Material še ni prispel", checkedOn "Preverjeno {date} ob {time}", recheckTitle "Seznam materiala je dopolnjen", recheckBody "{count, plural, one {# nova ali spremenjena postavka} two {# novi ali spremenjeni postavki} few {# nove ali spremenjene postavke} other {# novih ali spremenjenih postavk}}. Preverite, ali je vse prispelo.", recheckAction "Preveri znova", newBadge "novo".

Verification, driven in the preview on ground zero (sub token route), at 375px and 1265px:
- gate replaces the form; the form is absent from the DOM, not hidden
- the escape: tap "Material še ni prispel", confirm at the database level a check row with zero items and is_complete false exists, the report form unlocks, the standing banner shows all 7 lines as to check, and the EPC side (other tab) shows the not arrived state
- re-seed, then the full check path: Vse prispelo resolves all rows (assert aria-checked); Delno reveals the input AND focus lands in it; comma input "3,5" survives to the DB as 3.5; submitting with an empty missing qty is blocked; the first offending row scrolls into view
- segmented options and the numeric input measure at least 44px tall
- attach one photo per slot with a synthetic File, submit, confirm at the database level: one check row with the right client id, statuses, missing qty, two docs with correct kinds under `${projectId}/material/${clientId}/`
- after submit the summary card renders and the report form is present; a `submitReport` attempt on a checkless project (fresh re-seed, direct action call) throws the gate error
- re-check loop: add an item via connector SQL (INSERT, not an update), reload, banner appears with count 1 even though the new item's updated_at predates nothing; expand, the new row carries the novo badge; re-check; banner gone; clean probe rows and re-seed
- the CURRENT scenario renders the report form immediately with the seeded settled summary and NO banner
- no horizontal overflow at 375px; no console errors; lint, tests, stopped server build

Commit. If the task needs splitting, split at "gate and rows render" versus "submit path wired".

## Task 6: EPC material panel, add item, re-check loop

Load the frontend-design skill first (same session is fine).

- Extract the lightbox out of PhotoGallery into `components/epc/dashboard/Lightbox.tsx` (client): props `{ items: { url: string; label: string }[]; open: number | null; onClose: () => void; onStep: (delta: number) => void }`, rendering the existing `.e-lightbox` markup and key handling unchanged. PhotoGallery becomes a thin consumer passing `label: ddmm(date)`. Verify the existing gallery still opens, steps, closes by Escape, and restores body scroll, by driving it, BEFORE building on top.
- New server component `components/epc/dashboard/MaterialPanel.tsx`, slotted after ScopeByPhase, as `section.e-sec.e-reveal`:
  - Status line: complete badge (`.e-proj-badge`), shortfall badge (`.e-proj-badge.late`) with count, the waiting state when no check exists, or the not arrived state when the latest check has zero items. When `uncoveredOrChanged > 0`, an amber line with the count, stating the crew will be prompted.
  - Shortfall lines: name, "manjka X od Y unit", simplified two column variant of the scope row family.
  - Check metadata: checkedOn with `ddmm` and `hhmm` (site local), the crew note under the crewNote label.
  - Documents: thumbnail row (client subcomponent) with kind labels, opening the shared Lightbox; the count comes from successfully signed URLs. Empty state: noDocs.
  - Add item: compact inline client form (name, qty, unit) calling `addMaterialItemAction`, pending state ("Dodajam...") on the button, `router.refresh()` on success. Framing, per the review and design law 2 (zero manual entry): this form is an explicit stopgap so the re-check loop is demonstrable before the plan PDF extraction exists; record that framing in DECISIONS.md and in the demo script, so the live demo narrates it as "until your Stückliste comes straight from your plan PDF" rather than presenting typing as the product.

i18n `dashboard.material`: title "Material", complete "Material popoln", short (same plural as crew summaryShort), waiting "Ekipa še ni potrdila prevzema materiala.", notArrived "Ekipa je sporočila, da material še ni prispel.", checkedOn "Preverjeno {date} ob {time}", missingOf "manjka {missing} od {qty} {unit}", docPhoto "Fotografija materiala", docNote "Dobavnica", noDocs "Brez priloženih dokumentov", recheckPending "{count, plural, one {# postavka dodana ali spremenjena po zadnjem preverjanju} two {# postavki dodani ali spremenjeni po zadnjem preverjanju} few {# postavke dodane ali spremenjene po zadnjem preverjanju} other {# postavk dodanih ali spremenjenih po zadnjem preverjanju}}. Ekipa bo pozvana k ponovnemu preverjanju.", addItem "Dodaj postavko", itemName "Naziv", itemQty "Količina", itemUnit "Enota", addSubmit "Dodaj", addPending "Dodajam...", addFailed "Postavke ni bilo mogoče dodati.", crewNote "Opomba ekipe".

Verification, on both scenarios (EPC token routes), 375px and 1265px. MANDATORY first step: `npm run seed`, because Task 5's probes leave state (this is not optional; the waiting state cannot be verified on a project that Task 5 left checked):
- ground zero: waiting state; then drive one crew check from the other tab and verify the settled rendering; then the escape state rendering (re-seed between)
- CURRENT: green complete badge, checked date shows today with a plausible site local time (the seed now stamps it at seed time), no shortfall rows, no recheck line
- add an item as EPC: recheckPending count 1 on the panel; the crew tab shows the banner; crew re-checks; both sides settle
- lightbox: open a material doc, step, Escape closes, body scroll restored; the site photo gallery unchanged
- panel participates in scroll reveal; German and English render with placeholders, no overflow at 375px; lint, tests, stopped server build

Commit.

## Task 7: deploy and verify the whole material loop live (FOUNDER CHECKPOINT)

- `npm run seed`, push, Vercel deploys. On production: the six token and locale URLs return 200; ground zero sub shows the gate; drive the escape once, verify, then a real check with two photos; EPC panel reflects each state; add item raises the banner; re-check settles it; CURRENT untouched throughout.
- Reset with `npm run seed` so the founder starts from a clean Dan 1.
- Message the founder: the material loop is live, what to press, and that this is the review moment. Their feedback gates Task 9's scope but not Task 8.

Commit docs updates.

## Task 8: optimization pass (named items only)

Each item measured or verified before and after, committed in small batches, CHANGELOG each.

1. Fold the sub org name into `getProjectCore`'s project select, delete the second `projects` read in `getEpcDashboard`, and check the error properly (the review confirmed `subRes.error` is silently ignored today). Verify: command bar meta and AlertStrip still render.
2. Delete the unused `activity` query, the `DashboardActivity` type, and the field (dead on the wire; nothing renders it). Verify: tsc, dashboard renders.
3. Parallelize page fetches. `/app`: actor first, then view data, `getSiblingToken`, and `sessionScenario` in one `Promise.all`. `/p/[token]`: view data and sibling in parallel. Measure: `curl -w "%{time_starttransfer}"`, five samples, median, local production server (stopped dev server), before and after, both numbers in the CHANGELOG entry.
4. Explicit dimensions on gallery tiles, material doc thumbs, and crew today post thumbs (no layout shift). Verify the attributes exist and one throttled reload shows stable geometry.
5. (Removed in revision: `.e-alert-b` is now the banner button style used by Tasks 5 and 6. Do NOT delete it.)
6. Connector `explain analyze` on the two material queries: both must ride `idx_material_items_project` and `idx_material_checks_project_latest`; record the plans briefly.

Explicitly NOT here: font subsetting, bundle surgery, offline caching, image CDN work.

## Task 9: polish pass (named items only)

Load the frontend-design skill. Founder feedback from Task 7 takes priority; fold it in first.

1. Replace the em dash placeholder in TempoChart.tsx:115 with a plain hyphen. Dash sweep, the exact command (grep -P is broken in this shell; this node one liner is proven here):
   `node -e "const fs=require('fs'),p=require('path');let bad=[];const re=new RegExp('[\u2013\u2014]');function walk(d){for(const f of fs.readdirSync(d)){const q=p.join(d,f);const s=fs.statSync(q);if(s.isDirectory())walk(q);else if(/\.(ts|tsx|json|md)$/.test(f)){const t=fs.readFileSync(q,'utf8');t.split('\n').forEach((l,i)=>{if(re.test(l))bad.push(q+':'+(i+1))})}}}['messages','app','components','lib'].forEach(walk);walk('docs/superpowers/plans');console.log(bad.length?bad.join('\n'):'CLEAN')"`
   (The regex is built from unicode escapes so this plan file itself stays free of the literal characters.)
   Expected output: CLEAN, except the two pre-existing prose hits in docs/superpowers/plans/2026-07-18-dark-epc-dashboard.md, which predate the rule and stay.
2. Login form: `enterkeyhint="next"` on username, `enterkeyhint="go"` on password.
3. Pending affordance on ScenarioPill and LogoutPill via a `useFormStatus` child button, disabled and dimmed while pending.
4. Focus visibility: one shared `.belin-dark` rule giving buttons, links, and inputs a gold `:focus-visible` outline (2px, offset 2), placed BEFORE the safe area block at the file end (trap 6), checked against existing custom focus styles so nothing double rings. Verify by keyboard tabbing the crew check flow and the EPC add item form.
5. Touch target audit on everything new: segmented options, the missing quantity numeric input, doc slot buttons, add item controls, banner buttons, all at least 44px rendered.
6. Reduced motion on the check card expand and collapse and any new transition; nothing carrying a number may depend on animation.
7. All locale phone sweep at 375px: landing, crew (gate, escape, check, settled, banner), EPC dashboard with the panel in every state. Zero horizontal overflow, measured.
8. Copy pass over every new Slovenian string with the founder's Task 7 feedback applied.
9. The scenario pill flow end to end: Dan 1 gate, escape, check, report, Trenutno settled. The demo path gets the last look.

## Task 10: live sync

Architecture: broadcast a contentless ping on a per project topic after every successful write; clients re-run their server components. No data crosses the channel, so there is nothing to leak and no client side merging to get wrong; the server stays the single source of truth.

- `lib/realtime-shared.ts` (pure): `projectTopic(projectId)` returning `belin:project:${projectId}`, `PING_EVENT = "ping"`.
- `lib/realtime-server.ts` (server only): `notifyProject(projectId)` posting `{ messages: [{ topic, event: "ping", payload: {} }] }` to `${NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast` with the service role key in `apikey` and `Authorization`, `AbortSignal.timeout(2500)`, wrapped so it can never throw. AWAITED at call sites, never fire and forget (serverless freeze, audit lesson L1).
- Call sites, each after the successful write: `submitReport`, `submitMaterialCheckAction`, `addMaterialItemAction`, `setProjectStatus` (only on ok).
- Fallback if the REST endpoint proves unavailable in Task 11 (do not improvise a third variant): BEFORE relying on it, probe that the in database sender exists: `select 1 from pg_proc join pg_namespace n on n.oid = pronamespace where nspname = 'realtime' and proname = 'send';` via the connector. The fallback is then: `realtime.send('{}'::jsonb, 'ping', 'belin:project:' || p_project::text, false)` inside BOTH RPCs (submit_daily_report, submit_material_check), plus one trigger on `public.projects` AFTER UPDATE OF status, plus one trigger on `public.material_items` AFTER INSERT OR UPDATE, so the add item path is covered too (the review caught that the draft fallback left it silent, which is exactly the re-check moment the acceptance test verifies). All four surfaces must broadcast under either mechanism.
- `lib/realtime-client-core.ts` (pure, tested): a reducer over events `{ ping, wake, channelStatus, pollTick }` with injected timestamps deciding refresh effects. `wake` is ONE event fed by both `visibilitychange` and `focus` listeners, throttled to one refresh per 5s, so a tab return can never double refresh (the draft's separate visible and focus rules could fire twice; review finding). Rules: pings debounce trailing 1200ms; pings while hidden set a dirty flag; wake with the dirty flag refreshes once; `CHANNEL_ERROR` or `TIMED_OUT` enables 25s polling; `SUBSCRIBED` disables polling; a poll tick inside the ping debounce window is suppressed. Tests in `tests/realtime-core.test.ts` cover each rule, rapid ping collapse, and the double wake case.
- `components/LiveRefresh.tsx` (client): props `{ topic: string; showBadge?: boolean }`. `createBrowserClient()`, `supabase.channel(topic, { config: { broadcast: { self: true }, private: false } })`, `.on("broadcast", { event: PING_EVENT }, ...)`, `.subscribe(statusCallback)`, drives the reducer, executes refreshes via `router.refresh()`, cleans up with `removeChannel`. With `showBadge` it renders the existing `.e-live` element with the existing `dashboard.live` string ("V živo") while SUBSCRIBED, and nothing otherwise: the review made the case that the demo's climax must not degrade silently; a frozen dashboard with no affordance reads as a bug, while a visible live badge (and its absence during a hiccup) reads as state. Badge on for the EPC dashboard, off for the crew screen.
- Mount in `EpcDashboard` (badge on) and `CrewHome` (badge off).
- Security debt, logged honestly in DECISIONS.md: the channel is public and the topic is derivable from the project UUID, which already appears in signed photo URL paths. A holder of the anon key plus a project UUID can therefore both LISTEN for contentless pings and INJECT forged pings; a forged ping causes clients to re-fetch through authorized reads only (no data exposure, no writes), and the reducer's debounce caps the refresh rate per client, but this write amplification surface exists and is accepted for the PoC. Private channels with realtime authorization arrive with real auth in phase 3.

Verify: `npm test` green on the reducer. Commit.

## Task 11: live sync verification protocol

Dev first (preview browser, dev server running, seed fresh):

1. Tab A: EPC token route for the CURRENT project, fronted. Tab B: crew token route, background.
2. Drive tab B via `javascript_tool` with explicit `tabId`: fill the report form and `form.requestSubmit()`. Do not front tab B.
3. Within 3 seconds, `read_page` on tab A: the new entry appears and the hero numbers moved, without any navigation on tab A. Assert `location.pathname` unchanged inside the probe.
4. Status change direction: tab A changes status; tab B shows the new pill without navigation.
5. Material direction: add an item in tab A; tab B shows the re-check banner live. This step is mandatory under BOTH mechanisms (primary and fallback).
6. The live badge is present on tab A while subscribed.
7. A temporary server log line (removed before commit) confirms the broadcast POST returned 2xx; if not, run the pg_proc probe and switch to the documented fallback, then repeat steps 2 through 5.
8. Unit tests stand in for network failure modes; do not simulate websocket outage in the preview.

Then production: repeat steps 1 through 6 against belin-app.vercel.app on token routes. Then `npm run seed` and verify the six URLs once more.

Commit, CHANGELOG, DECISIONS.md line for the ping architecture and the public channel debt as worded in Task 10.

## Task 12: final QA, rituals, demo dry run

1. Full gate run: lint, tests, stopped server build, parity, the dash sweep from Task 9.1, the all locale 375px sweep.
2. Walk the acceptance script on production, phone viewport, both scenarios, both roles, live moment included. Fix or honestly log anything that fails; the script IS the definition of done.
3. Write the demo runbook `docs/demo/2026-07-20-demo-script.md`: the beat by beat script in Slovenian including the add item narration ("until the Stückliste comes straight from your plan PDF"), the presenter's manual refresh fallback if live sync misbehaves on venue wifi, and the reset command.
4. `npm run seed` last, so the demo starts clean.
5. Rituals: CHANGELOG final entries, DECISIONS.md (gate semantics with the escape, ping architecture, add item stopgap framing, any founder vetoes), session log, status line on this plan marked executed.
6. Report to the founder in plain language with the live URLs and what to press.

## Explicitly out of scope (do not wander)

- The automatic project report PDF: the founder's latest sequencing places PoC after live sync; the PDF is the next block after PoC and is not in this plan.
- Magic link auth, organizations, invites (phase 3); removing the demo login or DEV pill (launch); rotating the service role key (pre pilot 27.07, tracked).
- EPC editing or deleting material lines (add only), dobavnica as PDF upload, offline queueing, email notifications, private realtime channels, the activity feed UI, font or bundle surgery.

## Defaults chosen on the founder's behalf (veto any, before or during execution)

1. Both document attachments are optional with a strong visual nudge, never blocking a crew with a dead camera; the EPC panel states plainly when documents are missing.
2. The first check gate is escapable: "Material še ni prispel" records a truthful empty check, unlocks reporting, and notifies the EPC, with a standing banner until a real check covers the list. This amends the original hard gate decision (DECISIONS.md 2026-07-17) because the review showed the hard gate locks out day one crews doing reportable setup work before any delivery; the escape preserves the decision's intent, the EPC learns on day one, without the lockout. This is the most important default to review.
3. Both document kinds are camera photos into the photos bucket; PDF dobavnica support waits for the compliance vault work.
4. Rows start unresolved with a one tap "Vse prispelo" quick action, making an all present check an explicit attestation. Honest note from the review: the photos carry most of the evidentiary weight and this costs one tap against the 30 second law; present by default is a defensible alternative if the founder prefers it.
5. The EPC dashboard carries a minimal "V živo" badge while the live channel is subscribed (revised from the draft, which skipped it: a silent degradation during the demo climax reads as a bug; the badge makes delay read as state).
6. The crew flow says "preverjanje" (a quick arrival check), not "prevzem" (a formal goods acceptance); the dobavnica keeps its proper name.

## Self review notes

- The riskiest technical assumption remains the realtime REST broadcast endpoint; the fallback is now fully specified (probe query, `realtime.send` signature, and the two triggers that close the non RPC write paths the draft fallback missed).
- Task 5 is the largest unit; its split point is named.
- The four review passes changed real things: the retry semantics of the check timestamp, the membership based re-check signal, the seed's deterministic settled state, server derived completeness, the cross project upsert guard on both RPCs, the escapable gate, the arrival register in the copy, the live badge, and the unified wake path in the reducer. Everything else reuses a pattern that already shipped and was verified this week: the draft id retry model, PhotoCapture, signed upload targets, batched signing, the alert strip, the scope row family, the reveal system, the scenario switch, and the seed's determinism.
