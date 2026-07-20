# Belin v1 Master Plan: ship the entire product by Sunday 26.07 evening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: authored 2026-07-20 by the planning session (Fable), for execution by Opus in a fresh session. Grounded in four recon and research agents run 2026-07-20 (app recon, schema recon, AVE-DC PDF engine recon, Slovenian signature law research) plus the design record docs/superpowers/specs/2026-07-19-v1-ship-everything-design.md. Defaults chosen on the founder's behalf are listed at the end and can be vetoed before or during execution.

**Goal:** the whole v1 product: accounts and orgs, K2 ingest, narocilnica with in-app acceptance, notifications, incidents, Regiestunden, finalization with Bautagesbericht, acceptance and invoice, portfolio, a proper landing page, staged four-phase demo data. The demo IS the product with fake data (founder reframe, DECISIONS.md 2026-07-19).

**Architecture:** everything extends the proven patterns already in the repo: server-only data access through the `Actor` seam with the service-role client (RLS stays deny-all), pure tested `*-shared.ts` cores, colocated server actions, contentless broadcast pings for live sync, next-intl catalogs with the parity test. New: a person-based session next to the token session, a PDF engine ported from AVE-DC/dashboard, Resend email, deterministic K2 parsing.

**Tech stack additions:** @react-pdf/renderer 4.5.1, unpdf (PDF text extraction, used by the K2 parser AND by PDF-output tests), exceljs (K2 article-list Excel), resend (official SDK). Nothing else. No zod, no auth libraries, no @supabase/ssr.

Execution kickoff: run the session start ritual (CLAUDE.md, DECISIONS.md, recent CHANGELOG.md, latest session log), then execute tasks in order. Every task ends with its verification and a commit. Every push deploys to production; each task below is additive and safe to deploy, EXCEPT where a task says HOLD PUSH (Task B3 note). Load the frontend-design skill BEFORE any UI task, and the dataviz skill BEFORE Task H1 (saved memory: skipping cost two rebuilds).

## The founder's decisions (2026-07-20), all now CLOSED

1. Slovenia diary: research verdict (agent, 2026-07-20, sources PIS, Uradni list): an on-screen signature is a simple e-signature under eIDAS art. 25(1); only a qualified e-signature equals a handwritten one (art. 25(2)), and Pravilnik o gradbiscih art. 10(4) demands a lastnorocni podpis on duplicate paper sheets. The replacement Uredba o gradbiscih is still a draft, so the 2008 Pravilnik governs. Therefore: the generated diary is positioned as "dnevno poročilo podizvajalca", contractual site documentation mirroring the statutory fields, never a claimed statutory gradbeni dnevnik. Note: most Slovenian rooftop PV needs no gradbeno dovoljenje, so no statutory diary duty exists on those projects at all. A Priloga-1 printable sheet is parking lot, not v1.
2. VAT: per-project setting defaulted by country pair. Founder moved the finesse to the END of the phase: the invoice ships correct from day one (reverse charge never prints VAT), the settings UX polish and accountant confirmation copy land in Part J.
3. K2 parsing: deterministic parser plus review screen. Founder priority: build step 2, directly after the parser core which is step 1 of the build.
4. Notifications email plus in-app: founder priority step 3.
5. Incidents as their own table (kinds incident, rain_stop, obstruction, multi-photo): founder priority step 4.
6. Price anchor on the narocilnica; invoice composes from it plus approved Regiestunden plus approved change orders: founder priority step 5. Regiestunden has FULL schema but ZERO app code (verified 2026-07-20); Part F builds the UI.
7. Landing page: PROPER and expanded, with visual content (real staged screenshots). Protected, do not cut to one hero section.
8. Ad: after 26.07, storyboard already in the design record.

Priority protection for cuts: K2, notifications, incidents, narocilnica and the landing page are founder priorities and are cut LAST. Cut order if time runs short: portfolio charts first (keep the plain project list), then acceptance defect photos, then the crew-invite UI (tokens shareable from settings instead), then settings logo upload. The email digest is already out of scope.

## The acceptance script: v1 is done when this passes on production

On belin-app.vercel.app, in Slovenian, phone viewport for all crew-facing steps:

1. Landing: the new expanded landing renders with real product screenshots, no placeholder blocks, no horizontal overflow at 375px.
2. Auth: enter the founder's seeded email (see Task B1: SEED_FOUNDER_EMAIL), receive a real Resend magic-link email, click the link, press the confirm button, land in the project list. Log out (server-side revoked, not just cookie), log back in.
3. Phase 1 project (fresh): open the wizard, upload tests/fixtures/k2/k2-report-2025.pdf FIRST, watch name, address and metadata prefill from the parse, review article rows, edit one qty, attach the demo sub org in the wizard's sub step, commit. The material list shows the parsed rows. Generate the narocilnica with a price and a Regie hourly rate, send it. As Ana Novak (sub office login, second browser), open it, see the PDF, accept. Both sides get a confirmation email; the PO shows accepted with the authenticated acceptor name, timestamp and hash.
4. Phase 2 project (mid-project): as crew, log an incident with kind rain_stop and a photo in under 30 seconds one-handed. The EPC dashboard shows it live without reload, and the EPC person gets an in-app notification and an email. Crew requests additional material with a photo; the EPC resolves it with a note. Crew submits an hour sheet; the EPC sees the six-working-day countdown, approves it; the sub gets notified. Crew submits a change order with an amount; the EPC approves it.
5. Phase 3 project (finalization): the sub office requests finalization; the EPC generates the full completion report PDF: cover, day pages with sequential numbers and no gaps, weather on every day page that has an entry, photos, hour-sheet register, change-order register, incident register. Conduct the acceptance with one defect and both on-screen signatures (pass-the-device, sub signer named); the protokoll PDF contains the express penalty reservation text. Generate the invoice: reverse-charge mode prints the statutory note and NO VAT line anywhere; share-to-accountant shows the destination address on the confirm sheet, then sends the PDF to it.
6. Phase 4: the portfolio dashboard shows all demo projects with progress, status and key numbers.
7. Quality gates: `npm run lint` clean, `npm test` green, `npm run build` clean, messages parity green (all three catalogs, no empty strings), de and en fully translated (no Slovenian placeholders left), no console errors, zero em or en dashes in messages, app, components, lib and this plan file, service-role key rotated, demo password login gone from production.

## Global constraints

