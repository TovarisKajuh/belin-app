# Phase 1a Implementation Plan: Crew Daily Report Flow (Tagesbericht)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A crew member opens the sub token link on a phone and posts a daily report in under 30 seconds: photos, headcount, today's installed quantities per scope item, a short note, weather filled in automatically, submit. The report saves to the real Frankfurt database and storage, and the project progress recomputes and climbs on screen.

**Architecture:** The existing `/p/[token]` page becomes a role router. The sub role renders a new mobile-first crew home (server component) that embeds a client report form. Photos are downscaled in the browser and uploaded directly to the private `photos` storage bucket using short-lived signed upload URLs minted server-side (the service role key never reaches the browser). Submission goes through a server action that re-resolves the actor from the token, authorizes the sub role, writes the entry, quantities, photos and an activity row, and fetches a weather snapshot. Progress reuses the existing weighted `projectProgress` computation. The epc role keeps the phase 0 summary untouched until phase 1b builds the dashboard.

**Tech Stack:** Next.js App Router (server components + server actions), `@supabase/supabase-js` (service-role client server-side, publishable-key client browser-side for signed-URL uploads only), next-intl (sl, de, en), Open-Meteo (no key), vitest for pure logic, the in-app preview browser for UI verification on a phone viewport.

## Global Constraints

- UI in Slovenian, German and English, every string through a next-intl key; the parity test in `tests/messages-parity.test.ts` must stay green (identical key sets, no empty strings across sl, de, en).
- Never use em dashes or en dashes in any produced text (UI copy, comments, commit messages). Use commas, colons, periods.
- Every crew action must be completable in under 30 seconds, one-handed, on a phone. Large touch targets, high contrast, readable in sunlight. When in doubt, remove a field.
- No quick hacks in foundation code (schema, access layer, i18n, design tokens). Any knowingly taken shortcut is logged in CHANGELOG.md the moment it is taken.
- All database access goes through the actor abstraction: resolve the actor from the token server-side, authorize the role, then act. The browser never holds the service role key.
- Log every change in CHANGELOG.md (date, what, why) in the same commit. Crew-facing screens are verified on a real phone viewport as part of their definition of done.
- The design builds on the ported AVE-DC token set in `app/globals.css`. New crew utilities are appended below the ported block, each marked `/* BELIN */`. Existing tokens are not redesigned.

## Existing building blocks this plan reuses

- `lib/actor.ts`: `resolveActorFromToken(token) -> Promise<TokenActor | null>` where `TokenActor = { kind: "token"; role: "epc" | "sub"; projectId: string; orgId: string; tokenId: string }`.
- `lib/supabase/admin.ts`: `createAdminClient()` (server-only, service role).
- `lib/progress.ts`: `projectProgress(items: { targetQty; weight; installedQty }[]) -> number`.
- `lib/data/projects.ts`: `getProjectSummary(actor) -> Promise<ProjectSummary | null>` (used by the epc branch, unchanged).
- `app/[locale]/p/[token]/page.tsx`: the current token page (epc-style summary), to be turned into the role router.
- Seed tokens: sub `demo-sub-r8p3n6w1`, epc `demo-epc-k7m2x9q4`, project "PSE Trgovski center Kranj" with three scope items (Podkonstrukcija 546 kos weight 2, Moduli 546 kos weight 4, DC kabliranje 1200 m weight 1), lat 46.2455 lng 14.3555.

## File structure after this plan

```
belin-app/
  app/[locale]/p/[token]/
    page.tsx                 MODIFY: role router (sub -> CrewHome, epc -> existing summary)
    actions.ts               NEW: server actions (requestPhotoTargets, submitReport)
  components/crew/
    CrewHome.tsx             NEW: server component, project header + progress + today's posts + form
    CrewReportForm.tsx       NEW: client component, the report form, calls server actions
    PhotoCapture.tsx         NEW: client component, camera input + in-browser downscale + preview
    Stepper.tsx              NEW: client component, large plus/minus numeric stepper
  lib/
    supabase/client.ts       NEW: browser publishable-key client (signed-URL uploads only)
    storage.ts               NEW: server signed upload/download URL helpers
    weather.ts               NEW: server Open-Meteo snapshot fetch
    weather-codes.ts         NEW: pure weather-code to label-key mapping
    data/reports.ts          NEW: getCrewHome, submitDailyReport
  tests/
    weather-codes.test.ts    NEW
    report-summary.test.ts   NEW (pure aggregation helper)
  messages/sl.json de.json en.json   MODIFY: crew + weather keys
  app/globals.css            MODIFY: append BELIN mobile utilities
```

## Data shapes (decided before code)

```ts
// lib/data/reports.ts
export interface CrewScopeStatus {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  installedQty: number;   // cumulative across all entries
}
export interface TodayPost {
  id: string;
  note: string | null;
  headcount: number | null;
  photoCount: number;
  quantities: { name: string; qty: number; unit: string }[];
  createdAt: string;
}
export interface CrewHomeData {
  projectId: string;
  projectName: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  progressPercent: number;
  scope: CrewScopeStatus[];
  todayDate: string;      // yyyy-mm-dd (project local, computed server-side)
  todayPosts: TodayPost[];
}
export interface SubmitReportPayload {
  clientGeneratedId: string;   // uuid, one per form open, idempotency + photo folder
  entryDate: string;           // yyyy-mm-dd
  note: string;
  headcount: number;
  quantities: { scopeItemId: string; qty: number }[];   // qty >= 0, zeros dropped before insert
  photoPaths: string[];        // storage paths already uploaded by the client
}
```

