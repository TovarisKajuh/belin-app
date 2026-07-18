# Dark EPC Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this cohesive UI build) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder EPC view with the approved dark dashboard (glowing gold progress ring, soft projection line, scope by phase, stats, live-on-site panel, day-by-day log, photo gallery), wired to the project's real data, trilingual and responsive.

**Architecture:** A new server-composed data function `getEpcDashboard(actor)` gathers everything the screen needs in one pass (project core, multi-day log history, activity, all photos, and a computed projection). Pure computations (install rate, projected finish, working days) live in a vitest-importable shared module and are unit-tested. The UI is a set of focused server/client components under `components/epc/`, ported from the approved mockup at `.superpowers/mobile-preview/index.html`, scoped to a dark theme that does not touch the still-light crew view. The token page renders it for the `epc` role.

**Tech Stack:** Next.js 15 App Router (RSC), Supabase (Postgres + Storage signed URLs), next-intl, TypeScript strict, vitest. No new dependencies.

## Global Constraints

- No em dashes or en dashes in any produced text (UI, comments, commits, docs). Use commas, colons, periods.
- TypeScript strict, no `any`. `npm run lint` (tsc) must stay clean.
- All user-facing strings go through next-intl keys, present in all three of `messages/{sl,de,en}.json`. The parity test fails the build if any key is missing or empty in any language.
- Pure, unit-testable logic lives in `lib/*-shared.ts` (vitest cannot import `server-only` modules). Server-only data code imports `"server-only"`.
- Service-role key stays server-side; the browser only ever receives server-minted signed URLs.
- Crew-facing definition of done is real-device, but for this EPC screen: verify in the dev preview (render, no horizontal overflow at 390px and 1280px, correct data, all three locales, no console errors), because the preview tab backgrounds `requestAnimationFrame` so timed animations are confirmed by the founder on a real browser.
- Do not implement live-sync (Supabase realtime) or the Stueckliste material-check gate here; both are later chunks. The "V zivo" panel shows the latest entry statically; the alert strip derives from `status = 'reviewing'`.
- Scope is the EPC dashboard only. The crew view stays light and unchanged. Dark styles must be scoped so they cannot leak into it.
- Visual source of truth: `.superpowers/mobile-preview/index.html`. Port its markup and its `<style>` block; do not redesign.
- Work stays on branch `feat/dark-epc-dashboard`; production (`main` -> belin-app.vercel.app) is only updated after founder review of the branch preview.

---

## File Structure

- Create `supabase/migrations/20260718100000_project_planned_dates.sql` — adds `planned_start`, `planned_end` (nullable `date`) to `projects`.
- Create `lib/projection-shared.ts` — pure: install-rate, projected-finish, working-day math. Vitest-importable.
- Create `tests/projection.test.ts` — unit tests for the above.
- Create `lib/data/epc-dashboard.ts` — `getEpcDashboard(actor)`, server-only, composes core + history + activity + photos + projection.
- Modify `lib/data/project-core.ts` — expose `planned_start`, `planned_end` on `ProjectCore` (fetch already selects the row; add the two columns).
- Create `components/epc/EpcDashboard.tsx` — top-level dark dashboard (server component), replaces `EpcHome` usage.
- Create `components/epc/dashboard/CommandBar.tsx`, `AlertStrip.tsx`, `ProgressRing.tsx` (client, count-up), `ProjectionPanel.tsx`, `ScopeByPhase.tsx`, `StatRow.tsx`, `LatestOnSite.tsx`, `DailyLogFeed.tsx`, `PhotoGallery.tsx` (client, lightbox), `Reveal.tsx` (client, scroll reveal). One responsibility each.
- Delete `components/epc/EpcHome.tsx` after `EpcDashboard` replaces it (and its `TodayPosts` usage is superseded; keep `components/project/TodayPosts.tsx`, still used by the crew view).
- Modify `app/[locale]/p/[token]/page.tsx` — render `EpcDashboard` for the `epc` role instead of `EpcHome`.
- Modify `app/globals.css` — append a scoped `BELIN dark dashboard` block (all rules under `.epc-dark`).
- Modify `messages/{sl,de,en}.json` — add the `dashboard` namespace.
- Modify `scripts/seed-demo.mjs` — enrich the demo project with multi-day entries, quantities, photos, planned dates, so the dashboard renders believably.

