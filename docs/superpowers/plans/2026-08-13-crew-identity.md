# Crew Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crew members become named people with permanent device sessions: claim your name once through the project link, then Belin opens signed in from the home screen every day.

**Architecture:** The person-session machinery (sessions table, `belin_session` cookie with `p:` prefix, `resolveActorFromSession`) already carries crew end to end: a signed-in crew person already renders `CrewHome` at `/app/[projectId]` with session actions. What is missing is only the way IN without email: a claim flow on the crew link that finds or creates a `people` row (role `crew`, email null) and calls `startPersonSession`. The shared link demotes from "the app" to "the join door". The boss gets a roster card to add and disable crew, and disabling revokes sessions.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres via the admin client, the existing custom session plumbing in `lib/auth.ts`. No new dependencies.

## Global Constraints

- BUILD IN SLOVENIAN ONLY (founder mandate 2026-07-19): new UI strings are real Slovenian; `de`/`en` carry the Slovenian string as a placeholder; log the debt in CHANGELOG.md.
- Never use em dashes or en dashes in any produced text.
- Every schema change: apply via the Supabase connector (project ref `xrwncpngjajosstvkign`) AND commit a matching file in `supabase/migrations/` in the same task (repo-vs-DB drift rule, 2026-07-20).
- `create or replace function` with a changed signature ADDS an overload. Every function change drops the old signature explicitly and ends with the overload-count guard query (lesson paid for on 2026-08-12 with `create_project_from_review`).
- Contract-forming acts stay person-only and office-only: nothing in this plan widens `requireOfficeActor`, and the login magic link continues to REFUSE crew emails.
- One database serves local and production. Verification against the DB is verification against the live demo: clean up staged rows.
- Run `npm run lint` (tsc) and `npm test` before every commit. All 423 existing tests must stay green; the messages parity and ICU tests gate every catalog edit.

## Deemed decisions (founder veto list)

1. Crew identity is a NAME plus a device session: no email, no password. Veto path: email magic links for crew, but then every roofer needs a mailbox they check.
2. This reverses the 2026-07-20 founding decision "crew never gets accounts" at the founder's explicit instruction of 2026-08-13. `DECISIONS.md` records the reversal.
3. Anyone holding the crew link can claim a name on the roster or add themselves. This is the same trust the anonymous link already extended; what is new is that the boss can now see and revoke individuals.
4. The crew link (`/p/<token>`, role `sub`) becomes claim-only. The EPC link (role `epc`) is untouched. Demo token sessions (cookie-held tokens from the demo login) are untouched.
5. A crew person landing on `/app` with one project goes straight into it; with several, a minimal picker: no portfolio numbers, no schedule bars, those are office reading.

---

### Task 1: Schema: `people.disabled_at`, author on the report RPC

**Files:**
- Create: `supabase/migrations/20260813120000_crew_identity.sql`
- Modify: `lib/database.types.ts` (via `npm run gen:types`)
- Modify: `lib/data/reports.ts:137-148`

**Interfaces:**
- Produces: `people.disabled_at timestamptz null`; `submit_daily_report(..., p_person uuid)` 9-arg form, 8-arg form dropped.
- Produces for Task 3: disabled people are invisible to rosters and refused at claim.

- [ ] **Step 1: Write the migration file** with exactly this content (the function body is the live definition pulled via `pg_get_functiondef` on 2026-08-13, with three deltas: the `p_person` parameter, `created_by_person` in the insert, and an author-preserving conflict clause):

