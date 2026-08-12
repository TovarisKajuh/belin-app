# Belin v1 Completion Plan: everything that remains, pinned to the repo as of 2026-08-12

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: authored 2026-08-12 on Fable for execution by Opus in a fresh session. This plan SUPERSEDES the task sections of docs/superpowers/plans/2026-07-20-v1-master-plan.md (Parts C through J). That file remains the design record; THIS file is the executable truth, because three weeks of shipped code (all of Part B, the wizard, the K2 parser rebuild, email infrastructure) made parts of the old task text wrong. Every fact below was re-verified against the working tree today: 307 tests green, tsc clean, working tree clean at commit 666dbc7.

**Goal:** finish v1: PDF engine, naročilnica with hash-bound acceptance, notifications engine and bell, incidents, material requests, Regiestunden with deemed approval, change orders, finalization (completion report, acceptance protocol, invoice with accountant share), portfolio, staged three-project demo, expanded landing, the single translation pass, security cleanup, final QA.

**Architecture:** everything extends the proven seams: server-only data access through `Actor` / `ProjectActor` / `OrgActor` with the service-role client (RLS deny-all), pure tested `lib/*-shared.ts` cores, colocated server actions in BOTH the token family (`app/[locale]/p/[token]/actions.ts`) and the session family (`app/[locale]/app/[projectId]/actions.ts`) with identical signatures, contentless broadcast pings via `notifyProject`, next-intl catalogs guarded by the parity test. New: a PDF engine ported from AVE-DC, an event engine (`emitEvent`) fanning out to activity, in-app notifications and email.

**Tech stack additions:** `@react-pdf/renderer@4.5.1`. NOTHING else. resend and unpdf are already installed; exceljs was deliberately never added (the K2 Excel adapter was deleted, DECISIONS.md 2026-07-20).

---

## Part 0: the state of the repo, verified 2026-08-12 (do not re-verify, do not rebuild)

DONE and shipped (with the interfaces the remaining tasks consume):