---

## Task 1: Planned-date columns on projects

**Files:**
- Create: `supabase/migrations/20260718100000_project_planned_dates.sql`
- Modify: `lib/database.types.ts` (regenerated), `lib/data/project-core.ts`

**Interfaces:**
- Produces: `projects.planned_start: string | null`, `projects.planned_end: string | null` (ISO date). `ProjectCore` gains `plannedStart: string | null`, `plannedEnd: string | null`.

- [ ] **Step 1: Write the migration**

```sql
-- 20260718100000_project_planned_dates.sql
-- Optional planned start and completion dates, used by the dashboard projection
-- (working-day totals and the deadline buffer). Nullable: the projection
-- degrades to a pure rate-based forecast when they are not set.
alter table public.projects
  add column if not exists planned_start date,
  add column if not exists planned_end date;
```

- [ ] **Step 2: Apply via the Supabase connector** (project ref xrwncpngjajosstvkign, Frankfurt) and keep this file in `supabase/migrations/`.

- [ ] **Step 3: Regenerate types**: `npm run gen:types`. Confirm `planned_start`/`planned_end` appear on the `projects` Row.

- [ ] **Step 4: Surface on ProjectCore**: in `lib/data/project-core.ts`, add `planned_start, planned_end` to the `projects` select, add `plannedStart`/`plannedEnd` to the `ProjectCore` interface and the returned object.

- [ ] **Step 5: Verify** `npm run lint` clean. Commit: `git commit -m "Add nullable planned_start/planned_end to projects"`.

---

## Task 2: Projection and working-day math (pure, TDD)

**Files:**
- Create: `lib/projection-shared.ts`
- Test: `tests/projection.test.ts`

**Interfaces:**
- Produces:
  - `businessDaysBetween(startIso: string, endIso: string): number` — inclusive of neither end convention documented in tests; counts Mon-Fri.
  - `type DailyProgressPoint = { date: string; cumulativePercent: number }`
  - `type ProjectionInput = { history: DailyProgressPoint[]; currentPercent: number; today: string; plannedStart: string | null; plannedEnd: string | null }`
  - `type Projection = { ratePctPerDay: number | null; projectedFinish: string | null; workingDaysElapsed: number | null; workingDaysTotal: number | null; daysVsDeadline: number | null }`
  - `computeProjection(input: ProjectionInput): Projection` — rate is the average weighted-percent gained per working day over the last up-to-6 working days with progress; `projectedFinish = today + ceil((100 - currentPercent) / ratePctPerDay) working days`; `null` when fewer than 2 progress days (not enough signal). `daysVsDeadline = businessDaysBetween(projectedFinish, plannedEnd)` sign-aware, null if either missing.