```sql
-- Crew identity: named crew people with device sessions.
-- 1) disabled_at lets the boss remove one crew member without deleting rows
--    that daily entries reference.
-- 2) submit_daily_report learns WHO submitted. The old 8-arg signature is
--    dropped first: create or replace with a new signature would add an
--    overload beside it (the create_project_from_review lesson).

alter table public.people add column if not exists disabled_at timestamptz;

drop function if exists public.submit_daily_report(
  uuid, date, text, integer, jsonb, uuid, jsonb, text[]);

create or replace function public.submit_daily_report(
  p_project uuid,
  p_entry_date date,
  p_note text,
  p_headcount integer,
  p_weather jsonb,
  p_client_id uuid,
  p_quantities jsonb,
  p_photo_paths text[],
  p_person uuid
)
returns uuid
language plpgsql
as $function$
declare
  v_entry uuid;
  v_item jsonb;
  v_scope uuid;
  v_qty numeric;
  v_path text;
  v_valid uuid[];
  v_prefix text := p_project::text || '/';
begin
  select coalesce(array_agg(id), '{}') into v_valid
  from public.scope_items where project_id = p_project;

  insert into public.daily_entries
    (project_id, entry_date, note, headcount, weather, client_generated_id, created_by_person)
  values
    (p_project, p_entry_date, nullif(btrim(coalesce(p_note, '')), ''), p_headcount, p_weather, p_client_id, p_person)
  on conflict (client_generated_id) do update
    set note = excluded.note,
        headcount = excluded.headcount,
        weather = excluded.weather,
        entry_date = excluded.entry_date,
        -- A retry of the same report keeps its original author.
        created_by_person = coalesce(daily_entries.created_by_person, excluded.created_by_person)
    where daily_entries.project_id = excluded.project_id
  returning id into v_entry;

  if v_entry is null then
    raise exception 'daily entry client id % conflicts with another project', p_client_id;
  end if;

  delete from public.entry_quantities where entry_id = v_entry;
  if p_quantities is not null then
    for v_item in select * from jsonb_array_elements(p_quantities) loop
      v_scope := (v_item->>'scope_item_id')::uuid;
      v_qty := (v_item->>'qty')::numeric;
      if v_qty > 0 then
        if not (v_scope = any(v_valid)) then
          raise exception 'scope_item % does not belong to project %', v_scope, p_project;
        end if;
        insert into public.entry_quantities (entry_id, scope_item_id, qty)
        values (v_entry, v_scope, v_qty);
      end if;
    end loop;
  end if;

  delete from public.entry_photos where entry_id = v_entry;
  if p_photo_paths is not null then
    for i in 1 .. coalesce(array_length(p_photo_paths, 1), 0) loop
      v_path := p_photo_paths[i];
      if v_path is null or left(v_path, length(v_prefix)) <> v_prefix then
        raise exception 'photo path % is not in project %', v_path, p_project;
      end if;
      insert into public.entry_photos (entry_id, storage_path, sort_order)
      values (v_entry, v_path, i - 1);
    end loop;
  end if;

  insert into public.activity (project_id, kind, payload)
  values (p_project, 'entry_submitted',
          jsonb_build_object('headcount', p_headcount,
                             'photos', coalesce(array_length(p_photo_paths, 1), 0)));

  return v_entry;
end;
$function$;
```

- [ ] **Step 2: Apply it** via the Supabase connector `apply_migration` with the same SQL, name `crew_identity`.

- [ ] **Step 3: Run the overload guard.** Via `execute_sql`:

```sql
select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'submit_daily_report';
```

Expected: exactly `1`. If `2`, an overload survived: drop the 8-arg form and re-run.

- [ ] **Step 4: Regenerate types.** Run: `npm run gen:types`. Expected: `lib/database.types.ts` now shows `p_person: string` in the `submit_daily_report` args and `disabled_at: string | null` on `people`.

- [ ] **Step 5: Thread the author through the caller.** In `lib/data/reports.ts`, inside the `db.rpc("submit_daily_report", {...})` call, add after `p_photo_paths: payload.photoPaths,`:

```ts
    // Who held the phone. Null on the anonymous link during rollout; a claimed
    // crew session puts a real name on the report, which is what the completion
    // report and the notifications print.
    p_person: actor.personId,
```

- [ ] **Step 6: Gates.** Run: `npm run lint` then `npm test -- --run`. Expected: clean, 423 passing.

- [ ] **Step 7: Verify against the live DB.** Submit a report through the crew link locally (or `execute_sql` insert via the RPC with a staged client id), confirm `daily_entries.created_by_person` is null for the token path, then delete the staged row. Expected: no error, author column exists.

- [ ] **Step 8: Commit.**

```bash
git add supabase/migrations/20260813120000_crew_identity.sql lib/database.types.ts lib/data/reports.ts
git commit -m "feat(crew): disabled_at on people, author on the report RPC"
```

### Task 2: Pure rules: `lib/crew-shared.ts`

**Files:**
- Create: `lib/crew-shared.ts`
- Test: `tests/crew-shared.test.ts`

**Interfaces:**
- Produces: `normalizeCrewName(raw: string): string | null`, `matchRosterName(roster: { id: string; fullName: string }[], name: string): string | null` (returns the person id or null). Tasks 3 and 4 import both.

