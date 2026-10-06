# Recon: demo-risk (the live meeting and what can go wrong on stage)

Date: 2026-10-05, about 18:40 to 19:10 UTC (20:40 to 21:10 CEST). Read-only. Scratch folder: `scratchpad/recon/demo-risk/` (scripts `shots1.mjs`, `shots2.mjs`, `k2peek.mjs`, `bro.mjs`, screenshots in `shots/`).

## Headline

Right now nothing that touches data works, anywhere. The Supabase project is paused for inactivity. Production and localhost both answer every project link with "Povezava ni veljavna". Even once it is resumed, production has no way for the founder to appear as the EPC office, the subcontractor office or the crew, because every demo person has a fake `-demo.si` address that the mailer refuses by design, and the password login that the runbook relies on is hidden on production. On top of that, getbelin.com, the domain printed on every PDF, every email and the brochure, serves the OLD Belin 1.0.0 CRM with invented customer logos and stats, and the getbelin.com sending domain has failed verification in Resend (its DKIM record no longer exists in DNS).

None of this is visible from the code alone. All of it is fixable tonight, mostly with small changes, plus four clicks only the founder can make (Supabase resume, Resend DKIM record at Hostinger, Vercel domain move, Supabase plan).

## Current state, verified

| Thing | State | Evidence |
|---|---|---|
| Supabase project xrwncpngjajosstvkign | **INACTIVE (paused)**, org BELIN on plan `free` | `get_project` status INACTIVE; `get_organization` plan free; `nslookup xrwncpngjajosstvkign.supabase.co` gives Non-existent domain; `execute_sql` "Connection terminated due to connection timeout" |
| Production project link | 404 "Povezava ni veljavna" after 7.5 s | `shots/B-prod-epc-token-1280x720.png`, `shots/B-prod-crew-token-390.png`; curl 404 7.5 s |
| Localhost project link | Same 404 after 9.4 s | curl `http://localhost:3000/sl/p/demo-epc-k7m2x9q4` 404 |
| Production traffic | Practically none in 14 days except today's recon | Vercel `get_runtime_logs` production, 2026-10-05 18:40 entries only |
| Vercel function region | **iad1 (Washington DC)**, edge fra1 | Response header `X-Vercel-Id: fra1::iad1::...` on `/sl` and `/sl/p/...` |
| Vercel production envs | NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, RESEND_API_KEY. No DEMO_LOGIN, no NEXT_PUBLIC_APP_URL | `filter_project_envs` (values not decrypted) |
| Last production deploy | dpl_EUTbu612Gd87sZXHnj1JSctgqmL5, 2026-09-16 10:52 UTC, READY | `get_project` latestDeployment |
| getbelin.com / www / app.getbelin.com | Serves the OLD Belin 1.0.0 site ("Every kWh starts here", fake "Trusted by" logos, "2,400+ projects", "EUR 50M+ revenue tracked", pricing 0/50/200 EUR) with a different logo | `shots/getbelin-1280x720.png`; `list_project_domains` on the old Vercel project `belin` (prj_1XtUQRTqNtginblWPdWspOKg3kNc) holds app.getbelin.com |
| Resend domain getbelin.com | **Status failed**. `resend._domainkey.getbelin.com` does not exist in DNS. DMARC is p=quarantine | Resend `list-domains`; `nslookup -type=TXT resend._domainkey.getbelin.com 8.8.8.8` NXDOMAIN; `_dmarc.getbelin.com` TXT |
| Landing and login (no DB needed) | Work on production, 0.7 to 1.9 s load, then a 4.5 s splash | `shots2.mjs` log: splashMs 4480 to 4749 |

## How the founder appears as each persona on production today: he cannot