- CLAUDE.md discipline in full: small verified steps, CHANGELOG.md in the same commit as every change, session logs, no em or en dashes in ANY produced text including UI strings, PDFs, emails and this file.
- Slovenian only while building (founder mandate 2026-07-19): every new UI string is written in Slovenian, de.json and en.json carry the identical Slovenian string as a placeholder, one CHANGELOG debt line per batch. Task J3 is the single deliberate translation pass and clears the debt. Generated PDFs and emails render in the PROJECT language via the same catalogs, so their strings go through i18n keys too, never hardcoded.
- REGISTER (review finding): the shipped catalog is consistently vikanje ("Poskusite znova.", "Označite vse postavke."). Every new string in this plan ships in vikanje; the draft strings below that slipped into tikanje (auth, po, request, invite, final namespaces) are normalized at implementation time: "Preveri e-pošto." becomes "Preverite e-pošto.", "Tvoja prijava" becomes "Vaša prijava", "Kaj potrebuješ?" becomes "Kaj potrebujete?", "S sprejemom se strinjaš" becomes "S sprejemom se strinjate", "Podpiši s prstom" becomes "Podpišite se s prstom", "Tvoje ime" becomes "Vaše ime", and so on across every key. German inherits Sie at J3.
- Every count-bearing string ({n} days, open items) uses ICU plural with the four Slovenian forms (one, two, few, other), following crew.postSummary; never a bare "{n} delovnih dni".
- All state transitions on rows with legal or money meaning (PO send, accept, reject; hour sheet decide; deemed persistence; invite accept; login token consumption) are SINGLE conditional UPDATE statements with the full guard in the WHERE clause and RETURNING; zero rows returned surfaces a localized conflict error. Read-then-write transition checks are forbidden in this plan.
- Role gates: PersonActor role admin or owner (helper `requireOfficeActor`, bauleiter included ONLY where a task says so) is required for: org settings mutations (vat_id, iban, accountant_email especially), invite creation, PO create, send and accept, finalization request, acceptance signing, invoice generation and accountant share. Crew-role people never receive magic links (requestMagicLink refuses them with the same generic success). Crew token actors never reach contract-forming acts.
- The dark system is the only system for app surfaces: `--e-*` tokens, `.belin-dark` scoping, `section.e-sec.e-reveal` for new dashboard panels, never `.e-fadein`. New crew surfaces mirror the existing crew screen. The landing (Part J) has its own `lp-*` system.
- Error convention for server actions: throw on failure, client catches, shows a localized error, preserves state for retry (the report path). Freshness: no revalidatePath anywhere; clients call `router.refresh()` after success. Live sync: call `notifyProject(projectId)` after every write a dashboard should reflect.
- Every new pure core lives in a `lib/*-shared.ts` or `lib/<domain>/*.ts` file with no server imports and gets a vitest file. TDD for every pure core: write the failing test first, run it, implement, run green, commit.
- Storage: PO, invoice and report PDFs go to the `reports` bucket, incident photos to `photos`, signatures to `signatures`. Client-influenced path segments are validated as UUIDs before interpolation (the established storage rule).
- New tables all get `enable row level security` with NO policies (service-role-only access, the repo's deliberate architecture).
- Migrations: apply via the Supabase connector (project xrwncpngjajosstvkign) AND commit the identical file in supabase/migrations/. Prefixes must exceed 20260719180000. After each migration: mirror the types into lib/database.types.ts BY HAND (gen:types exists but is guarded because its output is untrusted in this environment; always hand-mirror), re-run `npm run seed`, probe the changed objects via the connector, clean probe rows.

### Environment traps (all previously hit, all mandatory)

1. Never run `npm run build` while the dev server runs; stop the server first (both write .next).
2. `read_console_messages` returns accumulated history; verify against the current DOM, never console history alone.
3. The session cookie is httpOnly; never "verify" cookie state from page JavaScript.
4. Drive React with `form.requestSubmit()` and real pointer sequences; synthetic enter/leave events do not reach React.
5. Measure the element that carries the value (bar fill, input height), not its container.
6. The safe-area and raised-pill blocks sit at the END of globals.css deliberately; do not re-declare their properties after them.
7. Screenshots time out in the preview (backgrounded renderer); verify with text and geometry probes; the founder verifies motion on a real phone. The preview tab always reports document.hidden true, so visibility-gated code must be tested by simulating a wake.
8. Assert `location.pathname` inside every probe that depends on the current URL.
9. Two roles in one browser: use token routes in two tabs; the cookie session is browser-global.
10. gen:types fails loudly by design; edit lib/database.types.ts manually.
11. After schema changes: seed, probe RPCs at the database level including rejection probes, clean up.
12. `grep -c` counts lines; use `grep -o | wc -l`. The dash sweep is this exact command (proven in this environment, run from the repo root; it must print nothing):
    `node -e "const fs=require('fs'),p=require('path');const roots=['messages','app','components','lib','docs/superpowers/plans/2026-07-20-v1-master-plan.md'];const bad=[];const re=new RegExp('[\u2013\u2014]');const walk=f=>{const s=fs.statSync(f);if(s.isDirectory())return fs.readdirSync(f).forEach(c=>walk(p.join(f,c)));if(!/\.(tsx?|json|css|md|mjs)$/.test(f))return;const t=fs.readFileSync(f,'utf8');if(re.test(t))bad.push(f)};roots.forEach(walk);if(bad.length){console.log(bad.join('\n'));process.exit(1)}"` (the dash characters appear only as \u escapes so the sweep never flags itself)
13. NEW, PDF engine (from AVE-DC recon): photo images MUST be passed to @react-pdf `<Image>` as Buffers, never as Windows path strings (silent failure). Fonts register from `public/fonts/InterVariable.ttf` via `process.cwd()` at MODULE level, once, in the base document file; every other document imports that file for the side effect. Every PDF route declares `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` and returns `new NextResponse(new Uint8Array(buffer))` with Content-Type application/pdf and Cache-Control private, max-age=0, must-revalidate.
14. NEW: photos in generated PDFs come from Supabase Storage, not the local filesystem: download via the admin client (`storage.from("photos").download(path)`), convert to Buffer, tolerate failures by skipping the image, never abort the document.
15. NEW: Resend sends are fire-and-log: wrap in try/catch with a timeout, write email_log either way, NEVER let an email failure break a write path (mirror notifyProject).

## Verified building blocks (recon 2026-07-20, exact locations)

- Actor seam: `lib/actor.ts:10` `TokenActor { kind:"token"; role:"epc"|"sub"; projectId; orgId; tokenId }`, `Actor = TokenActor` at line 18. `resolveActorFromToken(token)` at actor.ts:20 (admin query on project_tokens). `lib/auth.ts:57` `resolveActorFromSession()` reads cookie `belin_session` via `sessionToken()` (auth.ts:47) and delegates to resolveActorFromToken; `startSession(token)` auth.ts:30 (httpOnly, secure in prod, lax, 30 days), `endSession()` auth.ts:41. Demo credentials live in `lib/auth-shared.ts` (DEMO_USERS 12345/54321, SCENARIO_TOKENS, tokenForCredentials at :44), marked temporary.
- Role routing: `app/[locale]/app/page.tsx:19` (session) and `app/[locale]/p/[token]/page.tsx:15` (token) both route sub to CrewHome, else EpcDashboard. Server actions colocated at `app/[locale]/p/[token]/actions.ts` with `requireSubActor` (:19) and `requireEpcActor` (:25); auth actions at `app/actions/auth.ts` (loginAction :20, switchScenarioAction :38, logoutAction :46). There are NO API route handlers yet anywhere.
- Data layer (all take `actor: Actor`): lib/data/reports.ts `getCrewHome` :39, `submitDailyReport` :115; lib/data/materials.ts `getMaterialState` :19, `submitMaterialCheck` :86, `addMaterialItem` :105; lib/data/epc-dashboard.ts `getEpcDashboard` :80; lib/data/projects.ts `updateProjectStatus` :10; lib/data/project-core.ts `getProjectCore` :43; lib/data/tokens.ts `getSiblingToken` :7. Supabase clients: lib/supabase/admin.ts:7 `createAdminClient()` (service role), lib/supabase/client.ts:7 `createBrowserClient()` (anon, deny-all, used for signed uploads and realtime).
- Storage: lib/storage.ts `createPhotoUploadTargets` :17, `createMaterialDocTargets` :37, `getSignedPhotoUrlMap` :84 (unstable_cache 3000s), `UploadTarget {path, token}` :7. Buckets (all private): photos 15MB jpeg/png/webp/heic, plans 30MB pdf, docs 30MB pdf/jpeg/png/webp, signatures 2MB png, reports 30MB pdf.
- Live sync: lib/realtime-shared.ts `projectTopic(projectId)` = `belin:project:${projectId}`, PING_EVENT "ping"; lib/realtime-server.ts:9 `notifyProject(projectId)` POSTs the broadcast REST endpoint, 2500ms timeout, never throws; components/LiveRefresh.tsx:19 subscribes and router.refresh()es; reducer in lib/realtime-client-core.ts.
- i18n: next-intl 4.1; catalogs messages/sl.json, de.json, en.json, 167 leaf keys, namespaces common, project, crew, weather, dashboard, status, landing, auth. Parity test tests/messages-parity.test.ts flattens and compares key sets and forbids empty strings. Slovenian plural pattern to follow: crew.postSummary, dashboard.buffer (one, two, few, other).
- Seed: scripts/seed-demo.mjs, `node --env-file=.env.local`, upserts by fixed UUIDs, deletes and rebuilds history relative to today, stable tokens demo-epc-k7m2x9q4, demo-sub-r8p3n6w1, demo-epc-start-h3k9m2, demo-sub-start-q7w4z8. Orgs: Sonce Energija d.o.o. (epc), AVESOL d.o.o. (sub); people Matej Kovač (bauleiter, keep the diacritic exactly as seeded), Luka Zupan (crew). Projects CURRENT (uuid 3333...3) and START (uuid ...4).
- Components to reuse: PhotoCapture (components/crew/PhotoCapture.tsx:54, props blobs/onChange/addLabel, HEIC fallback, 1600px downscale), Stepper (:5), Lightbox (components/epc/dashboard/Lightbox.tsx:13, items/open/onClose/onStep), CommandBar, PendingButton (useFormStatus), BelinMark, LiveRefresh. EpcDashboard panel order at components/epc/EpcDashboard.tsx:78-96: hero, ProjectionPanel, ScopeByPhase, MaterialPanel, StatRow, LatestOnSite, DailyLogFeed, PhotoGallery.
- IMPORTANT structural fact for Part B (verified): every existing surface is token-threaded. CommandBar, CrewHome, EpcDashboard and MaterialPanel all take a `token: string` prop, and every server action in app/[locale]/p/[token]/actions.ts resolves the actor from that token. Task B4 defines the person-session mechanism explicitly; do not invent one.
- Tests: vitest node environment, tests/**/*.test.ts, 12 files, all pure cores. `npm run lint` is `tsc --noEmit`.
- Schema (23 tables, all RLS enabled, zero policies): full column detail verified 2026-07-20. Ready unused: hour_sheets (status draft/submitted/approved/rejected/deemed_approved, deadline_at, epc_signature_path, unique(project_id, number)) plus hour_sheet_lines (person_id, work_date, hours > 0, description); change_orders (submitted/approved/rejected, NO amount column) plus change_order_photos; acceptances (kind final/partial, status draft/signed, both signer names and signature paths, report_pdf_path) plus acceptance_defects (description, photo_path, due_date, open/resolved); documents vault (types a1, freistellungsbescheinigung, unbedenklichkeitsbescheinigung, id_document, qualification, hfu_status, zko_notification, insurance, other; valid_from, valid_until) plus document_reminders; invites (kind sub_company/crew/epc_member, token unique, status pending/accepted/revoked/expired, expires_at); generated_documents (kinds bautagebuch, regiebericht, nachtrag, abnahmeprotokoll, completion_report; NO invoice). projects.status includes reviewing and finished. activity.kind already includes hours_submitted, hours_decided, hours_deemed_approved, change_order_submitted, change_order_decided, acceptance_signed, document_uploaded, document_expiring. people.role check: admin, bauleiter, owner, crew. organizations: type, name, country, address, contact_email, contact_phone ONLY (no vat_id, iban, accountant_email). MISSING ENTIRELY: purchase orders, invoices, incidents, notifications, email log, plan imports, login/session tables, monetary columns anywhere.
- Latest migration prefix 20260719180000; new ones start at 20260720T (today).
- PDF engine source (AVE-DC recon): C:\DevEnv\AVE-DC\dashboard\lib\pdf\weekly-document.tsx (owns Font.register of public/fonts/InterVariable.ttf for weights 400 and 700 plus registerHyphenationCallback disabling hyphenation, palette const C, StyleSheet.create, hand-built flex tables with percentage widths, absolutely positioned fixed footer) and consolidated-document.tsx (cover page plus per-week pages, imports the weekly module for the font side effect). Routes use renderToBuffer, invoked as plain function calls, runtime nodejs, force-dynamic. @react-pdf/renderer resolved 4.5.1. Copy the TTF file itself from C:\DevEnv\AVE-DC\dashboard\public\fonts\InterVariable.ttf (Inter is OFL licensed). AVE-DC is read-only reference: never modify it.
- K2 fixtures: tests/fixtures/k2/: k2-report-2025.pdf (123KB), k2-report-2023.pdf (224KB), k2-base-report-annotations.pdf (907KB), forum1.pdf (3.1MB), forum2.pdf (1.3MB). Every page footer carries "K2 Base Report <version> | <date> | <project>". Article table columns exactly: Position, Art-Nr., Artikel, Anzahl, Gewicht; 7-digit article numbers; the article list is an OPTIONAL report section (two of the five fixtures lack it); normalize stray spaces inside numbers, German decimal commas, multi-line cells.
- Resend: RESEND_API_KEY in .env.example and Vercel; domain getbelin.com verified. NEXT_PUBLIC_APP_URL scaffolded. The connectors cannot set Vercel env vars: if a new env var is ever needed, the founder sets it in the Vercel dashboard (none is planned; RESEND_API_KEY and NEXT_PUBLIC_APP_URL already exist).

## Legal constants to encode (from the 2026-07-19 and 2026-07-20 research)

- Reverse charge notes by SITE country (project.country): de: "Steuerschuldnerschaft des Leistungsempfängers", at: "Übergang der Steuerschuld auf den Leistungsempfänger", si: "Obrnjena davčna obveznost po 76.a členu ZDDV-1". Wrong VAT on an invoice creates 14c UStG liability: the reverse-charge template must make printing VAT impossible, not just avoided.
- Standard VAT rates when vat_mode is standard: de 19.00, at 20.00, si 22.00.
- Invoice mandatory fields (Art. 226 set): issue date, sequential number, supplier name, address, VAT id, customer name, address, VAT id (mandatory under reverse charge), service description plus project site address, performance period, net amounts and unit prices, the reverse charge note OR rate and VAT amount, currency, due date, IBAN.
- Abnahmeprotokoll: the express reservation of contractual penalty is a TEMPLATE FIELD (checkbox plus fixed sentence), never free text. Fields: parties, date, attendees, kind (final/partial), defects each with description, photo, deadline, status agreed/disputed, declaration (accepted, with reservations, refused), warranty start, both signatures.
- Bautagesbericht day page: report number SEQUENTIAL WITH NO GAPS, date, author, weather morning and midday with temperatures (already auto-fetched, a selling point), crew count, hours, work performed with location and quantities, deliveries, equipment, incidents, instructions, photos timestamped, foreman signature slot.
- Narocilnica acceptance (eIDAS art. 25 simple e-signature strengthened): named authenticated acceptor, server timestamp, immutable PDF snapshot, sha256 hash of the exact accepted PDF bytes, confirmation email to both sides.
- Slovenia positioning string (crew and PDF): the diary artifacts are titled "Dnevno poročilo podizvajalca", never "gradbeni dnevnik", on ALL locales for si projects.

## New dependencies (exact)

```
npm install @react-pdf/renderer@4.5.1 unpdf exceljs resend
```

No other additions. sharp is already a devDependency (seed placeholders).

## Migrations (four files, complete SQL)

### M1: 20260720120000_accounts_settings.sql (Part B)

```sql
alter table public.organizations
  add column vat_id text,
  add column iban text,
  add column accountant_email text,
  add column logo_path text;

alter table public.people
  add column notification_prefs jsonb not null default '{}'::jsonb;

create unique index idx_people_email_unique
  on public.people (lower(email)) where email is not null;

alter table public.projects
  add column vat_mode text check (vat_mode in ('reverse_charge','standard'));

create table public.login_tokens (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_login_tokens_person on public.login_tokens(person_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_sessions_person on public.sessions(person_id);

alter table public.login_tokens enable row level security;
alter table public.sessions enable row level security;
```

Seed prerequisite: the seed gives Matej Kovac and Luka Zupan emails (matej@sonce-demo.si, luka@avesol-demo.si) plus a sub-side admin person (Ana Novak, ana@avesol-demo.si, role admin) so login is demonstrable. The unique-email index makes upserts idempotent only if the seed uses fixed person UUIDs, which it already does.

### M2: 20260720130000_plan_imports_purchase_orders.sql (Parts A and C)

```sql
create table public.plan_imports (
  id uuid primary key default gen_random_uuid(),
  -- nullable: the wizard parses BEFORE the project exists (plan-first flow);
  -- createProjectFromReview backfills it
  project_id uuid references public.projects(id) on delete cascade,
  source text not null check (source in ('k2_pdf','k2_xlsx')),
  storage_path text not null,
  parsed jsonb not null,
  status text not null default 'review' check (status in ('review','committed','discarded')),
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_plan_imports_project on public.plan_imports(project_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number integer not null,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','cancelled')),
  currency text not null default 'EUR',
  total_net numeric(12,2) not null check (total_net >= 0),
  regie_hourly_rate numeric(8,2) check (regie_hourly_rate >= 0),
  payment_terms text,
  deadline date,
  pdf_path text,
  pdf_sha256 text,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by_person uuid references public.people(id) on delete set null,
  accepted_by_name text,
  rejected_at timestamptz,
  rejection_note text,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_purchase_orders_project on public.purchase_orders(project_id);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  description text not null,
  qty numeric(12,2),
  unit text,
  unit_price numeric(12,2),
  total numeric(12,2) not null,
  sort_order integer not null default 0
);
create index idx_po_lines_po on public.purchase_order_lines(purchase_order_id);

alter table public.change_orders add column amount numeric(12,2) check (amount >= 0);

-- review finding: the plans bucket allows only application/pdf today; the wizard
-- accepts xlsx too, so the allowlist must grow in the same migration
update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  where id = 'plans';

alter table public.plan_imports enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
```

### M3: 20260720140000_incidents_notifications.sql (Parts D and E)

```sql
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('incident','rain_stop','obstruction')),
  note text not null,
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

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  kind text not null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null check (status in ('sent','failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index idx_email_log_project on public.email_log(project_id);

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
alter table public.email_log enable row level security;
```

Note: verify the actual name of the activity kind CHECK constraint before dropping (`select conname from pg_constraint where conrelid = 'public.activity'::regclass`); the init migration may have named it differently.

### M4: 20260720150000_invoices.sql (Part G)

```sql
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: an issued invoice is a legal record and must survive
  -- any future project-delete path (review finding)
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
-- one invoice per project in v1 (review finding: double generation would mint two
-- legal invoices); relax deliberately when Abschlagsrechnung arrives post-v1
create unique index idx_invoices_project_single on public.invoices(project_id);

-- generated_documents kinds stay UNCHANGED: PO and invoice PDFs live on their own
-- tables (pdf_path columns), so no new kinds are needed (review finding removed
-- the earlier dead-value expansion)

alter table public.invoices enable row level security;
```

The invoices_vat_shape constraint is the database-level guarantee behind decision 2: a reverse-charge invoice CANNOT carry VAT figures.

## Data shapes (decided before code)

```ts
// lib/k2/k2-shared.ts (pure, fully unit tested against the fixtures)
export interface K2LineItem {
  articleNo: string;   // 7 digits, zero-padded string, never a number
  name: string;        // multi-line cells joined with a single space
  qty: number;         // German decimals normalized: "3 262,5" -> 3262.5
  weightKg: number | null;
}
export interface K2Metadata {
  projectName: string | null;
  address: string | null;
  windZone: string | null;
  snowZone: string | null;
  roofType: string | null;
  pitchDeg: number | null;
  moduleMaker: string | null;
  moduleModel: string | null;
  moduleWp: number | null;
  moduleCount: number | null;
  kwpTotal: number | null;
  reportVersion: string | null;  // from the footer fingerprint
}
export interface K2ParseResult {
  ok: boolean;                 // false when the fingerprint is absent
  metadata: K2Metadata;
  items: K2LineItem[];         // empty when the article list section is absent
  warnings: string[];          // i18n KEYS (e.g. "wizard.warnNoArticles"), never prose
}
export function detectK2(pagesText: string[]): { isK2: boolean; version: string | null };
export function parseK2Text(pagesText: string[]): K2ParseResult;
export function parseGermanNumber(raw: string): number | null; // "1 234,56"->1234.56, "-"->null
export function normalizeArticleRows(rows: string[][]): K2LineItem[];
```

```ts
// lib/k2/k2-pdf.ts (server): unpdf extraction -> parseK2Text
export async function parseK2Pdf(bytes: Uint8Array): Promise<K2ParseResult>;
// lib/k2/k2-xlsx.ts (server): exceljs -> normalizeArticleRows; metadata stays null
export async function parseK2Xlsx(bytes: Uint8Array): Promise<K2ParseResult>;
```

```ts
// lib/auth-core.ts (pure, tested)
export function hashToken(raw: string): string;            // sha256 hex via node:crypto
export function newRawToken(): string;                     // 32 bytes base64url; ALSO used for invite tokens (entropy rule)
export const LOGIN_TOKEN_TTL_MIN = 15;
export const SESSION_TTL_DAYS = 30;
export const LOGIN_RATE_MAX = 3;                           // max unexpired login tokens per person
export function loginTokenValid(row: { expires_at: string; used_at: string | null }, now: Date): boolean;

// Session lifecycle rules (two independent reviews demanded these in plan text):
// - the person branch of resolveActorFromSession filters
//   revoked = false AND expires_at > now() in the sessions query, always
// - logoutAction sets revoked = true on the current session row (by token hash)
//   BEFORE clearing the cookie; cookie deletion alone is not logout
// - the login-token consumption is ONE conditional update:
//   set used_at = now() where token_hash = $1 and used_at is null and expires_at > now()
//   returning person_id  (the expiry lives INSIDE the update, not in a prior read)
// - cookie parsing: value "p:" with an empty remainder resolves to null, never
//   falls through to project-token resolution
```

```ts
// lib/actor.ts evolution (Task B4). TokenActor is UNCHANGED; everything existing compiles.
export interface PersonActor {
  kind: "person";
  personId: string;
  orgId: string;
  orgType: "epc" | "sub";
  role: "admin" | "bauleiter" | "owner" | "crew";
  fullName: string;
  email: string | null;
}
export type Actor = TokenActor | PersonActor;
// Project-scoped access for person actors:
export async function requireProjectActor(actor: Actor, projectId: string): Promise<ProjectActor>;
// ProjectActor = { role: "epc" | "sub"; projectId; orgId; personId: string | null }
// TokenActor: projectId must equal actor.projectId, personId null.
// PersonActor: the project's epc_org_id or sub_org_id must equal actor.orgId;
// role derives from WHICH column matched, not from the person's title. Throws otherwise.
// Every existing lib/data function keeps its signature by accepting ProjectActor
// where it now takes Actor (TokenActor structurally satisfies ProjectActor's fields;
// the change is a rename plus one added optional personId, verified by tsc).

// The office gate (SECURITY BLOCKER finding: without it, a crew login reaches org
// settings, IBAN, accountant email and invoice sharing):
export function requireOfficeActor(actor: Actor): PersonActor;
// Throws unless actor.kind === "person" AND role is admin or owner (a task may state
// "office plus bauleiter" explicitly where the Bauleiter belongs in the flow).
// Required by: settings mutations, invite creation, PO create/send/accept/reject,
// requestFinalization, signAcceptance, generateInvoice, shareToAccountant, and the
// invoice PDF route. Contract-forming acts are therefore PERSON-ONLY: crew token
// actors get the localized message common.askOffice "To dejanje opravi vodstvo
// podjetja v svojem računu." This also strengthens the eIDAS position: the named
// acceptor is always an authenticated person, so accepted_by_name is ALWAYS
// written from actor.fullName (snapshot survives person deletion).
```

```ts
// lib/notify-shared.ts (pure, tested): the recipient matrix
export type NotifyKind =
  | "entry_submitted" | "material_check_completed" | "request_created" | "request_resolved"
  | "incident_created" | "hours_submitted" | "hours_decided" | "hours_deemed_approved"
  | "change_order_submitted" | "change_order_decided"
  | "po_sent" | "po_accepted" | "po_rejected"
  | "finalization_requested" | "acceptance_signed" | "invoice_sent" | "document_expiring";
export type Side = "epc" | "sub";
export function recipientsFor(kind: NotifyKind): Side[];
// epc gets: entry_submitted, material_check_completed, request_created, incident_created,
//           hours_submitted, change_order_submitted, finalization_requested
// sub gets: request_resolved, hours_decided, hours_deemed_approved, change_order_decided,
//           po_sent, document_expiring
// both get: po_accepted, po_rejected, acceptance_signed, invoice_sent
// (review finding: PO acceptance is the eIDAS-strengthened act, BOTH sides must get
// the confirmation email; the B2 test pins po_accepted and po_rejected as "both")
export function emailSubjectKey(kind: NotifyKind): string;  // "notify.subject.<kind>"
export function emailBodyKey(kind: NotifyKind): string;     // "notify.body.<kind>"
export function wantsEmail(prefs: unknown, kind: NotifyKind): boolean; // default TRUE, prefs[kind] === false disables
```

```ts
// lib/notify.ts (server)
export async function emitEvent(input: {
  projectId: string;
  kind: NotifyKind;
  actorPerson: string | null;
  payload: Record<string, unknown>;   // small, renderable: names, numbers, dates
  skipActivity?: boolean;             // true for entry_submitted and
                                      // material_check_completed: their RPCs already
                                      // insert the activity row (verified in
                                      // migrations 20260719180000 and 20260719170000);
                                      // without this flag those events double-log
}): Promise<void>;
// 1. insert activity unless skipActivity (kind is in the expanded CHECK)
// 2. resolve recipient people: sides from recipientsFor(kind); epc side = people of
//    projects.epc_org_id with role in (admin,bauleiter,owner); sub side = people of
//    sub_org_id with role in (admin,owner). Crew never gets notifications.
// 3. insert one notifications row per recipient
// 4. for each recipient with an email and wantsEmail: sendEmail (below)
// 5. notifyProject(projectId)
// Failures in 4 never throw; the whole function never throws into a write path.

// lib/email.ts (server)
export async function sendEmail(input: {
  to: string; kind: string; projectId: string | null;
  subject: string; html: string;
}): Promise<void>;
// Resend SDK, from "Belin <obvestila@getbelin.com>" (domain verified, eu-west-1),
// 4000ms timeout, writes email_log (sent with provider_id | failed with error),
// never throws, and is NEVER awaited on a latency-sensitive auth path (timing oracle).
export function renderEmail(heading: string, bodyLines: string[], ctaLabel: string, ctaUrl: string): string;
// one branded inline-styled HTML shell (dark navy header with the Belin mark as text,
// gold CTA button), no external assets, table layout for client compatibility.
// SECURITY (review finding): renderEmail HTML-escapes heading, every body line and
// the CTA label at the sink (& < > " '), because body lines interpolate crew-typed
// text (request text, incident notes). Unit test: a body line containing
// <a href="https://evil"> arrives fully entity-escaped in the produced HTML.
// Notify strings are plural-free by construction (the format helper does plain
// {var} interpolation, no ICU); any count in an email is pre-formatted by the caller.
```

```ts
// lib/hours-shared.ts (pure, tested)
export const HOLIDAYS_2026: Record<"si" | "de" | "at", string[]>; // ISO dates; de = federal only
export function addWorkingDays(startIso: string, days: number, country: "si"|"de"|"at"): string;
// Working days are Mon..Sat excluding HOLIDAYS_2026[country]; start day itself excluded;
// returns the deadline date at 23:59:59 local project time as ISO. 6 is the VOB/B value
// but the count is a parameter.
export type SheetStatus = "draft" | "submitted" | "approved" | "rejected" | "deemed_approved";
export function effectiveStatus(row: { status: SheetStatus; deadline_at: string | null }, now: Date): SheetStatus;
// submitted past deadline -> deemed_approved (display truth even before persistence)
export function workingDaysLeft(deadlineIso: string, now: Date, country: "si"|"de"|"at"): number;
```

```ts
// lib/invoice-shared.ts (pure, tested)
export type VatMode = "reverse_charge" | "standard";
export function defaultVatMode(_siteCountry: "si"|"de"|"at"): VatMode; // always "reverse_charge" for the pilot pairs; parameter kept for future pairs
export function reverseChargeNote(siteCountry: "si"|"de"|"at"): string; // the three statutory sentences, exact
export function standardVatRate(siteCountry: "si"|"de"|"at"): number;   // 22 / 19 / 20
export interface InvoiceLine {
  kind: "po" | "regie" | "change_order";
  description: string;
  qty: number | null; unit: string | null;
  unitPrice: number | null;
  total: number; // 2 decimals
}
export function composeInvoiceLines(input: {
  po: { totalNet: number; regieHourlyRate: number | null; label: string } | null;
  approvedRegieHours: { sheetNumber: number; hours: number }[];
  approvedChangeOrders: { number: number; title: string; amount: number | null }[];
}): { lines: InvoiceLine[]; totalNet: number; warnings: string[] };
// regie lines: hours x regieHourlyRate; if rate is null and hours exist -> warning key
// "invoice.warnNoRate" and the regie lines are OMITTED (never silently zero-priced).
// change orders with null amount -> warning "invoice.warnCoNoAmount", omitted.
export function computeTotals(totalNet: number, mode: VatMode, rate: number | null):
  { totalVat: number | null; totalGross: number };
export function nextInvoiceNumber(year: number, existing: string[]): string; // "2026-001" style, max+1
```

```ts
// lib/pdf/theme.ts: palette from the light system (--ink #0a1628, --line #e6e9ef,
// --accent #2b7de9, --muted #8a95a6, white paper), Font.register of
// public/fonts/InterVariable.ttf at 400 and 700, hyphenation disabled. All documents
// import theme.ts for the side effect. Shared primitives: Header(project, title, docNo),
// Footer(generatedAtLabel) fixed absolute, LabelValue, FlexTable(columns as
// percentage widths), SignatureRow(names, pngBuffers | blank lines).
// Documents (each a function returning a <Document>):
//   lib/pdf/narocilnica.tsx     NarocilnicaDocument({ po, lines, project, epcOrg, subOrg, locale })
//   lib/pdf/day-report.tsx      DayReportDocument({ project, day, locale })  // one Bautagesbericht page set
//   lib/pdf/completion.tsx      CompletionDocument({ project, days, registers, locale })
//   lib/pdf/abnahme.tsx         AbnahmeDocument({ acceptance, defects, project, locale })
//   lib/pdf/regiebericht.tsx    RegieberichtDocument({ sheet, lines, project, locale })
//   lib/pdf/invoice.tsx         InvoiceDocument({ invoice, locale })
// InvoiceDocument BRANCHES ON vat_mode: the reverse_charge branch has NO VAT row in
// its JSX at all and renders the note line instead: structural prevention, not an if
// around a value. All strings via messages catalogs (getTranslations on the server
// caller passes a plain strings object into the document; @react-pdf components
// cannot call next-intl hooks).
export interface DayReportData {
  reportNo: number;          // sequential position, no gaps
  dateIso: string;
  weather: unknown | null;   // the existing daily_entries.weather jsonb
  headcount: number | null;
  entries: { note: string | null; quantities: { name: string; qty: number; unit: string }[];
             photos: Buffer[]; createdAt: string; author: string | null }[];
  incidents: { kind: "incident"|"rain_stop"|"obstruction"; note: string }[];
}
export function buildDayReports(
  entries: { entry_date: string; /* joined rows */ }[],
  incidents: { occurred_on: string; kind: string; note: string }[]
): { dateIso: string; reportNo: number }[];
// pure (lib/report-days-shared.ts): the ordered union of dates carrying entries OR
// incidents, numbered 1..n ascending. Tested: gaps in calendar dates are fine,
// numbering never skips.
```

```ts
// Storage path conventions (all client ids UUID-validated before interpolation)
// reports bucket:  ${projectId}/po/${poId}.pdf
//                  ${projectId}/invoice/${invoiceId}.pdf
//                  ${projectId}/final/completion-${generatedDocId}.pdf
//                  ${projectId}/final/abnahme-${acceptanceId}.pdf
//                  ${projectId}/regie/${sheetId}.pdf
// photos bucket:   ${projectId}/incident/${incidentClientId}/${i}-${uuid}.jpg
// signatures:      ${projectId}/acceptance/${acceptanceId}-{epc|sub}.png
// docs bucket:     ${orgId}/vault/${documentId}.pdf|jpg|png  (compliance vault uploads)
// plans bucket:    ${projectId}/plan/${importId}.pdf|xlsx
```

Routing additions (pages inside the existing `[locale]` tree; the /api/pdf/* handlers sit at the ROOT of app/, outside [locale], exactly as listed):

```
/[locale]/app                        person: project list (epc: portfolio, sub: simple list); token session: unchanged role router
/[locale]/app/new                    EPC wizard (Part C)
/[locale]/app/[projectId]            project home: renders EpcDashboard or CrewHome by requireProjectActor role
/[locale]/app/[projectId]/po         narocilnica (EPC build and send; sub view and accept)
/[locale]/app/[projectId]/hours      Regiestunden list and detail
/[locale]/app/[projectId]/final      finalization hub (report, acceptance, invoice)
/[locale]/app/settings               org settings, people, notification prefs, vault
/[locale]/auth/verify/[token]        magic-link landing (server component: verify, start session, redirect)
/[locale]/invite/[token]             invite acceptance
/[locale]/p/[token]                  UNCHANGED crew token route (crew never logs in)
PDF route handlers (GET, nodejs, force-dynamic):
/api/pdf/po/[poId] , /api/pdf/invoice/[invoiceId] , /api/pdf/report/[docId] ,
/api/pdf/abnahme/[acceptanceId] , /api/pdf/regie/[sheetId]
```

PDF route ACCESS MATRIX (security finding: person session required, no token
query params ever, tokens in URLs leak into logs and history):

| Route | Who may fetch |
|---|---|
| /api/pdf/po | PersonActor of either project org (any role except crew) |
| /api/pdf/invoice | requireOfficeActor of either project org |
| /api/pdf/report | PersonActor of either project org (any role except crew) |
| /api/pdf/abnahme | PersonActor of either project org (any role except crew) |
| /api/pdf/regie | PersonActor of either project org (any role except crew) |

Every route: resolveActorFromSession (person branch only; a token cookie session is
refused with 403), load the row, requireProjectActor(actor, row.project_id), then the
matrix rule. Crew token surfaces never show PDF download buttons (the office reads
the PDFs); this is a deliberate v1 default on the veto list.

NAVIGATION MODEL (review blocker: without this, no new route is reachable):

- CommandBar grows a role-aware nav row (same bar, second line on phones) for person
  actors: EPC on a project: Pregled (dashboard), Naročilnica, Ure in dodatna dela,
  Zaključek; sub office: Naročilnica, Ure in dodatna dela, Zaključek, Ekipa (crew
  link). Keys: nav.overview "Pregled", nav.po "Naročilnica", nav.hours "Ure in
  dodatna dela", nav.final "Zaključek", nav.team "Ekipa". Active state gold underline
  per the dark system.
- The project list header carries the bell (Task D2), a settings link (nav.settings
  "Nastavitve") and the new-project button (EPC only).
- CrewHome (token) gains a compact two-button row under the report card: Ure and
  Dodatna dela, deep-linking to /p/[token]/hours with the tab preselected (crew
  creates and submits sheets and change orders; only CONTRACT-forming acts, PO
  acceptance and finalization, are office-only).
  IncidentButton and RequestButton are separate prominent quick actions (Task E1/E3).
- The EPC dashboard StatRow chips deep-link: open hours chip to /hours, open
  requests chip to the requests panel anchor, incident chip to the incidents panel
  anchor.
- Sub office home (person actor, sub side; defined in Task B4): NOT CrewHome. Cards:
  naročilnica state (with accept CTA when sent), hours and change orders summary,
  finalization state, crew link with QR, latest reports feed (read-only).

## Part A: K2 parser core (founder build step 1 of the code, no UI, no schema)

### Task A1: dependencies and extraction harness

**Files:** Modify package.json (deps above). Create lib/k2/k2-pdf.ts (extraction only for now). Test tests/k2-extract.test.ts.

- [ ] Install the four dependencies; commit lockfile change separately from code.
- [ ] Write tests/k2-extract.test.ts: reads tests/fixtures/k2/k2-report-2025.pdf via node:fs, calls `extractPages` (unpdf `extractText` with `mergePages: false`), asserts pages.length > 0 and that some page contains "K2 Base Report". Run: `npx vitest run tests/k2-extract.test.ts`, expect FAIL (module missing), implement k2-pdf.ts `extractPages(bytes): Promise<string[]>`, run PASS.
- [ ] Commit: "feat(k2): pdf text extraction harness over the five fixtures"

### Task A2: fingerprint detection and metadata parser (TDD)

**Files:** Create lib/k2/k2-shared.ts. Test tests/k2-shared.test.ts.

- [ ] Failing tests first, using REAL extracted text snapshots: run a one-off node script to dump `extractPages` output of all five fixtures to tests/fixtures/k2/text/*.json (commit these; they freeze the extraction so pure tests need no PDF dependency). Tests: `detectK2` true with version for all five; false for a synthetic non-K2 page array. `parseGermanNumber`: "1 234,56" is 1234.56, "3 262,5" is 3262.5, "17" is 17, "-" and "" are null. Metadata assertions against k2-report-2025 (exact expected values read from the dumped text by eye ONCE and pinned).
- [ ] Implement detectK2 (footer regex over "K2 Base Report"), parseGermanNumber, metadata label-value extraction (label list from the dumped texts; tolerate other UI languages by matching value patterns near known labels, and return null rather than guessing).
- [ ] Run green, commit: "feat(k2): fingerprint detection and metadata parsing (pure, fixture-pinned)"

### Task A3: article table parser (TDD)

**Files:** Modify lib/k2/k2-shared.ts (normalizeArticleRows, parseK2Text). Test tests/k2-articles.test.ts.

- [ ] Failing tests: for fixtures WITH an article list, parseK2Text returns items with 7-digit articleNo strings, positive qtys, names free of internal line breaks; per-roof duplication resolved by preferring the project-total table when present (assert a known total row count). For the two fixtures WITHOUT the list: ok true, items empty, warnings contains "wizard.warnNoArticles". Number normalization: an item whose qty renders with a stray space parses correctly.
- [ ] Implement: locate the article section per page, split rows on 7-digit anchors, join wrapped name lines, normalize numbers.
- [ ] Run green, commit: "feat(k2): article list parsing with per-fixture pins"

### Task A4: Excel article list parser

**Files:** Create lib/k2/k2-xlsx.ts. Test tests/k2-xlsx.test.ts plus a small generated fixture tests/fixtures/k2/articles.xlsx.

- [ ] Generate the fixture ONCE with a node script using exceljs (columns Position, Art-Nr., Artikel, Anzahl, Gewicht, three rows with German formats) and commit it. Failing test: parseK2Xlsx returns the three items, metadata all null, ok true.
- [ ] Implement with exceljs, reusing normalizeArticleRows.
- [ ] Run green, commit: "feat(k2): xlsx article list adapter"

## Part B: accounts, orgs, settings (unblocks every surface; German EPC needs it 27.07)

### Task B1: migration M1, types, seed people

**Files:** Create supabase/migrations/20260720120000_accounts_settings.sql (SQL above). Modify lib/database.types.ts (mirror by hand), scripts/seed-demo.mjs (emails plus Ana Novak as above, fixed UUIDs).

- [ ] Apply M1 via the connector; commit the file; hand-mirror types; seed; probe: insert and select a login_tokens row via the connector, delete it. Verify the unique email index rejects a duplicate (insert probe expecting failure, then clean).
- [ ] Seed data completeness (review finding: without these, invoice generation on the demo projects fails): both orgs get vat_id (Sonce "SI10000001", AVESOL "SI10000002"), iban (any valid-format demo IBAN), accountant_email (racunovodstvo@avesol-demo.si on the sub org); all demo projects get vat_mode "reverse_charge". One additional EPC person "Jan" is seeded with the email taken from the env var SEED_FOUNDER_EMAIL when set (the founder adds it to .env.local; document in .env.example), else skipped: this is the only DELIVERABLE address in the seed, used by acceptance script step 2. The @sonce-demo.si and @avesol-demo.si addresses are fake: emitEvent will attempt sends that hard-bounce, so lib/email.ts refuses to send to *.si demo domains matching /-demo\.si$/ (logged as skipped in email_log with status failed and error "demo-domain"), protecting the verified domain's reputation.
- [ ] Commit: "feat(auth): accounts and settings schema (M1), seed completeness"

### Task B2: magic-link core and email shell (TDD on the pure parts)

**Files:** Create lib/auth-core.ts, lib/email.ts, lib/notify-shared.ts. Tests tests/auth-core.test.ts, tests/notify-shared.test.ts.

- [ ] Failing tests: hashToken is deterministic 64-hex; newRawToken is url-safe and 40 plus chars; loginTokenValid false when expired or used; recipientsFor matrix exactly as specified INCLUDING po_accepted and po_rejected as "both"; wantsEmail default true, false only on explicit false; renderEmail escapes HTML in every interpolated slot (the evil-anchor test).
- [ ] Implement all three files (email.ts per the shape above; renderEmail returns a single table-layout HTML string, inline styles only, navy #0b1524 header, gold #d4a843 CTA, footer "Belin, getbelin.com").
- [ ] Run green, commit: "feat(auth): token hashing core, email shell, notification matrix"

### Task B3: login flow end to end

**Files:** Modify app/actions/auth.ts (add `requestMagicLink(prev, formData)`), lib/auth.ts (issue person sessions: `startPersonSession(personId)` inserting a sessions row and setting the SAME belin_session cookie to `p:` plus raw session token; `sessionToken()` learns to distinguish the `p:` prefix), components/auth/LoginForm.tsx (email field variant), messages/*.json (auth namespace additions below). Create app/[locale]/auth/verify/[token]/page.tsx.

Slovenian copy (de and en get identical placeholders; vikanje per the register rule): auth.emailLabel "E-poštni naslov", auth.sendLink "Pošlji povezavo", auth.linkSent "Povezava za prijavo je poslana. Preverite e-pošto.", auth.linkInvalid "Povezava ni veljavna ali je potekla. Zahtevajte novo.", auth.confirmTitle "Prijava v Belin", auth.confirmLogin "Potrdi prijavo", emails: auth.loginSubject "Vaša prijava v Belin", auth.loginBody "Kliknite gumb za prijavo. Povezava velja 15 minut.", auth.loginCta "Prijava v Belin". There is NO emailUnknown string anywhere (enumeration-safe by design).

- [ ] requestMagicLink: normalize email lowercase, look up people by email. REFUSE role crew silently (same generic success). If the person is absent, STILL run newRawToken plus hashToken (timing symmetry) and return the same success. Rate limit: when LOGIN_RATE_MAX (3) unexpired unused login_tokens already exist for the person, return the same generic success without inserting or sending. Otherwise insert login_tokens (hashToken(raw), 15 min TTL) and send the email WITHOUT awaiting the full send on the response path (fire-and-log per lib/email.ts; both branches of the action converge in timing). Accept an optional `next` form field (validated: must start with `/`), carried through to the verify URL as a query param, so notification emails can deep-link (review finding: every email CTA lands on a guard otherwise). Link: `${NEXT_PUBLIC_APP_URL}/${locale}/auth/verify/${raw}?next=...`.
- [ ] verify page: GET NEVER MUTATES (security finding: Outlook SafeLinks and similar scanners prefetch GET links and would burn the single-use token before the human clicks). The GET renders a confirm card: "Prijava v Belin" plus a PendingButton auth.confirmLogin "Potrdi prijavo". The button posts a server action that performs the ONE conditional update from the auth-core rules (used_at null AND expires_at > now(), returning person_id), calls startPersonSession, and redirects to the validated `next` target or /[locale]/app. Failure renders auth.linkInvalid with a link home.
- [ ] Session resolution lands HERE, not B4 (review finding: otherwise B3's own verification cannot pass): resolveActorFromSession learns the `p:` branch now: sessions join people where token_hash matches, revoked = false, expires_at > now(); returns PersonActor. logoutAction sets revoked = true on the row before endSession(). The existing token-cookie behavior is untouched.
- [ ] Landing LoginForm: email-only form via useActionState, success state shows auth.linkSent. The demo password path stays behind `process.env.DEMO_LOGIN === "1"`, FAIL-CLOSED (the check is strict equality with "1"; never invert to opt-out). Add DEMO_LOGIN=1 to .env.example with a comment; the founder sets it in Vercel ONLY if they want the password demo on a deployed environment before J4 deletes it; locally .env.local carries it. HOLD PUSH only if the flow is half-done at end of day: the landing must never deploy with a dead login form.
- [ ] No raw login token or verify URL is ever logged in production paths; dev-only logging is gated by NODE_ENV !== "production" (J4 sweeps for violations).
- [ ] Verify in preview (DEMO_LOGIN local): request a link for the SEED_FOUNDER_EMAIL person, read the raw link from the dev-gated log, open it, press the confirm button, land signed in. Probe single-use: the same link twice, second press shows linkInvalid. Probe logout: after logout, restore the old cookie value manually via devtools is impossible (httpOnly), so probe at the DB: the sessions row has revoked true. Probe rate limit: four requests, email_log shows three sends.
- [ ] Commit: "feat(auth): magic-link login with scanner-safe confirm, rate limit, revocable sessions"

### Task B4: PersonActor and project-scoped plumbing (TWO commits)

**Files:** Modify lib/actor.ts (PersonActor, Actor union, requireProjectActor, requireOfficeActor as specified in the data shapes), every lib/data/* signature Actor to ProjectActor (mechanical, tsc-driven), app/[locale]/app/page.tsx (person: project list; token session: existing behavior). Create app/[locale]/app/[projectId]/page.tsx, app/[locale]/app/[projectId]/actions.ts, components/app/ProjectList.tsx, components/sub/SubHome.tsx. Test tests/actor.test.ts (pure guard logic extracted as `resolveProjectRole(actor, project): "epc" | "sub" | null` in lib/actor-shared.ts).

THE PERSON-SESSION MECHANISM (review blocker: every existing surface is token-threaded, this is the single decision the executor must not improvise): the `token` prop on CommandBar, CrewHome, EpcDashboard, MaterialPanel and friends becomes `token: string | null`. Components call actions from a NEW colocated file app/[locale]/app/[projectId]/actions.ts whenever token is null; that file exports session variants of every existing action with the same names and payloads, taking `projectId` instead of `token`, each resolving via resolveActorFromSession then requireProjectActor(actor, projectId). The token action files stay untouched. Client components receive ONE prop pair (token, projectId) and branch internally on token null; no other conditional plumbing.

- [ ] Failing tests for resolveProjectRole: token actor wrong project null; person actor org matches epc_org_id gives epc; sub_org_id gives sub; neither null.
- [ ] Commit 1: actor union, requireProjectActor, requireOfficeActor, ProjectActor rename across lib/data, session action variants, /app/[projectId] route rendering EpcDashboard for epc persons and SubHome for sub persons. tsc green, existing tests green, token routes pixel-identical (verify demo token URLs in preview).
- [ ] SubHome (review finding: sub office people are NOT crew; they must not land on the roof reporting screen): the office cards per the navigation model (naročilnica state, hours and change orders summary, finalization state, crew link with QR placeholder until B5, latest reports read-only). Sections stub gracefully until their parts land (each card renders its empty state; the plan's later tasks fill them).
- [ ] Commit 2 (frontend-design skill first): ProjectList: dark system, one card per project: name, city, status badge, progress bar (reuse the e-srow pattern), last activity line; sub persons see the list scoped to sub_org_id. Copy: app.projectsTitle "Projekti", app.newProject "Nov projekt", app.noProjects "Ni še projektov.", common.askOffice "To dejanje opravi vodstvo podjetja v svojem računu.".
- [ ] Guard behavior (review finding): /app/* without a session redirects to /[locale] with `?next=` set to the attempted path; the landing login form forwards `next` into requestMagicLink.
- [ ] Verify: seeded EPC person sees both demo projects; clicking opens the dashboard at /app/[projectId]; Ana Novak sees SubHome; crew token link unchanged.
- [ ] Commits: "feat(auth): person actor and session action plumbing" / "feat(app): project list and sub office home"

### Task B5: invites

**Files:** Create app/[locale]/invite/[token]/page.tsx, components/settings/InvitePanel.tsx, server actions in app/[locale]/app/settings/actions.ts (`createInvite`, `acceptInvite`). Modify messages (settings namespace).

- [ ] THE INVITE MATRIX, exact (review finding: two executors would otherwise build different auth surfaces): EPC office (admin, owner; bauleiter NOT included) creates kind sub_company invites (email plus target project). EPC office creates kind epc_member invites into its OWN org, invited_role bauleiter by default, admin only when explicitly chosen. Sub office (admin, owner) creates NOTHING by email; it generates the crew LINK: reuse project_tokens with role sub, label "crew", surfaced as a copyable link plus QR in settings and SubHome. Nobody invites across the org boundary except sub_company. Invite tokens are minted with newRawToken (entropy rule; the DB stores them plaintext-unique as the schema already does).
- [ ] acceptInvite on /invite/[token]: consumption is ONE conditional update (`status = 'pending' and expires_at > now()` returning the row); zero rows renders invite.invalid. sub_company path: refuse when the target project's sub_org_id is already set (invite.alreadyLinked); otherwise a form (org name, your name, email prefilled from the invite) creates the organizations row plus admin person, links projects.sub_org_id. epc_member path: creates the person in invites.org_id with invited_role. BOTH paths: when the typed email already exists on a person, do not insert; render invite.emailTaken with a login link instead (the unique index would throw an unlocalized error otherwise). Success marks accepted, starts a person session, redirects to /app.
- [ ] Copy (vikanje): settings.inviteSub "Povabi podizvajalca", settings.inviteSent "Povabilo poslano.", settings.crewLink "Povezava za ekipo", settings.copyLink "Kopiraj povezavo", invite.title "Povabilo v Belin", invite.acceptCta "Sprejmi povabilo", invite.orgName "Ime podjetja", invite.yourName "Vaše ime in priimek", invite.invalid "Povabilo ni veljavno ali je poteklo.", invite.alreadyLinked "Na tem projektu je podizvajalec že določen.", invite.emailTaken "Ta e-poštni naslov že ima račun. Prijavite se.". Email: invite.subject "Povabilo v Belin", invite.body "{org} vas vabi k sodelovanju na projektu {project}.".
- [ ] Verify: invite a fresh email, accept in a second browser, the new sub admin sees the project; re-open the same invite link, see invite.invalid; invite an email that already exists, see invite.emailTaken.
- [ ] Commit: "feat(auth): invites with exact matrix and atomic acceptance"

### Task B6: settings page and compliance vault surfacing

**Files:** Create app/[locale]/app/settings/page.tsx, components/settings/OrgForm.tsx, components/settings/VaultPanel.tsx, actions in the settings actions file (`updateOrg`, `uploadVaultDoc`, `setNotificationPref`). Modify lib/storage.ts (createVaultDocTarget per the docs path convention).

- [ ] OrgForm: name, address, country, contact fields, vat_id, iban, accountant_email; save via updateOrg gated by requireOfficeActor (admin, owner ONLY: these fields move money; a bauleiter or crew person must never reach them, security blocker finding). Notification prefs: one toggle per NotifyKind relevant to the org side, writes the CURRENT person's own notification_prefs (any office role may edit their own).
- [ ] VaultPanel (sub orgs): list documents with type, title, valid_until and a traffic light (green over 30 days, amber under 30, red expired: pure helper `expiryState(validUntil, now)` in lib/vault-shared.ts, tested); upload flow (type select including a1 and freistellungsbescheinigung FIRST in the list, file to docs bucket, valid_until date). The stored extension comes from a server-side whitelist keyed on the validated mime (pdf, jpg, png), never from the uploaded filename. EPC sees the sub's vault read-only on the project (surfaced in Part E dashboard panel).
- [ ] Docs bucket signer (review finding: getSignedPhotoUrlMap signs the photos bucket only, and signs whatever it is handed): add `getSignedDocUrlMap(paths)` to lib/storage.ts, same caching pattern, but callers may ONLY pass paths read from documents rows they were authorized to load: own org's rows, or, for EPC readers, rows where documents.org_id equals the project's sub_org_id under requireProjectActor. State this rule in a comment at the function.
- [ ] Copy: settings.title "Nastavitve", settings.orgSection "Podjetje", settings.accountantEmail "E-pošta računovodstva", settings.vatId "ID za DDV", settings.iban "IBAN", settings.notifSection "Obvestila", vault.title "Dokumenti", vault.upload "Naloži dokument", vault.validUntil "Velja do", vault.expired "Poteklo", vault.expiringSoon "Poteče kmalu", vault.types.a1 "Potrdilo A1", vault.types.freistellungsbescheinigung "Freistellungsbescheinigung", vault.types.other "Drugo" (plus the remaining type keys mirroring the schema list).
- [ ] Verify: save org fields, upload a PDF, traffic lights render, tsc and tests green.
- [ ] Commit: "feat(settings): org settings, notification prefs, compliance vault"

## Part C: PDF engine, wizard, narocilnica (founder step 2 and step 5)

EXECUTION ORDER NOTE (review blocker): Task C3 consumes emitEvent and the expanded activity kinds, which exist only after Task D1. The true execution order is C1, C2, D1, C3, D2, then Part E. This also matches the founder's priority order (notifications, their step 3, precede the naročilnica, their step 5). The tasks stay grouped here by theme; the milestone calendar reflects the real order.

### Task C1: PDF engine bootstrap

**Files:** Copy C:\DevEnv\AVE-DC\dashboard\public\fonts\InterVariable.ttf to public/fonts/InterVariable.ttf. Create lib/pdf/theme.ts (per the shape above). Test tests/pdf-theme.test.ts.

- [ ] theme.ts with the light-paper palette and shared primitives; a trivial SmokeDocument.
- [ ] Test: renderToBuffer(SmokeDocument()) resolves, buffer starts with %PDF, and unpdf extraction of the buffer contains "Belin" (this closes the loop: our own tests read our own PDFs). Verification is TEST-ONLY (review finding: no PO table exists yet; the first real route lands in C3).
- [ ] Commit: "feat(pdf): engine bootstrap ported from AVE-DC pattern"

### Task C2: project wizard with K2 upload and review (TWO commits)

**Files:** Create app/[locale]/app/new/page.tsx, components/wizard/Wizard.tsx (steps: plan upload FIRST, review, sub, done), server actions app/[locale]/app/new/actions.ts (`uploadPlanForParse`, `createProjectFromReview`). Modify lib/storage.ts (plan upload target), migration M2 applied here (with types hand-mirrored, seed rerun).

- [ ] Commit 1: apply M2 (connector plus file plus types plus probes, as B1): "feat(schema): plan imports, purchase orders, change order amounts, plans bucket xlsx (M2)".
- [ ] STEP ORDER is plan-first (review finding, law 2 and the ad hero shot: "the address types itself"). Step 1 uploads the K2 file; step 2 (review) shows the parsed metadata PREFILLED into the project fields (name, address, kWp, modules, mounting) all editable, plus the article table; step 3 attaches the sub; done creates everything atomically.
- [ ] uploadPlanForParse: gated requireOfficeActor (epc side; bauleiter included). SIZE CAPS BEFORE PARSING (security finding: zip bombs, CPU pins): pdf max 30MB, xlsx max 5MB, checked on the received bytes server side; next.config raises serverActions bodySizeLimit to 32mb in the same commit. Extension plus mime check, store to plans bucket, parse inside try/catch: ANY throw maps to the warnNotK2 manual path, never a 500. Inserts plan_imports (status review, parsed jsonb), returns the result. Because no project exists yet at upload time, the storage path uses the import id only (`pending/${importId}.pdf|xlsx`) and plan_imports.project_id becomes nullable in M2 (add `project_id uuid references public.projects(id) on delete cascade` WITHOUT not null; createProjectFromReview backfills it).
- [ ] Review screen (frontend-design skill): metadata summary card with the prefilled editable project fields, article rows in an editable table (name, qty, unit default "kos"), delete row, add row. Sub step: pick an existing sub org the EPC has worked with (select over organizations of type sub linked to any of the EPC's projects, the demo org qualifies) OR enter an email to send a B5 sub_company invite after creation OR skip (review finding: without a sub attached, the PO cannot be sent and no sub token resolves; the PO page shows po.noSub until one is attached).
- [ ] createProjectFromReview: one action: insert project (country defaults vat_mode per defaultVatMode, language, fields from the review), epc AND sub project tokens (sub token only when a sub org was picked), material_items from the reviewed rows, backfill plan_imports.project_id, mark committed, move the stored file to `${projectId}/plan/${importId}.ext` (storage move; on failure keep the pending path and log, never abort), optional invite send. Redirect to /app/[projectId].
- [ ] Copy (vikanje): wizard.title "Nov projekt", wizard.stepPlan "Načrt", wizard.stepReview "Pregled", wizard.stepSub "Podizvajalec", wizard.uploadPlan "Naložite K2 načrt (PDF ali Excel)", wizard.parsing "Berem načrt ...", wizard.warnNoArticles "Načrt ne vsebuje seznama artiklov. Izvozite poročilo s seznamom artiklov ali naložite Excel.", wizard.warnNotK2 "Te datoteke ne prepoznam kot K2 poročilo. Podatke lahko vnesete ročno.", wizard.subPick "Izberite podizvajalca", wizard.subInvite "Povabite po e-pošti", wizard.subSkip "Dodam pozneje", wizard.commit "Potrdi in ustvari", wizard.metaTitle "Podatki iz načrta", wizard.articlesTitle "Material iz načrta".
- [ ] Verify on the phone viewport AND desktop: upload k2-report-2025.pdf, watch the fields prefill, edit one qty, pick AVESOL, commit, material list on the dashboard shows the rows. Upload forum1.pdf on a scratch run: graceful warnings path. Oversize probe: a 40MB file is refused with a localized message.
- [ ] Commit 2: "feat(wizard): plan-first project creation with K2 parse, review and sub attach"

### Task C3: narocilnica build, PDF, send (RUNS AFTER D1; TWO commits)

**Files:** Create app/[locale]/app/[projectId]/po/page.tsx, components/po/PoBuilder.tsx, components/po/PoView.tsx, lib/pdf/narocilnica.tsx, lib/data/purchase-orders.ts (`getPo`, `createPo`, `sendPo`, `acceptPo`, `rejectPo`), actions colocated at the po page. Create app/api/pdf/po/[poId]/route.ts (the C1 skeleton was test-only).

- [ ] All five transitions are office-gated (requireOfficeActor: EPC side for create, send; SUB side for accept, reject) and are SINGLE conditional updates per the global rule: sendPo `where status = 'draft'`, acceptPo and rejectPo `where status = 'sent'`, each RETURNING; zero rows shows po.conflict "Naročilnica je bila medtem spremenjena. Osvežite stran.". createPo is REFUSED when an accepted PO already exists on the project (one live contract in v1). After acceptance the row is immutable (no action mutates accepted POs).
- [ ] Commit 1: data layer plus NarocilnicaDocument plus the PDF route (access matrix applies). PoBuilder (EPC): lines prefilled with one line from project scope ("Montaža FV sistema {kWp} kWp, {address}"), editable lines (description, qty, unit, unit_price, total), total_net auto-summed (pure helper poTotals in lib/po-shared.ts, tested: line totals 2-decimal, sum), regie_hourly_rate field, payment_terms, deadline. createPo assigns number = max plus 1 per project (catch 23505, retry once). sendPo: renders the PDF, stores it, computes sha256 (node:crypto over the exact bytes), saves pdf_path plus pdf_sha256, sent_at, emitEvent po_sent. When project.sub_org_id is null the page shows po.noSub "Najprej dodajte podizvajalca." with a link to settings.
- [ ] NarocilnicaDocument: parties with vat_id (orderer = EPC org, contractor = sub org), PO number "N-{project shortcode}-{number}", date, site address, lines table, total, currency, payment terms, deadline, place of performance, acceptance block naming the acceptance mechanics (accepted in Belin by named authenticated user, server timestamp, document hash printed on the PDF).
- [ ] Commit 2: PoView (sub OFFICE, person-only per the role gates; the SubHome card carries the CTA): inline PDF link, accept button opens a confirm sheet showing po.acceptNote and requiring the checkbox po.acceptConfirm; acceptPo re-hashes the stored PDF and compares to pdf_sha256 inside the conditional update's guard read (defense against swapped files), writes accepted_at, accepted_by_person, accepted_by_name = actor.fullName ALWAYS (evidence snapshot), emitEvent po_accepted (recipients: both). rejectPo requires a note, emitEvent po_rejected.
- [ ] Copy (vikanje): po.title "Naročilnica", po.create "Pripravi naročilnico", po.send "Pošlji podizvajalcu", po.regieRate "Urna postavka za režijske ure", po.paymentTerms "Plačilni pogoji", po.deadline "Rok izvedbe", po.accept "Sprejmi naročilnico", po.acceptConfirm "Potrjujem, da sprejemam naročilnico po navedeni ceni.", po.acceptNote "S sprejemom se strinjate s ceno in pogoji. Sprejem se zabeleži z imenom, časom in prstnim odtisom dokumenta.", po.accepted "Sprejeta {date}", po.rejected "Zavrnjena", po.noSub "Najprej dodajte podizvajalca.", po.conflict "Naročilnica je bila medtem spremenjena. Osvežite stran.", emails: po.sentSubject "Nova naročilnica za {project}", po.acceptedSubject "Naročilnica sprejeta: {project}", bodies one line each in the same voice.
- [ ] Verify the acceptance script step 3 end to end in two browsers (EPC person, Ana Novak), including BOTH confirmation emails in email_log and the hash printed on the PDF matching pdf_sha256. Double-send probe: two rapid sends produce one PDF render (second hits the conflict path).
- [ ] Commits: "feat(po): narocilnica data layer and pdf" / "feat(po): office acceptance with hash binding"

## Part D: notifications engine (founder step 3)

### Task D1: migration M3, emitEvent, wiring existing events

**Files:** Create supabase/migrations/20260720140000_incidents_notifications.sql (SQL above, constraint-name caution), lib/notify.ts. Modify lib/database.types.ts and the two existing write paths: submitDailyReport and submitMaterialCheck (shortfall only). Requests have NO write path in the repo yet; their events wire in Task E3. finalization_requested wires in Part G.

- [ ] Apply M3 (probes: notifications insert and unread partial index used via explain, activity kind check accepts incident_created, rejects a bogus kind). Commit schema separately.
- [ ] Implement lib/notify.ts emitEvent per the shape (recipient queries, notifications inserts, wantsEmail gate, sendEmail with subject and body from the messages catalogs rendered in the PROJECT language: load messages/{lang}.json directly server side and index by the subject and body keys, interpolate payload with a tiny `format(str, vars)` helper, tested; all interpolations HTML-escaped at the renderEmail sink).
- [ ] Wire entry_submitted and material_check_completed ONLY, both with skipActivity true (their RPCs already write activity). The request kinds are wired in Task E3, which builds the first request write path (review finding: no request write path exists in the repo today).
- [ ] Copy (notify namespace): subject.entry_submitted "Novo dnevno poročilo: {project}", body.entry_submitted "{author} je oddal dnevno poročilo.", subject.material_check_completed "Prevzem materiala z manki: {project}", body.material_check_completed "Ekipa je zabeležila manke pri prevzemu materiala.", subject.request_created "Nova zahteva: {project}", body.request_created "{author}: {text}", subject.request_resolved "Zahteva rešena: {project}", body.request_resolved "Tvoja zahteva je rešena.", plus keys for every remaining NotifyKind (write them all now, used by later parts: incident_created, hours_submitted, hours_decided, hours_deemed_approved, change_order_submitted, change_order_decided, po_sent, po_accepted, po_rejected, finalization_requested, acceptance_signed, invoice_sent, document_expiring, same voice, one line each).
- [ ] The activity feed dedupe probe: submit one report, exactly ONE entry_submitted activity row exists (the RPC's), plus the notifications rows.
- [ ] Verify: submit a report as crew in preview; the EPC person's notifications row exists; email_log carries the send attempt (demo-domain skip counts).
- [ ] Also fix the request_resolved body here (review finding: it goes to sub office admins, not the requester): notify.body.request_resolved "Zahteva ekipe je rešena.".
- [ ] Commit: "feat(notify): event engine, email fanout, first two events wired"

### Task D2: in-app notification UI

**Files:** Create components/app/NotificationBell.tsx (client), lib/data/notifications.ts (`getUnread`, `listNotifications`, `markAllRead`), action in a new app/[locale]/app/actions.ts. Mount points, exact (review finding): inside CommandBar when the actor is a person (CommandBar gains an optional `bell` slot prop rendered right of the status control), and in the ProjectList page header built in B4. Token surfaces never render the bell.

- [ ] Bell with unread count badge in the command bar (person actors only), tap opens a panel listing the latest 20 with localized one-liners (same body keys), relative time, project name; opening marks all read. Live: the bell subscribes to the person's projects topics? NO: keep it simple, the bell refreshes on router.refresh() which live sync already triggers on project pages; on the project list it refetches on focus (the existing wake pattern from LiveRefresh's reducer). Log this simplification in CHANGELOG as accepted behavior, not debt.
- [ ] Copy: notify.title "Obvestila", notify.empty "Ni novih obvestil.", notify.markRead "Označi kot prebrano".
- [ ] Verify at 375px: badge, panel, mark-read cycle.
- [ ] Commit: "feat(notify): in-app bell and inbox"

## Part E: incidents and requests on the crew side (founder step 4)

### Task E1: crew incident capture

**Files:** Create components/crew/IncidentButton.tsx (kind sheet plus note plus PhotoCapture, mirroring CrewReportForm mechanics: draft UUID in a ref, signed uploads, tolerant of partial photo failure), lib/data/incidents.ts (`createIncident(actor, payload)`), storage target `createIncidentPhotoTargets`, action in the token actions file AND the app actions file (both call the same lib function). Test tests/incidents-shared.test.ts for the payload validator (note required nonempty, kind in the three, photos 0..6).

- [ ] Validator rules (review finding, law 1): note is REQUIRED only for kind incident; for rain_stop and obstruction the kind label becomes the stored note when the field is empty (typing in rain is not mandatory). Failing validator tests first (all three kinds, empty-note behavior per kind, photos 0..6), implement lib/incidents-shared.ts, green.
- [ ] IncidentButton renders OUTSIDE the material gate branch of CrewHome (review finding: rain on day 1 before the material check is the demo story; verified CrewHome renders only MaterialCheck while needsFirstCheck): one tap opens a bottom sheet: three big kind buttons with icons (labels: incident.kinds.* below; obstructionHint explains the third), note field (optional per kind), optional photos, submit. Under 30 seconds one-handed; occurred_on defaults to the project-local today (projectToday exists in lib/project-time.ts).
- [ ] createIncident writes incidents plus photos rows, emitEvent incident_created (payload carries kind and note).
- [ ] Copy (vikanje): incident.cta "Prijavi zaplet", incident.kinds.incident "Zaplet", incident.kinds.rain_stop "Dež, prekinitev", incident.kinds.obstruction "Ovira", incident.note "Kaj se je zgodilo?", incident.submit "Pošlji", incident.sent "Zabeleženo.", incident.obstructionHint "Ovira pomeni, da naročnik ali tretja stran preprečuje delo. Naročnik bo obveščen takoj.".
- [ ] Verify on phone viewport: full capture under 30 seconds, live ping updates the open dashboard.
- [ ] Commit: "feat(incidents): crew capture with photos and instant notify"

### Task E2: EPC dashboard incidents panel and vault visibility

**Files:** Create components/epc/dashboard/IncidentsPanel.tsx, components/epc/dashboard/CompliancePanel.tsx. Modify lib/data/epc-dashboard.ts (join incidents last 14 days plus counts by kind; join the sub org's vault expiry states), EpcDashboard panel order (IncidentsPanel after MaterialPanel; CompliancePanel after it).

- [ ] IncidentsPanel: `section.e-sec.e-reveal`, kind-tinted rows (rain blue, obstruction amber, incident red accents from existing token palette), note, date, photo thumbnails through the shared Lightbox, empty state dashboard.noIncidents "Ni zabeleženih zapletov.".
- [ ] CompliancePanel: sub name, the A1 and Freistellungsbescheinigung rows FIRST with traffic lights, then other docs; red states also emitEvent document_expiring ONCE per document per threshold (persist via the existing document_reminders sent-log to dedupe, days_before 30 and 0).
- [ ] Copy: dashboard.incidents "Zapleti", dashboard.compliance "Dokumenti podizvajalca", dashboard.docMissing "Ni naloženo".
- [ ] Verify: seeded incident renders, lightbox works, dedupe probe (two loads, one reminder row).
- [ ] Commit: "feat(dashboard): incidents and compliance panels"

### Task E3: material requests (crew asks, EPC resolves)

**Files:** Create components/crew/RequestButton.tsx (bottom sheet: type select material, plan or instruction, text field, optional single photo per the schema's photo_path), components/epc/dashboard/RequestsPanel.tsx (open requests with resolve action plus response note), lib/data/requests.ts (`createRequest(actor, payload)`, `resolveRequest(actor, requestId, note)`, `listRequests(actor)`). Actions in both the token and app action files. Recon note: the requests TABLE exists since day one but NO write path or UI exists anywhere; this task is the first consumer.

- [ ] createRequest: sub side, type in the three schema values, text required; photo via the established signed-upload pattern (single target, photos bucket, `${projectId}/request/${clientId}-${uuid}.jpg`); emitEvent request_created (the notify kinds request_created and request_resolved are WIRED HERE, moved from D1). resolveRequest: epc side, ONE conditional update (`where status = 'open'`), sets response_note, resolved_at, emitEvent request_resolved.
- [ ] RequestButton sits next to IncidentButton on CrewHome, OUTSIDE the material gate (same rule as E1, same visual family, 30-second law). The same sheet lists the crew's own open and recently resolved requests WITH the EPC's response_note (review finding: the resolution was invisible to the very people who asked; crew has no notification inbox, this list is their answer channel). RequestsPanel slots after IncidentsPanel, badge count in StatRow when any request is open.
- [ ] Copy (vikanje): request.cta "Zahtevaj", request.types.material "Dodaten material", request.types.plan "Načrt ali dokument", request.types.instruction "Navodilo", request.text "Kaj potrebujete?", request.submit "Pošlji zahtevo", request.sent "Poslano.", request.yourRequests "Vaše zahteve", request.resolvedTag "Rešeno", dashboard.requests "Zahteve", dashboard.resolve "Reši", dashboard.responseNote "Odgovor ekipi", dashboard.noRequests "Ni odprtih zahtev.".
- [ ] Verify: crew requests material with a photo, EPC resolves with a note, the crew's request sheet shows the note, both notification rows exist, live ping fires.
- [ ] Commit: "feat(requests): crew requests and epc resolution"

## Part F: Regiestunden (schema exists, zero app code)

### Task F1: hours core (TDD)

**Files:** Create lib/hours-shared.ts. Test tests/hours-shared.test.ts.

- [ ] Failing tests: addWorkingDays skips Sundays and holidays (pin: submitted Fri 2026-07-24 in si, 6 working days, assert the exact resulting date accounting for Sat working; a case crossing a holiday; a case crossing the year boundary into January 2027), effectiveStatus deemed past deadline, workingDaysLeft countdown values including 0 on the deadline day.
- [ ] Implement with HOLIDAYS (si, de federal, at national lists written out for BOTH 2026 and 2027; review finding: a late-December submission must not count 1.1. as a working day).
- [ ] Commit: "feat(hours): working-day deadline core with 2026 and 2027 holiday calendars"

### Task F2: sub-side sheets

**Files:** Create app/[locale]/app/[projectId]/hours/page.tsx, components/hours/SheetList.tsx, components/hours/SheetEditor.tsx, lib/data/hours.ts (`listSheets`, `getSheet`, `createSheet`, `addLine`, `removeLine`, `submitSheet`). Actions colocated. The crew token route gains the same page at /[locale]/p/[token]/hours (same components, token actor).

- [ ] createSheet number = max plus 1 (catch 23505, retry once); SheetEditor lines: work_date (defaults today), hours field DEFAULTS TO 8 with quick chips 4, 8, 10 plus a Stepper at 0.5 for fine tuning (review finding: 16 taps for a standard day violates law 1), description, person defaults to the previous line's person; submitSheet sets status submitted, submitted_at now, deadline_at = addWorkingDays(now, 6, project.country), emitEvent hours_submitted. Draft sheets editable, submitted read-only.
- [ ] The page is titled with nav.hours "Ure in dodatna dela" (review finding: change orders live here too and must be findable); the hours tab is hours.tabHours, deep links preselect a tab.
- [ ] Copy (vikanje): hours.title "Režijske ure", hours.new "Nov list", hours.addLine "Dodaj vrstico", hours.hoursLabel "Ure", hours.submit "Oddaj v potrditev", hours.submitted "Oddano {date}", hours.deadline "Rok za odziv: {date}", hours.deemedNote "Brez odziva v {n} delovnih dneh se list šteje za potrjen." (ICU plural on {n}; no legal citation in UI copy, the VOB/B grounding lives in the docs), hours.empty "Ni še listov."
- [ ] Verify phone viewport, 30-second law for adding a line.
- [ ] Commit: "feat(hours): sub-side regie sheets"

### Task F3: EPC review, deemed approval, Regiebericht PDF

**Files:** Modify the hours page for the epc role (decision buttons), lib/data/hours.ts (`decideSheet(actor, sheetId, approve, note)`, `persistDeemed(projectId)`), create lib/pdf/regiebericht.tsx, app/api/pdf/regie/[sheetId]/route.ts. Dashboard: StatRow gains an open-hours chip when any sheet is submitted.

- [ ] decideSheet: epc only, ONE conditional update: `where id = X and status = 'submitted' and (deadline_at is null or deadline_at > now())` returning the row (review finding: this simultaneously kills the two-decider race AND forbids rejecting a sheet that already deemed-approved by deadline); zero rows shows hours.conflict "List je bil medtem odločen ali je rok potekel.". Sets status, decided_at, decided_by_person, emitEvent hours_decided (payload approved boolean, sheet number, total hours). persistDeemed: ONE update `where project_id = X and status = 'submitted' and deadline_at <= now()`, emitEvent hours_deemed_approved per affected row; called on hours page load AND at the top of generateInvoice and assembleCompletionData (review finding: those two read DB status, not effectiveStatus, and would silently drop deemed hours).
- [ ] Countdown UI on each submitted sheet: workingDaysLeft badge (amber at 2, red at 1 and 0), ICU plural key hours.daysLeft.
- [ ] RegieberichtDocument: sheet header (project, number, status, submitted and decided stamps), lines table (date, person, hours, description), totals, signature row (EPC decision recorded digitally; epc_signature_path stays null in v1, the printed decision block carries name and timestamp).
- [ ] Copy: hours.approve "Potrdi", hours.reject "Zavrni", hours.rejectNote "Razlog zavrnitve", hours.deemed "Potrjeno po poteku roka", hours.daysLeft ICU plural ("{n, plural, one {# delovni dan do roka} two {# delovna dneva do roka} few {# delovni dnevi do roka} other {# delovnih dni do roka}}"), hours.conflict "List je bil medtem odločen ali je rok potekel.", hours.pdf "Prenesi PDF" (the button renders for person actors only per the PDF access matrix; the crew token page omits it).
- [ ] Verify: approve path, reject path, deemed path (probe by setting a seeded sheet's deadline into the past via the connector, load, verify persistence and notification, clean up).
- [ ] Commit: "feat(hours): epc decisions, deemed approval, regiebericht pdf"

### Task F4: Nachtraege (change orders)

**Files:** Create components/hours/ChangeOrderList.tsx and ChangeOrderEditor.tsx (they live on the hours page as a second tab: one surface for "more money" flows), lib/data/change-orders.ts (`listChangeOrders`, `createChangeOrder(actor, payload)`, `decideChangeOrder(actor, id, approve)`). Schema exists since day one (change_orders plus change_order_photos, amount added by M2); this is the first app code.

- [ ] createChangeOrder: sub side, title required, description, amount (nullable but the editor nags: co.amountHint), photos 0..6 via the signed-upload pattern (`${projectId}/co/${clientId}/${i}-${uuid}.jpg`), number max plus 1 per project (catch 23505, retry once), status submitted, emitEvent change_order_submitted. decideChangeOrder: epc side, ONE conditional update `where status = 'submitted'` returning, approved or rejected, decided stamps, emitEvent change_order_decided.
- [ ] Tab UI: segmented control on the hours page (hours.tabHours "Režijske ure", hours.tabCo "Dodatna dela"); the EPC side shows decision buttons and photo lightbox; approved amounts flow into Task G4's composeInvoiceLines (interface already defined).
- [ ] Copy: co.title "Dodatna dela", co.new "Nov zahtevek", co.amount "Znesek (neto)", co.amountHint "Brez zneska dodatek ne bo zaračunan na računu.", co.submit "Oddaj", co.approve "Potrdi", co.reject "Zavrni", co.approved "Potrjeno", co.rejected "Zavrnjeno", notify keys already exist from D1.
- [ ] Verify: submit with photo and amount, approve as EPC, the amount appears in a generated invoice on the scratch project, notifications both ways.
- [ ] Commit: "feat(co): change orders end to end"

## Part G: finalization: report, acceptance, invoice (VAT finesse last per decision 2)

### Task G1: migration M4 and finalization request

**Files:** Create supabase/migrations/20260720150000_invoices.sql (SQL above). Modify lib/data/projects.ts (`requestFinalization(actor)`: requireOfficeActor sub side (contract-forming, person-only; the crew token surface never shows this button), active to reviewing via the existing status machine as one conditional update, emitEvent finalization_requested). The button lives on SubHome's finalization card, with a confirm sheet.

- [ ] Apply M4 with probes (the invoices_vat_shape check: insert probe with reverse_charge plus vat_rate expecting failure). Commit schema.
- [ ] Copy: final.request "Zaključi projekt", final.requestConfirm "EPC bo obveščen, da je projekt pripravljen za prevzem.", final.requested "Zaključek zahtevan {date}".
- [ ] Commit: "feat(final): invoices schema (M4), finalization request"

### Task G2: day reports and completion report (TWO commits: pure core plus DayReportDocument, then assembly plus CompletionDocument plus route)

**Files:** Create lib/report-days-shared.ts (buildDayReports, tested: gaps, ordering, incident-only days), lib/pdf/day-report.tsx, lib/pdf/completion.tsx, lib/data/final-report.ts (`assembleCompletionData(actor, projectId)`: one batched fetch of entries plus quantities plus photos plus incidents plus hour sheets plus change orders plus acceptance; photo Buffers downloaded per trap 14 capped at 4 per day page), app/api/pdf/report/[docId]/route.ts, generation action storing to reports bucket plus generated_documents (kind completion_report, project language).

- [ ] TDD the pure core first, including (review finding): a day's weather and headcount come from the FIRST entry of the date when multiple entries exist; incident-only days carry null weather (the page prints the incident rows and omits the weather line). Then DayReport page per DayReportData: header "Dnevno poročilo št. {reportNo}" plus the Slovenia positioning subtitle for si projects "Dnevno poročilo podizvajalca" (decision 1; de and at render "Bautagesbericht"), date, weather morning and midday from the stored jsonb (the existing weather codes map to i18n keys already), headcount, work performed (entry notes plus quantities with locations), incidents of the day with kind labels, photo grid (2 columns, wrap false per card), author line, signature slot.
- [ ] Generation UX (review finding: dozens of storage downloads, weak LTE): the generate button uses PendingButton plus final.generating "Pripravljam poročilo ..." and is disabled while running; double-click cannot start a second assembly (the action refuses while a generated_documents row for this kind is under a minute old).
- [ ] CompletionDocument: cover (project data, kWp, dates, org names, totals), contents, all day pages ascending, then registers: hour sheets (number, hours, status, decided date), change orders (number, title, amount, status), incidents summary, defect register placeholder referencing the acceptance annex, document index with page-free numbering (section numbers, not page numbers, to avoid pagination coupling).
- [ ] Sequential numbering assertion IN TEST: extract text of a generated two-day fixture document via unpdf, assert "št. 1" and "št. 2" both present and no "št. 3".
- [ ] Verify: generate on the CURRENT demo project, download, open: 9 day pages numbered 1..9, photos render, weather lines present.
- [ ] Commit: "feat(final): bautagesbericht day pages and completion report"

### Task G3: acceptance flow with penalty reservation

**Files:** Create components/final/AcceptanceFlow.tsx, components/SignaturePad.tsx (canvas, pointer events, toBlob png, clear and confirm, works one-handed on a phone), lib/data/acceptances.ts (`startAcceptance`, `addDefect`, `signAcceptance`), lib/pdf/abnahme.tsx, app/api/pdf/abnahme/[acceptanceId]/route.ts, app/[locale]/app/[projectId]/final/page.tsx (the hub: report, acceptance, invoice cards).

- [ ] Flow: EPC office starts (kind final or partial), attendees names, defect list (description, photo optional, due date, agreed or disputed toggle), the penalty reservation CHECKBOX with the fixed sentence (below), declaration select (accepted, with reservations, refused), then BOTH signatures pass-the-device (review finding, now explicit): the EPC signs on the pad, hands the phone to the sub representative, whose FULL NAME is a required field next to the second pad (prefilled with the sub org's admin name, editable, stored as sub_signer_name), sub signs. EVERY step persists server-side as the draft acceptance row (defects insert as typed, signatures upload as produced) so a dropped connection on a roof loses nothing; reopening the flow resumes from the stored state. signAcceptance is the final ONE conditional update (`where status = 'draft'`), sets signed and conducted_at, generates the PDF (kind abnahmeprotokoll, both signature images as Buffers, defect table, the reservation sentence VERBATIM when checked), emitEvent acceptance_signed.
- [ ] The fixed sentence key final.penaltyReservation: "Naročnik si izrecno pridržuje pravico do uveljavljanja pogodbene kazni." (rendered in the project language after J3; the de translation in J3 must be the standard clause "Der Auftraggeber behält sich die Geltendmachung der Vertragsstrafe ausdrücklich vor.").
- [ ] Copy: final.acceptance "Prevzem", final.startAcceptance "Začni prevzem", final.defects "Pomanjkljivosti", final.addDefect "Dodaj pomanjkljivost", final.dueDate "Rok za odpravo", final.agreed "Usklajeno", final.disputed "Sporno", final.declaration "Izjava", final.declAccepted "Prevzeto", final.declReservations "Prevzeto s pridržki", final.declRefused "Prevzem zavrnjen", final.signEpc "Podpis naročnika", final.signSub "Podpis podizvajalca", final.signHint "Podpiši s prstom", final.warranty "Začetek garancijske dobe: {date}".
- [ ] Verify: full flow on phone viewport, PDF contains defects, both signatures visible, sentence present when checked and ABSENT when unchecked (unpdf text assertions in a test with a fixture acceptance).
- [ ] Commit: "feat(final): acceptance protocol with signatures and penalty reservation"

### Task G4: invoice generation and accountant share

**Files:** Create lib/invoice-shared.ts (TDD per the shape), lib/data/invoices.ts (`generateInvoice(actor, projectId)`: requireOfficeActor, sub side or epc on behalf; calls persistDeemed FIRST; composes from THE accepted PO plus approved and deemed sheets times regie rate plus approved change orders; REFUSED when an invoice already exists for the project (the M4 unique index backs this; catch 23505 into the same localized message invoice.exists); snapshots supplier and customer from organizations incl vat_id and iban; number via nextInvoiceNumber over the sub org's existing numbers (catch 23505, recompute once); vat_mode from project.vat_mode falling back to defaultVatMode(project.country) when null (review finding: seeded and legacy projects carry null); renders and stores the PDF at generation, writing pdf_path in the same operation, so share and download always have bytes), lib/pdf/invoice.tsx, app/api/pdf/invoice/[invoiceId]/route.ts (office-only per the matrix), components/final/InvoiceCard.tsx (generate, download, share buttons), `shareToAccountant(actor, invoiceId)` (requireOfficeActor; the confirm sheet DISPLAYS the destination address before sending, review finding; sends the stored PDF as a Resend attachment to the SHARING actor's own org's accountant_email, records sent_to_accountant_at plus accountant_email snapshot, emitEvent invoice_sent; refuses with a localized error when accountant_email is empty, linking to settings).
 
- [ ] TDD invoice-shared fully first: composeInvoiceLines cases (all three sources, missing rate warning, missing amount warning, empty everything gives zero-line refusal), computeTotals both modes, nextInvoiceNumber gaps ("2026-001" then "2026-003" existing gives "2026-004"), reverseChargeNote exact strings, defaultVatMode.
- [ ] InvoiceDocument: full Art. 226 field set, lines table, totals block: standard mode renders net, rate, VAT, gross; reverse mode is a STRUCTURALLY DIFFERENT totals block (net, then the note sentence, then gross equal to net), plus supplier VAT id and customer VAT id both mandatory in reverse mode (generation refuses with invoice.errNoVatId when either org lacks vat_id).
- [ ] PDF TEST with unpdf: reverse fixture text contains the si note and does NOT contain "DDV" as an amount row label or any "%" in the totals; standard fixture contains "22" and a VAT amount.
- [ ] Copy (vikanje): invoice.title "Račun", invoice.generate "Ustvari račun", invoice.share "Pošlji računovodstvu", invoice.shareConfirm "Račun bo poslan na {email}.", invoice.shared "Poslano na {email} dne {date}", invoice.exists "Račun za ta projekt že obstaja.", invoice.errNoVatId "Manjka ID za DDV. Dopolnite v nastavitvah.", invoice.errNoAccountant "V nastavitvah ni e-pošte računovodstva.", invoice.warnNoRate "Urna postavka ni določena na naročilnici, režijske ure niso zaračunane.", invoice.warnCoNoAmount "Nekateri potrjeni dodatki nimajo zneska in niso zaračunani.". The three statutory reverse-charge sentences live in lib code, not messages: they are legal constants, not UI copy.
- [ ] Verify acceptance script step 5 end to end including the accountant email with attachment in email_log.
- [ ] Commit: "feat(invoice): composed invoice, reverse-charge-safe pdf, accountant share"

## Part H: portfolio (cuttable to the plain list from B4)

### Task H1: portfolio dashboard

**Files:** Modify app/[locale]/app/page.tsx and components/app/ProjectList.tsx into a portfolio: aggregate header strip (active projects, open hour sheets, open incidents this week, kWp in progress), per-project cards enriched (progress, tempo sparkline reusing the TempoChart core math, status, open items count), a simple month bar of completed kWp. Load the dataviz skill BEFORE this task. lib/data/portfolio.ts (`getPortfolio(actor)`: one batched query set across org projects).

- [ ] Cut rule: if running behind on Saturday, ship the enriched cards and SKIP the aggregate charts; the header strip numbers stay (plain queries).
- [ ] Copy: portfolio.active "Aktivni projekti", portfolio.openHours "Odprte režijske ure", portfolio.openIncidents "Zapleti ta teden", portfolio.kwp "kWp v izvedbi".
- [ ] Verify at 375px and desktop; measure the sparkline geometry (trap 5).
- [ ] Commit: "feat(portfolio): epc portfolio dashboard"

## Part J: staging, landing, translations, security, QA (Sunday)

### Task J1: four-phase demo seeds

**Files:** Modify scripts/seed-demo.mjs: keep CURRENT and START, add FINAL (phase 3). Fixed UUIDs ...5 for FINAL. All demo people, tokens stable. The four phases of the demo arc: START (onboarding), CURRENT (mid-project), FINAL (finalization), portfolio (the list of all three).

- [ ] STAGING RULE (review blocker resolved: nothing can render a PDF for a pre-seeded 'sent' or 'accepted' row, and acceptPo's hash check would fail on pdf_sha256 null): the seed NEVER stages a PO past 'draft' and never inserts an invoice. What the seed writes: START gets a DRAFT PO with prefilled lines and regie rate; FINAL gets full history (day entries, an incident set, submitted AND approved sheets, one approved change order with amount), a DRAFT PO, and NO invoice. The runbook prep ritual (J5) then performs three real UI actions on FINAL: send PO as EPC, accept as Ana, generate the invoice; and one on START: send the PO. These four clicks produce genuine PDFs, hashes and timestamps, which is exactly what the demo should show. Deemed staging: one FINAL sheet is seeded submitted with deadline_at two days ahead, so the countdown badge is live in the demo.
- [ ] Verify: seed twice, no duplicates, all three projects render correctly in all surfaces, the prep ritual runs clean start to finish.
- [ ] Commit: "feat(seed): four-phase demo staging"

### Task J2: the landing page, proper and expanded (founder decision 7, protected)

**Files:** Rewrite app/[locale]/page.tsx plus new components/landing/* sections. Load the frontend-design skill FIRST. Keep the login form section intact.

- [ ] Sections (Slovenian, translated in J3): hero (the existing dark identity, headline "Gradbišče v žepu.", subline "Belin poveže EPC in monterske ekipe: načrt noter, dokumentacija ven.", CTA to login plus "Pišite nam" mailto), the drop (K2 upload story with a REAL screenshot of the wizard review screen), the day loop (crew phone screenshot next to dashboard screenshot, "30 sekund na dan."), truth moments (incidents, Regiestunden countdown, material shortfall: three cards with screenshots), paperwork finale (completion report and invoice thumbnails, "Papirologija? Narejena."), compliance strip (A1, Freistellungsbescheinigung, EU hosting Frankfurt), footer (getbelin.com, contact, legal placeholder pages NOT in v1: plain mailto and a one-line imprint block).
- [ ] Screenshots: taken from the seeded production surfaces at phone and desktop sizes, stored as optimized static assets under public/landing/ (sharp script scripts/landing-shots.mjs is OPTIONAL; manual capture acceptable, the founder can supply better ones later). Never ship an empty image slot: every section works text-first if a shot is missing.
- [ ] Verify: 375px and 1280px, no overflow, lighthouse-style sanity (images sized, lazy), all strings through landing.* keys.
- [ ] Commit: "feat(landing): expanded product landing"

### Task J3: the single translation pass (clears ALL i18n debt)

**Files:** messages/de.json, messages/en.json (every key), CHANGELOG debt lines closed.

- [ ] Translate every key currently carrying a Slovenian placeholder: old debt (landing, auth, crew.material, dashboard.material, dashboard.tempo) plus every namespace added by this plan (wizard, po, incident, hours, final, invoice, notify, settings, vault, app, portfolio). German first (the 27.07 EPC), then English. Legal sentence translations: the penalty reservation clause per Task G3; the reverse-charge notes are code constants and stay untouched.
- [ ] The Slovenia positioning rule holds across locales: si projects title the diary "Dnevno poročilo podizvajalca" in sl, "Tagesbericht des Nachunternehmers" in de, "Subcontractor daily report" in en; de and at projects say "Bautagesbericht" (sl "Dnevno poročilo", en "Daily site report"): the title key is selected by project country in code (`diaryTitleKey(country)` helper, tested), not by locale alone.
- [ ] Verify: parity test green, no empty strings, spot-check the German invoice and Bautagesbericht PDFs render with correct umlauts (the Inter TTF covers them; the K2 fixtures prove extraction, this proves rendering).
- [ ] Commit: "feat(i18n): full de and en translation pass, debt cleared"

### Task J4: security cleanup and deploy hygiene

**Files:** Modify lib/auth-shared.ts (demo login gated), Vercel env (founder action), README runbook.

- [ ] Rotate the Supabase service-role key in a quiet window (Supabase dashboard, founder does the click, then updates SUPABASE_SERVICE_ROLE_KEY in Vercel env AND in .env.local in the same sitting, review finding: a stale local key silently breaks the seed). Redeploy, then verify BOTH a login and a signed photo URL mint (both paths use the service role).
- [ ] DEMO_LOGIN deleted from every Vercel environment (the password form disappears; magic link only). The demo scenario pill and DevSwapBar render only when DEMO_LOGIN is 1 (local .env.local keeps it).
- [ ] Secret sweep by VALUE SHAPE, not by name (review finding: name-based grep can never come back clean because env var names legitimately appear in code): `git grep -nE "re_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}"` must return nothing; named references like SUPABASE_SERVICE_ROLE_KEY in admin.ts and .env.example are expected and fine. Confirm no raw login-token logging survives outside NODE_ENV guards (`git grep -n "verify/" app lib | grep -i log` reviewed by eye).
- [ ] Storage buckets still private; the five PDF routes and the verify action re-checked against the access matrix (manual checklist in the session log).
- [ ] Commit: "chore(security): demo login removed, key rotated, sweeps"

### Task J5: final QA, acceptance script, runbook v2

**Files:** docs/demo/runbook-v2.md, session log, CHANGELOG.

- [ ] Run the ENTIRE acceptance script top to bottom on production, fixing forward; every fix its own commit.
- [ ] The dash sweep (proven node one-liner) over messages, app, components, lib, docs/superpowers/plans/2026-07-20-v1-master-plan.md.
- [ ] Runbook v2: the four-phase demo walk (START onboarding with the QR moment: prospect scans the crew link QR, submits a report from their own phone, wall dashboard updates live; CURRENT mid-project story; FINAL paperwork finale; portfolio zoom-out), the prep ritual (seed freshly, then the four staging clicks from J1: send both POs, accept on FINAL, generate the invoice), reset steps, known rough edges. SECURITY RITUAL (review finding): the crew token shown as a QR to an audience is a live capability; the runbook's reset step regenerates the demo crew token after every event where it was displayed (delete and re-insert the project_tokens row; the stable-token rule applies only to the four session-bound demo tokens, not the QR crew link).
- [ ] Session end ritual, CHANGELOG, DECISIONS.md entries for the eight closed decisions.
- [ ] Commit: "docs: v1 runbook, QA pass complete"

## Milestone calendar (velocity-calibrated against this repo's history)

- Mon 20.07 (after the Slovenian demo): Part A complete (parser core is pure code, one evening like phase 0 was).
- Tue 21.07: Part B complete through B4; B5 and B6 spill to Wednesday morning at worst.
- Wed 22.07: B5, B6, C1, C2 (engine, wizard).
- Thu 23.07: D1, C3, D2, Part E (notifications, narocilnica, incidents, requests; the C3-after-D1 order note).
- Fri 24.07: Part F (Regiestunden, change orders) plus G1, G2 started.
- Sat 25.07: Part G complete (report, acceptance, invoice), H1.
- Sun 26.07: Part J (seeds, landing, translations, security, QA, runbook). Done by evening.

Slack lives in H1's cut rule and J2's text-first fallback. If Wednesday ends without a working narocilnica acceptance, invoke the cut order (portfolio charts out first) and tell the founder the same evening.

## Defaults chosen on the founder's behalf (veto list)

1. Custom magic-link auth on our own tables (login_tokens, sessions) instead of Supabase Auth: it composes with the existing session seam and avoids integrating @supabase/ssr plus middleware in a deadline week. people.auth_user_id stays dormant. Veto cost later: a migration to Supabase Auth is additive, not destructive.
2. Crew never gets accounts: crew joins by shareable token link and QR (design law 1). Only EPC and sub office roles log in.
3. One email address maps to one person (unique index). A person working for two orgs needs two addresses in v1.
4. New dependencies capped at four: @react-pdf/renderer, unpdf, exceljs, resend.
5. The Regie hourly rate lives on the narocilnica; change orders get an amount column; invoices refuse silently-unpriced lines and warn instead.
6. Invoice numbering "YYYY-NNN" per sub organization, computed max-plus-one at generation.
7. Deemed approval is persisted lazily on page load, no cron; the pure effectiveStatus keeps every display truthful regardless.
8. German holidays use the federal list only in v1 (Bundesland tables are post-v1).
9. Notification emails default ON per event kind, switchable per person in settings; crew receives none.
10. The bell refreshes with existing live sync and focus wake, no dedicated realtime channel for notifications.
11. Non-K2 uploads never block the wizard: warn and continue manually.
12. Demo seeds stage rows up to DRAFT POs and no invoice; the runbook's four prep clicks produce the real PDFs, hashes and timestamps through the UI.
13. Landing legal footer is a one-line imprint plus mailto in v1; proper legal pages are post-v1.
14. The Priloga-1 printable statutory day sheet for permit-carrying Slovenian projects is parking lot, per the legal research.
15. Contract-forming acts (PO accept and reject, finalization request, acceptance signing, invoice generation and share) are PERSON-ONLY, never crew-token: this closes the shared-QR-token capability hole AND makes the eIDAS named-acceptor claim true by construction.
16. PDF downloads are person-session only (no tokens in URLs); crew token surfaces show no PDF buttons in v1.
17. Emails to the fake demo domains (*-demo.si) are skipped at the sender to protect domain reputation; the founder's real address (SEED_FOUNDER_EMAIL in .env.local) is the one deliverable demo inbox.
18. One invoice per project in v1 (database-enforced); Abschlagsrechnung relaxes this post-v1.
19. One PO per project may be accepted; a new PO cannot be created once one is accepted.

## Post-v1 parking lot (recorded, not planned)

The 60-second ad (storyboard in the design record, produce after 26.07 from the staged demo). Priloga-1 print path. Abschlagsrechnung. Behinderungsanzeige letter generation. DATEV, e-SLOG, ZUGFeRD (2028). Web push. Offline queue. Planner adapters beyond K2. Bundesland holiday calendars. Supabase Auth migration. Legal pages.