```ts
// lib/storage.ts
export interface UploadTarget { path: string; token: string; }   // token is the signed-upload token
// lib/weather.ts
export interface WeatherSnapshot { tempC: number | null; code: number | null; capturedAt: string; }
```

---

### Task 1: Foundation - browser client, mobile CSS, i18n keys

**Files:**
- Create: `lib/supabase/client.ts`
- Modify: `app/globals.css` (append BELIN block)
- Modify: `messages/sl.json`, `messages/de.json`, `messages/en.json`

**Interfaces:**
- Produces: `createBrowserClient()` returning a supabase-js client built on the publishable key, used only for `storage.uploadToSignedUrl`. New i18n keys under `crew.*` and `weather.*`. New CSS utility classes `b-*`.

- [ ] **Step 1: Create the browser supabase client**

`lib/supabase/client.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Browser client on the publishable key. RLS is deny-all for this key, so it
// cannot read or write tables. Its only job is storage.uploadToSignedUrl,
// which is authorized by a per-file signed token minted on the server, not by RLS.
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public environment variables are missing.");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 2: Append the BELIN mobile utilities to globals.css**

At the end of `app/globals.css`, append:

```css
/* BELIN mobile crew utilities. Appended below the ported AVE-DC block. */
.b-screen { max-width: 640px; margin: 0 auto; padding: 20px 16px 120px; }
.b-h { font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
.b-sub { color: var(--muted); font-size: 14px; }
.b-card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 18px; margin-bottom: 16px; box-shadow: 0 10px 30px -18px rgba(10,22,40,0.18); }
.b-label { display: block; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 8px; }
.b-field { width: 100%; font: inherit; font-size: 16px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); }
.b-field:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.b-stepper { display: flex; align-items: center; gap: 12px; }
.b-step-btn { width: 52px; height: 52px; border-radius: 14px; border: 1px solid var(--line); background: #fff; font-size: 26px; font-weight: 700; color: var(--ink); display: flex; align-items: center; justify-content: center; user-select: none; touch-action: manipulation; }
.b-step-btn:active { background: var(--bg); }
.b-step-val { min-width: 64px; text-align: center; font-variant-numeric: tabular-nums; font-weight: 800; font-size: 24px; color: var(--ink); }
.b-scope-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.b-scope-row:first-child { border-top: none; }
.b-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.b-photo { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--bg); }
.b-photo img { width: 100%; height: 100%; object-fit: cover; }
.b-photo-add { display: flex; align-items: center; justify-content: center; aspect-ratio: 1; border: 2px dashed var(--line); border-radius: 12px; color: var(--muted); font-size: 30px; background: #fff; }
.b-submit-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-top: 1px solid var(--line); }
.b-btn { width: 100%; font: inherit; font-size: 17px; font-weight: 800; padding: 16px; border-radius: 16px; border: none; background: var(--accent); color: #fff; touch-action: manipulation; }
.b-btn:disabled { opacity: 0.55; }
.b-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; background: var(--accent-soft); color: var(--accent-deep); font-weight: 700; font-size: 13px; }
.b-progress-num { font-weight: 800; font-size: 44px; letter-spacing: -0.02em; color: var(--ink); font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Add crew and weather keys to all three catalogs**

Add this `crew` and `weather` block into each of `messages/sl.json`, `messages/de.json`, `messages/en.json`, at the top level (sibling of `common`, `home`, `project`). Keep the existing content.

`messages/sl.json` additions:

```json
  "crew": {
    "todayReport": "Današnje poročilo",
    "progress": "Napredek projekta",
    "photos": "Fotografije",
    "addPhoto": "Dodaj",
    "headcount": "Število delavcev",
    "quantitiesToday": "Danes vgrajeno",
    "note": "Opomba",
    "notePlaceholder": "Kratka opomba (neobvezno)",
    "submit": "Pošlji poročilo",
    "submitting": "Pošiljam...",
    "submitted": "Poročilo poslano",
    "todayPosts": "Današnji vnosi",
    "noPostsYet": "Danes še ni vnosov.",
    "postSummary": "{headcount} delavcev, {photos} fotografij",
    "weatherLabel": "Vreme",
    "installedOfTarget": "{installed} od {target} {unit}"
  },
  "weather": {
    "unknown": "Ni podatka",
    "clear": "Jasno",
    "partly": "Delno oblačno",
    "fog": "Megla",
    "rain": "Dež",
    "snow": "Sneg",
    "storm": "Nevihta"
  }
```

`messages/de.json` additions:

```json
  "crew": {
    "todayReport": "Tagesbericht",
    "progress": "Projektfortschritt",
    "photos": "Fotos",
    "addPhoto": "Hinzufügen",
    "headcount": "Anzahl Mitarbeiter",
    "quantitiesToday": "Heute montiert",
    "note": "Notiz",
    "notePlaceholder": "Kurze Notiz (optional)",
    "submit": "Bericht senden",
    "submitting": "Senden...",
    "submitted": "Bericht gesendet",
    "todayPosts": "Heutige Einträge",
    "noPostsYet": "Heute noch keine Einträge.",
    "postSummary": "{headcount} Mitarbeiter, {photos} Fotos",
    "weatherLabel": "Wetter",
    "installedOfTarget": "{installed} von {target} {unit}"
  },
  "weather": {
    "unknown": "Keine Angabe",
    "clear": "Klar",
    "partly": "Teils bewölkt",
    "fog": "Nebel",
    "rain": "Regen",
    "snow": "Schnee",
    "storm": "Gewitter"
  }
```

`messages/en.json` additions:

```json
  "crew": {
    "todayReport": "Today's report",
    "progress": "Project progress",
    "photos": "Photos",
    "addPhoto": "Add",
    "headcount": "Crew size",
    "quantitiesToday": "Installed today",
    "note": "Note",
    "notePlaceholder": "Short note (optional)",
    "submit": "Send report",
    "submitting": "Sending...",
    "submitted": "Report sent",
    "todayPosts": "Today's entries",
    "noPostsYet": "No entries yet today.",
    "postSummary": "{headcount} crew, {photos} photos",
    "weatherLabel": "Weather",
    "installedOfTarget": "{installed} of {target} {unit}"
  },
  "weather": {
    "unknown": "No data",
    "clear": "Clear",
    "partly": "Partly cloudy",
    "fog": "Fog",
    "rain": "Rain",
    "snow": "Snow",
    "storm": "Storm"
  }
```

- [ ] **Step 4: Run the parity test and type check**

Run: `npm test -- report` is not applicable yet; run the full suite and lint.
Run: `npm test` then `npm run lint`
Expected: parity test passes (all three catalogs still have identical key sets, no empty strings), type check clean.

- [ ] **Step 5: Commit**

Append to CHANGELOG.md under the current date heading:

```markdown
- Phase 1a foundation: browser supabase client (signed-URL uploads only), BELIN mobile CSS utilities, and crew plus weather i18n keys in all three languages. Why: shared groundwork for the crew daily report screen.
```

```bash
git add lib/supabase/client.ts app/globals.css messages CHANGELOG.md
git commit -m "Add crew flow foundation: browser client, mobile CSS, i18n keys"
```

---

### Task 2: Weather snapshot and code mapping

**Files:**
- Create: `tests/weather-codes.test.ts`
- Create: `lib/weather-codes.ts`
- Create: `lib/weather.ts`

**Interfaces:**
- Produces: `weatherCodeToKey(code: number | null) -> string` (returns a key under `weather.*`), and `fetchWeatherSnapshot(lat: number | null, lng: number | null) -> Promise<WeatherSnapshot | null>`.

- [ ] **Step 1: Write the failing test for the code mapping**

`tests/weather-codes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { weatherCodeToKey } from "@/lib/weather-codes";

describe("weatherCodeToKey", () => {
  it("maps null to unknown", () => {
    expect(weatherCodeToKey(null)).toBe("unknown");
  });
  it("maps clear and mainly clear", () => {
    expect(weatherCodeToKey(0)).toBe("clear");
    expect(weatherCodeToKey(1)).toBe("partly");
    expect(weatherCodeToKey(3)).toBe("partly");
  });
  it("maps fog, rain, snow, storm bands", () => {
    expect(weatherCodeToKey(45)).toBe("fog");
    expect(weatherCodeToKey(63)).toBe("rain");
    expect(weatherCodeToKey(75)).toBe("snow");
    expect(weatherCodeToKey(82)).toBe("rain");
    expect(weatherCodeToKey(86)).toBe("snow");
    expect(weatherCodeToKey(95)).toBe("storm");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- weather-codes`
Expected: FAIL, cannot resolve `@/lib/weather-codes`.

- [ ] **Step 3: Implement the mapping**

`lib/weather-codes.ts`:

```ts
// WMO weather codes (Open-Meteo) collapsed into the six labels the crew sees.
// Kept pure and framework-free so it is unit tested and reused on server and client.
export function weatherCodeToKey(code: number | null): string {
  if (code === null || code === undefined) return "unknown";
  if (code === 0) return "clear";
  if (code <= 3) return "partly";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "storm";
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -- weather-codes`
Expected: PASS.

- [ ] **Step 5: Implement the Open-Meteo fetch**

`lib/weather.ts`:

```ts
import "server-only";

export interface WeatherSnapshot {
  tempC: number | null;
  code: number | null;
  capturedAt: string;
}

// Best-effort weather at submit time. Never throws: on any failure the report
// still saves with a null snapshot. Open-Meteo needs no API key.
export async function fetchWeatherSnapshot(
  lat: number | null,
  lng: number | null
): Promise<WeatherSnapshot | null> {
  if (lat === null || lng === null) return null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    return {
      tempC: json.current?.temperature_2m ?? null,
      code: json.current?.weather_code ?? null,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Commit**

Append to CHANGELOG.md:

```markdown
- Added weather snapshot fetch (Open-Meteo, no key, never throws) and the pure WMO-code to label mapping with tests. Why: the crew report auto-fills weather from the site location.
```

```bash
git add tests/weather-codes.test.ts lib/weather-codes.ts lib/weather.ts CHANGELOG.md
git commit -m "Add weather snapshot fetch and tested code mapping"
```

---

### Task 3: Storage signed-URL helpers

**Files:**
- Create: `lib/storage.ts`

**Interfaces:**
- Consumes: `createAdminClient()` from `lib/supabase/admin.ts`.
- Produces: `createPhotoUploadTargets(projectId, entryClientId, count) -> Promise<UploadTarget[]>` and `getSignedPhotoUrls(paths: string[], expiresIn?) -> Promise<string[]>`.

- [ ] **Step 1: Implement the storage helpers**

`lib/storage.ts`:

```ts
import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UploadTarget {
  path: string;
  token: string;
}

// Mint one signed upload URL per photo. The client uploads directly to the
// private bucket with the returned token, so the service role key stays on
// the server. Paths are namespaced by project and by the client entry id.
export async function createPhotoUploadTargets(
  projectId: string,
  entryClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const db = createAdminClient();
  const targets: UploadTarget[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${projectId}/${entryClientId}/${i}-${randomUUID()}.jpg`;
    const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
    if (error || !data) throw new Error("Could not create upload URL");
    targets.push({ path: data.path, token: data.token });
  }
  return targets;
}

// Short-lived signed download URLs for private photos, for display.
export async function getSignedPhotoUrls(
  paths: string[],
  expiresIn = 3600
): Promise<string[]> {
  if (paths.length === 0) return [];
  const db = createAdminClient();
  const { data, error } = await db.storage.from("photos").createSignedUrls(paths, expiresIn);
  if (error || !data) return [];
  return data.map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
}
```

- [ ] **Step 2: Type check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Added storage helpers: server-minted signed upload URLs (client uploads photos directly to the private bucket) and signed download URLs for display. Why: keep the service role key server-side while photos flow through storage.
```

```bash
git add lib/storage.ts CHANGELOG.md
git commit -m "Add signed-URL storage helpers for private photos"
```

---

### Task 4: Reports data layer

**Files:**
- Create: `tests/report-summary.test.ts`
- Create: `lib/data/reports.ts`

**Interfaces:**
- Consumes: `createAdminClient()`, `Actor` from `lib/actor.ts`, `projectProgress` from `lib/progress.ts`, `fetchWeatherSnapshot` from `lib/weather.ts`.
- Produces: pure helper `summarizeTodayPosts(entries, quantitiesByEntry, photoCountByEntry, scopeNameById) -> TodayPost[]`; `getCrewHome(actor) -> Promise<CrewHomeData | null>`; `submitDailyReport(actor, payload) -> Promise<string>` (returns entry id).

- [ ] **Step 1: Write the failing test for the pure summary helper**

`tests/report-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeTodayPosts } from "@/lib/data/reports";

describe("summarizeTodayPosts", () => {
  it("shapes entries with their quantities and photo counts", () => {
    const posts = summarizeTodayPosts(
      [{ id: "e1", note: "Sued", headcount: 4, created_at: "2026-07-17T09:00:00Z" }],
      { e1: [{ scope_item_id: "s1", qty: 100 }] },
      { e1: 3 },
      { s1: { name: "Moduli", unit: "kos" } }
    );
    expect(posts).toEqual([
      {
        id: "e1",
        note: "Sued",
        headcount: 4,
        photoCount: 3,
        quantities: [{ name: "Moduli", qty: 100, unit: "kos" }],
        createdAt: "2026-07-17T09:00:00Z",
      },
    ]);
  });

  it("defaults missing photo counts and quantities to empty", () => {
    const posts = summarizeTodayPosts(
      [{ id: "e2", note: null, headcount: null, created_at: "2026-07-17T10:00:00Z" }],
      {},
      {},
      {}
    );
    expect(posts[0].photoCount).toBe(0);
    expect(posts[0].quantities).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- report-summary`
Expected: FAIL, cannot resolve `@/lib/data/reports`.

- [ ] **Step 3: Implement the data layer**

`lib/data/reports.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { projectProgress } from "@/lib/progress";
import { fetchWeatherSnapshot } from "@/lib/weather";

export interface CrewScopeStatus {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  installedQty: number;
}
export interface TodayPost {
  id: string;
  note: string | null;
  headcount: number | null;
  photoCount: number;
  quantities: { name: string; qty: number; unit: string }[];
  createdAt: string;
}
export interface CrewHomeData {
  projectId: string;
  projectName: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  progressPercent: number;
  scope: CrewScopeStatus[];
  todayDate: string;
  todayPosts: TodayPost[];
}
export interface SubmitReportPayload {
  clientGeneratedId: string;
  entryDate: string;
  note: string;
  headcount: number;
  quantities: { scopeItemId: string; qty: number }[];
  photoPaths: string[];
}

interface EntryRow {
  id: string;
  note: string | null;
  headcount: number | null;
  created_at: string;
}

// Pure shaping, unit tested. Keeps getCrewHome's query glue separate from logic.
export function summarizeTodayPosts(
  entries: EntryRow[],
  quantitiesByEntry: Record<string, { scope_item_id: string; qty: number }[]>,
  photoCountByEntry: Record<string, number>,
  scopeById: Record<string, { name: string; unit: string }>
): TodayPost[] {
  return entries.map((e) => ({
    id: e.id,
    note: e.note,
    headcount: e.headcount,
    photoCount: photoCountByEntry[e.id] ?? 0,
    quantities: (quantitiesByEntry[e.id] ?? []).map((q) => ({
      name: scopeById[q.scope_item_id]?.name ?? "",
      unit: scopeById[q.scope_item_id]?.unit ?? "",
      qty: Number(q.qty),
    })),
    createdAt: e.created_at,
  }));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getCrewHome(actor: Actor): Promise<CrewHomeData | null> {
  const db = createAdminClient();
  const today = todayIso();

  const [projectRes, scopeRes, qtyRes, todayEntriesRes] = await Promise.all([
    db
      .from("projects")
      .select("id, name, address_street, address_zip, address_city")
      .eq("id", actor.projectId)
      .maybeSingle(),
    db
      .from("scope_items")
      .select("id, name, unit, target_qty, weight, sort_order")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
    db
      .from("entry_quantities")
      .select("scope_item_id, qty, daily_entries!inner (project_id)")
      .eq("daily_entries.project_id", actor.projectId),
    db
      .from("daily_entries")
      .select("id, note, headcount, created_at")
      .eq("project_id", actor.projectId)
      .eq("entry_date", today)
      .order("created_at", { ascending: false }),
  ]);

  if (projectRes.error || !projectRes.data) return null;
  if (scopeRes.error || qtyRes.error || todayEntriesRes.error) return null;

  const installedByItem = new Map<string, number>();
  for (const row of qtyRes.data) {
    installedByItem.set(
      row.scope_item_id,
      (installedByItem.get(row.scope_item_id) ?? 0) + Number(row.qty)
    );
  }

  const scope: CrewScopeStatus[] = scopeRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    targetQty: Number(s.target_qty),
    installedQty: installedByItem.get(s.id) ?? 0,
  }));

  const progressPercent = projectProgress(
    scopeRes.data.map((s) => ({
      targetQty: Number(s.target_qty),
      weight: Number(s.weight),
      installedQty: installedByItem.get(s.id) ?? 0,
    }))
  );

  // Per-entry quantities and photo counts for today's posts only.
  const todayEntryIds = todayEntriesRes.data.map((e) => e.id);
  const scopeById: Record<string, { name: string; unit: string }> = {};
  for (const s of scopeRes.data) scopeById[s.id] = { name: s.name, unit: s.unit };

  const quantitiesByEntry: Record<string, { scope_item_id: string; qty: number }[]> = {};
  const photoCountByEntry: Record<string, number> = {};
  if (todayEntryIds.length > 0) {
    const [eqRes, epRes] = await Promise.all([
      db.from("entry_quantities").select("entry_id, scope_item_id, qty").in("entry_id", todayEntryIds),
      db.from("entry_photos").select("entry_id").in("entry_id", todayEntryIds),
    ]);
    for (const row of eqRes.data ?? []) {
      (quantitiesByEntry[row.entry_id] ??= []).push({
        scope_item_id: row.scope_item_id,
        qty: Number(row.qty),
      });
    }
    for (const row of epRes.data ?? []) {
      photoCountByEntry[row.entry_id] = (photoCountByEntry[row.entry_id] ?? 0) + 1;
    }
  }

  const todayPosts = summarizeTodayPosts(
    todayEntriesRes.data,
    quantitiesByEntry,
    photoCountByEntry,
    scopeById
  );

  return {
    projectId: projectRes.data.id,
    projectName: projectRes.data.name,
    addressStreet: projectRes.data.address_street,
    addressZip: projectRes.data.address_zip,
    addressCity: projectRes.data.address_city,
    progressPercent,
    scope,
    todayDate: today,
    todayPosts,
  };
}

export async function submitDailyReport(actor: Actor, payload: SubmitReportPayload): Promise<string> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("lat, lng")
    .eq("id", actor.projectId)
    .maybeSingle();
  const weather = await fetchWeatherSnapshot(project?.lat ?? null, project?.lng ?? null);

  // Idempotent on client_generated_id: a retried submit returns the same row.
  const { data: entry, error: entryErr } = await db
    .from("daily_entries")
    .upsert(
      {
        project_id: actor.projectId,
        entry_date: payload.entryDate,
        note: payload.note.trim() === "" ? null : payload.note.trim(),
        headcount: payload.headcount,
        weather: weather as unknown as Record<string, unknown> | null,
        client_generated_id: payload.clientGeneratedId,
      },
      { onConflict: "client_generated_id" }
    )
    .select("id")
    .single();
  if (entryErr || !entry) throw new Error("Could not save the report");

  const nonZero = payload.quantities.filter((q) => q.qty > 0);
  if (nonZero.length > 0) {
    const { error } = await db.from("entry_quantities").upsert(
      nonZero.map((q) => ({ entry_id: entry.id, scope_item_id: q.scopeItemId, qty: q.qty })),
      { onConflict: "entry_id,scope_item_id" }
    );
    if (error) throw new Error("Could not save quantities");
  }

  if (payload.photoPaths.length > 0) {
    const { error } = await db.from("entry_photos").insert(
      payload.photoPaths.map((p, i) => ({ entry_id: entry.id, storage_path: p, sort_order: i }))
    );
    if (error) throw new Error("Could not save photos");
  }

  await db.from("activity").insert({
    project_id: actor.projectId,
    kind: "entry_submitted",
    payload: { headcount: payload.headcount, photos: payload.photoPaths.length },
  });

  return entry.id;
}
```

- [ ] **Step 4: Run the test, verify it passes, and lint**

Run: `npm test -- report-summary` then `npm run lint`
Expected: PASS and clean.

- [ ] **Step 5: Commit**

Append to CHANGELOG.md:

```markdown
- Added the reports data layer: getCrewHome (project header, cumulative scope status, computed progress, today's posts) and submitDailyReport (idempotent entry plus quantities, photos, weather snapshot, activity row), with the pure post-summary helper unit tested. Why: the crew screen reads and writes through one actor-scoped module.
```

```bash
git add tests/report-summary.test.ts lib/data/reports.ts CHANGELOG.md
git commit -m "Add crew reports data layer with tested summary helper"
```

---

### Task 5: Server actions

**Files:**
- Create: `app/[locale]/p/[token]/actions.ts`

**Interfaces:**
- Consumes: `resolveActorFromToken`, `createPhotoUploadTargets`, `submitDailyReport`, `SubmitReportPayload`.
- Produces: `requestPhotoTargets(token, entryClientId, count) -> Promise<UploadTarget[]>` and `submitReport(token, payload) -> Promise<{ ok: true; entryId: string }>`. Both authorize the sub role or throw.

- [ ] **Step 1: Implement the actions**

`app/[locale]/p/[token]/actions.ts`:

```ts
"use server";
import { resolveActorFromToken } from "@/lib/actor";
import { createPhotoUploadTargets, type UploadTarget } from "@/lib/storage";
import { submitDailyReport, type SubmitReportPayload } from "@/lib/data/reports";

async function requireSubActor(token: string) {
  const actor = await resolveActorFromToken(token);
  if (!actor || actor.role !== "sub") throw new Error("Not authorized for this project.");
  return actor;
}

export async function requestPhotoTargets(
  token: string,
  entryClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const actor = await requireSubActor(token);
  const safeCount = Math.max(0, Math.min(count, 12));
  return createPhotoUploadTargets(actor.projectId, entryClientId, safeCount);
}

export async function submitReport(
  token: string,
  payload: SubmitReportPayload
): Promise<{ ok: true; entryId: string }> {
  const actor = await requireSubActor(token);
  const entryId = await submitDailyReport(actor, payload);
  return { ok: true, entryId };
}
```

- [ ] **Step 2: Type check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Added crew server actions requestPhotoTargets and submitReport, each re-resolving the actor from the token and requiring the sub role before acting. Why: the browser calls these; authorization lives server-side in the actor layer, never in the client.
```

```bash
git add "app/[locale]/p/[token]/actions.ts" CHANGELOG.md
git commit -m "Add crew server actions with sub-role authorization"
```

---

### Task 6: Stepper client component

**Files:**
- Create: `components/crew/Stepper.tsx`

**Interfaces:**
- Produces: `<Stepper value number, onChange (n:number)=>void, min?, max?, step?, ariaLabel? />`. Large plus/minus buttons, tabular value, clamps to min/max.

- [ ] **Step 1: Implement the stepper**

`components/crew/Stepper.tsx`:

```tsx
"use client";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="b-stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="b-step-btn" onClick={() => onChange(clamp(value - step))} aria-label="minus">
        &minus;
      </button>
      <span className="b-step-val" aria-live="polite">{value}</span>
      <button type="button" className="b-step-btn" onClick={() => onChange(clamp(value + step))} aria-label="plus">
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Added the Stepper client component (large plus/minus touch targets, clamped). Why: headcount and per-item quantities are entered by thumb, not keyboard, on a roof.
```

```bash
git add components/crew/Stepper.tsx CHANGELOG.md
git commit -m "Add large-touch Stepper component"
```

---

### Task 7: Photo capture with in-browser downscale

**Files:**
- Create: `components/crew/PhotoCapture.tsx`

**Interfaces:**
- Produces: `<PhotoCapture blobs: Blob[], onChange (blobs: Blob[])=>void, addLabel: string />`. Uses a camera-capable file input, downscales each picked image to max 1600px JPEG at ~0.8 quality, keeps preview URLs, allows removing a photo, caps at 12.

- [ ] **Step 1: Implement the photo capture component**

`components/crew/PhotoCapture.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 12;
const MAX_DIM = 1600;
const QUALITY = 0.8;

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", QUALITY);
  });
}

export function PhotoCapture({
  blobs,
  onChange,
  addLabel,
}: {
  blobs: Blob[];
  onChange: (blobs: Blob[]) => void;
  addLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - blobs.length;
    const scaled = await Promise.all(files.slice(0, room).map(downscale));
    onChange([...blobs, ...scaled]);
  }

  function removeAt(i: number) {
    onChange(blobs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="b-photos">
      {previews.map((src, i) => (
        <div key={src} className="b-photo" onClick={() => removeAt(i)}>
          <img src={src} alt="" />
        </div>
      ))}
      {blobs.length < MAX_PHOTOS && (
        <button type="button" className="b-photo-add" onClick={() => inputRef.current?.click()} aria-label={addLabel}>
          +
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={onPick}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Added PhotoCapture: camera input, in-browser downscale to 1600px JPEG (weak-LTE friendly), previews, tap to remove, capped at 12. Why: crews shoot progress photos; downscaling keeps uploads fast and storage small.
```

```bash
git add components/crew/PhotoCapture.tsx CHANGELOG.md
git commit -m "Add PhotoCapture with in-browser downscale"
```

---

### Task 8: Crew report form (client)

**Files:**
- Create: `components/crew/CrewReportForm.tsx`

**Interfaces:**
- Consumes: `Stepper`, `PhotoCapture`, `requestPhotoTargets`, `submitReport`, `createBrowserClient`, `CrewScopeStatus`.
- Produces: `<CrewReportForm token, entryDate, scope: CrewScopeStatus[] />`. Manages headcount, per-item quantities, note, photos; on submit uploads photos to storage then calls submitReport; on success resets and calls router.refresh().

- [ ] **Step 1: Implement the form**

`components/crew/CrewReportForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Stepper } from "./Stepper";
import { PhotoCapture } from "./PhotoCapture";
import { createBrowserClient } from "@/lib/supabase/client";
import { requestPhotoTargets, submitReport } from "@/app/[locale]/p/[token]/actions";
import type { CrewScopeStatus } from "@/lib/data/reports";

export function CrewReportForm({
  token,
  entryDate,
  scope,
}: {
  token: string;
  entryDate: string;
  scope: CrewScopeStatus[];
}) {
  const t = useTranslations("crew");
  const router = useRouter();
  const [headcount, setHeadcount] = useState(1);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    try {
      const clientGeneratedId = crypto.randomUUID();
      let photoPaths: string[] = [];
      if (blobs.length > 0) {
        const targets = await requestPhotoTargets(token, clientGeneratedId, blobs.length);
        const supabase = createBrowserClient();
        await Promise.all(
          targets.map((tg, i) =>
            supabase.storage.from("photos").uploadToSignedUrl(tg.path, tg.token, blobs[i], {
              contentType: "image/jpeg",
            })
          )
        );
        photoPaths = targets.map((tg) => tg.path);
      }
      await submitReport(token, {
        clientGeneratedId,
        entryDate,
        note,
        headcount,
        quantities: scope.map((s) => ({ scopeItemId: s.id, qty: qty[s.id] ?? 0 })),
        photoPaths,
      });
      setDone(true);
      setBlobs([]);
      setNote("");
      setQty({});
      setHeadcount(1);
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="b-card">
        <span className="b-label">{t("photos")}</span>
        <PhotoCapture blobs={blobs} onChange={setBlobs} addLabel={t("addPhoto")} />
      </div>

      <div className="b-card">
        <span className="b-label">{t("headcount")}</span>
        <Stepper value={headcount} onChange={setHeadcount} min={0} max={99} ariaLabel={t("headcount")} />
      </div>

      <div className="b-card">
        <span className="b-label">{t("quantitiesToday")}</span>
        {scope.map((s) => (
          <div key={s.id} className="b-scope-row">
            <div>
              <div className="b-h" style={{ fontSize: 16 }}>{s.name}</div>
              <div className="b-sub">
                {t("installedOfTarget", { installed: s.installedQty, target: s.targetQty, unit: s.unit })}
              </div>
            </div>
            <Stepper
              value={qty[s.id] ?? 0}
              onChange={(n) => setQty((prev) => ({ ...prev, [s.id]: n }))}
              min={0}
              max={s.targetQty}
              step={10}
              ariaLabel={s.name}
            />
          </div>
        ))}
      </div>

      <div className="b-card">
        <span className="b-label">{t("note")}</span>
        <textarea
          className="b-field"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
        />
      </div>

      <div className="b-submit-bar">
        <button className="b-btn" onClick={onSubmit} disabled={busy}>
          {done ? t("submitted") : busy ? t("submitting") : t("submit")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Added CrewReportForm: photos, headcount, per-item quantity steppers, note, and a sticky submit that uploads photos to storage then writes the report, refreshing the screen on success. Why: this is the core sub action, built for one-handed use under 30 seconds.
```

```bash
git add components/crew/CrewReportForm.tsx CHANGELOG.md
git commit -m "Add crew report form wiring photos, quantities and submit"
```

---

### Task 9: Crew home and role router

**Files:**
- Create: `components/crew/CrewHome.tsx`
- Modify: `app/[locale]/p/[token]/page.tsx`

**Interfaces:**
- Consumes: `getCrewHome`, `CrewHomeData`, `CrewReportForm`, `resolveActorFromToken`, `getProjectSummary` (existing epc branch).
- Produces: `<CrewHome token, data: CrewHomeData />`. The page routes sub actors to CrewHome and keeps the existing summary for epc actors.

- [ ] **Step 1: Implement CrewHome**

`components/crew/CrewHome.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import type { CrewHomeData } from "@/lib/data/reports";

export async function CrewHome({ token, data }: { token: string; data: CrewHomeData }) {
  const t = await getTranslations("crew");
  const address = [data.addressStreet, [data.addressZip, data.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="b-screen">
      <h1 className="b-h" style={{ fontSize: 24 }}>{data.projectName}</h1>
      {address && <p className="b-sub" style={{ marginTop: 4 }}>{address}</p>}

      <div className="b-card" style={{ marginTop: 16 }}>
        <span className="b-label">{t("progress")}</span>
        <div className="b-progress-num">
          {data.progressPercent}
          <span style={{ fontSize: 22, color: "var(--muted)" }}> %</span>
        </div>
      </div>

      <h2 className="b-h" style={{ fontSize: 18, marginTop: 8, marginBottom: 8 }}>{t("todayReport")}</h2>
      <CrewReportForm token={token} entryDate={data.todayDate} scope={data.scope} />

      <div className="b-card">
        <span className="b-label">{t("todayPosts")}</span>
        {data.todayPosts.length === 0 ? (
          <p className="b-sub">{t("noPostsYet")}</p>
        ) : (
          data.todayPosts.map((post) => (
            <div key={post.id} className="b-scope-row" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="b-h" style={{ fontSize: 15 }}>
                  {t("postSummary", { headcount: post.headcount ?? 0, photos: post.photoCount })}
                </div>
                {post.quantities.map((q, i) => (
                  <div key={i} className="b-sub">{q.name}: {q.qty} {q.unit}</div>
                ))}
                {post.note && <div className="b-sub" style={{ marginTop: 4 }}>{post.note}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Turn the page into a role router**

Replace the body of `app/[locale]/p/[token]/page.tsx` with:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getProjectSummary } from "@/lib/data/projects";
import { getCrewHome } from "@/lib/data/reports";
import { CrewHome } from "@/components/crew/CrewHome";

export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  if (actor.role === "sub") {
    const data = await getCrewHome(actor);
    if (!data) notFound();
    return <CrewHome token={token} data={data} />;
  }

  // epc: phase 0 summary, replaced by the dashboard in phase 1b.
  const t = await getTranslations("project");
  const project = await getProjectSummary(actor);
  if (!project) notFound();
  const address = [project.addressStreet, `${project.addressZip ?? ""} ${project.addressCity ?? ""}`.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="container section">
      <div className="card card-full fade-up">
        <span className="tl-tag">{t("roleEpc")}</span>
        <h1 className="section-title" style={{ marginTop: 12 }}>{project.name}</h1>
        <p className="section-label">{t("address")}: {address}</p>
        <div className="stat-value" style={{ marginTop: 18 }}>
          {project.progressPercent}
          <span className="unit">%</span>
        </div>
        <div className="stat-label">{t("progress")}</div>
        <table className="log-table" style={{ marginTop: 24 }}>
          <thead>
            <tr><th>{t("scope")}</th><th></th></tr>
          </thead>
          <tbody>
            {project.scopeItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="num mono">
                  {t("installedOfTarget", { installed: item.installedQty, target: item.targetQty, unit: item.unit })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Type check and full test suite**

Run: `npm run lint` then `npm test`
Expected: clean, all tests green (parity, progress, weather-codes, report-summary, token-format).

- [ ] **Step 4: Commit**

Append to CHANGELOG.md:

```markdown
- Wired the crew home and made /p/[token] a role router: the sub token opens the mobile Tagesbericht screen, the epc token keeps the phase 0 summary until phase 1b builds the dashboard. Why: the token already carries the role; each side gets its own experience behind one link.
```

```bash
git add components/crew/CrewHome.tsx "app/[locale]/p/[token]/page.tsx" CHANGELOG.md
git commit -m "Add crew home and role-routed token page"
```

---

### Task 10: End-to-end verification on a phone viewport

**Files:** none (verification and one CHANGELOG entry).

- [ ] **Step 1: Start the preview and open the crew link on mobile**

Run the dev server via the preview browser (`preview_start` with name `belin-dev`), resize to mobile (375x812), navigate to `/sl/p/demo-sub-r8p3n6w1`.
Expected: the crew screen renders in Slovenian: project name, progress number, the report form (photos add tile, headcount stepper, three scope quantity steppers, note), sticky "Poslji porocilo" bar, and "Danes se ni vnosov." No horizontal scroll.

- [ ] **Step 2: Submit a report and confirm progress climbs**

Set headcount to 5, set Moduli quantity to some value (for example 100), type a short note, tap submit.
Expected: button shows the sending then sent state, the screen refreshes, "Napredek projekta" increases from 6.3, and a new row appears under "Danes vnosi" showing the crew size, photo count, and Moduli quantity. Verify the same rise by reading the database (a quick `execute_sql` count of entry_quantities, or reload the epc link and see the higher percentage).

- [ ] **Step 3: Confirm the other two languages and the epc branch**

Navigate to `/de/p/demo-sub-r8p3n6w1` and `/en/p/demo-sub-r8p3n6w1`: the crew screen is fully translated. Navigate to `/de/p/demo-epc-k7m2x9q4`: the epc summary still renders (unchanged), now reflecting the higher progress.

- [ ] **Step 4: Confirm a photo actually lands in storage**

Add one photo (in the preview, an image file), submit, then verify a `photos` object exists under `<projectId>/<clientId>/` (via `execute_sql` on `storage.objects` count, or the Supabase dashboard). Confirm it displays back if surfaced. If anything fails, read the console and server logs, fix the source, and re-verify from Step 1.

- [ ] **Step 5: Reseed note and commit the verification**

Because Step 2 mutates the seeded project, run `npm run seed` is not required (the seed is upsert and additive); note in the session log that the demo project now carries test entries and can be reset by truncating `daily_entries` for the project before the real demo.

Append to CHANGELOG.md:

```markdown
- Verified the crew report flow end to end on a phone viewport in all three languages: submit writes entry, quantities and a downscaled photo to Frankfurt, progress recomputes and climbs, activity row is created. Why: crew-facing definition of done is a real submit on a phone, not a unit test.
```

```bash
git add CHANGELOG.md
git commit -m "Verify crew report flow end to end on mobile"
```

---

## Self-review notes

- Spec coverage: covers the Tagesbericht core from the demo design (photos, note, headcount, per-item quantities, weather auto-fill, submit under 30 seconds) and the computed-progress differentiator. Deferred to later plans, by design: the Stueckliste material-check gate (phase 1b or 2 per the build order), the project info screen with the Google Maps button (phase 2), the EPC dashboard and live sync (phase 1b), offline queueing (later). The material gate is intentionally not blocking crew logging yet; noted so it is not mistaken for a miss.
- No placeholders: every step carries runnable code or an exact command.
- Type consistency: `SubmitReportPayload`, `CrewScopeStatus`, `CrewHomeData`, `UploadTarget`, `WeatherSnapshot` are defined once and consumed with the same shapes across tasks. `createBrowserClient`, `getCrewHome`, `submitDailyReport`, `requestPhotoTargets`, `submitReport`, `weatherCodeToKey`, `summarizeTodayPosts` names are stable across tasks.
- Known intentional debt to log when taken: photos display on the dashboard uses signed URLs (built in Task 3) but is not surfaced on the crew screen in this plan (crew shows a photo count, not thumbnails of past posts); acceptable for phase 1a and revisited in 1b. Weather label rendering from `weatherCodeToKey` is wired in the dashboard (1b); the crew screen stores the snapshot but does not display it, matching the demo design's priority of speed on the crew side.
