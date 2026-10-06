# Recon: spec-gaps (what the product promises versus what the code does)

Date: 2026-10-05. Read-only recon. Scratch folder: `scratchpad/recon/spec-gaps/` (screenshots, probe scripts, extracted texts).

## 0. The thing that outranks everything

The Supabase project behind BOTH localhost and production is PAUSED.

- `get_project xrwncpngjajosstvkign` returns `"status":"INACTIVE"`; `get_organization` returns `"plan":"free"`.
- `nslookup xrwncpngjajosstvkign.supabase.co` returns NXDOMAIN; every supabase-js call from `.env.local` fails with `TypeError: fetch failed` (probe: `spec-gaps/dbstate.mjs`).
- Production token links 404: `https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1` returns 404 and renders "Povezava ni veljavna" (screenshot `spec-gaps/prod-sl-crewtoken.png`). Same locally (`local-sl-crewtoken.png`, `local-sl-epctoken.png`).
- Supabase docs (https://supabase.com/docs/guides/platform/free-project-pausing, read 2026-10-05): Free projects with low activity over 7 days are paused; restore via dashboard "Resume project" within 90 days, data preserved; Pro plan is never paused.

Consequence: nothing data-backed works right now (login, dashboards, crew screen, PDFs). Every other agent's dynamic recon of signed-in screens will also fail. I could not render a single signed-in screen; everything below about signed-in behaviour is verified from code, not from the running app.

## 1. Feature matrix (spec and plans versus code)

Status: BUILT, PARTIAL, MISSING. Demo risk is for tomorrow.

| Capability (source) | Status | Evidence | Demo risk |
|---|---|---|---|
| Infrastructure: database reachable | BROKEN | Supabase INACTIVE, free plan, DNS NXDOMAIN | blocker |
| Email delivery (magic links, invites, notifications) | BROKEN | Resend domain getbelin.com status `failed`, DKIM and SPF `failed`; `resend._domainkey.getbelin.com` NXDOMAIN; nameservers `dns-parking.com`; sender `lib/email.ts:19` `obvestila@getbelin.com` | blocker for any real login |
| K2 PDF upload and extraction (HANDOFF s3 m1) | BUILT | `lib/k2/*`, `lib/data/plan-imports.ts`, `components/wizard/Wizard.tsx`; PDF only, Excel adapter deleted | low |
| Project created from review: scope items for progress | MISSING | `create_project_from_review` inserts projects, tokens, material_items, project_roofs only (`supabase/migrations/20260720190000_roofs_pitch_covering.sql:69-120`); no app code inserts `scope_items`; `lib/progress.ts:15` returns 0 with no items | blocker if a live project is created |
| Coordinates for weather on new projects | MISSING | no geocoding anywhere (grep); `lib/weather.ts:18` returns null when lat is null; only seed has coords (`scripts/seed-demo.mjs:229`) | high |
| Project edit after creation (address, dates, kWp, VAT mode, language) | MISSING | only `status` and `sub_org_id` are ever updated (`lib/data/projects.ts:33,74`, `lib/data/invites.ts:181`) | medium |
| Invite sub company by link | BUILT | `components/project/AddSubPanel.tsx`, `createSubInviteLink` | low |
| More than one sub per project, EPC own crews | MISSING | single `projects.sub_org_id`; `invite.alreadyLinked` refusal | high (buyer question) |
| Crew join (sub owner invites crew by link) | BUILT, changed | `components/crew/CrewClaim.tsx` now needs name AND email plus a magic link (CHANGELOG 2026-08-13) | blocker while email is broken |
| iOS Add to Home Screen guide | PARTIAL | `components/crew/InstallHint.tsx`: generic one-liner, no iOS steps, no Android prompt, no WhatsApp in-app browser detection | medium |
| Google Maps button for address | MISSING | no maps link anywhere (grep); address is plain text `components/crew/CrewHome.tsx:69` | low |
| Plan pages shown to the sub | MISSING | plans bucket only touched by upload and sweep (`lib/data/plan-imports.ts:79,164`) | medium |
| Stueckliste gate, material check with photos and delivery note | BUILT | `components/crew/MaterialCheck.tsx`, migration `20260719150000` | low |
| Progress by quantities, weighted | BUILT on seed, PARTIAL in use | `lib/progress.ts`; Stepper step 10 only, no typed entry (`components/crew/Stepper.tsx`, `CrewReportForm.tsx:116`) | medium |
| Requests (material, plan, instruction) | BUILT | `components/crew/RequestButton.tsx`, `RequestsPanel.tsx`, `lib/data/requests.ts` | low |
| Compliance vault, per company | BUILT | `components/settings/VaultPanel.tsx`, `CompliancePanel.tsx` | low |
| Compliance vault, per worker | MISSING | `documents.person_id` exists, never written (`lib/data/org-settings.ts:207`), no person field in VaultPanel | high if Salzburg ("Fuer jeden Mann") |
| Automatic expiry reminders | PARTIAL | only when an EPC dashboard is rendered, sub side only (`lib/data/epc-dashboard.ts:355-385`); no cron in codebase | medium |
| EPC downloads entitled documents | MISSING by design | `CompliancePanel.tsx` header comment: documents not linked for EPC | low |
| HFU list status, ZKO fields | PARTIAL | only as document types in schema (`init_v1_schema.sql:228-238`) | low |
| Document extraction from vault uploads (law 2) | MISSING | manual dates in VaultPanel | low |
| Daily log: photos, note, headcount, quantities, auto weather | BUILT on seed, PARTIAL on real projects | `CrewReportForm.tsx`; weather once at submit, and null on wizard projects | high |
| Weather morning and midday (spec, legal research) | PARTIAL | single snapshot `lib/weather.ts` | low |
| Daily 17:00 crew reminder email | MISSING | no cron, no reminder code (grep) | low |
| Offline capture queue | MISSING | no service worker; in-memory retry only `CrewReportForm.tsx:43-82` | medium (claimed on landing) |
| Bautagebuch PDF, day pages numbered | BUILT | `lib/pdf/day-report.tsx`, `lib/pdf/completion.tsx`, `lib/data/final-report.ts` (generatable at any status) | low |
| Regiestunden: sheets, 6 working day countdown, deemed approval | BUILT | `lib/hours-shared.ts`, `lib/data/hours.ts:204-330`, `components/hours/*` | medium (legal fit) |
| Deemed approval only where VOB/B applies | MISSING | deadline set for every country `lib/data/hours.ts:217` | high |
| Prior approval flag for hourly work (s 2 Abs. 10 VOB/B) | MISSING | grep finds nothing | medium |
| Worker names on Regie lines | MISSING | `personId: null` in `components/hours/SheetEditor.tsx:156` | medium |
| Regiebericht PDF | BUILT | `lib/pdf/regiebericht.tsx`, `app/api/pdf/regie/[sheetId]/route.ts` | low |
| Nachtraege: photos, amount, approve or reject | BUILT | `components/hours/ChangeOrderList.tsx`, `lib/data/change-orders.ts` | low |
| Nachtrag PDF (HANDOFF PDF list) | MISSING | no change-order document in `lib/pdf/` | low |
| Abnahme: defects, signatures, penalty reservation, warranty start | BUILT | `components/final/AcceptanceFlow.tsx`, `lib/pdf/abnahme.tsx`, image `spec-gaps/landing-doc-abnahme.png` | low |
| Abnahme defect photos | MISSING | no capture in AcceptanceFlow, no Image in abnahme.tsx, though `photo_path` is read `lib/data/acceptances.ts:54-86` | medium |
| Completion report: logs, hours, changes, incidents | BUILT | `lib/pdf/completion.tsx` | low |
| Completion report: material docs, defect annex, document index | MISSING | completion.tsx sections: cover, days, three registers | low |
| Naročilnica with hash-bound acceptance | BUILT | `lib/data/purchase-orders.ts:286-420`, `lib/pdf/narocilnica.tsx` | medium (person-only, see demo access) |
| Invoice from PO, hours, extras, reverse charge, accountant share | BUILT | `lib/data/invoices.ts`, `lib/pdf/invoice.tsx`, image `landing-doc-invoice.png` | low |
| Per-project VAT mode | MISSING | `defaultVatMode` always reverse_charge `lib/invoice-shared.ts:40-42`, no UI | medium |
| Notifications: 17 kinds, email plus bell | BUILT (emails blocked by F2) | all kinds emitted (grep), `components/app/NotificationBell.tsx` | high while email is down |
| Incidents (rain, obstruction, incident) | BUILT | `components/crew/IncidentButton.tsx`, `IncidentsPanel.tsx` | low |
| Portfolio | BUILT | `components/app/PortfolioHeader.tsx`, `ScheduleBar.tsx`, seed adds five projects | low |
| Magic-link auth, sessions, roles | BUILT (blocked by F1, F2) | `app/actions/auth.ts`, `lib/auth.ts` | blocker now |
| Self-service EPC signup or onboarding | MISSING | only the seed creates `type: "epc"` orgs (`scripts/seed-demo.mjs:142,191`); unknown email returns `sent:true` silently `app/actions/auth.ts:79` | high |
| Demo access to persons during a live demo | MISSING | demo passwords give TOKEN sessions; PO page `notFound` for non-person (`po/page.tsx:34`), final page (`final/page.tsx:29`), hours cannot decide; nav row only for `token === null` (`CommandBar.tsx:71`); demo people have `*-demo.si` emails that `lib/email.ts` refuses | blocker |
| Landing page | BUILT | `app/[locale]/page.tsx`, `components/landing/Story.tsx`; screenshot `local-sl-landing-desktop.png` | see claims |
| Landing localized assets | PARTIAL | `Story.tsx:36-108` hardcodes Slovenian images; `public/landing/doc-*-de.webp` exist, unused (`crop-de-paper.png`) | high for a German or Austrian buyer |
| Impressum and privacy | BUILT but dark | `lib/legal.ts` OPERATOR fields null, routes 404 (`local-sl-impressum.png`) | medium |
| Error and loading boundaries | MISSING | no `error.tsx` or `loading.tsx` anywhere under app (find); not-found uses old light card with project-link copy | high |
| Translations de, en | BUILT | parity test green, 0 keys with Slovenian left in de (my count over 834 keys) | low |
| Custom domain | MISSING | belin-app Vercel domains: only `belin-app.vercel.app`; getbelin.com serves the old Belin 1.0.0 CRM site | high |
| Service role rotation | UNVERIFIED | FOUNDER-VERIFICATION, plan D8 open | low tomorrow |

## 2. Marketing claims the product does not fulfil

Landing (messages/sl.json `landing.*`):
- `loopBody` "Vreme se pripne samo": false on every wizard-created project (no coordinates).
- `loopAside` "tudi na slabi povezavi": no offline queue, no service worker.
- `ctaBody` "Naložite načrt in v nekaj minutah vidite, kako izgleda" plus `ctaButton` "Prijava": a stranger cannot get an account; and a created project would show 0% (no scope items).
- `paperAside` "Vse v jeziku projekta": true for PDFs, but the German landing itself shows Slovenian documents.
- `compliance1` "z opozorilom pred potekom": only fires when an EPC opens a dashboard, and only to the sub.
- `point2` "EPC vidi napredek v živo": true on seed, false on new projects (0%).

Brochure (`lib/pdf/brochure-copy.ts`):
- sl daily step "Brez usposabljanja, brez računa": crew now needs an email and a magic link.
- de daily step "Ohne Schulung, ohne Rechnung": mistranslation ("Rechnung" is invoice; meant account), and false for the same reason.
- "tudi na slabi povezavi" / "auch bei schlechter Verbindung": no offline.
- "Vreme se pripne samo" / "Das Wetter hängt sich selbst an": see above.
- "z opozorilom pred potekom" / "mit Warnung vor Ablauf": partial.
- "Vseh pet modulov, brez omejitev" / "Alle fünf Module": module 2 lacks per-worker docs and reminders, module 3 lacks offline and the 17:00 reminder.
- "Rok šestih delovnih dni sledi § 15 odst. 3 VOB/B" in the Slovenian edition: applied to Slovenian projects where VOB/B is not law unless agreed.
- "Dokumenti ostanejo vaši, tudi če Belin nehate uporabljati": no bulk export.

Salzburg deck (`assets/marketing/source/salzburg-de.html`, live at /p/salzburg.html):
- "NACHWEISE A1, ZKO, Versicherung. Für jeden Mann.": no per-worker documents.
- "Belin meldet sich, bevor etwas abläuft.": partial, see above.
- "UNTERWEISUNG Unterschrieben am Tablet" and the drawn Sicherheitsunterweisung marked "Erstellt in Belin": not built (CHANGELOG 2026-09-16 admits).
- Strangmessprotokoll marked "Erstellt in Belin": not built.
- "Video, Orthofoto und Einzelbilder liegen im Projekt und lassen sich mit einem Link teilen": no video or orthophoto storage, no share link for project content.
- "Jedes Foto ... in voller Auflösung, jederzeit herunterladbar": photos are downscaled to 1600px (`PhotoCapture.tsx:6`), no download control in the Lightbox.
- "Mit einem Link teilen": PDFs are person-session only; ShareLink exists only for invites.
- "Datum, Wetter und Mannschaftsstärke kommen automatisch dazu": weather fails on wizard projects.
- "Nichts davon lässt sich später umschreiben": TRUE (no update path for daily_entries).

Workflow document (`assets/marketing/source/workflow-sl.html`, uncommitted, internal):
- predlog tiles, self-declared unbuilt: Ponudba, Pooblastilo, e-mail "Pošiljam v podpis" to the end customer, Enopolna shema, Povpraševanje plus supplier picker, Protokol meritev nizov.
- todo tiles: SMS-geslo signing, soglasje capture, supplier picker, filing confirmation, two missing photos.
- Overclaims beyond the badges: 2.1 and 4.2 caption the vloga as "Samodejno izpolnjena" and "Izpolnjeni dokumenti za priključitev v aplikaciji" with a `dokument` badge, but it was filled by `scripts/marketing/vloga.mjs`, not by the app. 4.3 captions the Abnahme as "Podpisi vseh udeležencev in povezava za stranko": no end-customer role or link exists. 3.2 promises assignment to own employees and to mechanical plus electrical subs: one sub per project. "Slabo vreme se samodejno zabeleži prek vremenskega API-ja": rain is a manual incident. 4.4 "Oddaja institucijam" automatic: not built. "Gradbeni dnevnik (Bautagesbericht)" as a generated document contradicts DECISIONS (Slovenian positioning: never claim a statutory gradbeni dnevnik).
- Title "Belin ERP, od leada do priklopa" describes a product scope (EPC to end customer) that is about one third built.

## 3. Open debt

CHANGELOG debt still open:
- 2026-09-16: workflow doc predlog modules (above); Salzburg build commitments (Strangmessprotokoll, signed Unterweisung, drone flights); `assets/marketing/docs-de/` misleading folder and no German Bestellung from the pipeline.
- 2026-08-31: flaky `tests/k2-parse.test.ts` forum2 under load; operator identity, Resend SPF/DKIM/DMARC, custom domain outstanding.
- 2026-08-13: demo video not embedded (deliberate); Impressum and domain founder's call.
- Earlier: service role key exposed in chat, rotation owed (CHANGELOG line 459; FOUNDER-VERIFICATION); DevSwapBar removal debt (gated by `tests/dev-tools-gate.test.ts`, appears handled).
- GTM INDEX: rename Sonce Energija before any public asset (violated: live landing images); login is a dead end for strangers.

FOUNDER-VERIFICATION.md: every item is still `[ ]` open, including "the login email actually arrives" (now known false: domain failed), crew flow under 30 seconds on a real phone, two real accounts end to end, own K2 exports.

## 4. Uncommitted working tree

`git status`: M CHANGELOG.md, DECISIONS.md, package.json; ?? assets/marketing/belin-workflow-sl.html (2.8 MB built), assets/marketing/forms/ (blank operator PDF 1.28 MB, two filled PNGs), assets/marketing/source/workflow-sl.html, docs/sessions/2026-09-16-workflow-document-rebrand.md, scripts/marketing/vloga.mjs, vloga-view.html, workflow.mjs.

Read the diffs: complete and coherent. CHANGELOG and DECISIONS entries describe exactly these files; package.json adds `marketing:vloga` and `marketing:workflow`; the session log exists. No secrets. `git diff --check` clean. Dash sweep: only `vloga.mjs` carries two en dashes, deliberately, as a search needle for the operator's own text and a comment explaining it.

Safe to commit, with three caveats: (1) `workflow.mjs` reads `../../screenshots/k2 upload prompt.png` and `k2 upload result.png`, and `screenshots/` is gitignored, so the build is not reproducible from a clean checkout; copy them into `assets/marketing/raw/`. (2) The built HTML photographs documents naming Sonce Energija d.o.o. (private repo, but internal files get forwarded). (3) It should not be presented to a prospect as product: most of it is roadmap.

## 5. Other evidence gathered

- getbelin.com serves a page titled "BELIN [em dash] Where Solar Gets Done" with the description "Manage contacts, projects, leads, workers, expenses" (old Belin 1.0.0 site, title contains an em dash) from another Vercel project; belin-app has only `belin-app.vercel.app`. Every PDF footer (`lib/pdf/theme.tsx:288`), email footer (`lib/email-shared.ts:65`), landing imprint and brochure send people there.
- Production deploy is current: belin-app production = commit e89f2de (READY).
- Landing assets show inconsistent tempo on one screen: hero tile "5.9 %/dan" vs panel "6,5 %/dan", and dot decimals in Slovenian ("245.7 kWp", "58.3 %") (`landing-epc-dashboard.png`, `crop-de-loop.png`).
- Local login page (DEMO_LOGIN=1) shows the password form glued under the magic-link button (`local-sl-login-phone.png`).
- "Dan 1" project id: 33333333-3333-4333-8333-333333333334 (Poslovni park Ljubljana Vzhod); "Trenutno": ...333 (PSE Trgovski center Kranj). Demo tokens: demo-epc-k7m2x9q4, demo-sub-r8p3n6w1, demo-epc-start-h3k9m2, demo-sub-start-q7w4z8. No FINAL project was ever added; the paperwork beat runs on Trenutno and needs a reseed after each demo.
- Runbook v2 (`docs/demo/2026-08-12-runbook-v2.md`) is stale: beat 2 says "tap a name", beat 4 says "no account, no password", rough edges say landing screenshots are missing, and beats 1, 5, 6 cannot be done with the 12345/54321 token logins it prescribes.