- Demo people: Marko Golob (EPC admin, marko@sonce-demo.si), Boštjan Novak (sub admin, bostjan@avesol-demo.si), Luka Zupan (crew, luka@avesol-demo.si). `scripts/seed-demo.mjs:198-207`.
- `lib/email.ts:24-25` and `:48-51`: any address ending in `-demo.si` is refused and logged as `demo-domain`. So a magic link for any demo person never leaves the server.
- The password form (12345 / 54321) is rendered only when `DEMO_LOGIN === "1"` (`app/[locale]/login/page.tsx:40,79`), and DEMO_LOGIN is not set in any Vercel environment (verified above).
- Even with it, the password login produces a TOKEN session, and every office act refuses token sessions: `app/[locale]/app/[projectId]/final/page.tsx:29` (notFound for tokens), `po/page.tsx:34`, `hours/actions.ts:91,126`, `final/actions.ts:24-151`, `lib/data/acceptances.ts:101`. So beats 5 and 6 of runbook v2 (approve hours, Zaključi projekt, Ustvari poročilo, Začni prevzem, Ustvari račun) were never possible with 12345 / 54321.
- The crew door now asks for a name AND an email and sends a magic link (`app/[locale]/p/[token]/claim-actions.ts`, `components/crew/CrewClaim.tsx`), so the runbook's "tap a name" no longer exists.
- Locally, the only way in is the `[dev] magic link for ...` line printed in the dev server terminal (`app/actions/auth.ts`), which a non-developer would have to copy mid-meeting from a terminal, on a dev server that compiles each route on first visit.

## Findings

