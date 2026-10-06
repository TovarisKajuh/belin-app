# Recon: backend-ops (infrastructure, data health, safety net)

Recon date: 2026-10-05, about 18:40 to 19:10 UTC. Read-only. Artifacts in
`scratchpad/recon/backend-ops/`.

## Headline

The app is DOWN right now, locally and on production, because the Supabase
project is paused (free plan, inactivity). Separately, every email the app
sends is refused because the sending domain getbelin.com lost its DKIM record
and Resend marks it "failed". On production there is no password login, so
until both are fixed nobody can sign in there, and the demo EPC link answers
"Povezava ni veljavna" (link invalid). Both fixes are founder dashboard actions
of a few minutes each and must happen TONIGHT, not tomorrow morning.

Beyond that: functions run in Washington (iad1) against a Frankfurt database,
getbelin.com (printed on every PDF and email) serves the OLD Belin 1.0.0
marketing site with invented customer logos and "Free forever", the demo names
a real Slovenian EPC (also on the public landing page), and there is no code
path at all to create an EPC customer's organization.

## Current state (evidence)

| Item | State | Evidence |
|---|---|---|
| Supabase project belin (xrwncpngjajosstvkign, eu-central-1) | INACTIVE (paused) | get_project 2026-10-05; execute_sql "Connection terminated due to connection timeout"; `nslookup xrwncpngjajosstvkign.supabase.co` NXDOMAIN while supabase.com resolves; supabase-js `ENOTFOUND` (probe-down.json) |
| Supabase org plan | free; all three org projects INACTIVE (belin, avesol, solarflow-crm) | get_organization, list_projects |
| Supabase advisors | security: [] performance: [] (almost certainly because the DB is unreachable, re-run after resume) | get_advisors |
| Production URL | /sl 200, /sl/login 200, /sl/p/demo-epc-k7m2x9q4 404 after 12.4 s | probe-down.json, prod-epc-token-settled.png |
| Local dev server | same 404 on the demo link after 9.5 s, /sl/app redirects to login | local-epc-token.png, probe-down.json |
| Vercel production deployment | READY, commit e89f2de (2026-09-16), equals local HEAD and origin/main | get_deployment, `git rev-list` 0 0 |
| Vercel function region | iad1 (Washington DC), no vercel.json | get_deployment "regions":["iad1"] |
| Vercel env var NAMES (prod and preview) | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY. No DEMO_LOGIN, no NEXT_PUBLIC_APP_URL (falls back to VERCEL_PROJECT_PRODUCTION_URL, lib/app-url.ts) | filter_project_envs (not decrypted) |
| Vercel plan | Hobby (inferred: list_billing_charges "costs_not_found"; log query older than about 1 h fails "ExceedsBillingLimitError"; Hobby keeps 1 hour of runtime logs per vercel.com/docs/plans/hobby, accessed 2026-10-05) | |
| Vercel runtime errors | none in the visible window, but the window is about 1 hour, so history is unknowable | get_runtime_errors, get_runtime_logs |
| Resend domain getbelin.com | status failed; DKIM TXT `resend._domainkey` missing in DNS (NXDOMAIN); SPF TXT and MX on send.getbelin.com present; DMARC p=quarantine | Resend get-domain; nslookup |
| Resend domain avesol.si | verified (used by the AVESOL website, not Belin) | Resend list-domains |
| Resend sent mail | 2 emails total visible, both avesol.si on 2026-09-24, delivered; no Belin send in the API log window (2026-09-23 onward); usage 2/3000 monthly, 0/100 daily | list-emails, list-logs, get-usage |
| App sender | `Belin <obvestila@getbelin.com>` | lib/email.ts:19 |
| getbelin.com DNS | Hostinger (ns1/ns2.dns-parking.com), registered 2026-02-13, expires 2027-02-13 | RDAP verisign |
| getbelin.com / www | served by OLD Vercel project belin-swsc | list_project_domains; getbelin-www.png |
| app.getbelin.com | served by OLD Vercel project belin (Belin 1.0.0 CRM login with "Sign up") | getbelin-app.png |
| npm test | Test Files 43 passed (43), Tests 431 passed (431), Duration 23.34 s | run 2026-10-05 20:46 local |
| npm run lint | `tsc --noEmit`, exit 0, no output | run 2026-10-05 |
| npm audit --omit=dev | 1 critical, 3 high (next 15.5.20, postcss, sharp, nanoid) | npm audit |
| Working tree | uncommitted 09-16 work: CHANGELOG.md, DECISIONS.md, package.json (+2 scripts), workflow and vloga marketing files, session log | git status |