- [ ] **Step 1: Write the failing tests:**

```ts
import { describe, expect, it } from "vitest";
import { normalizeCrewName, matchRosterName } from "@/lib/crew-shared";

// The claim screen takes free text from a phone keyboard on a roof. The rules
// are small but they are the difference between one Luka and three: "luka
// zupan", " Luka  Zupan " and "LUKA ZUPAN" must be the same person.
describe("normalizeCrewName", () => {
  it("trims and collapses whitespace, keeps letters as typed", () => {
    expect(normalizeCrewName("  Luka   Zupan ")).toBe("Luka Zupan");
  });
  it("refuses empty and one-letter noise", () => {
    expect(normalizeCrewName("   ")).toBeNull();
    expect(normalizeCrewName("L")).toBeNull();
  });
  it("caps length so a paste cannot become a name", () => {
    expect(normalizeCrewName("x".repeat(81))).toBeNull();
    expect(normalizeCrewName("x".repeat(80))).not.toBeNull();
  });
});

describe("matchRosterName", () => {
  const roster = [
    { id: "a", fullName: "Luka Zupan" },
    { id: "b", fullName: "Miha Oblak" },
  ];
  it("matches case-insensitively after normalization", () => {
    expect(matchRosterName(roster, " luka  ZUPAN ")).toBe("a");
  });
  it("returns null for a new name", () => {
    expect(matchRosterName(roster, "Jan Kranjc")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure.** Run: `npx vitest run tests/crew-shared.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement:**

```ts
// Pure rules for crew name claiming. No server imports: the claim form
// validates client side with the same function the server enforces.

/** Trimmed, single-spaced, 2..80 chars; null when it is not a usable name. */
export function normalizeCrewName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

/** The roster entry this free-typed name IS, or null when it is genuinely new. */
export function matchRosterName(
  roster: { id: string; fullName: string }[],
  name: string,
): string | null {
  const normalized = normalizeCrewName(name);
  if (!normalized) return null;
  const wanted = normalized.toLowerCase();
  return roster.find((r) => r.fullName.trim().replace(/\s+/g, " ").toLowerCase() === wanted)?.id ?? null;
}
```

- [ ] **Step 4: Run to verify pass.** Run: `npx vitest run tests/crew-shared.test.ts`. Expected: PASS, 5 tests.

- [ ] **Step 5: Commit.**

```bash
git add lib/crew-shared.ts tests/crew-shared.test.ts
git commit -m "feat(crew): pure name claim rules"
```

### Task 3: Data layer: `lib/data/crew.ts`

**Files:**
- Create: `lib/data/crew.ts`

**Interfaces:**
- Consumes: `normalizeCrewName`, `matchRosterName` (Task 2); `createAdminClient`; `resolveActorFromToken` shape from `lib/actor.ts`.
- Produces for Tasks 4, 5, 6:
  - `listCrewRoster(projectId: string): Promise<{ id: string; fullName: string }[]>`
  - `claimCrewIdentity(rawToken: string, choice: { personId: string } | { newName: string }): Promise<{ ok: true; personId: string; projectId: string } | { ok: false; error: "invalid" | "name" }>`
  - `listOrgCrew(actor: PersonActor): Promise<{ id: string; fullName: string; disabledAt: string | null }[]>`
  - `setCrewDisabled(actor: PersonActor, personId: string, disabled: boolean): Promise<void>`

- [ ] **Step 1: Implement the module:**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canIssueCrewLink } from "@/lib/invites-shared";
import { matchRosterName, normalizeCrewName } from "@/lib/crew-shared";
import type { PersonActor } from "@/lib/actor";

// Crew identity. A crew member is a people row with role crew and, usually, no
// email: their credential is a device session claimed through the project
// link. The link authenticates the CLAIM (holding it is what lets you say who
// you are, the same trust the anonymous link always extended); the session
// authenticates every day after.

/** The claimable names for a project: its sub org's live crew. */
export async function listCrewRoster(
  projectId: string,
): Promise<{ id: string; fullName: string }[]> {
  const db = createAdminClient();
  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.sub_org_id) return [];

  const { data } = await db
    .from("people")
    .select("id, full_name")
    .eq("org_id", project.sub_org_id)
    .eq("role", "crew")
    .is("disabled_at", null)
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }));
}