### B1. Supabase is paused (blocker)
Evidence: table above. Free plan pauses after a week of low activity (Supabase docs, "Project Pausing", https://supabase.com/docs/guides/platform/free-project-pausing, accessed 2026-10-05). Restore window is 90 days.
Fix: founder clicks Resume project in the Supabase dashboard now (or approves `restore_project` through the connector). Then keep it awake: Pro plan "from $25/month" (https://supabase.com/pricing, accessed 2026-10-05), which also removes the 7-day pause for the pilot, or at minimum the daily demo-reset cron below. 0.25 h plus restore wait.

### B2. No persona entry on production (blocker)
Evidence: section above. Fix: the Demo Door plus Persona Bar (design below). 3 h.

### B3. getbelin.com shows a different, older product with fabricated social proof (blocker)
Every generated PDF footer prints getbelin.com (`lib/pdf/theme.tsx:288`), every email footer (`lib/email-shared.ts:65`), the landing imprint (`messages/*.json:246`), the legal page (`components/legal/LegalPage.tsx:68`), the brochure (`lib/pdf/brochure.tsx:167,216,383`), the Salzburg deck (`public/p/salzburg.html:525` links to it). A buyer who types the domain from a PDF sees "the operating system for solar companies, from first lead to first kilowatt", fake logos, fake numbers and a 50 EUR/200 EUR price list. That contradicts the product and the pitch, and fake testimonials are a legal exposure under unfair-competition law.
Fix: in Vercel, remove getbelin.com, www.getbelin.com and app.getbelin.com from the old projects and add them to `belin-app` (DNS already points at Vercel, A 216.198.79.1, nameservers at Hostinger dns-parking.com), set `NEXT_PUBLIC_APP_URL=https://getbelin.com` and redeploy. Keep belin-app.vercel.app as fallback. 0.75 h, founder approval (public change). Do it at T minus 12 h or not at all.

### B4. Resend sending domain getbelin.com failed verification (blocker for letting them use it; high for the meeting)
DKIM record missing, status failed. Every login link, invite, notification and accountant share is sent `from: Belin <obvestila@getbelin.com>` (`lib/email.ts:18`). Not verified: whether the RESEND_API_KEY on Vercel belongs to this same Resend account (value not decrypted by rule). Also note `requestMagicLink` returns "check your email" on every path, so a failure is invisible on screen.
Fix: founder opens Resend, Domains, getbelin.com, copies the DKIM TXT record, adds it at Hostinger DNS, presses Verify; then a real test: request a link for his own address on production and read the `email_log` row (status sent, provider id) and the arrival time. 0.5 h plus DNS time.

### B5. Demo dates are frozen at the last seed run (blocker once the DB is back)
All demo dates are relative to the moment the seed ran (`scripts/seed-demo.mjs:114-133` working days, `:359` Dan 1 start, `:493` PO dates, `:576` hour sheet deadline now plus 2 days, `:675-689` compliance documents valid 120 / 18 / 200 days from seed). The DB cannot have been seeded since it paused, and the last pipeline that ends in a seed is the German brochure run of 2026-08-31 (commit 6527e27; `scripts/marketing/pipeline.mjs:60`). On 06.10 that would mean: Trenutno's last diary entry about five weeks ago, hour sheet 2 already "deemed approved" (`lib/hours-shared.ts:153-158`), so no countdown to narrate, the Freistellungsbescheinigung expired around 18.09, and Dan 1 "planned to start" five weeks ago with nothing logged. Exact seed date unverified (DB paused); the mechanism is verified.
Fix: reseed on the morning of the meeting via the in-app reset (below). 0 h beyond the reset work.

### H1. Countdown, weekend dates and the six-day rule do not add up
- Deadline is now plus two CALENDAR days (`seed-demo.mjs:576`) and `workingDaysLeft` counts Monday to Saturday (`lib/hours-shared.ts:68-72` and `workingDaysLeft`). Seeded Monday 21:00 CEST it shows 1 day on Tuesday; seeded Tuesday morning it shows 2. The runbook narrates "two working days".
- Sheet 2 `submitted_at` is two days before a deadline two days ahead (`:574-576`), while the same card prints "Brez odziva v 6 delovnih dneh se list šteje za potrjen" (frame `shots/video-22.png`). A sharp buyer can count.
- Hour lines use calendar `isoDaysAgo(9|8|3)` and the obstruction incident `isoDaysAgo(2)` (`:584-602`, `:638`). Seeded Tuesday 06:00 UTC they land on Sunday 27.09, Saturday 03.10 and Sunday 04.10 (computed with node).
Fix in the seed: deadline = end of the 2nd working day in the project's zone (reuse `deadlineTimestamp` and `addWorkingDays` from `lib/hours-shared.ts`), `submitted_at` = 6 working days before that deadline, hour lines and incidents on working days via the existing `workingDaysEnding` helper. 0.75 h.

### H2. The demo EPC is a real Slovenian company, the book uses real brands, and the PO prints AVESOL's price
`seed-demo.mjs:143` "Sonce Energija d.o.o." (a real ZSFV member, flagged in `docs/gtm/INDEX.md:53` and `docs/gtm/knowledge/market-icp-si.md:56`); book projects "PSE Lidl Domžale", "Hala Trimo Trebnje", "Streha Gorenje Velenje" (`:711-726`); PO 118,500 EUR and 48 EUR/h (`:504-505`), which DECISIONS.md:19 says "hands a prospect our rate". The 40 s video shows Sonce Energija on the Zapisnik and the Račun (`shots/video-33.png`). In front of a Slovenian EPC this is a blocker: it reads as "Sonce is our client and pays us this much". 
Fix: invented EPC and book names (check each against AJPES before use), or better, personalise: the demo EPC carries the prospect's own company name for the meeting (see ideas). Decide with the founder whether real prices stay. 0.5 h.

### H3. Dan 1 naročilnica says Kranj for a Ljubljana job
`seed-demo.mjs:544` description "Montaža FV sistema 245.7 kWp, Kranj" on PO_START, whose project is Poslovni park Ljubljana Vzhod (`:371-379`). Opened on stage in beat 1 or 2. 0.1 h.

### H4. Functions run in the USA, the database in Frankfurt
`X-Vercel-Id: fra1::iad1::...`. Every query on every server render crosses the Atlantic, and the landing and login footers claim "Podatki v EU, Frankfurt" (`messages/sl.json:210,241`) while processing happens in Virginia. Vercel lets every plan pick one region (https://vercel.com/docs/functions/limitations, accessed 2026-10-05: default iad1, changeable).
Fix: add `vercel.json` with `{"regions": ["fra1"]}`, deploy, verify the header reads `fra1::fra1`, time the EPC dashboard before and after. 0.25 h.

### H5. The seed is not a full reset, so rehearsals leave debris on stage
It upserts fixed ids and deletes only a few things (`seed-demo.mjs:262-268`, `:401-411`, `:428-437`, `:624`, `:646`, `:669`, `:848-894`). After a rehearsal these survive the reseed: projects created with the wizard in the demo EPC org (they pile up in the portfolio "zoom out" beat), material items added live on Dan 1 (the crew is asked to re-check a phantom part), new hour sheets, change orders and naročilnice, Dan 1 incidents and requests, every non-closing activity row (for example "List 2 potrjen" while the sheet is back to submitted), crew people created through the claim screen, and PO_START keeps `accepted_by_name`/`accepted_at` from a rehearsal acceptance because the upsert does not null them (`:515-525`).
Fix: a purge step scoped strictly to demo org and project ids before the upserts. 1 h.

### H6. No error or loading boundaries anywhere
`app/` contains no `error.tsx`, `global-error.tsx` or `loading.tsx` (full listing). Any thrown server error shows Next's default "Application error" page; a database error on a project link is rendered as "link invalid or revoked" because `resolveActorFromToken` returns null on error (`lib/actor.ts` around line 164); the not-found page is an unbranded white card with no way back (`app/[locale]/not-found.tsx`, `shots/B-prod-epc-token-1280x720.png`). With functions in iad1, clicks feel dead for a second with no feedback.
Fix: branded `app/[locale]/error.tsx` with a retry button, `app/global-error.tsx`, `app/[locale]/app/loading.tsx` skeleton, distinguish "database unreachable" (503, "Belin trenutno ni dosegljiv, poskusite znova") from "not found", and give not-found the wordmark plus a home link. 1.5 h.

### H7. The 4.5 s splash replays on every reload
`components/SplashGate.tsx:20` mounts `BelinSplash` without `once`, in the locale layout (`app/[locale]/layout.tsx:138`). Measured 4.5 to 4.7 s on every fresh load. The runbook's own recovery move for a stalled live update is "reload the page", so each recovery costs 4.5 s of logo in front of the buyer.
Fix: pass `once` (sessionStorage), or play only when `display-mode: standalone`. 0.25 h.

### H8. The runbook no longer matches the product in six places
`docs/demo/2026-08-12-runbook-v2.md`: 12345/54321 (hidden on prod and unable to do office acts), the scenario pill (token sessions only, `app/[locale]/app/page.tsx:83`), "tap a name" (now email plus link), "Show the crew link as a QR from Settings" (there is no QR anywhere: no QR dependency in package.json, `components/settings/CrewLink.tsx` renders only ShareLink), "The EPC sees it live and gets an email" (demo addresses are refused, `lib/email.ts:48`), "Landing page screenshots are not in yet" (they are). 
Fix: runbook v3 plus the one-page cheat sheet below. 1 h.

### H9. Handing a crew link to the prospect corrupts their future account
`findOrCreateCrewByEmail` (`lib/data/crew.ts` around 175-224) creates a crew person in AVESOL's demo company with whatever email is typed. Later an invite to that same address fails with `emailTaken` (`lib/data/invites.ts:105-113`), so the buyer cannot be onboarded with their own address. If the address already belongs to someone in another company (for example the founder's own account), it signs that person in and sends them to a demo project they are not party to (`crew.ts` returns `existing.id` regardless of org), which errors.
Fix: never show the crew link to the room; for "try it on your phone" use the demo door guest entry. In the product, refuse an existing person from another org with a clear message. 0.5 h.

### H10. No way to create an EPC customer in the product
Organizations are only ever inserted as `type: "sub"` through invites (`lib/data/invites.ts:165`); invite kinds are `sub_company | epc_member | crew` (`lib/invites-shared.ts:1`). If the buyer says "set us up", the founder cannot do it in the meeting. 
Fix: founder-only "Ustvari naročnika" action on the presenter panel (company name, country, admin name, email; inserts org type epc and admin person, sends the login link). 1.5 h. Depends on B4.

### H11. German or Austrian audience: half the screen stays Slovenian
UI catalogs are complete (834 keys each, only 3 identical multiword values, all legitimately identical). But: landing images are always Slovenian (`app/[locale]/page.tsx:105,114`, `components/landing/Story.tsx:36,56,57,106-108`) although `public/landing/doc-*-de.webp` exist, see `shots/B-prod-landing-de-1366x768.png` ("PREGLED PROJEKTA", "Dnevni tempo" in the German hero). All demo data and every PDF follow `projects.language = 'sl'`. The German overlay (`scripts/marketing/germanize.mjs`) is a terminal script, never re-renders the naročilnica PDFs (DECISIONS.md:19), and leaves Naklo, Trimo, Gorenje in the book.
Fix: locale-aware landing images (0.5 h); a second demo world for DE/AT seeded side by side with its own fixed ids, German names, an Austrian or German address and German PDFs, chosen on the presenter panel (3 h). Only if the audience is German speaking.

### M1. The hidden demo password action is still callable on production
The production login chunk `page-b45ba5fbb1e62146.js` ships `createServerReference("60f1dbf5...", ..., "loginAction")`; `loginAction` (`app/actions/auth.ts`) has no DEMO_LOGIN check. Anyone can mint a demo EPC or crew token session, and a token EPC can run the project wizard (`app/[locale]/app/new/actions.ts:24`). Only demo data is exposed, but a stranger could litter the demo before the meeting. Not invoked by me.
Fix: check `process.env.DEMO_LOGIN === "1"` inside `loginAction`, or delete LoginForm, loginAction and DEMO_USERS (task J4). 0.25 h.

### M2. Upload limit mismatch and real customer data in the K2 files
`next.config.ts` raises server action bodies to 32 MB, but Vercel caps a function request body at 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE, https://vercel.com/docs/functions/limitations, accessed 2026-10-05). Fixtures range 0.12 to 3.46 MB, so the demo file must be chosen. Several fixtures carry real third parties: `planung-engelmeier.pdf` names a private customer and a Vienna street address and the EPC Lumix Solutions GmbH; `thomas-woginger.pdf` likewise. `k2-report-2025.pdf` (123 KB, 17 pages, "Kunde Mustermann") is the least sensitive.
Fix: demo with `k2-report-2025.pdf` or a sanitised copy; long term, upload straight to storage. 0.1 h for tomorrow.

### M3. Signed-in browser cannot show the landing page
`app/[locale]/page.tsx` redirects any resolvable session to `/app`. Present the landing from a separate Chrome profile (or before signing in). 0 h, cheat sheet item.

### M4. Text too small for a projector or a shared Teams window
74 declarations between 9 px and 11.5 px in `app/globals.css` (tally). Unverified on real screens (DB paused). Present at 125 percent browser zoom on a 1920 screen; rehearse at 1280x720.

### M5. Live update depends on a websocket to supabase.co
Venue or corporate wifi can block it; the fallback poll is 25 s (`lib/realtime-client-core.ts:6`). Use a phone hotspot for the laptop, and say "it is saved, the screen catches up" instead of reloading (see H7).

### M6. Platform terms
Vercel Hobby is "non-commercial, personal use only" (https://vercel.com/docs/plans/hobby, accessed 2026-10-05); the team looks like Hobby (1-hour runtime log retention seen in `get_runtime_logs`), plan not directly verified. Open-Meteo free API "may only be used for non-commercial purposes" (https://open-meteo.com/en/terms, accessed 2026-10-05). Weather is fetched server side with a 2.5 s timeout (`lib/weather.ts`), so venue wifi does not affect it. Low for tomorrow, real before the pilot.

### M7. The crew phone is invisible to a room
A projector shows the laptop. The 30-second crew report, the strongest beat, happens on a 6-inch screen nobody else can see. See the split-stage idea.

## The bulletproof setup

### 1. Demo Door (one tap entry, no security hole)
- `lib/demo/door.ts` (server-only):
  - `DEMO_PERSONAS = { epc: "66666666-6666-4666-8666-666666666605", sub: "...603", crew: "...602", bauleiter: "...601" }` (fixed ids from `seed-demo.mjs:25-33`), plus the DE world ids if built.
  - `DEMO_ORGS` = the four demo org ids.
  - `doorOpen(key)`: false unless `process.env.DEMO_DOOR_KEY` is set and at least 32 chars, `Date.now() < Date.parse(process.env.DEMO_DOOR_UNTIL)`, and `timingSafeEqual` matches. Fail closed.
  - `enterAs(persona)`: looks the id up in the fixed map (never an id from the request), loads the person, refuses unless `org_id` is in DEMO_ORGS and `email` is null or ends in `-demo.si`, then starts a person session with a short TTL (extend `startPersonSession(personId, { ttlDays })`, 1 day for laptop personas, 7 days for the crew phone).
- `app/[locale]/demo/[key]/page.tsx`: the presenter panel. notFound on a bad key, `robots: noindex`. Big buttons: EPC pisarna, Podizvajalec pisarna, Ekipa na strehi; Ponastavi demo; Ogrej; world switch SI / DE; health lights (below).
- `app/[locale]/demo/[key]/actions.ts`: POST server actions only. A GET never mints a session, so link previewers and mail scanners cannot sign anyone in (same principle as the verify page).
- `components/demo/DemoPersonaBar.tsx`: rendered in the app pages only when the current session is a person in DEMO_PERSONAS and the door is open. A segmented control "Pogled: Naročnik | Podizvajalec | Ekipa" that swaps the session to another demo person and keeps the current project and locale. A real customer can never see it or call it, because the action re-checks that the CURRENT session is a demo person. Hidden in shot mode.
- Revocation: reset revokes all sessions of demo persons; after the meeting rotate DEMO_DOOR_KEY or let DEMO_DOOR_UNTIL lapse.
- Also close M1 in the same change.
- Effort: 3 h including tests (door closed without env, wrong key, expired, non-demo id impossible, bar invisible to a real person).

### 2. Reset without a terminal
- Move the seed body into `lib/demo/seed.ts` (`resetDemo({ world, now })`), keep `npm run seed` as a thin CLI over it, so there is one implementation.
- Add the purge pass (H5) and the date fixes (H1), the name fixes (H2, H3).
- Seed photos: reuse the six JPEGs already in storage at `${PROJECT}/seed/photo-i.jpg` (or commit them to `public/`), so the server path needs no sharp.
- Re-render the naročilnice through `renderPoPdf` exactly as `scripts/seed-documents.ts` does, including the remove, wait, upload, signed-URL hash read-back.
- Presenter panel button "Ponastavi demo" calls it; shows the result lines.
- `app/api/cron/demo-reset/route.ts` guarded by `Authorization: Bearer ${CRON_SECRET}`, `vercel.json` crons `"0 3 * * *"` (Hobby: once a day, plus or minus 59 minutes, https://vercel.com/docs/cron-jobs/usage-and-pricing, accessed 2026-10-05). Keeps the story dated "yesterday" forever and keeps Supabase from pausing. The tripwire stays.
- Cheap fallback if this slips: `reset-demo.cmd` on the founder's desktop that runs `npm run seed` in the repo.
- Effort: 3.5 h.

### 3. Health lights on the presenter panel
DB reachable and its latency; function region (from `process.env.VERCEL_REGION`); seed freshness (Trenutno's last entry is the last working day); hour sheet 2 shows 2 working days; Freistellungsbescheinigung shows 18 days; both naročilnica PDFs re-hash to their stored sha256; leftovers count is zero; no finalization, acceptance or invoice on Trenutno; realtime channel status. Green or red, one glance at T minus 5. 1.5 h.

### 4. Pre-warming
With functions in fra1 most of the latency goes away. Still, at T minus 10: open each route once per persona from the presenter panel's "Ogrej" (portfolio, Trenutno dashboard, hours, naročilnica, final page, settings; crew home on the phone), open both PO PDFs and one Regiebericht PDF (loads @react-pdf and the font), and generate the completion report once (it is repeatable; the action reuses a report younger than 60 s, `final/actions.ts`). The once-only beats (handover, acceptance, invoice) are never pre-warmed.

### 5. Fallback ladder (in this order)
1. Saved but screen did not move: wait 3 s, then click the tab again rather than reload (splash).
2. Venue network: switch the laptop to the phone hotspot (or a second phone).
3. A deploy broke something: Vercel Instant Rollback to the deployment noted at T minus 3 h (no deploys after T minus 3 h).
4. Database or platform down: the offline kit on the desktop, folder `BELIN OFFLINE`: a fresh screen recording of the full story shot tonight after the name fixes (the existing `assets/marketing/video/belin-demo.mp4` shows Sonce Energija and August dates, `shots/video-33.png`), the brochures `assets/marketing/belin-predstavitev-sl.pdf` and `belin-vorstellung-de.pdf` (no company names or prices in text, verified with unpdf, 7 pages each), the three generated PDFs from the rehearsal, and for an Austrian audience `public/p/salzburg.html`.

### 6. Pre-flight checklist
- **Tonight (T minus 20 h, now)**: resume Supabase; fix Resend DKIM; decide the domain move; tell us the prospect (company name, country, language, how many people, in person or Teams, projector or TV).
- **T minus 12 h (before sleep, after the fixes are deployed)**: full dress rehearsal on production with the exact laptop, phone and cable; every beat including the once-only ones; sign the crew phone in through the door and add it to the home screen, open it from the icon and confirm it is still signed in; grant the camera permission; test a magic link to the founder's own inbox (arrival time, spam folder); then press Ponastavi demo; print the cheat sheet.
- **T minus 3 h**: code freeze. Note the production deployment id for rollback on the cheat sheet. No pushes to main after this.
- **T minus 1 h**: Ponastavi demo (dates are now "today", countdown 2 days, document 18 days). Health lights all green. Laptop: notifications off (Windows Focus, WhatsApp, Outlook, Teams), power plugged in, sleep off, Chrome profile "Belin oder" with only the needed tabs, second profile "Belin splet" for the landing, zoom 125 percent. Phone: charged above 80 percent, Do Not Disturb, auto-lock off, brightness up, crew home open.
- **T minus 15 min**: Ogrej. Generate the completion report once. Open the offline folder in a background window. Check the hotspot works.
- **T minus 5 min**: health lights green again. Landing open in profile "Belin splet", EPC dashboard in profile "Belin oder" on Trenutno, phone on the crew home of Dan 1. Close everything else.

### 7. The printed one-page cheat sheet (content)
- Top: the presenter panel QR (door link) and the three persona QR codes, the production URL, the rollback deployment id, the hotspot name.
- The story in 7 lines, one sentence of narration each, in the meeting's language (sl and de columns).
- "If this, then that" box: screen did not update, a red error, logged out by accident (scan the QR), wifi dead, PDF slow (it is still assembling, talk about the cover page), they ask for prices, they ask where the data is (Frankfurt, after H4).
- Numbers to have in the head: 245.7 kWp, 546 modules, 9 working days logged, six working days rule, the naročilnica total if kept.
- Bottom: after the meeting, rotate the door key, press Ponastavi demo, send the leave-behind.

## Ideas (things that make it a no-brainer on stage)

1. **Their name on the dashboard.** The presenter panel takes the prospect's company name and writes it as the demo EPC's name before the reset, so the portfolio, the naročilnica PDF and the Zapisnik o prevzemu say their company. It also removes the Sonce Energija problem. 0.5 h on top of the reset.
2. **Split stage.** On the projected laptop, two windows side by side: the crew view in a 390 px wide window on the left (persona Ekipa, its own Chrome profile), the EPC dashboard on the right. The room watches the report leave the phone view and land on the dashboard. The real phone then goes into the buyer's hand.
3. **The buyer files the report.** Hand them the crew phone: they take a photo of the meeting table and send. It appears on the wall. Then generate the completion report: their photo is inside the PDF. That is the moment the product stops being a slide.
4. **Leave-behind from the meeting itself.** Email the three documents produced live (completion report, Zapisnik, Račun) and the read-only wall link in their language (`/de/p/<epc token>` or `/sl/p/...`) the same afternoon: "the documents we made together on Tuesday".
5. **Sign them up before they leave.** "Ustvari naročnika" on the presenter panel: their admin receives the Belin login email on their phone in the room. Requires B4 and H10.
6. **Guest crew QR for the room** (demo world only): an expiring signed QR lets anyone in the room join as a guest crew member with just a name, no email, on a dedicated demo site; the reset deletes guests. Avoids H9 entirely. 2 h, optional.
7. **Daily self-reset** keeps the demo looking alive any day a prospect opens the wall link, and keeps the database awake.

## Questions for the founder
1. Who is the prospect, which country, which language in the room, how many people, in person or Teams, and what screen?
2. Is the prospect possibly Lumix Solutions or someone who knows Sonce Energija? (K2 fixtures carry Lumix and its customers.)
3. Do the real AVESOL numbers (118,500 EUR, 48 EUR/h) stay visible on the naročilnica and the invoice?
4. May we move getbelin.com to the new app tonight, and pay 25 USD/month for Supabase Pro so it cannot pause during the pilot?
5. Do you have access to Hostinger DNS for getbelin.com tonight (DKIM record)?
6. Presenting from your own laptop and phone? iPhone or Android?

## Unverified (needs the database or a device)
- The exact date of the last seed and the current state of every demo row (DB paused). After resume run: `select max(entry_date) from daily_entries where project_id='33333333-3333-4333-8333-333333333333'`, `select status, deadline_at from hour_sheets`, `select title, valid_until from documents`, `select id, name from organizations`, `select email, count(*) from people group by 1 having count(*) > 1`.
- Whether the tripwire (unknown organizations) will refuse the next seed.
- Whether Vercel's RESEND_API_KEY belongs to the Resend account that shows getbelin.com as failed.
- How long the Supabase resume takes.
- Completion report generation time on production, and dashboard latency before and after moving to fra1.
- iOS behaviour of the installed web app after signing in in Safari (cookie carry-over); must be rehearsed on the actual phone.
- Readability of the app screens on a projector and in a Teams share (could not screenshot app screens with the DB paused).
- Whether info@getbelin.com mailbox exists at Hostinger (MX records exist).
- Vercel team plan (Hobby inferred from log retention).