- [ ] **Step 1: Write failing tests** in `tests/projection.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { businessDaysBetween, computeProjection } from "@/lib/projection-shared";

describe("businessDaysBetween", () => {
  it("counts Mon-Fri only", () => {
    // Mon 2026-06-01 .. Fri 2026-06-05 => 5 working days
    expect(businessDaysBetween("2026-06-01", "2026-06-05")).toBe(5);
    // includes a weekend: Fri 06-05 .. Mon 06-08 => Fri, Mon = 2
    expect(businessDaysBetween("2026-06-05", "2026-06-08")).toBe(2);
  });
});

describe("computeProjection", () => {
  const base = { plannedStart: "2026-06-30", plannedEnd: "2026-08-08", today: "2026-07-10" };
  it("returns null forecast with too little data", () => {
    const p = computeProjection({ ...base, currentPercent: 5, history: [{ date: "2026-07-10", cumulativePercent: 5 }] });
    expect(p.projectedFinish).toBeNull();
    expect(p.ratePctPerDay).toBeNull();
  });
  it("projects a finish date from the recent slope", () => {
    const history = [
      { date: "2026-07-06", cumulativePercent: 30 },
      { date: "2026-07-07", cumulativePercent: 36 },
      { date: "2026-07-08", cumulativePercent: 42 },
      { date: "2026-07-09", cumulativePercent: 48 },
      { date: "2026-07-10", cumulativePercent: 54 },
    ];
    const p = computeProjection({ ...base, currentPercent: 54, history });
    expect(p.ratePctPerDay).toBeGreaterThan(5);
    expect(p.projectedFinish).not.toBeNull();
    expect(p.daysVsDeadline).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**: `npm test -- projection` -> FAIL (module missing).
- [ ] **Step 3: Implement `lib/projection-shared.ts`** (pure; no `server-only`). Full implementation of `businessDaysBetween` (iterate dates, count day-of-week 1..5 using `Date` from the ISO strings with `T00:00:00Z` to avoid TZ drift) and `computeProjection` per the interface. Guard: rate uses only the last 6 points that show an increase; if `< 2`, return nulls.
- [ ] **Step 4: Run to verify pass**: `npm test -- projection` -> PASS.
- [ ] **Step 5: Full suite + lint**: `npm test` (all prior tests still green), `npm run lint`.
- [ ] **Step 6: Commit**: `git commit -m "Add pure projection and working-day math with tests"`.

---

## Task 3: getEpcDashboard data function

**Files:**
- Create: `lib/data/epc-dashboard.ts`

**Interfaces:**
- Consumes: `getProjectCore(actor)` (project + scope + progress + today + planned dates), `computeProjection`, `getSignedPhotoUrlMap`, `summarizeTodayPosts` pattern.
- Produces:
```ts
export interface DashboardDay {
  entryId: string; date: string; headcount: number | null; note: string | null;
  weatherKey: string | null; tempC: number | null;
  quantities: { name: string; qty: number; unit: string }[];
  photoUrls: string[];
}
export interface DashboardPhoto { url: string; date: string; label: string }
export interface DashboardActivity { kind: string; at: string; payload: Record<string, unknown> }
export interface EpcDashboardData {
  core: ProjectCore;                 // reuse
  progressPercent: number;           // from core
  scope: ScopeItemStatus[];          // from core
  days: DashboardDay[];              // newest first, all entries
  latest: DashboardDay | null;       // days[0]
  gallery: DashboardPhoto[];         // all photos, newest first
  activity: DashboardActivity[];     // recent, newest first, capped 12
  projection: Projection;            // computed
  photoCount: number;
  needsReview: boolean;              // status === 'reviewing'
}
export async function getEpcDashboard(actor: Actor): Promise<EpcDashboardData | null>;
```
- Implementation notes: one `daily_entries` fetch for the project (ordered `entry_date desc, created_at desc`), one `entry_quantities` join fetch keyed by those entries, one `entry_photos` fetch keyed by those entries (ordered), one `activity` fetch (limit 12). Sign all photo paths in a single `getSignedPhotoUrlMap` batch (reuse the cached mint). Build `DailyProgressPoint[]` for the projection by walking entries oldest->newest accumulating weighted percent using the same weighted formula as `projectProgress` (import from `lib/progress.ts`, which is already pure). Map `weather` Json to `{ weatherKey, tempC }` using the existing `weatherCodeToKey`.

- [ ] **Step 1** Write the module with the interface above; reuse `getProjectCore`, `lib/progress.ts`, `lib/storage.ts`, `lib/weather-codes.ts`, `lib/reports-shared.ts` where useful. Server-only.
- [ ] **Step 2** Verify with a script against the seeded project (call the function via a tiny `node --env-file` script or a temporary route) that it returns days, gallery, projection with sane numbers, and rejects a bad token (returns null). Log the shape.
- [ ] **Step 3** `npm run lint` clean.
- [ ] **Step 4** Commit: `git commit -m "Add getEpcDashboard data function"`.

---

## Task 4: Enrich the demo seed

**Files:**
- Modify: `scripts/seed-demo.mjs`

**Interfaces:** Consumes the schema. Produces a believable multi-day project: `planned_start`/`planned_end` set; ~9 daily entries across ~2 weeks (skipping weekends), each with per-scope quantities that make the weighted progress land near a realistic value, weather snapshots, and a few photo rows per entry (reuse any existing seeded photo storage paths, or reference placeholder paths already in the bucket). Keep it rerunnable (idempotent upserts on stable ids), matching the existing seed style.

- [ ] **Step 1** Extend the seed with the entries/quantities/photos/planned-dates. Keep names Slovenian and realistic.
- [ ] **Step 2** Run `npm run seed`; confirm no errors and the project now has multi-day history.
- [ ] **Step 3** Re-run Task 3's verification script; confirm the dashboard data now shows a rising projection and a populated feed/gallery.
- [ ] **Step 4** Commit: `git commit -m "Enrich demo seed with multi-day history for the dashboard"`.

---

## Task 5: Dark theme foundation (scoped CSS)

**Files:**
- Modify: `app/globals.css`

**Interfaces:** Produces a `.epc-dark` scope with dark tokens and the dashboard component classes, ported from the mockup `<style>`. Every rule is nested under `.epc-dark` (or targets elements only rendered inside it) so the light crew view is untouched. Tokens: `--bg`, `--ink`, `--muted`, `--gold`, `--line`, `--surface`, `--ok`, glow values, matching the mockup.

- [ ] **Step 1** Append the `BELIN dark dashboard` block to `globals.css`, all selectors under `.epc-dark`. Port the mockup's classes (bar, alert, hero, ring, panel, scope, stats, live, feed, gallery, reveal, grain) verbatim in values, renamed/prefixed to avoid clashes with the light system (e.g., keep the mockup's own class names but scope them).
- [ ] **Step 2** Verify the crew screen still renders light and unbroken (dev preview `/sl` sub token): no visual change.
- [ ] **Step 3** Commit: `git commit -m "Add scoped dark dashboard design tokens and component styles"`.

---

## Task 6: Dashboard i18n keys

**Files:**
- Modify: `messages/sl.json`, `messages/de.json`, `messages/en.json`

**Interfaces:** Produces a `dashboard` namespace with every label the mockup shows: `overview`, `totalProgress`, `computedFrom` (ICU plural over reports and photos), `pathToCompletion`, `projectionCaption`, `plannedFinish`, `daysAheadOfDeadline`/`daysBehind`, `forYourPlanning`, `scopeByPhase`, `tempo`, `perDay`, `workingDays`, `latestOnSite`, `live`, `dailyLog`, `dayByDay`, `sitePhotos`, `requestsReview` (alert), `open` (alert action), `gatheringData` (projection fallback), status reuse from `status.*`, weather reuse from `weather.*`, plus units. Exact German and English translations included. No dashes.

- [ ] **Step 1** Add the `dashboard` namespace to all three files with translated values (sl authoritative, de and en carefully translated).
- [ ] **Step 2** Run `npm test -- messages` (parity test) -> PASS.
- [ ] **Step 3** Commit: `git commit -m "Add dashboard i18n keys in sl, de, en"`.

---

## Task 7: Dashboard shell, command bar, hero ring (FOUNDER CHECKPOINT)

**Files:**
- Create: `components/epc/EpcDashboard.tsx`, `components/epc/dashboard/CommandBar.tsx`, `AlertStrip.tsx`, `ProgressRing.tsx`, `Reveal.tsx`
- Modify: `app/[locale]/p/[token]/page.tsx`

**Interfaces:**
- Consumes: `getEpcDashboard(actor)`, the `.epc-dark` styles, `dashboard` i18n.
- Produces: `EpcDashboard({ token, data }: { token: string; data: EpcDashboardData })`. `ProgressRing({ percent, reportCount, photoCount })` client component with the count-up. `Reveal({ children })` client wrapper with the dependency-free scroll reveal + 5s safety net + `.js` gate, exactly as hardened in the mockup.

- [ ] **Step 1** Build `EpcDashboard` wrapping everything in `<div className="epc-dark">`, rendering the command bar (project name, status pill via existing `ProjectStatusControl`, updated-ago), the conditional `AlertStrip` (only when `data.needsReview`), and the hero (eyebrow, project headline, chips: tempo, planned finish, headcount) plus `ProgressRing` with real `progressPercent`. Port markup/classes from the mockup hero.
- [ ] **Step 2** Wire `page.tsx`: for `actor.role === 'epc'`, call `getEpcDashboard` and render `<EpcDashboard>`; keep the sub branch and dev swap bar. Delete `EpcHome.tsx` import.
- [ ] **Step 3** VERIFY in dev preview at 390px and 1280px, all three locales: dark hero renders, ring shows real percent, chips show real tempo/finish/headcount, status pill works, no horizontal overflow, no console errors.
- [ ] **Step 4** Commit: `git commit -m "Add dark dashboard shell, command bar, and hero ring"`.
- [ ] **Step 5** **STOP: push branch, share the Vercel preview URL, get founder sign-off on the real-data dark hero before continuing.**

---

## Task 8: Projection soft-line panel

**Files:** Create `components/epc/dashboard/ProjectionPanel.tsx`.
- [ ] Build the soft, smooth SVG line (actual solid + projection dashed to 100%, deadline marker when `plannedEnd` set, buffer band) from `data.projection` and the daily history. When `projection.projectedFinish` is null, show the `gatheringData` fallback. Port the mockup's `proj-svg` styling. Verify (render, both widths, 3 locales, no overflow). Commit.

## Task 9: Scope by phase

**Files:** Create `components/epc/dashboard/ScopeByPhase.tsx`.
- [ ] Render each `ScopeItemStatus` as a flat row (name, thin gold-on-dark bar at `installed/target`, `installedOfTarget`, percent), from `data.scope`. Port the mockup's `srow`. Verify + commit.

## Task 10: Stats row and latest-on-site

**Files:** Create `components/epc/dashboard/StatRow.tsx`, `LatestOnSite.tsx`.
- [ ] StatRow: working days (from projection, or hide when null), tempo, planned finish, photo count. LatestOnSite: `data.latest` (headcount, note, weather, thumbs) with the static "V zivo" indicator. Port mockup `stat`/`live-panel`. Verify + commit.

## Task 11: Daily log feed

**Files:** Create `components/epc/dashboard/DailyLogFeed.tsx`.
- [ ] Render `data.days` as day rows (date, headcount + qty summary, note, weather, thumbs). Port mockup `day`. Empty state when no entries. Verify + commit.

## Task 12: Photo gallery with lightbox

**Files:** Create `components/epc/dashboard/PhotoGallery.tsx` (client).
- [ ] Render `data.gallery` tiles; click opens a lightbox (reuse `.lightbox` from the light system or a scoped dark variant) with prev/next and caption. Port mockup `gal`. Verify open/close/next in preview via javascript probe. Commit.

## Task 13: Assemble, responsive pass, full verification

**Files:** Modify `components/epc/EpcDashboard.tsx` (compose Tasks 8-12 under `Reveal` wrappers in the mockup's order).
- [ ] Compose all segments in order with scroll-reveal on the below-hero ones. Full verification: 390px and 1280px, sl/de/en, no horizontal overflow anywhere, no console errors; screenshot-free checks per the constraint. Confirm the crew view is still light and unaffected.
- [ ] Update `CHANGELOG.md` (what/why) and add a session log under `docs/sessions/`.
- [ ] Commit: `git commit -m "Assemble dark EPC dashboard with responsive and i18n verification"`.
- [ ] **STOP: push branch, share preview, founder full review. On approval, merge to main (production deploy).**

---

## Deferred / explicitly out of scope (recorded)
- Live-sync (Supabase realtime crew->EPC): next chunk.
- Stueckliste material-check gate and its alert: later phase; the alert here is `status === 'reviewing'` only.
- Darkening the crew (sub) view for visual consistency: revisit after founder reacts to the dark EPC side.
- Requests flow, PDF export, weather off-day forecast overlay on the projection: later.

## Self-review notes
- Spec coverage: every mockup segment (bar, alert, hero+ring, projection, scope, stats, live, feed, gallery) maps to a task; data needs (history, rate, projection, gallery, activity, planned dates) map to Tasks 1-4; theme and i18n to Tasks 5-6.
- Types: `EpcDashboardData` (Task 3) is the single prop contract consumed by all UI tasks; `Projection` (Task 2) is consumed by Tasks 3, 8, 10. Names are consistent across tasks.
- No placeholders: pure-logic and migration carry full code; UI tasks carry the exact mockup source, prop contract, and verification, which is the appropriate altitude since the visual is already designed and approved.