/**
 * Turns a held crew link into a person. Existing name: verified against the
 * roster so a disabled person cannot be claimed. New name: normalized, checked
 * against the roster case-insensitively (so "luka zupan" does not become a
 * second Luka), then created in the sub org with role crew and no email.
 */
export async function claimCrewIdentity(
  rawToken: string,
  choice: { personId: string } | { newName: string },
): Promise<{ ok: true; personId: string; projectId: string } | { ok: false; error: "invalid" | "name" }> {
  const db = createAdminClient();

  const { data: tokenRow } = await db
    .from("project_tokens")
    .select("project_id, role, revoked")
    .eq("token", rawToken)
    .maybeSingle();
  if (!tokenRow || tokenRow.revoked || tokenRow.role !== "sub") {
    return { ok: false, error: "invalid" };
  }

  const roster = await listCrewRoster(tokenRow.project_id);

  if ("personId" in choice) {
    const hit = roster.find((r) => r.id === choice.personId);
    if (!hit) return { ok: false, error: "invalid" };
    return { ok: true, personId: hit.id, projectId: tokenRow.project_id };
  }

  const name = normalizeCrewName(choice.newName);
  if (!name) return { ok: false, error: "name" };

  const existing = matchRosterName(roster, name);
  if (existing) return { ok: true, personId: existing, projectId: tokenRow.project_id };

  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", tokenRow.project_id)
    .maybeSingle();
  if (!project?.sub_org_id) return { ok: false, error: "invalid" };

  const { data: person, error } = await db
    .from("people")
    .insert({ org_id: project.sub_org_id, full_name: name, role: "crew" })
    .select("id")
    .single();
  if (error || !person) return { ok: false, error: "invalid" };

  return { ok: true, personId: person.id, projectId: tokenRow.project_id };
}

/** The boss's roster view: every crew person of his org, disabled ones included. */
export async function listOrgCrew(
  actor: PersonActor,
): Promise<{ id: string; fullName: string; disabledAt: string | null }[]> {
  if (!canIssueCrewLink(actor.orgType, actor.role)) throw new Error("Forbidden");
  const db = createAdminClient();
  const { data } = await db
    .from("people")
    .select("id, full_name, disabled_at")
    .eq("org_id", actor.orgId)
    .eq("role", "crew")
    .order("full_name");
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    disabledAt: p.disabled_at,
  }));
}

/**
 * Disable or re-enable one crew member. Disabling revokes their sessions in
 * the same call: this is the whole point over the shared link, where removing
 * one person meant breaking the link for everyone.
 */
export async function setCrewDisabled(
  actor: PersonActor,
  personId: string,
  disabled: boolean,
): Promise<void> {
  if (!canIssueCrewLink(actor.orgType, actor.role)) throw new Error("Forbidden");
  const db = createAdminClient();

  const { data: updated } = await db
    .from("people")
    .update({ disabled_at: disabled ? new Date().toISOString() : null })
    .eq("id", personId)
    .eq("org_id", actor.orgId)
    .eq("role", "crew")
    .select("id")
    .maybeSingle();
  if (!updated) throw new Error("Forbidden");

  if (disabled) {
    await db.from("sessions").update({ revoked: true }).eq("person_id", personId);
  }
}
```

- [ ] **Step 2: Refuse disabled people at the session gate.** In `lib/actor.ts`, `resolvePersonActor` selects `"id, org_id, full_name, email, role, organizations (type)"`. Add `disabled_at` to the select and, before building the actor:

```ts
  if (data.disabled_at) return null;
```

- [ ] **Step 3: Gates.** Run: `npm run lint` then `npm test -- --run`. Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add lib/data/crew.ts lib/actor.ts
git commit -m "feat(crew): roster, claim, and disable in the data layer"
```

### Task 4: The claim door at `/p/[token]`

**Files:**
- Create: `components/crew/CrewClaim.tsx`
- Create: `app/[locale]/p/[token]/claim-actions.ts`
- Modify: `app/[locale]/p/[token]/page.tsx`
- Modify: `messages/sl.json`, `messages/de.json`, `messages/en.json` (namespace `claim`; de/en carry the Slovenian string)
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `listCrewRoster`, `claimCrewIdentity` (Task 3), `startPersonSession` from `lib/auth.ts`, `resolveActorFromSession`.
- Produces: `/p/<subToken>` renders the claim screen for anonymous visitors; a claimed visitor and any returning crew person is redirected to `/{locale}/app/{projectId}`.