- **K2 parser** (lib/k2/): `parseK2Pdf(bytes)` from `@/lib/k2/k2-shared`. PDF only. Never fails, warns with CODES. Not touched by this plan.
- **Accounts, magic-link auth, sessions** (Part B): `resolveActorFromSession()` in lib/auth.ts returns `SessionActor | null` (TokenActor or PersonActor). `startPersonSession(personId)`, `endPersonSession()`. Login rate-limited, scanner-safe confirm page, revocable sessions.
- **Actor seam** (lib/actor.ts): `TokenActor` (has `personId: null`), `PersonActor`, `ProjectActor { role; projectId; orgId; personId }`, `OrgActor { orgId; personId }`. `requireProjectActor(actor, projectId)` is the ONLY project gate. `requireOfficeActor(actor, { allowBauleiter? })` throws unless person with role admin/owner (or bauleiter when allowed). `resolvePersonActor(personId)`.
- **Email** (lib/email.ts, lib/email-shared.ts): `sendEmail({ to, kind, projectId, subject, html })` never throws, writes email_log always, refuses `*-demo.si` with error "demo-domain", 4000ms timeout. `renderEmail(heading, bodyLines, ctaLabel, ctaUrl)` escapes every slot. On latency-sensitive paths callers wrap sends in Next's `after()` (import from "next/server"), NEVER a detached promise.
- **Notification matrix** (lib/notify-shared.ts): `NOTIFY_KINDS` (all 17), `recipientsFor(kind)`, `emailSubjectKey`, `emailBodyKey`, `wantsEmail(prefs, kind)`. Tested. The engine that CONSUMES it (lib/notify.ts emitEvent) does NOT exist yet: that is Task 2.
- **URL base** (lib/app-url.ts): `appBaseUrl(): string | null`. NEXT_PUBLIC_APP_URL wins, falls back to VERCEL_PROJECT_PRODUCTION_URL, never the Host header. Use it for every email CTA link.
- **Wizard** (Task C2, done): plan-first project creation. `uploadAndParsePlan`, `listKnownSubs`, `createProjectFromReview` in lib/data/plan-imports.ts (all take OrgActor). Transactional `create_project_from_review` RPC. next.config.ts already carries `serverActions: { bodySizeLimit: "32mb" }`.
- **Invites** (B5, then reworked 2026-07-20 commit 666dbc7): sub invitation is a SHAREABLE LINK created from the project (`createSubInviteLink` in app/[locale]/app/[projectId]/actions.ts; AddSubPanel on the project and in the wizard). Colleague (epc_member) invites live in Settings. `ensureCrewLink(projectId)` in lib/data/invites.ts mints/reuses the crew project token. lib/invites-shared.ts holds the policy (`canCreateInvite`, `canIssueCrewLink`).
- **Settings and vault** (B6): org form (vat_id, iban, accountant_email), per-person notification prefs UI (keys notify.pref.* ALREADY exist in all three catalogs), VaultPanel with `expiryState` traffic lights (lib/vault-shared.ts), `createVaultDocTarget`, `getSignedDocUrlMap` in lib/storage.ts.
- **Session-side plumbing** (B4): ProjectList, SubHome (office home, NOT crew), /app/[projectId] renders EpcDashboard / SubHome / crew screen by role. Components take a `(token: string | null, projectId)` pair and branch internally; the two action families have IDENTICAL signatures. Existing session actions: requestPhotoTargets, requestMaterialDocTargets, submitMaterialCheckAction, addMaterialItemAction, submitReport, createSubInviteLink, setProjectStatus.
- **CommandBar** (components/project/CommandBar.tsx): props `{ token: string | null, projectId, projectName, meta, status, role, locale? }`. `locale` present only on EPC office surfaces and currently renders one "Projekti" link. Task 3 extends it with the nav row.
- **Seed** (scripts/seed-demo.mjs, 381 lines): fixed UUIDs. EPC_ORG 1111...1, sub org, PROJECT CURRENT 33333333-3333-4333-8333-333333333333, PROJECT_START ...334. Founder gets their OWN org from SEED_FOUNDER_EMAIL / SEED_FOUNDER_ORG, NEVER seeded into the demo company (commit 666dbc7). Demo people: Matej Kovač (EPC bauleiter), Ana Novak (sub admin), Luka Zupan (crew), all on fake `*-demo.si` addresses.
- **Migrations applied through** `20260720210000_email_log.sql`. email_log EXISTS (pulled forward out of the old M3). purchase_orders, purchase_order_lines, plan_imports, change_orders.amount EXIST (old M2, applied 2026-07-20). New migration prefixes MUST start at `20260812100000`.
- **Message namespaces** (messages/sl.json, de, en; parity test enforces structure): common, project, crew, weather, dashboard, status, landing, auth, wizard, projects, sub, app, settings, invite, vault, notify (only notify.pref.* so far), share.
- **Tables ready and UNUSED** (init schema, zero app code): requests (type material/plan/instruction, text, photo_path, status open/resolved, response_note), hour_sheets (status draft/submitted/approved/rejected/deemed_approved, deadline_at, unique(project_id, number)), hour_sheet_lines (person_id nullable, work_date, hours > 0, description NOT NULL), change_orders (number, title, status submitted/approved/rejected, amount numeric NULL), change_order_photos, acceptances (kind, status draft/signed, signer names, signature paths, report_pdf_path, note), acceptance_defects (description, photo_path, due_date, status open/resolved, sort_order), documents + document_reminders (days_before, sent_at), generated_documents (kinds bautagebuch, regiebericht, nachtrag, abnahmeprotokoll, completion_report; language sl/de/en).
- **Missing entirely**: incidents, notifications, invoices tables; lib/notify.ts; lib/pdf/*; every /api route (app/api does not exist); public/fonts (empty: the Inter TTF must be copied in Task 1); hours, change orders, acceptance, invoice, incident, request app code; portfolio; FINAL demo project; landing rebuild; de/en translations (Slovenian placeholders throughout).

Schedule note: the original 26.07/27.07 deadlines have passed. This plan carries no calendar; the founder sets the new demo and pilot dates. Velocity estimate from THIS repo's delivered history (phase 0 one evening, dark dashboard one day, K2 parser one day, Part B about 1.5 days): Tasks 1-4 one day, 5-7 one day, 8-11 one day, 12-15 one and a half days, 16-17 half a day, 18-21 one day. Roughly six focused days.

---

## Global constraints (every task inherits these)

- CLAUDE.md discipline in full: small verified steps, CHANGELOG.md in the same commit as every change, session logs in docs/sessions/, no em or en dashes in ANY produced text (UI, PDFs, emails, docs, this file).
- SLOVENIAN ONLY while building (founder mandate 2026-07-19): every new UI string in Slovenian, de.json and en.json carry the identical Slovenian string as placeholder, one CHANGELOG debt line per batch. Task 19 is the single translation pass. PDF and email strings go through i18n keys too, rendered in the PROJECT language.
- REGISTER: vikanje everywhere ("Preverite", "Vaše", "Označite"). Any tikanje in draft copy below is a bug: normalize at implementation time.
- Every count-bearing string uses ICU plural with the four Slovenian forms (one, two, few, other), pattern: crew.postSummary.
- All state transitions on rows with legal or money meaning (PO send/accept/reject, sheet decide, deemed persistence, acceptance sign, invoice generation) are SINGLE conditional UPDATEs with the full guard in the WHERE clause and RETURNING; zero rows surfaces a localized conflict error. Read-then-write transition checks are forbidden.
- Role gates: `requireOfficeActor` for org settings mutations, PO create/send/accept/reject, acceptance signing, invoice generation and accountant share. Crew token actors never reach contract-forming acts; they get common.askOffice "To dejanje opravi vodstvo podjetja v svojem računu." (key exists).
- The dark system is the only app system: `--e-*` tokens, `.belin-dark` scoping, `section.e-sec.e-reveal` for new dashboard panels. New crew surfaces mirror the existing crew screen (big targets, one thumb). The landing has its own `lp-*` system.
- Server action error convention: throw on failure, client catches, shows localized error, preserves state for retry. No revalidatePath; clients `router.refresh()`. Call `notifyProject(projectId)` after every write a dashboard should reflect (emitEvent does this itself; do not double-ping when emitEvent ran).
- Every new pure core lives in `lib/*-shared.ts` with no server imports and gets a vitest file, TDD: failing test first, run, implement, run green, commit.
- Storage: PO, invoice and report PDFs in `reports` bucket; incident and change-order photos in `photos`; signatures in `signatures`. Client-influenced path segments are UUID-validated before interpolation.
- New tables: `enable row level security`, NO policies (service-role-only architecture).
- Migrations: apply via the Supabase connector (project xrwncpngjajosstvkign) AND commit the identical file in supabase/migrations/ in the same commit (memory: drift caught 2026-07-20). Prefixes from 20260812100000. After each: hand-mirror lib/database.types.ts (gen:types output untrusted), re-run `npm run seed`, probe changed objects via the connector including rejection probes, clean probe rows.
- Load the frontend-design skill BEFORE every UI task; load the dataviz skill BEFORE Task 16 (portfolio). Saved memory: skipping cost two rebuilds.
- Environment traps, all previously hit, all mandatory:
  1. Never `npm run build` while the dev server runs.
  2. `read_console_messages` returns accumulated history; verify against current DOM.
  3. The session cookie is httpOnly; never verify cookie state from page JS.
  4. Drive React with `form.requestSubmit()` and real pointer sequences.
  5. Measure the element that carries the value (bar fill, canvas), not its container.
  6. Safe-area and raised-pill blocks stay at the END of globals.css.
  7. The preview tab always reports document.hidden true; test visibility-gated code by simulating a wake. Screenshots can time out; verify with text and geometry probes.
  8. Assert `location.pathname` inside every URL-dependent probe.
  9. Two roles in one browser: token routes in two tabs; the person session is browser-global, so two PERSONS need two browsers.
  10. gen:types fails loudly by design; edit lib/database.types.ts manually.
  11. After schema changes: seed, probe RPCs at the database level, clean up.
  12. Dash sweep (must print nothing; the dash characters appear only as escapes so the sweep never flags itself):
     `node -e "const fs=require('fs'),p=require('path');const roots=['messages','app','components','lib','docs/superpowers/plans/2026-08-12-v1-completion-plan.md'];const bad=[];const re=new RegExp('['+String.fromCharCode(8211,8212)+']');const walk=f=>{const s=fs.statSync(f);if(s.isDirectory())return fs.readdirSync(f).forEach(c=>walk(p.join(f,c)));if(!/\.(tsx?|json|css|md|mjs)$/.test(f))return;const t=fs.readFileSync(f,'utf8');if(re.test(t))bad.push(f)};roots.forEach(walk);if(bad.length){console.log(bad.join('\n'));process.exit(1)}"`
  13. PDF engine (AVE-DC recon): photo images passed to @react-pdf `<Image>` as Buffers, never Windows path strings (silent failure). Fonts register at MODULE level once in lib/pdf/theme.ts from `public/fonts/InterVariable.ttf` via `process.cwd()`; every document imports theme.ts for the side effect. Every PDF route: `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`, returns `new NextResponse(new Uint8Array(buffer))`, Content-Type application/pdf, Cache-Control `private, max-age=0, must-revalidate`.
  14. Photos in generated PDFs come from Supabase Storage (`storage.from("photos").download(path)` on the admin client), converted to Buffer; a failed download skips the image, never aborts the document.
  15. Email sends are fire-and-log; on response paths wrap in `after()`. Never let an email failure break a write path.

## Legal constants to encode (unchanged from the research record)

- Reverse charge notes by SITE country (projects.country): de "Steuerschuldnerschaft des Leistungsempfängers", at "Übergang der Steuerschuld auf den Leistungsempfänger", si "Obrnjena davčna obveznost po 76.a členu ZDDV-1". These live in lib code as constants, never in messages: they are legal text, not UI copy.
- Standard VAT rates when vat_mode is standard: de 19.00, at 20.00, si 22.00.
- Invoice mandatory fields (Art. 226 set): issue date, sequential number, supplier name + address + VAT id, customer name + address + VAT id (mandatory under reverse charge), service description + project site address, performance period, net amounts, the reverse charge note OR rate and VAT amount, currency, due date, IBAN.
- Abnahmeprotokoll: the express penalty reservation is a TEMPLATE FIELD (checkbox + fixed sentence), never free text: "Naročnik si izrecno pridržuje pravico do uveljavljanja pogodbene kazni." (de at J-time: "Der Auftraggeber behält sich die Geltendmachung der Vertragsstrafe ausdrücklich vor.")
- Day report page: report number SEQUENTIAL WITH NO GAPS, date, author, weather morning and midday, crew count, work performed with quantities, incidents, photos, signature slot. Slovenia positioning: for si projects the title is "Dnevno poročilo podizvajalca", NEVER "gradbeni dnevnik"; de/at projects say "Bautagesbericht". Selected by project COUNTRY in code (`diaryTitleKey(country)` helper, tested), not by locale.
- Naročilnica acceptance (eIDAS art. 25 simple e-signature, strengthened): named authenticated acceptor, server timestamp, immutable PDF snapshot, sha256 of the exact accepted bytes, confirmation email to both sides.

## Migrations (two files, complete SQL)

### M3': 20260812100000_incidents_notifications.sql (Task 2)

Differences from the old plan's M3: email_log REMOVED (exists since 20260720210000); incidents.note gets `default ''` and empties are allowed (the UI renders the kind label when note is empty; storing localized UI copy in data rows was wrong).

```sql
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('incident','rain_stop','obstruction')),
  note text not null default '',
  occurred_on date not null,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_incidents_project on public.incidents(project_id, occurred_on desc);

create table public.incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);
create index idx_incident_photos_incident on public.incident_photos(incident_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_person uuid not null references public.people(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient
  on public.notifications(recipient_person, created_at desc);
create index idx_notifications_unread
  on public.notifications(recipient_person) where read_at is null;

alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in (
  'entry_submitted','material_check_completed','request_created','request_resolved',
  'document_uploaded','document_expiring','hours_submitted','hours_decided',
  'hours_deemed_approved','change_order_submitted','change_order_decided',
  'acceptance_signed','project_updated',
  'incident_created','po_sent','po_accepted','po_rejected',
  'finalization_requested','invoice_generated','invoice_sent'
));

alter table public.incidents enable row level security;
alter table public.incident_photos enable row level security;
alter table public.notifications enable row level security;
```

Before applying: `select conname from pg_constraint where conrelid = 'public.activity'::regclass and contype = 'c';` and use the REAL constraint name in the drop (the init migration may have named it differently).

### M4': 20260812110000_invoices_acceptance_fields.sql (Task 12)

Differences from the old plan's M4: ADDS the acceptance columns the old plan's Task G3 spec needed but never migrated (declaration, penalty_reserved, warranty_start, attendees; defect agreement). Without them the "every step persists server-side" rule of the acceptance flow has nowhere to write.

```sql
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  sub_org_id uuid not null references public.organizations(id) on delete restrict,
  number text not null,
  status text not null default 'draft' check (status in ('draft','final')),
  issue_date date not null,
  service_start date,
  service_end date,
  vat_mode text not null check (vat_mode in ('reverse_charge','standard')),
  vat_rate numeric(4,2),
  reverse_charge_note text,
  supplier jsonb not null,
  customer jsonb not null,
  lines jsonb not null,
  total_net numeric(12,2) not null,
  total_vat numeric(12,2),
  total_gross numeric(12,2) not null,
  due_date date,
  iban text,
  pdf_path text,
  accountant_email text,
  sent_to_accountant_at timestamptz,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (sub_org_id, number),
  constraint invoices_vat_shape check (
    (vat_mode = 'reverse_charge' and vat_rate is null and total_vat is null)
    or
    (vat_mode = 'standard' and vat_rate is not null and total_vat is not null)
  )
);
create index idx_invoices_project on public.invoices(project_id);
-- one invoice per project in v1: double generation would mint two legal invoices
create unique index idx_invoices_project_single on public.invoices(project_id);

alter table public.acceptances
  add column attendees text,
  add column declaration text
    check (declaration in ('accepted','with_reservations','refused')),
  add column penalty_reserved boolean not null default false,
  add column warranty_start date;

alter table public.acceptance_defects
  add column agreement text not null default 'agreed'
    check (agreement in ('agreed','disputed'));

alter table public.invoices enable row level security;
```

The invoices_vat_shape constraint is the database-level guarantee behind founder decision 2: a reverse-charge invoice CANNOT carry VAT figures. Probe on apply: insert reverse_charge with vat_rate 22 expecting failure; insert a second invoice for the same project expecting failure; clean both.

## Storage path conventions (all client ids UUID-validated before interpolation)

```
reports bucket:  ${projectId}/po/${poId}.pdf
                 ${projectId}/invoice/${invoiceId}.pdf
                 ${projectId}/final/completion-${generatedDocId}.pdf
                 ${projectId}/final/abnahme-${acceptanceId}.pdf
                 ${projectId}/regie/${sheetId}.pdf
photos bucket:   ${projectId}/incident/${incidentClientId}/${i}-${uuid}.jpg
                 ${projectId}/request/${clientId}-${uuid}.jpg
                 ${projectId}/co/${clientId}/${i}-${uuid}.jpg
signatures:      ${projectId}/acceptance/${acceptanceId}-epc.png | -sub.png
```

## Routing additions

```
/[locale]/app/[projectId]/po        naročilnica (EPC build and send; sub office view and accept)
/[locale]/app/[projectId]/hours     Regiestunden and change orders (tabs)
/[locale]/app/[projectId]/final     finalization hub (report, acceptance, invoice cards)
/[locale]/p/[token]/hours           the SAME hours surface for the crew token
PDF route handlers (GET, nodejs, force-dynamic, at the ROOT of app/, outside [locale]):
/api/pdf/po/[poId]  /api/pdf/invoice/[invoiceId]  /api/pdf/report/[docId]
/api/pdf/abnahme/[acceptanceId]  /api/pdf/regie/[sheetId]
```

PDF route ACCESS MATRIX (person session ONLY; a token cookie is refused with 403; tokens never appear in PDF URLs):

| Route | Who may fetch |
|---|---|
| /api/pdf/po | PersonActor of either project org, any role except crew |
| /api/pdf/invoice | requireOfficeActor of either project org |
| /api/pdf/report | PersonActor of either project org, any role except crew |
| /api/pdf/abnahme | PersonActor of either project org, any role except crew |
| /api/pdf/regie | PersonActor of either project org, any role except crew |

Every route: resolveActorFromSession, refuse token actors, load the row, `requireProjectActor(actor, row.project_id)`, then the matrix rule. Crew token surfaces never render PDF download buttons.

## Navigation model

- CommandBar (components/project/CommandBar.tsx) grows a role-aware second line for PERSON actors only (token surfaces unchanged): EPC: Pregled, Naročilnica, Ure in dodatna dela, Zaključek; sub office: Naročilnica, Ure in dodatna dela, Zaključek. Keys: nav.overview "Pregled", nav.po "Naročilnica", nav.hours "Ure in dodatna dela", nav.final "Zaključek". Active state: gold underline per the dark system. Add the nav row in Task 3 (first consumer) and extend it in Tasks 9 and 12 as routes land; links to routes that do not exist yet are NEVER rendered early.
- The ProjectList header gains the NotificationBell in Task 4.
- CrewHome: IncidentButton and RequestButton are prominent quick actions rendered OUTSIDE the material-gate branch (rain on day 1 before the material check is a real story; CrewHome renders only MaterialCheck while `material.needsFirstCheck`). A compact two-button row under the report card deep-links to /p/[token]/hours with the tab preselected (Task 9).
- SubHome cards fill in as tasks land: naročilnica state + accept CTA (Task 3), hours and change orders summary (Tasks 9-11), finalization card (Task 12).
- EPC dashboard StatRow chips deep-link: open hours chip to /hours, requests chip and incidents chip to their panel anchors.

## Data shapes (decided before code; later tasks consume these names EXACTLY)

```ts
// lib/notify.ts (server). THE event engine. Consumes lib/notify-shared.ts (exists).
export async function emitEvent(input: {
  projectId: string;
  kind: NotifyKind;
  actorPerson: string | null;          // people.id or null for token actors
  payload: Record<string, string>;     // small, pre-formatted, renderable values
  skipActivity?: boolean;              // true for entry_submitted and
                                       // material_check_completed: their RPCs
                                       // already insert the activity row
}): Promise<void>;
// 1. insert activity unless skipActivity (kind is in the M3'-expanded CHECK)
// 2. load the project (epc_org_id, sub_org_id, language, name)
// 3. recipients: sides from recipientsFor(kind); epc side = people of epc_org_id
//    with role in (admin, bauleiter, owner); sub side = people of sub_org_id with
//    role in (admin, owner). Crew never gets notifications.
// 4. insert one notifications row per recipient (kind, payload)
// 5. for each recipient with an email and wantsEmail(prefs, kind): sendEmail with
//    subject and body resolved from the PROJECT language catalog:
//    const catalog = (await import(`@/messages/${lang}.json`)).default
//    subject = formatTemplate(lookupKey(catalog, emailSubjectKey(kind)), vars)
//    where vars = { project: projectName, ...payload }. html = renderEmail(
//    subject, [body], ctaLabel, `${appBaseUrl()}/${lang}/app/${projectId}`).
//    When appBaseUrl() is null: skip the send and log it through email_log with
//    error "no-base-url" (mirror the login guard).
// 6. await notifyProject(projectId)
// Failures in 5 never throw; emitEvent NEVER throws into a write path (wrap the
// body after step 1 in try/catch; console.error gated to NODE_ENV development).
// Callers on response-critical paths wrap the call in after().

// lib/notify-shared.ts ADDITIONS (pure, tested):
export function formatTemplate(tpl: string, vars: Record<string, string>): string;
// replaces {name} tokens; unknown tokens stay literal; no ICU here (emails are
// plural-free by construction; callers pre-format any count).
export function lookupKey(catalog: unknown, dottedKey: string): string | null;
// walks "notify.subject.po_sent" through the nested catalog; null when absent.
```

```ts
// lib/incidents-shared.ts (pure, tested)
export type IncidentKind = "incident" | "rain_stop" | "obstruction";
export const INCIDENT_KINDS: IncidentKind[];
export const MAX_INCIDENT_PHOTOS = 6;
export function validateIncident(input: { kind: string; note: string; photoCount: number }):
  | { ok: true; kind: IncidentKind; note: string }   // note trimmed; "" allowed except for kind "incident"
  | { ok: false; error: "kind" | "note" | "photos" };
// note REQUIRED nonempty only for kind "incident"; rain_stop and obstruction
// allow empty (typing in rain is not mandatory; renderers show the kind label).
```

```ts
// lib/po-shared.ts (pure, tested)
export interface PoLine { description: string; qty: number | null; unit: string | null;
  unitPrice: number | null; total: number; sortOrder: number }
export function round2(n: number): number;
export function lineTotal(qty: number | null, unitPrice: number | null): number | null;
// round2(qty * unitPrice) when both present and finite, else null (manual total)
export function poTotals(lines: { total: number }[]): number;  // round2 sum
export function formatMoney(n: number, locale: "sl" | "de" | "en"): string;
// Intl.NumberFormat, EUR printed as "12.345,67 EUR" style (word, not symbol, in PDFs)
```

```ts
// lib/hours-shared.ts (pure, tested)
export const HOLIDAYS: Record<"si" | "de" | "at", string[]>;  // ISO dates, 2026 AND 2027
export function addWorkingDays(startIso: string, days: number, country: "si"|"de"|"at"): string;
// working days are Mon..Sat excluding HOLIDAYS[country]; the start day itself is
// excluded; returns an ISO DATE (the deadline day)
export function deadlineTimestamp(deadlineDateIso: string): string; // `${date}T23:59:59.000Z`
export type SheetStatus = "draft" | "submitted" | "approved" | "rejected" | "deemed_approved";
export function effectiveStatus(row: { status: SheetStatus; deadline_at: string | null }, now: Date): SheetStatus;
// submitted past deadline reads as deemed_approved (display truth before persistence)
export function workingDaysLeft(deadlineIso: string, now: Date, country: "si"|"de"|"at"): number;
export const DECISION_WORKING_DAYS = 6;  // the VOB/B value; a parameter, not magic
```

```ts
// lib/invoice-shared.ts (pure, tested)
export type VatMode = "reverse_charge" | "standard";
export function defaultVatMode(siteCountry: "si"|"de"|"at"): VatMode; // "reverse_charge" for all pilot pairs
export function reverseChargeNote(siteCountry: "si"|"de"|"at"): string; // the three statutory sentences, exact
export function standardVatRate(siteCountry: "si"|"de"|"at"): number;   // 22 / 19 / 20
export interface InvoiceLine { kind: "po" | "regie" | "change_order"; description: string;
  qty: number | null; unit: string | null; unitPrice: number | null; total: number }
export function composeInvoiceLines(input: {
  po: { totalNet: number; regieHourlyRate: number | null; label: string } | null;
  approvedRegieHours: { sheetNumber: number; hours: number }[];
  approvedChangeOrders: { number: number; title: string; amount: number | null }[];
}): { lines: InvoiceLine[]; totalNet: number; warnings: string[] };
// regie: hours x rate; rate null with hours present -> warning CODE "no-rate",
// regie lines OMITTED (never silently zero-priced). change orders with null
// amount -> warning CODE "co-no-amount", omitted. Warnings are CODES, the UI
// maps them to invoice.warnNoRate / invoice.warnCoNoAmount (K2 parser precedent:
// pure cores never know i18n namespaces).
export function computeTotals(totalNet: number, mode: VatMode, rate: number | null):
  { totalVat: number | null; totalGross: number };
export function nextInvoiceNumber(year: number, existing: string[]): string;
// "2026-001" style; max over the year's numbers plus one; gaps stay gaps
```

```ts
// lib/report-days-shared.ts (pure, tested)
export function buildDayReports(
  entryDates: string[],       // daily_entries.entry_date values, any order, duplicates fine
  incidentDates: string[],    // incidents.occurred_on values
): { dateIso: string; reportNo: number }[];
// ordered union of dates carrying entries OR incidents, numbered 1..n ascending;
// calendar gaps are fine, numbering never skips
export function diaryTitleKey(country: string | null): "final.diaryTitleSi" | "final.diaryTitleDeAt";
// "si" gets the Slovenia positioning title; everything else Bautagesbericht
```

```ts
// lib/pdf/theme.ts: light-paper palette (ink #0a1628, line #e6e9ef, accent
// #2b7de9, muted #8a95a6, white paper), Font.register of
// public/fonts/InterVariable.ttf at 400 and 700 at MODULE level,
// Font.registerHyphenationCallback disabling hyphenation. Shared primitives:
// Header({ title, docNo, projectName }), Footer({ generatedLabel }) fixed
// absolute bottom, LabelValue({ label, value }), FlexTable({ columns:
// { label, widthPct, align? }[], rows }), SignatureBox({ name, image? }:
// Buffer renders the png, undefined renders a blank line).
// Documents (each a plain function returning a <Document>; strings arrive as a
// plain object `s` from the caller, because @react-pdf components cannot call
// next-intl hooks; the caller builds `s` with getMessagesFor(lang), a tiny
// server helper importing the catalog directly):
//   lib/pdf/narocilnica.tsx   NarocilnicaDocument({ po, lines, project, epcOrg, subOrg, s })
//   lib/pdf/day-report.tsx    DayReportDocument({ day, s })       // one day page set
//   lib/pdf/completion.tsx    CompletionDocument({ cover, days, registers, s })
//   lib/pdf/abnahme.tsx       AbnahmeDocument({ acceptance, defects, project, signatures, s })
//   lib/pdf/regiebericht.tsx  RegieberichtDocument({ sheet, lines, project, s })
//   lib/pdf/invoice.tsx       InvoiceDocument({ invoice, s })
// InvoiceDocument BRANCHES ON vat_mode: the reverse_charge branch has NO VAT row
// in its JSX at all and renders the note line instead: structural prevention.
```

---

## Task 1: PDF engine bootstrap

**Files:**
- Copy: `C:\DevEnv\AVE-DC\dashboard\public\fonts\InterVariable.ttf` to `public/fonts/InterVariable.ttf` (Inter is OFL licensed; AVE-DC is read-only, copy only)
- Create: `lib/pdf/theme.ts`
- Test: `tests/pdf-theme.test.ts`
- Modify: `package.json` (`npm install @react-pdf/renderer@4.5.1`; lockfile in the same commit)

**Interfaces:**
- Consumes: nothing new
- Produces: theme.ts primitives (Header, Footer, LabelValue, FlexTable, SignatureBox) and the registered-font side effect; every Document in Tasks 3, 10, 13, 14, 15 imports theme.ts first

- [ ] **Step 1:** `npm install @react-pdf/renderer@4.5.1`; verify `npm ls @react-pdf/renderer` prints 4.5.1.
- [ ] **Step 2:** Copy the TTF; verify the file exists and is larger than 300KB.
- [ ] **Step 3:** Write the failing test: a SmokeDocument built from the primitives (Header title "Belin", one FlexTable with two rows, Footer), `renderToBuffer`, assert the buffer starts with `%PDF`, then extract its text with unpdf and assert it contains "Belin". Run `npx vitest run tests/pdf-theme.test.ts`, expect FAIL (module missing).
- [ ] **Step 4:** Implement theme.ts per the shape. Font path via `path.join(process.cwd(), "public", "fonts", "InterVariable.ttf")`. NO "server-only" import (the test imports it under plain Node; it holds no secrets: the K2 precedent, DECISIONS 2026-07-20).
- [ ] **Step 5:** Run green. This closes the loop: our tests read our own PDFs, which the legal-text assertions of Tasks 13, 14, 15 rely on.
- [ ] **Step 6:** Commit: "feat(pdf): engine bootstrap ported from AVE-DC pattern" (+ CHANGELOG line).

## Task 2: notifications engine (M3', emitEvent, first events wired)

**Files:**
- Create: `supabase/migrations/20260812100000_incidents_notifications.sql` (SQL above, constraint-name caution), `lib/notify.ts`
- Modify: `lib/notify-shared.ts` (add formatTemplate, lookupKey), `lib/database.types.ts` (hand-mirror incidents, incident_photos, notifications), `lib/data/reports.ts` (submitDailyReport emits entry_submitted, skipActivity true), `lib/data/materials.ts` (submitMaterialCheck emits material_check_completed on shortfall only, skipActivity true), `messages/*.json` (notify.subject.*, notify.body.*, notify.cta)
- Test: `tests/notify-shared.test.ts` (extend)

**Interfaces:**
- Consumes: recipientsFor, wantsEmail, emailSubjectKey, emailBodyKey, sendEmail, renderEmail, appBaseUrl, notifyProject (all exist)
- Produces: `emitEvent` (shape above), consumed by Tasks 3, 5, 6, 7, 9, 10, 11, 12, 14, 15

- [ ] **Step 1:** Failing tests for the pure additions: formatTemplate("List št. {number}", { number: "3" }) gives "List št. 3"; unknown token stays literal; lookupKey resolves "notify.subject.po_sent" through a nested object; missing path gives null. Run FAIL.
- [ ] **Step 2:** Implement, run green.
- [ ] **Step 3:** Probe the real activity CHECK constraint name via the connector (`select conname from pg_constraint where conrelid = 'public.activity'::regclass and contype = 'c'`), put the real name in the migration, apply M3' via the connector AND commit the identical file. Probes: notifications insert and delete; activity accepts kind incident_created, rejects a bogus kind (expect failure); clean.
- [ ] **Step 4:** Hand-mirror types; `npm run seed`; `npm run lint` green.
- [ ] **Step 5:** Implement lib/notify.ts per the shape. ALL notify copy keys land now, all 17 kinds, Slovenian, vikanje (de/en placeholders, one CHANGELOG debt line):
  notify.cta "Odpri v Belinu";
  notify.subject.entry_submitted "Novo dnevno poročilo: {project}" / notify.body.entry_submitted "{author} je oddal dnevno poročilo.";
  material_check_completed "Prevzem materiala z manki: {project}" / "Ekipa je zabeležila manjkajoči material pri prevzemu.";
  request_created "Nova zahteva z gradbišča: {project}" / "{author}: {text}";
  request_resolved "Zahteva rešena: {project}" / "Zahteva ekipe je rešena.";
  incident_created "Zaplet na gradbišču: {project}" / "{kindLabel}. {note}";
  hours_submitted "Oddane režijske ure: {project}" / "List št. {number} ({hours} ur) čaka na vašo odločitev.";
  hours_decided "Odločitev o režijskih urah: {project}" / "List št. {number}: {decision}.";
  hours_deemed_approved "Režijske ure samodejno potrjene: {project}" / "List št. {number} se po poteku roka šteje za potrjenega.";
  change_order_submitted "Nov zahtevek za dodatna dela: {project}" / "{title}";
  change_order_decided "Odločitev o dodatnih delih: {project}" / "Zahtevek št. {number}: {decision}.";
  po_sent "Nova naročilnica: {project}" / "Prejeli ste naročilnico. Preglejte jo in odločite v aplikaciji.";
  po_accepted "Naročilnica sprejeta: {project}" / "Naročilnico je sprejela oseba {name}.";
  po_rejected "Naročilnica zavrnjena: {project}" / "Naročilnica je zavrnjena. Razlog: {note}";
  finalization_requested "Projekt pripravljen za prevzem: {project}" / "Podizvajalec je zahteval zaključek projekta.";
  acceptance_signed "Prevzem opravljen: {project}" / "Zapisnik o prevzemu je podpisan in shranjen.";
  invoice_sent "Račun poslan računovodstvu: {project}" / "Račun {number} je poslan na {email}.";
  document_expiring "Dokument poteka: {title}" / "Dokument {title} poteče {date}." (payload-only vars; emitEvent tolerates a kind whose subject carries no {project}).
- [ ] **Step 6:** Wire entry_submitted and material_check_completed ONLY, both skipActivity true (their RPCs already write the activity row). Calls go AFTER the RPC succeeded; a notify failure cannot un-succeed the submit. The existing notifyProject call at those two sites is REMOVED (emitEvent pings; never double-ping).
- [ ] **Step 7:** Verify in preview: submit a report on the demo crew token; probe DB: exactly ONE entry_submitted activity row (the RPC's), notifications rows exist for the EPC office people, email_log carries demo-domain refusals.
- [ ] **Step 8:** Commit: "feat(notify): event engine with email fanout, first two events wired".

## Task 3: naročilnica (TWO commits)

**Files:**
- Create: `lib/po-shared.ts`, `lib/data/purchase-orders.ts` (`getPoView`, `createPo`, `updatePoDraft`, `sendPo`, `acceptPo`, `rejectPo`), `lib/pdf/narocilnica.tsx`, `app/api/pdf/po/[poId]/route.ts`, `app/[locale]/app/[projectId]/po/page.tsx` with colocated `actions.ts`, `components/po/PoBuilder.tsx`, `components/po/PoView.tsx`
- Modify: `components/project/CommandBar.tsx` (nav row per the navigation model), `components/sub/SubHome.tsx` (naročilnica card), `lib/storage.ts` (`storeReportPdf(path, buffer)`: uploads a Buffer to the reports bucket, upsert true)
- Test: `tests/po-shared.test.ts`

**Interfaces:**
- Consumes: emitEvent (Task 2), theme.ts (Task 1), requireOfficeActor, requireProjectActor
- Produces: the accepted PO row (regie_hourly_rate, total_net, number) consumed by Task 15; `storeReportPdf` reused by Tasks 10, 13, 14, 15

- [ ] **Step 1:** Failing tests: round2 half-away-from-zero at 2 decimals; lineTotal(3, 2.005) is 6.02; lineTotal(null, 5) is null; poTotals sums to 2 decimals; formatMoney(12345.67, "sl") contains "12.345,67". Run FAIL, implement, green.
- [ ] **Step 2 (commit 1):** Data layer. All transitions office-gated: EPC side create/update/send (allowBauleiter FALSE: money), SUB side accept/reject. Single conditional updates: sendPo `where id = $1 and status = 'draft'` RETURNING; acceptPo and rejectPo `where id = $1 and status = 'sent'` RETURNING; zero rows throws the localized conflict. createPo REFUSES when an accepted PO exists on the project (one live contract in v1); number = max plus 1 per project, catch 23505, retry once. sendPo: render NarocilnicaDocument, storeReportPdf to `${projectId}/po/${poId}.pdf`, sha256 via node:crypto over the exact bytes, write pdf_path, pdf_sha256, sent_at inside the conditional update, emitEvent po_sent. acceptPo: download the stored PDF, re-hash, compare to pdf_sha256 BEFORE the conditional update (a mismatch throws po.conflict: defense against swapped files), write accepted_at, accepted_by_person, accepted_by_name = actor.fullName ALWAYS (the evidence snapshot survives person deletion), emitEvent po_accepted (recipients both). rejectPo requires a nonempty note, emitEvent po_rejected.
- [ ] **Step 3 (commit 1):** NarocilnicaDocument: parties with vat_id (orderer = EPC org, contractor = sub org), "Naročilnica št. {number}", date, site address, lines FlexTable, total via formatMoney, currency, payment terms, deadline, place of performance, acceptance block naming the mechanics (accepted in Belin by a named authenticated user, server timestamp, sha256 printed ON the PDF). PDF route per the access matrix.
- [ ] **Step 4 (commit 1):** PoBuilder (frontend-design skill first): first line prefilled "Montaža FV sistema {kWp} kWp, {address}" from project data; editable lines (description, qty, unit default "kos", unit_price, total from lineTotal with manual override), total_net auto-summed, regie_hourly_rate, payment_terms, deadline. When project.sub_org_id is null: po.noSub plus the existing AddSubPanel rendered RIGHT THERE (not a settings link: invites moved onto the project, commit 666dbc7). The CommandBar nav row lands in this commit (Pregled + Naročilnica; later tasks append their links). Commit: "feat(po): narocilnica data layer, pdf and builder".
- [ ] **Step 5 (commit 2):** PoView for the sub OFFICE (SubHome card carries the CTA; person-only): inline PDF link, accept opens a confirm sheet showing po.acceptNote and requiring checkbox po.acceptConfirm; reject requires a note. Copy (vikanje): po.title "Naročilnica", po.create "Pripravi naročilnico", po.send "Pošlji podizvajalcu", po.regieRate "Urna postavka za režijske ure", po.paymentTerms "Plačilni pogoji", po.deadline "Rok izvedbe", po.accept "Sprejmi naročilnico", po.reject "Zavrni", po.rejectNote "Razlog zavrnitve", po.acceptConfirm "Potrjujem, da sprejemam naročilnico po navedeni ceni.", po.acceptNote "S sprejemom se strinjate s ceno in pogoji. Sprejem se zabeleži z imenom, časom in prstnim odtisom dokumenta.", po.accepted "Sprejeta {date}", po.rejected "Zavrnjena", po.sent "Poslana {date}", po.draft "Osnutek", po.noSub "Najprej dodajte podizvajalca.", po.conflict "Naročilnica je bila medtem spremenjena. Osvežite stran.", po.download "Prenesi PDF".
- [ ] **Step 6:** Verify in two browsers. Demo personas cannot receive real mail; use the Part B technique: the dev log prints the magic link before the send is refused, so sign in as Matej (EPC) in one browser and Ana (sub) in another locally. EPC creates and sends; Ana sees the SubHome card, opens the PDF, accepts; both confirmation emails in email_log; the hash printed on the PDF equals pdf_sha256 in the row; a second rapid send hits the conflict path; the crew token surface shows no PO anywhere.
- [ ] **Step 7:** Commit: "feat(po): office acceptance with hash binding".

## Task 4: in-app notification bell

**Files:**
- Create: `components/app/NotificationBell.tsx` (client), `lib/data/notifications.ts` (`getUnreadCount`, `listNotifications` latest 20, `markAllRead`), `app/[locale]/app/actions.ts` (new: markAllRead action)
- Modify: the ProjectList page header (mount the bell), CommandBar (optional bell slot, person actors only, right of the status control)

- [ ] **Step 1:** Data functions take PersonActor (the bell is person-only; token surfaces never render it). listNotifications returns kind, payload, project name, created_at; the client maps kind + payload to one-liners via useTranslations over the notify.body.* keys, relative time.
- [ ] **Step 2:** Bell: unread badge; tap opens a dark-system panel; opening marks all read (ONE update: `set read_at = now() where recipient_person = $1 and read_at is null`). Freshness: router.refresh() from live sync covers project pages; the list page refetches on the wake pattern (LiveRefresh reducer precedent). Log in CHANGELOG as accepted behavior, not debt.
- [ ] **Step 3:** Copy: notify.title "Obvestila", notify.empty "Ni novih obvestil.".
- [ ] **Step 4:** Verify at 375px: badge count, panel, mark-read cycle, no horizontal overflow.
- [ ] **Step 5:** Commit: "feat(notify): in-app bell and inbox".

## Task 5: crew incident capture

**Files:**
- Create: `lib/incidents-shared.ts`, `lib/data/incidents.ts` (`createIncident(actor: ProjectActor, payload)`, `listIncidents(actor, sinceDays)`), `components/crew/IncidentButton.tsx`
- Modify: `lib/storage.ts` (`createIncidentPhotoTargets`, mirroring createPhotoUploadTargets), BOTH action files (token and session variants calling the same lib function), `components/crew/CrewHome.tsx` (mount OUTSIDE the material-gate branch), `components/sub/SubHome.tsx` (same button for the office)
- Test: `tests/incidents-shared.test.ts`

**Interfaces:**
- Consumes: emitEvent, PhotoCapture (existing: props blobs/onChange/addLabel), projectToday (lib/project-time.ts)
- Produces: incidents rows consumed by Task 6 (panel) and Task 13 (day pages)

- [ ] **Step 1:** Failing validator tests: all three kinds valid; kind "flood" invalid; empty note invalid ONLY for kind incident; 7 photos invalid; 0 photos valid. Run FAIL, implement, green. Commit the pure core: "feat(incidents): validator core".
- [ ] **Step 2:** createIncident: validate, UUID-check client ids, insert incidents plus incident_photos, emitEvent incident_created with payload { kindLabel: the label resolved server-side from the PROJECT language catalog (incident.kinds.*), note }. occurred_on defaults to projectToday.
- [ ] **Step 3:** IncidentButton (frontend-design skill; 30-second law): one tap opens a bottom sheet: three big kind buttons with icons, note field (required only for Zaplet), optional PhotoCapture, PendingButton submit. Renders on CrewHome OUTSIDE the needsFirstCheck branch (rain on day 1 is the demo story).
- [ ] **Step 4:** Copy (vikanje): incident.cta "Prijavi zaplet", incident.kinds.incident "Zaplet", incident.kinds.rain_stop "Dež, prekinitev", incident.kinds.obstruction "Ovira", incident.note "Kaj se je zgodilo?", incident.submit "Pošlji", incident.sent "Zabeleženo.", incident.obstructionHint "Ovira pomeni, da naročnik ali tretja stran preprečuje delo. Naročnik bo obveščen takoj.".
- [ ] **Step 5:** Verify on the phone viewport with the demo crew token: full capture under 30 seconds one-handed; an open dashboard in a second tab updates live without reload.
- [ ] **Step 6:** Commit: "feat(incidents): crew capture with photos and instant notify".

## Task 6: EPC dashboard incidents and compliance panels

**Files:**
- Create: `components/epc/dashboard/IncidentsPanel.tsx`, `components/epc/dashboard/CompliancePanel.tsx`
- Modify: `lib/data/epc-dashboard.ts` (join incidents last 14 days plus counts by kind; join the sub org's vault docs with expiryState), `components/epc/EpcDashboard.tsx` (IncidentsPanel after MaterialPanel, CompliancePanel after it)

- [ ] **Step 1:** IncidentsPanel: `section.e-sec.e-reveal`, kind-tinted rows (rain blue, obstruction amber, incident red, existing token palette), note or kind label when note empty, date, photo thumbnails through the shared Lightbox, empty state.
- [ ] **Step 2:** CompliancePanel: sub org name, A1 and Freistellungsbescheinigung rows FIRST with expiryState traffic lights, then other docs; a type with no row renders dashboard.docMissing. Amber and red states emitEvent document_expiring ONCE per document per threshold, deduped via document_reminders (insert days_before 30 or 0 only when absent; the race is harmless: worst case one duplicate email; say so in a comment).
- [ ] **Step 3:** Copy: dashboard.incidents "Zapleti", dashboard.noIncidents "Ni zabeleženih zapletov.", dashboard.compliance "Dokumenti podizvajalca", dashboard.docMissing "Ni naloženo".
- [ ] **Step 4:** Verify: the Task 5 incident renders with lightbox; two consecutive loads produce ONE reminder row (probe DB, clean).
- [ ] **Step 5:** Commit: "feat(dashboard): incidents and compliance panels".

## Task 7: material requests (crew asks, EPC resolves)

**Files:**
- Create: `lib/data/requests.ts` (`createRequest`, `resolveRequest`, `listRequests`), `components/crew/RequestButton.tsx`, `components/epc/dashboard/RequestsPanel.tsx`
- Modify: `lib/storage.ts` (`createRequestPhotoTarget`, single photo), both action files, CrewHome (next to IncidentButton, outside the gate), EpcDashboard (RequestsPanel after IncidentsPanel; StatRow open-requests chip)

**Interfaces:**
- Consumes: emitEvent; the requests table (exists since day one, zero app code: this is its first consumer)
- Produces: request rows (nothing else consumes them in v1)

- [ ] **Step 1:** createRequest: sub side, type in (material, plan, instruction), text required nonempty, optional single photo at `${projectId}/request/${clientId}-${uuid}.jpg`, emitEvent request_created (payload { author, text }). resolveRequest: epc side, ONE conditional update `where id = $1 and status = 'open'` RETURNING, sets response_note and resolved_at, emitEvent request_resolved.
- [ ] **Step 2:** RequestButton (same visual family as IncidentButton, 30-second law): sheet with type select, text, photo. The SAME sheet lists the crew's own open and recently resolved requests WITH the EPC's response_note (crew has no inbox; this list is their answer channel).
- [ ] **Step 3:** RequestsPanel: open requests with resolve action and response-note field; StatRow chip when any open.
- [ ] **Step 4:** Copy (vikanje): request.cta "Zahtevaj", request.types.material "Dodaten material", request.types.plan "Načrt ali dokument", request.types.instruction "Navodilo", request.text "Kaj potrebujete?", request.submit "Pošlji zahtevo", request.sent "Poslano.", request.yourRequests "Vaše zahteve", request.resolvedTag "Rešeno", dashboard.requests "Zahteve", dashboard.resolve "Reši", dashboard.responseNote "Odgovor ekipi", dashboard.noRequests "Ni odprtih zahtev.".
- [ ] **Step 5:** Verify: crew requests material with photo; EPC resolves with note; the crew sheet shows the note; both notification rows exist; live ping fires.
- [ ] **Step 6:** Commit: "feat(requests): crew requests and epc resolution".

## Task 8: hours core (TDD)

**Files:**
- Create: `lib/hours-shared.ts`
- Test: `tests/hours-shared.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: addWorkingDays, deadlineTimestamp, effectiveStatus, workingDaysLeft, DECISION_WORKING_DAYS, consumed by Tasks 9, 10, 13, 15

The holiday calendars, written out in full (verify each against a calendar during implementation; Easter 2026 is 05.04, Easter 2027 is 28.03):

```ts
export const HOLIDAYS: Record<"si" | "de" | "at", string[]> = {
  si: [
    "2026-01-01","2026-01-02","2026-02-08","2026-04-06","2026-04-27",
    "2026-05-01","2026-05-02","2026-06-25","2026-08-15","2026-10-31",
    "2026-11-01","2026-12-25","2026-12-26",
    "2027-01-01","2027-01-02","2027-02-08","2027-03-29","2027-04-27",
    "2027-05-01","2027-05-02","2027-06-25","2027-08-15","2027-10-31",
    "2027-11-01","2027-12-25","2027-12-26",
  ],
  de: [ // federal only in v1 (Bundesland tables are post-v1, veto list)
    "2026-01-01","2026-04-03","2026-04-06","2026-05-01","2026-05-14",
    "2026-05-25","2026-10-03","2026-12-25","2026-12-26",
    "2027-01-01","2027-03-26","2027-03-29","2027-05-01","2027-05-06",
    "2027-05-17","2027-10-03","2027-12-25","2027-12-26",
  ],
  at: [
    "2026-01-01","2026-01-06","2026-04-06","2026-05-01","2026-05-14",
    "2026-05-25","2026-06-04","2026-08-15","2026-10-26","2026-11-01",
    "2026-12-08","2026-12-25","2026-12-26",
    "2027-01-01","2027-01-06","2027-03-29","2027-05-01","2027-05-06",
    "2027-05-17","2027-05-27","2027-08-15","2027-10-26","2027-11-01",
    "2027-12-08","2027-12-25","2027-12-26",
  ],
};
```

- [ ] **Step 1:** Failing tests, exact pins (all three computed and verified with real date arithmetic on 2026-08-12; they are the contract, so re-derive them once at implementation and only change them if the calendar disagrees with the arithmetic, never to make an implementation pass):
  - `addWorkingDays("2026-08-14", 6, "si")` is `"2026-08-22"`. Start Friday 14.08 is excluded. Saturday 15.08 is a Slovenian holiday and does not count. Sundays never count. The six are Mon 17, Tue 18, Wed 19, Thu 20, Fri 21, Sat 22.
  - `addWorkingDays("2026-08-14", 6, "de")` is `"2026-08-21"`. The SAME input, one day earlier, because 15.08 is not a German federal holiday, so Saturday 15 counts: Sat 15, Mon 17, Tue 18, Wed 19, Thu 20, Fri 21. This pair is the test that proves the country parameter is really used.
  - `addWorkingDays("2026-12-23", 6, "de")` is `"2027-01-02"`. Thu 24 counts, 25.12 and 26.12 are holidays, Sun 27 skipped, Mon 28 through Thu 31 count (four), 01.01 is a holiday, Sat 02.01 is the sixth. This is the year-boundary case: without the 2027 holiday list, 01.01 would be counted as a working day and the deadline would land a day early.
  - `effectiveStatus`: submitted with a past deadline reads deemed_approved; with a future deadline stays submitted; approved and rejected stay themselves regardless of the deadline; draft with a null deadline stays draft.
  - `workingDaysLeft`: 0 on the deadline day itself, 1 on the preceding working day, and never negative (past deadlines clamp to 0).
- [ ] **Step 2:** Run FAIL, implement, run green.
- [ ] **Step 3:** Commit: "feat(hours): working-day deadline core with 2026 and 2027 holiday calendars".

## Task 9: sub-side hour sheets

**Files:**
- Create: `app/[locale]/app/[projectId]/hours/page.tsx` with colocated `actions.ts`, `app/[locale]/p/[token]/hours/page.tsx` (same components, token actor), `components/hours/HoursTabs.tsx` (segmented control: sheets | change orders), `components/hours/SheetList.tsx`, `components/hours/SheetEditor.tsx`, `lib/data/hours.ts` (`listSheets`, `getSheet`, `createSheet`, `addLine`, `removeLine`, `submitSheet`)
- Modify: CommandBar nav row (add nav.hours), CrewHome (two-button deep-link row under the report card), SubHome (hours summary card)

**Interfaces:**
- Consumes: addWorkingDays, deadlineTimestamp, DECISION_WORKING_DAYS (Task 8), emitEvent
- Produces: hour_sheets rows and lines consumed by Tasks 10 and 15

- [ ] **Step 1:** createSheet: number = max plus 1 per project (catch 23505, retry once), status draft, sub side (crew token OR sub person; drafting hours is site work, not contract-forming). addLine: work_date defaults today, hours DEFAULTS TO 8 with quick chips 4, 8, 10 and a 0.5 Stepper (16 taps for a standard day violates law 1), description required (schema NOT NULL), person defaults to the previous line's person. submitSheet: ONE conditional update `where id = $1 and status = 'draft'` RETURNING, sets submitted_at, deadline_at = deadlineTimestamp(addWorkingDays(todayIso, DECISION_WORKING_DAYS, project.country)), emitEvent hours_submitted (payload number, hours total). Draft sheets editable, submitted read-only.
- [ ] **Step 2:** Page titled nav.hours "Ure in dodatna dela" (change orders live here too, Task 11); deep links preselect the tab via ?tab=co.
- [ ] **Step 3:** Copy (vikanje): hours.title "Režijske ure", hours.new "Nov list", hours.addLine "Dodaj vrstico", hours.hoursLabel "Ure", hours.date "Datum", hours.person "Oseba", hours.description "Opis dela", hours.submit "Oddaj v potrditev", hours.submitted "Oddano {date}", hours.deadline "Rok za odziv: {date}", hours.deemedNote "{n, plural, one {Brez odziva v # delovnem dnevu se list šteje za potrjen.} two {Brez odziva v # delovnih dnevih se list šteje za potrjen.} few {Brez odziva v # delovnih dnevih se list šteje za potrjen.} other {Brez odziva v # delovnih dnevih se list šteje za potrjen.}}", hours.empty "Ni še listov.", hours.total "Skupaj: {hours} ur".
- [ ] **Step 4:** Verify phone viewport on the crew token: adding a standard 8-hour line is under 30 seconds; submit stamps the deadline; the same surface works signed in as Ana.
- [ ] **Step 5:** Commit: "feat(hours): sub-side regie sheets".

## Task 10: EPC decisions, deemed approval, Regiebericht PDF

**Files:**
- Create: `lib/pdf/regiebericht.tsx`, `app/api/pdf/regie/[sheetId]/route.ts`
- Modify: `lib/data/hours.ts` (`decideSheet(actor, sheetId, approve, note)`, `persistDeemed(projectId)`), the hours page (EPC decision buttons, countdown badges), EpcDashboard StatRow (open-hours chip when any submitted)

**Interfaces:**
- Consumes: effectiveStatus, workingDaysLeft (Task 8), emitEvent, theme.ts, storeReportPdf
- Produces: decided/deemed sheet statuses consumed by Task 15; persistDeemed consumed by Tasks 13 and 15

- [ ] **Step 1:** decideSheet: epc office (allowBauleiter TRUE: reviewing site hours is exactly the Bauleiter's job), ONE conditional update: `where id = $1 and status = 'submitted' and (deadline_at is null or deadline_at > now())` RETURNING (kills the two-decider race AND forbids rejecting a sheet that already deemed by deadline); zero rows shows hours.conflict. Sets status, decided_at, decided_by_person, emitEvent hours_decided (payload number, decision resolved to the sl label server-side).
- [ ] **Step 2:** persistDeemed: ONE update `set status = 'deemed_approved' where project_id = $1 and status = 'submitted' and deadline_at <= now()` RETURNING rows, emitEvent hours_deemed_approved per row; called on hours page load AND at the top of generateInvoice and assembleCompletionData (they read DB status and would silently drop deemed hours otherwise).
- [ ] **Step 3:** Countdown badge per submitted sheet: workingDaysLeft, amber at 2, red at 1 and 0, key hours.daysLeft "{n, plural, one {# delovni dan do roka} two {# delovna dneva do roka} few {# delovni dnevi do roka} other {# delovnih dni do roka}}".
- [ ] **Step 4:** RegieberichtDocument: header (project, sheet number, status, submitted and decided stamps with decider name), lines FlexTable (date, person, hours, description), total hours, decision block (name, timestamp; epc_signature_path stays null in v1). PDF route per the matrix; the hours.pdf button renders for person actors only, never on the crew token page.
- [ ] **Step 5:** Copy: hours.approve "Potrdi", hours.reject "Zavrni", hours.rejectNote "Razlog zavrnitve", hours.deemed "Potrjeno po poteku roka", hours.conflict "List je bil medtem odločen ali je rok potekel.", hours.pdf "Prenesi PDF", hours.open "V odločanju".
- [ ] **Step 6:** Verify: approve path, reject path; deemed path by setting a probe sheet's deadline_at into the past via the connector, load the page, confirm persistence plus notification, clean up.
- [ ] **Step 7:** Commit: "feat(hours): epc decisions, deemed approval, regiebericht pdf".

## Task 11: change orders (Nachtraege)

**Files:**
- Create: `components/hours/ChangeOrderList.tsx`, `components/hours/ChangeOrderEditor.tsx`, `lib/data/change-orders.ts` (`listChangeOrders`, `createChangeOrder`, `decideChangeOrder`)
- Modify: HoursTabs (second tab), lib/storage.ts (`createChangeOrderPhotoTargets`), both action files, SubHome summary card

**Interfaces:**
- Consumes: emitEvent; change_orders (amount column exists since M2) and change_order_photos tables
- Produces: approved change orders with amounts consumed by Task 15

- [ ] **Step 1:** createChangeOrder: sub side, title required, description optional, amount nullable but the editor nags (co.amountHint), photos 0..6 at `${projectId}/co/${clientId}/${i}-${uuid}.jpg`, number = max plus 1 (catch 23505, retry once), status submitted (the schema default), emitEvent change_order_submitted. decideChangeOrder: epc office (allowBauleiter TRUE), ONE conditional update `where id = $1 and status = 'submitted'` RETURNING, sets decided stamps, emitEvent change_order_decided.
- [ ] **Step 2:** Tab UI: hours.tabHours "Režijske ure", hours.tabCo "Dodatna dela"; EPC side shows decision buttons and the photo lightbox.
- [ ] **Step 3:** Copy: co.title "Dodatna dela", co.new "Nov zahtevek", co.titleField "Naziv", co.desc "Opis", co.amount "Znesek (neto)", co.amountHint "Brez zneska dodatek ne bo zaračunan na računu.", co.submit "Oddaj", co.approve "Potrdi", co.reject "Zavrni", co.approved "Potrjeno", co.rejected "Zavrnjeno", co.submitted "Oddano".
- [ ] **Step 4:** Verify: submit with photo and amount as crew, approve as EPC, notifications both ways, lightbox works.
- [ ] **Step 5:** Commit: "feat(co): change orders end to end".

## Task 12: M4', finalization request, the final hub

**Files:**
- Create: `supabase/migrations/20260812110000_invoices_acceptance_fields.sql` (SQL above), `app/[locale]/app/[projectId]/final/page.tsx` (hub: report, acceptance, invoice cards, stubbed until their tasks land)
- Modify: `lib/database.types.ts` (invoices, acceptance columns), `lib/data/projects.ts` (emitEvent finalization_requested fired on the active-to-reviewing transition inside updateProjectStatus), SubHome (finalization card with confirm sheet), CommandBar nav row (nav.final)

FOUNDER VETO, 2026-08-12: requesting finalization IS its own office-only action, not a fold into the shared status machine. `requestFinalization(actor, projectId)` lives in lib/data/projects.ts, is gated by requireOfficeActor on the SUB side (allowBauleiter false: this is the moment a subcontractor declares the job finished and hands it over), performs the active-to-reviewing move as ONE conditional update `where id = $1 and status = 'active'` RETURNING, and emits finalization_requested. The crew token surface does NOT offer it; a crew person who tries gets common.askOffice. The shared status control keeps its other transitions unchanged, but loses the sub-side active-to-reviewing move, which now belongs to this action alone (otherwise two paths reach the same state and only one of them notifies). Update lib/project-status.ts accordingly and adjust its tests.

- [ ] **Step 1:** Apply M4' with probes: reverse_charge plus vat_rate insert expecting failure; second invoice for one project expecting failure; acceptance declaration "maybe" expecting failure; clean. Commit the file plus hand-mirrored types: "feat(schema): invoices and acceptance fields (M4')".
- [ ] **Step 2:** Wire emitEvent finalization_requested into updateProjectStatus for the active-to-reviewing transition (and ONLY that transition), after the existing compare-and-swap succeeded, skipActivity true if the existing path already logs project_updated activity for it (VERIFY in code which it does; never double-log).
- [ ] **Step 3:** SubHome finalization card: current status, final.request button with confirm sheet, shows final.requested when reviewing. The /final hub page renders three cards with graceful empty states.
- [ ] **Step 4:** Copy: final.title "Zaključek", final.request "Zaključi projekt", final.requestConfirm "Naročnik bo obveščen, da je projekt pripravljen za prevzem.", final.requested "Zaključek zahtevan {date}", final.reportCard "Zaključno poročilo", final.acceptanceCard "Prevzem", final.invoiceCard "Račun".
- [ ] **Step 5:** Verify: sub requests finalization, EPC gets the notification and email row, status flips to reviewing, the activity feed shows exactly one row for it.
- [ ] **Step 6:** Commit: "feat(final): finalization request and hub".

## Task 13: day reports and completion report (TWO commits)

**Files:**
- Create: `lib/report-days-shared.ts`, `lib/pdf/day-report.tsx`, `lib/pdf/completion.tsx`, `lib/data/final-report.ts` (`assembleCompletionData(actor, projectId)`, `generateCompletionReport(actor, projectId)`), `app/api/pdf/report/[docId]/route.ts`
- Modify: the final hub (report card: generate button, download link)
- Test: `tests/report-days-shared.test.ts`, PDF text assertions in `tests/pdf-completion.test.ts`

**Interfaces:**
- Consumes: buildDayReports, diaryTitleKey (this task), persistDeemed (Task 10), theme.ts, storeReportPdf, generated_documents (kind completion_report)
- Produces: the completion PDF and its generated_documents row

- [ ] **Step 1:** TDD the pure core: buildDayReports with entry dates {1.8, 3.8}, incident dates {2.8, 3.8} yields three days numbered 1, 2, 3 (union, ascending, no gaps, no duplicates); diaryTitleKey("si") / ("de") / (null). Run FAIL, implement, green.
- [ ] **Step 2 (commit 1):** DayReportDocument per day page: header via diaryTitleKey (si: final.diaryTitleSi "Dnevno poročilo podizvajalca"; de/at: final.diaryTitleDeAt "Bautagesbericht") plus "št. {reportNo}", date, weather morning and midday from the FIRST entry of the date when several exist (the existing weather jsonb and weather-codes keys), headcount from the first entry, work performed (entry notes plus quantities with names and units), incidents of the day with kind labels, photo grid two columns capped at 4 photos per day (trap 14: Buffers from storage, skip failures), author line, signature slot. Commit: "feat(final): day report document core".
- [ ] **Step 3 (commit 2):** assembleCompletionData: calls persistDeemed FIRST, then ONE batched fetch set (entries plus quantities plus photos, incidents, hour sheets, change orders, acceptance when signed). generateCompletionReport: PendingButton UX final.generating "Pripravljam poročilo ...", REFUSES while a generated_documents row of this kind is under a minute old (double-click cannot start a second assembly), renders CompletionDocument (cover with project data, kWp, dates, org names, totals; all day pages ascending; registers: hour sheets with number, hours, status, decided date; change orders with number, title, amount, status; incidents summary; defect register referencing the acceptance annex), stores to `${projectId}/final/completion-${docId}.pdf`, inserts generated_documents (kind completion_report, language = project language).
- [ ] **Step 4:** Sequential numbering assertion IN TEST: build a two-day fixture document, extract text with unpdf, assert "št. 1" and "št. 2" present and "št. 3" absent.
- [ ] **Step 5:** Verify on the CURRENT demo project: 9 day pages numbered 1..9, photos render, weather lines present, registers filled.
- [ ] **Step 6:** Commit: "feat(final): completion report assembly and route".

## Task 14: acceptance flow with penalty reservation

**Files:**
- Create: `components/final/AcceptanceFlow.tsx`, `components/SignaturePad.tsx` (canvas, pointer events, toBlob png, clear and confirm, one-handed), `lib/data/acceptances.ts` (`getAcceptance`, `startAcceptance`, `saveAcceptanceStep`, `addDefect`, `removeDefect`, `signAcceptance`), `lib/pdf/abnahme.tsx`, `app/api/pdf/abnahme/[acceptanceId]/route.ts`
- Modify: the final hub (acceptance card), lib/storage.ts (`createSignatureTarget(projectId, acceptanceId, side)`)

**Interfaces:**
- Consumes: theme.ts, storeReportPdf, emitEvent, the M4' acceptance columns
- Produces: the signed acceptance and abnahme PDF; warranty_start consumed by nothing else in v1

- [ ] **Step 1:** Flow, EPC office starts (requireOfficeActor allowBauleiter TRUE: the Bauleiter conducts acceptances): kind (final/partial), attendees text, defect list (description, optional photo, due date, agreed/disputed toggle writing acceptance_defects.agreement), the penalty reservation CHECKBOX bound to acceptances.penalty_reserved with the fixed sentence final.penaltyReservation "Naročnik si izrecno pridržuje pravico do uveljavljanja pogodbene kazni." rendered next to it, declaration select (accepted, with_reservations, refused), warranty_start date defaulting to today when declaration is accepted. EVERY step persists server-side to the draft acceptance row immediately (saveAcceptanceStep; defects insert as typed; signatures upload as produced): a dropped connection on a roof loses nothing; reopening resumes from stored state.
- [ ] **Step 2:** Signatures pass-the-device: EPC signs on the pad (epc_signer_name prefilled with actor.fullName), hands the phone over; sub_signer_name is a REQUIRED field next to the second pad (prefilled with the sub org's admin name, editable), sub signs. PNGs upload to `${projectId}/acceptance/${acceptanceId}-epc.png` and -sub.png.
- [ ] **Step 3:** signAcceptance: refuses unless both signature paths and sub_signer_name are stored; ONE conditional update `where id = $1 and status = 'draft'` RETURNING, sets signed, conducted_at; then renders AbnahmeDocument (parties, date, attendees, kind, defect table with agreement column, declaration, warranty_start, the reservation sentence VERBATIM when penalty_reserved and ABSENT otherwise, both signature images as Buffers with printed names), stores to `${projectId}/final/abnahme-${acceptanceId}.pdf`, writes report_pdf_path, inserts generated_documents (kind abnahmeprotokoll), emitEvent acceptance_signed.
- [ ] **Step 4:** Copy: final.acceptance "Prevzem", final.startAcceptance "Začni prevzem", final.kindFinal "Končni prevzem", final.kindPartial "Delni prevzem", final.attendees "Prisotni", final.defects "Pomanjkljivosti", final.addDefect "Dodaj pomanjkljivost", final.dueDate "Rok za odpravo", final.agreed "Usklajeno", final.disputed "Sporno", final.declaration "Izjava", final.declAccepted "Prevzeto", final.declReservations "Prevzeto s pridržki", final.declRefused "Prevzem zavrnjen", final.signEpc "Podpis naročnika", final.signSub "Podpis podizvajalca", final.signHint "Podpišite se s prstom", final.subSignerName "Ime in priimek podpisnika", final.warranty "Začetek garancijske dobe: {date}", final.penaltyReservation as above, final.signAndClose "Podpiši in zaključi".
- [ ] **Step 5:** PDF text assertions in test: a fixture acceptance with penalty_reserved true contains the sentence; with false it is absent; both signer names present.
- [ ] **Step 6:** Verify the full flow on the phone viewport including a mid-flow reload resuming from stored state.
- [ ] **Step 7:** Commit: "feat(final): acceptance protocol with signatures and penalty reservation".

## Task 15: invoice generation and accountant share

**Files:**
- Create: `lib/invoice-shared.ts`, `lib/data/invoices.ts` (`getInvoice`, `generateInvoice`, `shareToAccountant`), `lib/pdf/invoice.tsx`, `app/api/pdf/invoice/[invoiceId]/route.ts`, `components/final/InvoiceCard.tsx`
- Test: `tests/invoice-shared.test.ts`, `tests/pdf-invoice.test.ts`

**Interfaces:**
- Consumes: composeInvoiceLines inputs: the accepted PO (Task 3), approved and deemed sheets (Tasks 9, 10), approved change orders (Task 11); persistDeemed; theme.ts; storeReportPdf; sendEmail (attachment variant, see Step 3)
- Produces: the invoice row and PDF

- [ ] **Step 1:** TDD invoice-shared fully: composeInvoiceLines all three sources; rate null with hours gives warning "no-rate" and omits regie lines; co amount null gives "co-no-amount" and omits; everything empty gives zero lines (the caller refuses); computeTotals both modes; nextInvoiceNumber(2026, ["2026-001","2026-003"]) is "2026-004"; reverseChargeNote exact strings for all three countries; standardVatRate; defaultVatMode. Run FAIL, implement, green. Commit: "feat(invoice): composition core".
- [ ] **Step 2:** generateInvoice: requireOfficeActor (sub side, or epc acting on behalf; allowBauleiter FALSE), calls persistDeemed FIRST; refuses with invoice.exists when one exists (unique index backs it; catch 23505 into the same message); refuses with invoice.errNoVatId unless BOTH orgs carry vat_id in reverse mode; refuses zero-line compositions with invoice.errEmpty; vat_mode from project.vat_mode falling back to defaultVatMode(project.country); snapshots supplier and customer jsonb from organizations (name, address, vat_id, iban); number via nextInvoiceNumber over the sub org's existing numbers (catch 23505, recompute once); service_start and service_end from the first and last day-report dates; renders InvoiceDocument and stores the PDF AT GENERATION, writing pdf_path in the same operation (share and download always have bytes); emitEvent invoice_generated is NOT a NotifyKind: write the activity row directly (kind invoice_generated is in the M3' CHECK).
- [ ] **Step 3:** shareToAccountant: requireOfficeActor; confirm sheet DISPLAYS the destination address (invoice.shareConfirm) before sending; refuses with invoice.errNoAccountant when the sharing actor's own org has no accountant_email; downloads the stored PDF, sends via Resend with the attachment (extend sendEmail with an optional `attachments: { filename, content: Buffer }[]` passthrough; same timeout, same logging); records sent_to_accountant_at plus the accountant_email snapshot in ONE conditional update `where id = $1 and sent_to_accountant_at is null` RETURNING (double-share safe); emitEvent invoice_sent.
- [ ] **Step 4:** InvoiceDocument: full Art. 226 field set from the snapshots; lines FlexTable; totals: standard branch renders net, rate, VAT, gross; reverse branch is a STRUCTURALLY DIFFERENT block (net, the note sentence, gross equal to net) with NO VAT JSX at all.
- [ ] **Step 5:** PDF tests with unpdf: reverse fixture contains the si note and does NOT contain "DDV" as a totals row label nor any "%" in the totals block; standard fixture contains "22" and a VAT amount.
- [ ] **Step 6:** Copy (vikanje): invoice.title "Račun", invoice.generate "Ustvari račun", invoice.download "Prenesi PDF", invoice.share "Pošlji računovodstvu", invoice.shareConfirm "Račun bo poslan na {email}.", invoice.shared "Poslano na {email} dne {date}", invoice.exists "Račun za ta projekt že obstaja.", invoice.errNoVatId "Manjka ID za DDV. Dopolnite v nastavitvah.", invoice.errNoAccountant "V nastavitvah ni e-pošte računovodstva.", invoice.errEmpty "Ni postavk za račun.", invoice.warnNoRate "Urna postavka ni določena na naročilnici, režijske ure niso zaračunane.", invoice.warnCoNoAmount "Nekateri potrjeni dodatki nimajo zneska in niso zaračunani.". The statutory reverse-charge sentences stay in lib code.
- [ ] **Step 7:** Verify end to end on a scratch project: accepted PO plus approved hours plus approved CO compose correctly; the share lands in email_log with the attachment noted.
- [ ] **Step 8:** Commit: "feat(invoice): composed invoice, reverse-charge-safe pdf, accountant share".

## Task 16: portfolio dashboard

**Files:**
- Create: `lib/data/portfolio.ts` (`getPortfolio(actor)`: one batched query set across org projects)
- Modify: `app/[locale]/app/page.tsx`, `components/app/ProjectList.tsx`

- [ ] **Step 1:** Load the dataviz skill BEFORE any code (saved memory; twice skipped, twice rebuilt).
- [ ] **Step 2:** Aggregate header strip (active projects, open hour sheets, open incidents this week, kWp in progress), per-project cards enriched (progress bar, tempo sparkline reusing the TempoChart core math, status, open items count). Cut rule if the founder calls time: ship the enriched cards, skip the sparkline; the strip numbers stay.
- [ ] **Step 3:** Copy: portfolio.active "Aktivni projekti", portfolio.openHours "Odprte režijske ure", portfolio.openIncidents "Zapleti ta teden", portfolio.kwp "kWp v izvedbi".
- [ ] **Step 4:** Verify at 375px and desktop; measure the sparkline geometry itself (trap 5: the element carrying the value, not its container).
- [ ] **Step 5:** Commit: "feat(portfolio): epc portfolio dashboard".

## Task 17: three-phase demo staging

**Files:**
- Modify: `scripts/seed-demo.mjs` (keep CURRENT and START, add FINAL)

FINAL fixed UUIDs: project `33333333-3333-4333-8333-333333333335`, scope items `44444444-4444-4444-8444-4444444444 21|22|23`, entries `55555555-5555-4555-8555-5555555555 60..`, tokens `demo-epc-final-m4t7x2`, `demo-sub-final-b9v5k3`. Reuse the existing demo orgs and people; do NOT create new companies.

STAGING RULE, REVISED BY FOUNDER VETO 2026-08-12: the seed DOES stage a sent naročilnica on START and a sent-then-accepted one on FINAL, so the demo needs no prep clicks. The original objection stands on the facts and is answered by construction rather than by writing rows no code path could produce: a PO with status sent and pdf_path null cannot be opened, and acceptPo re-hashes the stored PDF, so a null pdf_sha256 would refuse acceptance on stage.

Therefore staging is a TWO PART operation and the second part is not optional:

1. `scripts/seed-demo.mjs` writes the PO rows, lines, statuses and stamps as before.
2. `scripts/seed-documents.ts` (run under tsx, invoked at the end of `npm run seed`) renders the real NarocilnicaDocument for every seeded PO through lib/pdf, uploads it to the reports bucket at the documented path, computes the sha256 of those exact bytes, and writes pdf_path and pdf_sha256 back. Accepted rows additionally carry accepted_by_person, accepted_by_name and accepted_at, all consistent with the document that now exists.

The demo therefore opens with genuine PDFs and genuine hashes, and the acceptance a prospect sees on FINAL verifies against the stored file exactly as a real one does. If step 2 fails, the seed must FAIL LOUDLY rather than leave sent rows without documents.

What the seed writes:
- START: as today, plus a DRAFT PO with prefilled lines and a regie rate.
- CURRENT: as today (nine working days, roughly half built), plus two incidents (one rain_stop three days ago, one obstruction yesterday with a photo), two open requests, one submitted hour sheet whose deadline_at is TWO DAYS AHEAD (so the countdown badge is live in the demo), one approved hour sheet, one submitted change order with an amount.
- FINAL: full history (entries across the whole span, an incident set, one approved sheet, one deemed_approved sheet, one approved change order with amount), a DRAFT PO, no invoice, no acceptance.

- [ ] **Step 1:** Extend the seed with FINAL and the staged rows above; every insert upserts by fixed UUID so a second run is a no-op (the existing pattern).
- [ ] **Step 2:** Seed twice; probe: no duplicate rows anywhere, all three projects render on every surface (EPC dashboard, SubHome, crew token, portfolio), the countdown badge shows on CURRENT.
- [ ] **Step 3:** Commit: "feat(seed): three-phase demo staging".

## Task 18: the landing page, proper and expanded

**Files:**
- Rewrite: `app/[locale]/page.tsx`; create `components/landing/*` sections
- Assets: `public/landing/*` (screenshots captured from the seeded surfaces)

Founder decision 7: PROTECTED, do not cut to one hero section. Load the frontend-design skill FIRST. Keep the login form section working and intact (a landing that deploys with a dead login form is the one unacceptable outcome).

- [ ] **Step 1:** Sections, Slovenian (translated in Task 19): hero (existing dark identity, headline "Gradbišče v žepu.", subline "Belin poveže EPC in monterske ekipe: načrt noter, dokumentacija ven.", CTA to login plus a mailto), the drop (K2 upload story with a REAL screenshot of the wizard review screen), the day loop (crew phone screenshot beside the dashboard screenshot, "30 sekund na dan."), truth moments (three cards with screenshots: zapleti, odštevanje pri režijskih urah, manjkajoči material), paperwork finale (completion report and invoice thumbnails, "Papirologija? Narejena."), compliance strip (A1, Freistellungsbescheinigung, gostovanje v EU, Frankfurt), footer (getbelin.com, mailto contact, one-line imprint).
- [ ] **Step 2:** Screenshots from the seeded surfaces at phone and desktop sizes, optimized into public/landing/. Every section must work TEXT-FIRST if a shot is missing: never ship an empty image slot.
- [ ] **Step 3:** Verify at 375px and 1280px: no horizontal overflow, images sized and lazy, every string through landing.* keys.
- [ ] **Step 4:** Commit: "feat(landing): expanded product landing".

## Task 19: the single translation pass (clears ALL i18n debt)

**Files:** `messages/de.json`, `messages/en.json`; CHANGELOG debt lines closed

- [ ] **Step 1:** Translate EVERY key currently carrying a Slovenian placeholder: the old debt (landing, auth, crew.material, dashboard.material, dashboard.tempo, wizard, projects, sub, app, settings, invite, vault, share) plus every namespace this plan added (notify, po, incident, request, hours, co, final, invoice, portfolio, nav). German first (the German EPC is the pilot), then English. Vikanje becomes Sie in German.
- [ ] **Step 2:** ICU plurals: German and English use their own two-form plural rules; do not copy the four Slovenian forms mechanically.
- [ ] **Step 3:** The penalty reservation clause in German is the standard wording: "Der Auftraggeber behält sich die Geltendmachung der Vertragsstrafe ausdrücklich vor." The reverse-charge notes are code constants and stay untouched.
- [ ] **Step 4:** The Slovenia positioning rule holds across locales: si projects title the diary "Dnevno poročilo podizvajalca" (sl), "Tagesbericht des Nachunternehmers" (de), "Subcontractor daily report" (en); de and at projects say "Bautagesbericht" (sl "Dnevno poročilo", en "Daily site report"). diaryTitleKey selects by project COUNTRY, the catalog then by locale.
- [ ] **Step 5:** Verify: parity test green, no empty strings, and spot-check a German invoice PDF and a German day report for umlauts (the Inter TTF covers them; this is the first time we render them).
- [ ] **Step 6:** Commit: "feat(i18n): full de and en translation pass, debt cleared".

## Task 20: security cleanup and deploy hygiene

**Files:** `lib/auth-shared.ts` (demo login gating), Vercel env (founder action), README runbook

- [ ] **Step 1:** Rotate the Supabase service-role key (founder clicks in the Supabase dashboard, then updates SUPABASE_SERVICE_ROLE_KEY in Vercel env AND in .env.local in the same sitting: a stale local key silently breaks the seed). Redeploy, then verify BOTH a login and a signed photo URL mint (both paths use the service role).
- [ ] **Step 2:** DEMO_LOGIN removed from every Vercel environment: magic link only in production. The demo scenario pill and DevSwapBar render only when DEMO_LOGIN is 1 (local .env.local keeps it).
- [ ] **Step 3:** Secret sweep BY VALUE SHAPE, not by name: `git grep -nE "re_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}"` must return nothing. Named references like SUPABASE_SERVICE_ROLE_KEY in admin.ts and .env.example are expected and fine.
- [ ] **Step 4:** Confirm no raw login token, invite token or verify URL is logged outside a NODE_ENV development guard (review `git grep -n "console.log" app lib components` by eye).
- [ ] **Step 5:** Re-check the five PDF routes and every action added by this plan against the access matrix and the office-gate rules; record the checklist in the session log.
- [ ] **Step 6:** Storage buckets still private; probe one signed URL expiry.
- [ ] **Step 7:** Commit: "chore(security): demo login removed, key rotated, sweeps".

## Task 21: final QA, acceptance script, runbook

**Files:** `docs/demo/runbook-v2.md`, session log, CHANGELOG, DECISIONS.md

- [ ] **Step 1:** Run the ENTIRE acceptance script below top to bottom ON PRODUCTION, fixing forward; every fix its own commit. Deploying is not verifying (Part B paid for this lesson: the local flow was green while production was dead).
- [ ] **Step 2:** The dash sweep (trap 12) over messages, app, components, lib and this plan file: must print nothing.
- [ ] **Step 3:** Gates: `npm run lint` clean, `npm test` green, `npm run build` clean (dev server stopped first, trap 1), messages parity green.
- [ ] **Step 4:** Runbook v2: the demo walk (START onboarding with the QR moment: the prospect scans the crew link, submits a report from their own phone, the wall dashboard updates live; CURRENT mid-project story with the countdown and the incident; FINAL paperwork finale; portfolio zoom-out), the prep ritual (seed fresh, then the staging clicks: send both POs, accept on FINAL as Ana, conduct the acceptance, generate the completion report and the invoice), reset steps, known rough edges.
- [ ] **Step 5:** SECURITY RITUAL in the runbook: a crew token shown as a QR to an audience is a live capability. After any event where it was displayed, regenerate the demo crew token (delete and re-insert the project_tokens row). The stable-token rule applies only to the four session-bound demo tokens, not to a QR shown on a wall.
- [ ] **Step 6:** Session end ritual: session log, CHANGELOG, DECISIONS.md entries for the deviations this plan records (finalization via the status machine, seed staging rule, bell freshness).
- [ ] **Step 7:** Commit: "docs: v1 runbook and QA pass complete".

---

## The acceptance script: v1 is done when this passes on production

On the production URL, in Slovenian, phone viewport for every crew-facing step.

1. **Landing:** the expanded landing renders with real product screenshots, no placeholder blocks, no horizontal overflow at 375px, the login form works.
2. **Auth:** enter the founder's address, receive a real magic-link email, click, confirm, land in the project list. Log out (the sessions row shows revoked true, not just a cleared cookie), log back in.
3. **Onboarding (START):** open the wizard, upload `tests/fixtures/k2/k2-report-2025.pdf` FIRST, watch name, address and metadata prefill, edit one quantity, attach the sub, commit. The material list shows the parsed rows. Build the naročilnica with a price and a regie hourly rate, send it. As Ana in a second browser: open it, read the PDF, accept. BOTH sides get a confirmation email; the PO shows accepted with the authenticated acceptor name, timestamp, and the hash printed on the PDF matching pdf_sha256.
4. **Mid-project (CURRENT):** as crew, log a rain_stop incident with a photo in under 30 seconds one-handed. The EPC dashboard shows it live without reload, and the EPC person gets an in-app notification and an email. Crew requests additional material with a photo; the EPC resolves it with a note that the crew can read. Crew submits an hour sheet; the EPC sees the six-working-day countdown and approves it; the sub is notified. Crew submits a change order with an amount; the EPC approves it.
5. **Finalization (FINAL):** the sub requests finalization; the EPC generates the completion report: cover, day pages with sequential numbers and no gaps, weather on every day page that has an entry, photos, hour-sheet register, change-order register, incident register. Conduct the acceptance with one defect and both on-screen signatures (pass-the-device, sub signer named); the protocol PDF contains the express penalty reservation sentence. Generate the invoice: reverse-charge mode prints the statutory note and NO VAT line anywhere; the share sheet displays the destination address before sending, then the PDF reaches the accountant address.
6. **Portfolio:** the project list shows all three demo projects with progress, status and the aggregate numbers.
7. **Gates:** lint clean, tests green, build clean, parity green, de and en fully translated with no Slovenian placeholders, no console errors, zero em or en dashes anywhere, service-role key rotated, demo password login gone from production.

## Defaults chosen on the founder's behalf (veto list, carried forward and amended)

1. Custom magic-link auth on our own tables, not Supabase Auth. SHIPPED, no longer vetoable without a migration.
2. Crew never gets accounts: crew joins by shareable link and QR. Only EPC and sub office roles log in.
3. One email address maps to one person. A person working for two orgs needs two addresses in v1.
4. New dependencies capped: this plan adds exactly ONE, @react-pdf/renderer.
5. The regie hourly rate lives on the naročilnica; change orders carry an amount; the invoice refuses to silently price anything and warns instead.
6. Invoice numbering "YYYY-NNN" per sub organization, max plus one at generation.
7. Deemed approval is persisted lazily on page load and before invoice or report assembly, no cron; effectiveStatus keeps every display truthful in between.
8. German holidays are the federal list only in v1.
9. Notification emails default ON per kind, switchable per person; crew receives none.
10. The bell refreshes through existing live sync and focus wake, with no dedicated realtime channel.
11. Contract-forming acts (PO accept and reject, acceptance signing, invoice generation and share) are PERSON-ONLY, never crew-token.
12. PDF downloads are person-session only; no tokens in URLs; crew token surfaces show no PDF buttons.
13. Emails to the fake `*-demo.si` seed addresses are refused at the sender; the founder's real address is the one deliverable demo inbox.
14. One invoice per project in v1 (database-enforced). One accepted PO per project.
15. VETOED BY THE FOUNDER 2026-08-12: demo seeds DO stage sent and accepted naročilnice, so the demo needs no prep clicks. Made safe by seeding real documents: scripts/seed-documents.ts renders each seeded PO through the real PDF code, uploads it, and writes back pdf_path and the sha256 of those exact bytes, so a staged acceptance verifies against its stored file exactly like a real one. The seed fails loudly if that step fails.
16. VETOED BY THE FOUNDER 2026-08-12: requesting finalization is its own office-only action on the sub side, not a fold into the shared status machine. The sub-side active-to-reviewing transition moves out of the status control so only one path reaches that state and it always notifies.
17. AMENDED (new): reviewing hour sheets and change orders, and conducting an acceptance, allow the Bauleiter (`allowBauleiter: true`). Money-moving acts (org banking fields, PO create and send, invoice generation and share) stay admin and owner only.
18. Landing legal footer is a one-line imprint plus mailto in v1; proper legal pages are post-v1.

## Post-v1 parking lot (recorded, not planned)

The 60-second ad (storyboard in the design record, produce from the staged demo). Priloga-1 printable statutory day sheet. Abschlagsrechnung (partial invoices). Behinderungsanzeige letter generation. DATEV, e-SLOG, ZUGFeRD. Web push. Offline queue. Planner adapters beyond K2. Bundesland holiday calendars. Supabase Auth migration. Legal pages. Crew accounts. Multi-project invoices.

## Self-review of this plan

**Coverage.** Every gap named in the 2026-08-12 assessment maps to a task: PDF engine (1), notifications engine and bell (2, 4), naročilnica with hash-bound acceptance (3), incidents (5, 6), requests (7), Regiestunden with deemed approval (8, 9, 10), change orders (11), finalization request and hub (12), completion report (13), acceptance protocol (14), invoice and accountant share (15), portfolio (16), demo staging (17), landing (18), translations (19), security (20), QA and runbook (21). The five v1 modules of HANDOFF.md section 3 are then all built: projects and parties (shipped), compliance vault (shipped, surfaced in 6), daily log (shipped, rendered to PDF in 13), Regiestunden (8-10), Nachträge and Abnahme (11, 14).

**Deviations from the 2026-07-20 master plan, each deliberate and each stated at its task.** email_log removed from M3' (shipped in Part B). exceljs never installed and no xlsx path anywhere (the adapter was deleted, DECISIONS 2026-07-20). Task C2's wizard is done and is not re-planned. Sub invitation is a project-level shareable link, not a settings email invite (commit 666dbc7), so Task 3 renders AddSubPanel inline instead of linking to settings. requestFinalization folds into the existing status machine rather than becoming a new office-only action. M4' additionally migrates the acceptance columns the old G3 needed but never created. Incident notes may be empty and renderers show the kind label, instead of storing localized UI copy in a data row. Warning strings from pure cores are CODES everywhere, matching the K2 precedent.

**Type consistency.** ProjectActor is what every lib/data function takes; PersonActor only where the office gate applies; OrgActor only for the wizard. storeReportPdf is defined once (Task 3) and reused by 10, 13, 14, 15. persistDeemed is defined in Task 10 and called by 13 and 15. buildDayReports and diaryTitleKey are defined in Task 13 and used by its own documents plus the translation rule in Task 19. formatMoney comes from po-shared and is used by every money-printing document. sendEmail grows its optional attachments parameter exactly once, in Task 15.

**Known risks, named rather than hidden.** (a) @react-pdf on Node 22 with Next 15: the Task 1 smoke test is deliberately the first thing built, so an incompatibility surfaces in five minutes rather than at Task 13. (b) The holiday pins in Task 8 must be hand-checked against a calendar before they become the contract. (c) Photo-heavy completion reports on weak LTE: capped at 4 photos per day page, generation refuses to run twice within a minute. (d) Two person sessions in one browser is impossible (the cookie is browser-global): every two-party verification step names two browsers.