## Findings

### BO-01 BLOCKER: Supabase project is paused, the whole app is down
- Evidence: see table. Free plan projects pause after 7 days of low activity and
  can be resumed for 90 days (https://supabase.com/docs/guides/platform/free-project-pausing, accessed 2026-10-05).
  Local dev and production share this one database (memory note, CLAUDE.md), so both are down.
- Fix: FOUNDER resumes the project in the Supabase dashboard tonight (Project, Resume).
  Then the executor runs `post-restore-health.sql` (SELECT only), `npm run seed`,
  the health pack again, and a Playwright pass on both demo links. Decide tonight on
  Supabase Pro (from $25/month, never paused, daily backups kept 7 days, per
  supabase.com/pricing accessed 2026-10-05). If not Pro, ship the daily keep-alive cron (idea 2).
- Effort: 0.5 h plus restore wait.

### BO-02 BLOCKER: Sending domain failed, every app email is refused
- Evidence: Resend getbelin.com status failed, DKIM record missing; lib/email.ts:19
  sends from getbelin.com; sendEmail logs refusals to email_log and never throws
  (lib/email.ts:28-90), and the login action always answers "sent"
  (app/actions/auth.ts:131), so the failure is invisible to the user. Production has
  no DEMO_LOGIN (env names above; runbook v2 line "On production, sign in by email link").
  CHANGELOG line 469 says the domain was verified in July: this is a regression.
  Runbook beat 5 promises "The EPC sees it live and gets an email".
- Fix: FOUNDER re-adds the TXT record `resend._domainkey.getbelin.com` with the value
  Resend shows, in Hostinger DNS, then presses Verify in Resend. Executor then sends a
  production login link to the founder's own address and records Resend status and
  arrival time, and checks email_log.
- Effort: 0.5 h (DNS usually minutes on Hostinger, unverified).

### BO-03 HIGH: Functions run in Washington against a Frankfurt database
- Evidence: deployment regions ["iad1"]; no vercel.json; Vercel default is iad1 and any
  plan can change the single default region (vercel.com/docs/functions/limitations,
  accessed 2026-10-05). Each page does several sequential Supabase calls
  (lib/actor.ts token lookup, getProjectCore, then a Promise.all, then getSiblingToken),
  each crossing the Atlantic. The login page claims "Podatki v EU, Frankfurt"
  (messages/sl.json:210, 241) while request processing happens in the US.
- Fix: add `vercel.json` with `{"regions":["fra1"]}`, deploy, confirm get_deployment
  shows fra1, measure TTFB of the EPC dashboard before and after.
- Effort: 0.5 h.

### BO-04 HIGH: getbelin.com shows a different, older product
- Evidence: getbelin-www.png: "Every kWh starts here. The operating system for solar
  companies", "Start Building, Free forever", "+127% revenue this quarter", "Trusted by
  solar companies across Europe" with invented company names, old orange logo. That URL is
  printed in the footer of EVERY generated PDF (lib/pdf/theme.tsx:288, see
  assets/marketing/docs/completion-day.png), every email (lib/email-shared.ts:65), the
  brochures (lib/pdf/brochure.tsx:216, 383), the landing CTA (components/landing/Story.tsx:136),
  and the sender address. app.getbelin.com is the old CRM login with "Sign up".
- Fix (founder approves, executor does through Vercel): move getbelin.com and
  www.getbelin.com from project belin-swsc to belin-app; point app.getbelin.com to
  belin-app or remove it. Note VERCEL_PROJECT_PRODUCTION_URL may then switch email links
  to the custom domain (lib/app-url.ts), which is desired; verify /, /sl, /sl/login and a
  verify link on the new host.
- Effort: 0.5 to 1 h.

### BO-05 HIGH: The demo, and the public landing page, name a real company
- Evidence: scripts/seed-demo.mjs:143 "Sonce Energija d.o.o.";
  docs/gtm/INDEX.md:53 and docs/gtm/knowledge/market-icp-si.md:56 say it is a real ZSFV
  member and must be changed before any public asset. public/landing/doc-invoice.webp and
  doc-abnahme.webp (rendered in components/landing/Story.tsx:106-108, served 200 on
  production) show an invoice and an acceptance protocol addressed to it
  (landing-doc-invoice.png, landing-doc-abnahme.png). The project sits at a real street
  address in Kranj.
- Fix: invented EPC name (checked against the AJPES register) and email domain in the
  seed; re-seed; regenerate the three landing document images and any brochure page that
  shows it; re-seed afterwards.
- Effort: 1.5 h.

### BO-06 HIGH: A database outage looks like "invalid link", and there are no error pages
- Evidence: lib/actor.ts:164 `if (error || !data || data.revoked || !data.projects) return null;`
  turns any query error into notFound; prod and local screenshots show
  "Povezava ni veljavna. Ta povezava do projekta ne obstaja ali je bila preklicana."
  `find app -name error.tsx -o -name global-error.tsx -o -name loading.tsx` returns
  nothing (only app/[locale]/not-found.tsx). The 404 card itself is bare: no logo, no way back.
- Fix: throw on query errors in the actor and data layer; add app/[locale]/error.tsx and
  app/global-error.tsx (branded, retry, "temporary problem"), loading.tsx skeletons for
  /app routes; give not-found a logo and a home link.
- Effort: 1.5 to 2 h.

### BO-07 HIGH: Demo site photos are flat navy rectangles
- Evidence: scripts/seed-demo.mjs:294-325 generates 800x600 solid colour JPEGs
  (shade 18 to 30). Replica: seed-photo-replica.jpg, 3,117 bytes, plain dark blue.
  Dashboard says "izračunano iz 9 poročil in 6 fotografij" (assets/marketing/raw/epc-dashboard.png).
  Real AVESOL site photos exist in assets/marketing/site/ (12 files). Rendering of the
  gallery with these placeholders not yet seen (DB down), confirm after resume.
- Fix: seed uploads real photos resized to 1600 px at quality 0.8 (PhotoCapture.tsx MAX_DIM
  and QUALITY), each matched to its day note, under NEW storage paths, because upsert keeps
  the old bytes (docs/known-issues.md entry 2; seed-demo.mjs:312 uses upsert on fixed paths).
- Effort: 1 h.

### BO-08 HIGH: No way to create an EPC customer
- Evidence: the only organizations insert in app code is lib/data/invites.ts:165 with
  type "sub". No signup route exists (app route list). "Then letting them use it" today
  means hand-written SQL.
- Fix: `scripts/onboard-epc.mjs` (org type epc, admin person, login link through the now
  verified domain; idempotent; refuses duplicates), later an admin page.
- Effort: 1.5 h for the script.

### BO-09 HIGH (first customer), MEDIUM (demo): one shared database, unscoped reset tools
- Evidence: seed tripwire scripts/seed-demo.mjs:73-100 refuses to run once any unknown org
  exists, so the first prospect org blocks every future demo reset unless the founder types
  `--yes-destroy-real-data`. scripts/seed-documents.ts:30-34 selects EVERY sent or accepted
  naročilnica in the database (no project filter) and lines 63-90 re-render, overwrite and
  re-hash them, which would silently rewrite a real customer's accepted order.
- Fix tonight: scope seed-documents to the two demo project ids (0.25 h). Before a real
  customer: separate Supabase project for the demo, or an `organizations.is_demo` flag that
  scopes every seed delete and replaces the hardcoded allowlist (2 to 3 h).

### BO-10 MEDIUM: Seed story inconsistencies a sharp buyer can spot
- (a) Dan 1 naročilnica line "Montaža FV sistema 245.7 kWp, Kranj" on the Ljubljana project
  (scripts/seed-demo.mjs:544).
- (b) Weather hardcoded at 20 to 31 °C (seed-demo.mjs:249-257) for log dates that will be
  23.09 to 05.10 if seeded on 06.10 (computed with the seed's own date logic).
- (c) Material check gets checked_at = seed time (seed-demo.mjs:447) while the log starts nine
  working days earlier, contradicting the product rule the runbook narrates (no report before
  the material check).
- (d) Compliance documents point at storage_path demo/a1.pdf etc. (seed-demo.mjs:676-690) that
  the seed never uploads; VaultPanel.tsx:144 renders a link only when a signed URL exists, so
  they cannot be opened.
- Fix: per-month plausible temperatures, project-specific line text, backdated check (insert
  material_items with explicit updated_at before the check, since moddatetime only fires on
  update), small rendered "VZOREC" PDFs uploaded for the vault.
- Effort: 1.5 h.

### BO-11 MEDIUM: The seed does not clean everything a demo leaves behind
- Evidence: no delete on projects (wizard projects from beat 1 accumulate in the demo EPC
  org); incidents and requests deleted only for PROJECT (seed-demo.mjs:635, 657); invoices,
  acceptances, notifications only for the two live projects (seed-demo.mjs:840-842); extra
  hour sheets and change orders, claimed crew names, plan_imports, sessions and login_tokens
  never cleaned.
- Fix: a demo-org-scoped cleanup step in the seed; health pack Q3, Q6, Q13 to confirm.
- Effort: 1.5 h.

### BO-12 MEDIUM: PDFs are proxied through the function, 4.5 MB response cap
- Evidence: app/api/pdf/report/[docId]/route.ts downloads and returns the whole file;
  Vercel caps request and response bodies at 4.5 MB (vercel.com/docs/functions/limitations,
  accessed 2026-10-05). lib/data/final-report.ts:30 embeds up to 4 photos per day at up to
  1600 px, downloaded one by one (241-255). A real three week job will exceed 4.5 MB and fail
  on production only. The demo is unaffected today (3 KB placeholder photos) but BO-07 makes
  the report heavier, so re-check the size after BO-07.
- Fix: downscale embedded photos with sharp (about 1000 px, q0.7), download in parallel,
  and serve large PDFs by a short-lived signed URL redirect.
- Effort: 2 h.

### BO-13 MEDIUM: Plan upload larger than 4.5 MB fails on production only
- Evidence: next.config.ts serverActions bodySizeLimit "32mb"; app/[locale]/app/new/actions.ts:38-50
  reads the whole File in a server action; lib/data/plan-imports.ts:18 allows 30 MB. Largest
  fixture is 3.46 MB (tests/fixtures/k2/thomas-woginger.pdf), so fixtures pass.
- Fix: direct browser upload with a signed upload URL (pattern in lib/storage.ts:204), parse
  from storage.
- Effort: 2 h. For tomorrow: only drop plans under 4 MB if demoing on production.

### BO-14 MEDIUM: next 15.5.20 has critical and high advisories
- Evidence: npm audit: "Unauthenticated Remote Code Execution in Image Optimization API when
  AVIF files are used" and "on windows-hosted servers" (< 15.5.24), "Denial of Service in App
  Router using Server Actions" (< 15.5.21). Latest 15.x is 15.5.27.
- Fix: `npm i next@15.5.27`, tests, lint, a production build in a separate checkout (never
  `npm run build` next to the running dev server), deploy.
- Effort: 0.5 h.

### BO-15 MEDIUM: material_check_docs has no RLS in the repo migrations
- Evidence: all other 34 tables have an `enable row level security` statement; this one,
  created at supabase/migrations/20260719150000_material_check_docs_and_submit.sql:15, has
  none. The browser holds the anon key and the design relies on deny-all RLS
  (lib/supabase/client.ts comment). Live state unverified because the DB is paused.
- Fix: migration enabling RLS plus the matching repo file; health pack Q19; re-run advisors.
- Effort: 0.25 h.

### BO-16 MEDIUM: Zero observability
- Evidence: Hobby keeps about 1 hour of runtime logs; no instrumentation.ts, no error
  reporter in package.json, no health route, no uptime check. The DB has been down for days
  and nothing told anybody.
- Fix: ideas 1, 3, 4.
- Effort: 2 to 3 h.

### BO-17 MEDIUM: No scheduled work at all
- Evidence: expiry reminders run only when somebody opens the EPC dashboard
  (lib/data/epc-dashboard.ts:355-378); deemed approval of hour sheets is computed on read
  (lib/hours-shared.ts:153-157), so nobody is told when the clock runs out; login_tokens and
  sessions are never pruned; no cron in migrations or vercel.json.
- Fix: daily Vercel cron (Hobby allows one run per day, vercel.com/docs/cron-jobs/usage-and-pricing,
  accessed 2026-10-05) at /api/cron/daily with CRON_SECRET: reminders, deemed-approval
  notifications, pruning, and a DB touch that keeps the free project awake.
- Effort: 2 h.

### BO-18 LOW: Plans not fit for a paying customer
- Vercel Hobby is "non-commercial, personal use only" (vercel.com/docs/plans/hobby, accessed
  2026-10-05); Pro seat $20 per user per month (same page). Supabase Free has no backups
  (pricing page). Upgrade both before the first invoice.

### BO-19 LOW: Uncommitted 2026-09-16 work in the tree
- Evidence: git status. Commit it on its own before tomorrow's work so tomorrow's diffs and
  deploys are clean.

## docs/known-issues.md, current status

1. @react-pdf text layer corruption: still guarded. tests/pdf-font-subset.test.tsx and
   tests/pdf-render-guard.test.ts are in the passing 43 files. Installed 4.5.1, upstream is
   4.9.0 (npm view, 2026-10-05); do NOT upgrade before the meeting.
2. Supabase storage upsert and cached download: still the platform's behaviour (not
   re-verified tonight, DB down). The seed itself still uploads photos with upsert on fixed
   paths (seed-demo.mjs:312), harmless only while the bytes never change; BO-07 must use new paths.

## Cross-surface observations (for other lanes)

- Local dev shows the Next.js "N" dev indicator bottom left, overlapping the login footer
  (local-login-attempt.png). If presenting from `npm run dev`, set devIndicators off or present
  a production build.
- On the 390 px login, the "Pošlji povezavo" button touches the "UPORABNIŠKO IME" label below
  it (local-login-attempt.png).
- The splash animation covers the screen for more than 1.5 s on every full page load, including
  error pages (prod-epc-token.png, local-epc-token.png).
- EPC CompliancePanel (components/epc/dashboard/CompliancePanel.tsx, 66 lines) has no way to open
  a subcontractor document.
- In assets/marketing/raw/epc-dashboard.png (13.08) the TEMPO tile says 5.9 %/dan while the chart
  says 6,5 %/dan, and decimals mix point and comma.

## Unverified

- All demo data state (DB paused): projects, hour sheets, change orders, incidents, requests,
  vault expiry, finalization, acceptances, invoices, completion reports, plan_imports,
  login_tokens, notifications, email_log. Query pack ready: post-restore-health.sql.
- Whether the demo is currently dressed in German or mid-closing-chain from an aborted
  marketing pipeline run.
- Security and performance advisor results (empty only because the DB is paused, presumably).
- Live RLS state of material_check_docs.
- When the project paused, and whether Supabase's warning email arrived.
- Login email delivery speed: no Belin email exists in Resend to measure.
- That the RESEND_API_KEY in Vercel belongs to the Resend account the connector sees.
- Whether info@getbelin.com is a working mailbox (MX points to Hostinger).
- The Atlantic round trip cost per query (estimated about 90 ms, not measured).
- That the street address used for "PSE Trgovski center Kranj" is a real shopping centre.
- Whether the service_role key was rotated as the memory note asks before a pilot.

## Ideas: the safety net for a live demo and a first paying customer

1. `npm run preflight` (read-only, 2 h). One screen of green or red: Supabase reachable and
   ACTIVE; Resend domain verified (API); production deployment sha equals local HEAD; function
   region fra1; demo state per the health pack (Trenutno last entry equals the last weekday, one
   submitted hour sheet with a future deadline, PO pdf and hash present, no closing residue, one
   amber vault document); PO hash re-verified against stored bytes via a cache-busted signed URL;
   every demo route warmed as EPC, sub and crew with TTFB printed. Run at T minus 60 and T minus 10.
2. Daily cron at /api/cron/daily (2 h): expiry reminders, deemed-approval notices, token and
   session pruning, and a DB touch so a free project never pauses again.
3. /api/health plus an external uptime check every 5 minutes emailing the founder (1 h).
   Free tiers of uptime services not verified tonight.
4. Error capture without a new vendor (1.5 h): instrumentation.ts `onRequestError` writes an
   app_errors row and emails the founder once per error fingerprint per hour through Resend.
5. Branded error.tsx, global-error.tsx and loading.tsx, and the actor layer throwing on DB
   errors instead of pretending the link is invalid (BO-06).
6. Separate demo database (2 to 3 h): a second Supabase project "belin-demo" for the seed,
   rehearsals and prospect sandboxes; production keeps real customers only. The tripwire and
   the unscoped seed-documents stop being dangerous by construction.
7. Prospect sandbox in one command (2 h): clone the staged demo into a fresh EPC org named
   after the prospect, with their admin invited, so "try it yourself" never touches the
   founder's demo and the founder can reset his own demo at will.
8. Demo reset button (1.5 h): in the DEMO_LOGIN-only pill, "Ponastavi demo" runs the scoped
   reset server side in about ten seconds, so a prospect who clicks the closing chain on the
   wrong project costs nothing.
9. Backups (2 h plus founder secret): Supabase Pro daily backups, plus a nightly GitHub Action
   running `supabase db dump` and a storage sync into a private bucket outside Supabase; one
   test restore into a scratch project.
10. Fallback ladder for the meeting: production URL (after BO-01..03) as primary; local
    production build (`next build && next start` in a separate checkout) as second; the
    existing 40 second demo video, the Salzburg deck at /p/salzburg.html and the rendered
    sample PDFs in assets/marketing/docs/ as the offline last resort; phone hotspot in case
    the venue Wi-Fi blocks anything.
11. Deliverability proof (0.5 h): after BO-02, send one login link each to Gmail and Outlook,
    read Resend's delivered timestamp, and keep the screenshot as proof for the buyer's IT.
12. EU-only processing statement made true (BO-03) and written into the privacy page: database
    and storage in Frankfurt, functions in Frankfurt, email via Resend eu-west-1.

## Questions for the founder

1. Is tomorrow's buyer Slovenian or German/Austrian? That decides the demo data language
   and the PDF language (projects.language), and whether the German overlay is needed.
2. Who is the buyer? If it is Sonce Energija d.o.o. or a direct competitor, BO-05 becomes a
   blocker.
3. Will you present from your laptop (localhost, password login 12345) or from
   belin-app.vercel.app, and will the buyer touch it on their own phone?
4. Approve Supabase Pro ($25/month) tonight so it can never pause during the sales cycle?
5. Can you log into Hostinger tonight to re-add the DKIM record for getbelin.com?
6. May getbelin.com and www.getbelin.com move from the old site to the new app, and may
   app.getbelin.com (old CRM login) be retired?
7. "Then letting them use it": their own organization on the live database, or a sandbox
   copy of the demo? (decides whether idea 6 or 7 is needed tonight)
8. Is 118.500 EUR for the montaža of 245.7 kWp (about 482 EUR per kWp) the number you want
   an EPC buyer to read on the naročilnica and the invoice?