- [ ] **Step 1: The server action**, `app/[locale]/p/[token]/claim-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { claimCrewIdentity } from "@/lib/data/crew";
import { startPersonSession } from "@/lib/auth";

// The one moment the link authenticates anything: turning a held link into a
// named session. After this, the link is not needed again on this device.
export async function claimCrewAction(
  locale: string,
  token: string,
  choice: { personId: string } | { newName: string },
): Promise<{ error: "invalid" | "name" } | never> {
  const result = await claimCrewIdentity(token, choice);
  if (!result.ok) return { error: result.error };

  await startPersonSession(result.personId);
  redirect(`/${locale}/app/${result.projectId}`);
}
```

- [ ] **Step 2: The claim screen**, `components/crew/CrewClaim.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { claimCrewAction } from "@/app/[locale]/p/[token]/claim-actions";
import { normalizeCrewName } from "@/lib/crew-shared";

// Who is holding this phone. One tap for a known name, one short type for a
// new one, and this screen is never seen again on this device: the session it
// mints is what opens the app from the home screen tomorrow.
export function CrewClaim({
  locale,
  token,
  roster,
  projectName,
}: {
  locale: string;
  token: string;
  roster: { id: string; fullName: string }[];
  projectName: string;
}) {
  const t = useTranslations("claim");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const claim = (choice: { personId: string } | { newName: string }) =>
    start(async () => {
      setError(null);
      const result = await claimCrewAction(locale, token, choice);
      if (result?.error) setError(t(result.error === "name" ? "errName" : "errInvalid"));
    });

  return (
    <main className="belin-dark cl-wrap">
      <div className="cl-card">
        <p className="cl-project">{projectName}</p>
        <h1 className="cl-title">{t("title")}</h1>
        <p className="cl-sub">{t("subtitle")}</p>

        <div className="cl-roster">
          {roster.map((person) => (
            <button
              key={person.id}
              type="button"
              className="cl-name"
              disabled={pending}
              onClick={() => claim({ personId: person.id })}
            >
              {person.fullName}
            </button>
          ))}
        </div>

        <div className="cl-new">
          <span className="b-label">{t("newLabel")}</span>
          <input
            className="b-field"
            value={newName}
            placeholder={t("newPlaceholder")}
            enterKeyHint="go"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className="cl-join"
            disabled={pending || !normalizeCrewName(newName)}
            onClick={() => claim({ newName })}
          >
            {t("join")}
          </button>
        </div>

        {error ? <p className="ic-error">{error}</p> : null}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Route the door.** In `app/[locale]/p/[token]/page.tsx`, after `const actor = await resolveActorFromToken(token); if (!actor) notFound();` insert, for the sub role only:

```tsx
  if (actor.role === "sub") {
    // The link is the door, not the app. A returning crew person of this
    // project's sub company goes straight home; everyone else says who they
    // are, once, and never sees this URL again on that device.
    const session = await resolveActorFromSession();
    if (
      session?.kind === "person" &&
      session.role === "crew" &&
      session.orgId === actor.orgId
    ) {
      redirect(`/${locale}/app/${actor.projectId}`);
    }

    const [roster, core] = await Promise.all([
      listCrewRoster(actor.projectId),
      getCrewHome(actor),
    ]);
    if (!core) notFound();
    return (
      <CrewClaim locale={locale} token={token} roster={roster} projectName={core.projectName} />
    );
  }
```

with imports `redirect` from `next/navigation`, `resolveActorFromSession` from `@/lib/auth`, `listCrewRoster` from `@/lib/data/crew`, `CrewClaim` from `@/components/crew/CrewClaim`. The old crew-screen branch below it becomes dead for role sub and is deleted; the EPC branch stays byte for byte.

- [ ] **Step 4: Catalog keys** (sl real, de/en placeholder = the Slovenian string), namespace `claim`:

```json
{
  "title": "Kdo ste?",
  "subtitle": "Izberite svoje ime. Telefon si vas zapomni, naslednjič se aplikacija odpre kar sama.",
  "newLabel": "Vas ni na seznamu?",
  "newPlaceholder": "Ime in priimek",
  "join": "To sem jaz",
  "errInvalid": "Povezava ni veljavna. Prosite vodjo za novo.",
  "errName": "Vpišite ime in priimek."
}
```

- [ ] **Step 5: Styles** in `app/globals.css` under the `.belin-dark` section:

```css
/* The claim door: one screen, thumb-sized names, nothing else. */
.belin-dark.cl-wrap { display: flex; align-items: center; justify-content: center; padding: 24px; }
.belin-dark .cl-card { width: 100%; max-width: 420px; }
.belin-dark .cl-project { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--e-muted); font-weight: 700; margin: 0 0 10px; }
.belin-dark .cl-title { margin: 0 0 8px; font-size: 28px; font-weight: 800; }
.belin-dark .cl-sub { margin: 0 0 22px; color: var(--e-ink2); font-size: 14.5px; line-height: 1.55; }
.belin-dark .cl-roster { display: grid; gap: 10px; margin-bottom: 26px; }
.belin-dark .cl-name {
  font: inherit; font-size: 16px; font-weight: 700; text-align: left;
  padding: 16px; border-radius: 14px; color: var(--e-ink);
  background: var(--e-surface); border: 1px solid var(--e-line); touch-action: manipulation;
}
.belin-dark .cl-name:active { background: var(--e-surface-2); }
.belin-dark .cl-new { display: grid; gap: 10px; }
.belin-dark .cl-join {
  font: inherit; font-size: 15px; font-weight: 700; padding: 15px; border-radius: 14px;
  color: #14100a; background: linear-gradient(180deg, var(--e-gold-2), var(--e-gold));
  border: 0; touch-action: manipulation;
}
.belin-dark .cl-join:disabled { opacity: .45; }
```

- [ ] **Step 6: Gates.** Run: `npm run lint` then `npm test -- --run`. Parity and ICU tests must accept the new namespace (placeholders are legal; identical strings are cognate-tolerated).

- [ ] **Step 7: Verify in the browser, phone viewport.** Anonymous `/sl/p/<crew token>`: claim screen with the roster. Tap a name: lands signed in on `/sl/app/<projectId>` showing `CrewHome`. Reopen `/sl/p/<token>`: immediate redirect, no claim screen. New name "Test Delavec": creates the person, lands; then delete that staged person row.

- [ ] **Step 8: Commit.**

```bash
git add components/crew/CrewClaim.tsx "app/[locale]/p/[token]/claim-actions.ts" "app/[locale]/p/[token]/page.tsx" messages app/globals.css
git commit -m "feat(crew): the link becomes the claim door, the app becomes home"
```

### Task 5: Crew landing at `/app`

**Files:**
- Modify: `app/[locale]/app/page.tsx`
- Create: `components/crew/CrewProjectPicker.tsx`
- Modify: `messages/*.json` (`claim.pickProject`)

**Interfaces:**
- Consumes: `listProjectsForPerson` (existing), `PersonActor`.
- Produces: crew person at `/app`: one project redirects into it; several render the picker; zero falls through to the empty list.

- [ ] **Step 1: Branch in the person path** of `app/[locale]/app/page.tsx`, before the `ProjectList` return:

```tsx
  if (actor.kind === "person" && actor.role === "crew") {
    // A roofer does not have a portfolio, he has today's site. One project
    // opens itself; several ask which roof, and nothing more.
    const projects = await listProjectsForPerson(actor);
    if (projects.length === 1) redirect(`/${locale}/app/${projects[0].id}`);
    return <CrewProjectPicker locale={locale} projects={projects} />;
  }
```

- [ ] **Step 2: The picker**, `components/crew/CrewProjectPicker.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ProjectListRow } from "@/lib/data/projects-list";

// Name and city only. The schedule bars and capacity totals on the office list
// are business reading; the crew picker answers one question: which roof.
export async function CrewProjectPicker({
  locale,
  projects,
}: {
  locale: string;
  projects: ProjectListRow[];
}) {
  const t = await getTranslations("claim");
  return (
    <main className="belin-dark cl-wrap">
      <div className="cl-card">
        <h1 className="cl-title">{t("pickProject")}</h1>
        <div className="cl-roster">
          {projects.map((p) => (
            <Link key={p.id} href={`/${locale}/app/${p.id}`} className="cl-name">
              {p.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
```

Key `claim.pickProject`: sl `"Katero gradbišče?"`, de/en placeholder.

- [ ] **Step 3: Gates, verify, commit.** Drive it: crew person with one project hits `/sl/app` and lands on the project without seeing a list.

```bash
git add "app/[locale]/app/page.tsx" components/crew/CrewProjectPicker.tsx messages
git commit -m "feat(crew): a roofer lands on his site, not on a portfolio"
```

### Task 6: The boss's roster card in Settings

**Files:**
- Create: `components/settings/CrewRoster.tsx`
- Modify: `app/[locale]/app/settings/page.tsx` (render beside the crew link card)
- Modify: `app/[locale]/app/settings/actions.ts`
- Modify: `messages/*.json` (`settings.crewRoster*` keys)

**Interfaces:**
- Consumes: `listOrgCrew`, `setCrewDisabled` (Task 3).
- Produces: the sub office sees its crew, adds a name (insert with role crew via `claimCrewIdentity`-free path: direct insert action `addCrewMemberAction(name)`), disables and re-enables one.

- [ ] **Step 1: Actions** in `app/[locale]/app/settings/actions.ts`:

```ts
export async function addCrewMemberAction(name: string): Promise<{ error?: string }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") return { error: "forbidden" };
  if (!canIssueCrewLink(actor.orgType, actor.role)) return { error: "forbidden" };
  const normalized = normalizeCrewName(name);
  if (!normalized) return { error: "name" };
  const db = createAdminClient();
  const { error } = await db
    .from("people")
    .insert({ org_id: actor.orgId, full_name: normalized, role: "crew" });
  if (error) return { error: "failed" };
  revalidatePath("/", "layout");
  return {};
}

export async function setCrewDisabledAction(personId: string, disabled: boolean): Promise<{ error?: string }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") return { error: "forbidden" };
  try {
    await setCrewDisabled(actor, personId, disabled);
  } catch {
    return { error: "forbidden" };
  }
  revalidatePath("/", "layout");
  return {};
}
```

- [ ] **Step 2: The card**, `components/settings/CrewRoster.tsx`: a list of `listOrgCrew` rows, each with the name, a muted `settings.crewDisabled` tag when `disabledAt` is set, and one PendingButton toggling via `setCrewDisabledAction`; below, one input plus add-button calling `addCrewMemberAction`. Reuse the visual pattern of the invite card in the same file tree (b-field, rp-send, st-note classes). Render it from `settings/page.tsx` inside the existing `canIssueCrewLink` guard, under the crew link card, heading `settings.crewRoster`.

Keys (sl real, de/en placeholder):

```json
{
  "crewRoster": "Ekipa",
  "crewRosterNote": "Kdor je na seznamu, se na gradbišču prijavi z enim dotikom. Odstranjen član takoj izgubi dostop na vseh napravah.",
  "crewAdd": "Dodaj člana",
  "crewDisabled": "Onemogočen",
  "crewDisable": "Odstrani",
  "crewEnable": "Vrni"
}
```

- [ ] **Step 3: Gates, verify, commit.** Drive it: add "Test Delavec", see him on the claim screen roster, disable him, confirm his claim button is gone AND an existing session of his is refused (resolvePersonActor returns null). Clean the staged person.

```bash
git add components/settings/CrewRoster.tsx "app/[locale]/app/settings/page.tsx" "app/[locale]/app/settings/actions.ts" messages
git commit -m "feat(crew): the boss manages his roster, disabling revokes devices"
```

### Task 7: Sessions that do not quietly expire on a roof

**Files:**
- Modify: `lib/auth.ts` (`resolveActorFromSession` person branch)

**Interfaces:**
- Produces: any person session used with less than 15 of its 30 days left gets its `expires_at` pushed back to 30 days out, and the cookie maxAge refreshed. Crew who report daily therefore never re-claim; a phone unused for a month does.

- [ ] **Step 1: Implement the rolling refresh** where the person session row is loaded (the query already reads the row: extend the select with `id, expires_at`):

```ts
      // Rolling session: someone who uses Belin keeps being signed in, and
      // only an abandoned device ever expires. Fire and forget: a failed
      // refresh must not fail the request that triggered it.
      const msLeft = new Date(row.expires_at).getTime() - Date.now();
      if (msLeft < (SESSION_TTL_DAYS / 2) * 86400000) {
        const newExpiry = new Date(Date.now() + SESSION_TTL_DAYS * 86400000);
        void db.from("sessions").update({ expires_at: newExpiry.toISOString() }).eq("id", row.id);
      }
```

- [ ] **Step 2: Gates, verify, commit.** Verify by shrinking a session's `expires_at` via `execute_sql` to 5 days out, loading `/sl/app`, and reading it back: it is 30 days out again.

```bash
git add lib/auth.ts
git commit -m "feat(auth): rolling person sessions, active devices never expire"
```

### Task 8: Home-screen install nudge on the crew screen

**Files:**
- Create: `components/crew/InstallHint.tsx`
- Modify: `components/crew/CrewHome.tsx` (render at the top of the settled screen)
- Modify: `messages/*.json` (`claim.installTitle`, `claim.installBody`, `claim.installDismiss`)

**Interfaces:**
- Produces: a dismissible one-line hint ("Dodajte Belin na začetni zaslon, odpre se z eno potezo.") shown only in a browser tab, never in standalone display mode, remembered in `localStorage` under `belin-install-hint`.

- [ ] **Step 1: Implement** as a small client component: render null when `matchMedia("(display-mode: standalone)").matches` or the localStorage flag is set; otherwise a quiet strip with the text and an X that sets the flag. No `beforeinstallprompt` machinery in v1: the copy is the feature.

- [ ] **Step 2: Gates, verify at 375px** (note: the preview pane always reports `document.hidden` true; visibility does not gate this component). Commit:

```bash
git add components/crew/InstallHint.tsx components/crew/CrewHome.tsx messages
git commit -m "feat(crew): nudge the home-screen install where daily use lives"
```

### Task 9: Seed, docs, and the demo

**Files:**
- Modify: `scripts/seed-demo.mjs`
- Modify: `docs/demo/2026-08-12-runbook-v2.md`
- Modify: `CHANGELOG.md`, `DECISIONS.md`, session log

**Interfaces:**
- Produces: a second AVESOL crew member (`Miha Oblak`, role crew, no email) so the claim roster shows a real choice; runbook beat 2 gains the one-tap claim; DECISIONS records the reversal of the 2026-07-20 founding decision and why (founder instruction 2026-08-13: crew uses the app daily and must have it as an installed, signed-in app, not a URL).

- [ ] **Step 1: Seed**: add to the `people` array:

```js
  { id: "66666666-6666-4666-8666-666666666606", org_id: SUB_ORG, full_name: "Miha Oblak", role: "crew", email: null },
```

- [ ] **Step 2: Run `npm run seed`**, confirm the claim screen for the demo crew link lists Luka Zupan and Miha Oblak.
- [ ] **Step 3: Update the runbook**: beat 2 becomes scan QR, tap your name, report; the security ritual paragraph gains: disabling a crew member in Settings revokes that person's devices without touching the link.
- [ ] **Step 4: CHANGELOG entry** (the what and the why, including the i18n debt for the new `claim` and `settings.crewRoster*` keys), DECISIONS entry (the reversal), session log.
- [ ] **Step 5: Commit.**

```bash
git add scripts/seed-demo.mjs docs CHANGELOG.md DECISIONS.md
git commit -m "feat(crew): seed the roster, record the founding-decision reversal"
```

### Task 10: End-to-end verification on production

- [ ] **Step 1:** Deploy (push), then on production with a phone viewport: open the crew link anonymously, claim Miha Oblak, submit a daily report, confirm `daily_entries.created_by_person` is Miha's id and the EPC notification body names him instead of "Ekipa na gradbišču".
- [ ] **Step 2:** Close the browser, reopen `belin-app.vercel.app`: still signed in, lands on the project.
- [ ] **Step 3:** As Boštjan in Settings, disable Miha: the phone session dies on next navigation; the claim screen no longer offers him.
- [ ] **Step 4:** Confirm the office matrix is unchanged: crew person gets 403 from all five PDF routes and cannot open `/po`, `/final` money surfaces.
- [ ] **Step 5:** Re-enable Miha (he is seed cast), run `npm run seed`, final gates, close the session log.

## Self-review notes

- Spec coverage: daily use without links (Tasks 4, 7, 8), named authorship (Task 1), boss control (Task 6), landing (Task 5), demo continuity (Task 9). The EPC token path and demo cookie sessions are explicitly untouched (Task 4 Step 3 scope).
- Type consistency: `listCrewRoster` returns `{ id, fullName }` and both `CrewClaim` and `matchRosterName` consume exactly that shape; `claimCrewAction(locale, token, choice)` matches the client call.
- The one deliberate loose end: anonymous submissions remain possible for EPC-role tokens only, which have no submit surface, so no report can be authorless once this ships.
