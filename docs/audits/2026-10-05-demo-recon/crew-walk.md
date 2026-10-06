# Recon: crew-walk (sub office and crew side, on phones)

Date: 2026-10-05. Read-only. Scratch folder: `scratchpad/recon/crew-walk/`.

## Headline

The live walk could not happen: the Supabase project `xrwncpngjajosstvkign` is PAUSED (status INACTIVE, org plan "free"). Nothing that touches the database works on localhost OR on production: every crew join link renders "Povezava ni veljavna" (404), and no one can sign in. Sending of sign-in mail is also broken independently: the Resend domain `getbelin.com` is in status "failed" (its DKIM record `resend._domainkey.getbelin.com` does not exist in DNS), while the app sends from `obvestila@getbelin.com` (lib/email.ts:19). And even with both fixed, the seeded demo people cannot sign in on production at all (demo-domain mail is refused by design, DEMO_LOGIN exists only locally).

So the recon below is built from: (1) live screenshots of what renders today on local and production without the DB, (2) a harness that renders the crew and sub screens with the REAL compiled globals.css and fonts from the running dev server, using markup copied 1:1 from the component sources (validated against the real Aug 31 crew-join screenshot: identical layout), (3) code reading with file:line evidence, (4) a Fast 3G + 4x CPU timing of the production shell. A ready-to-run live walk script (`walk.mjs`) is in the scratch folder for the moment the DB is back.

## Evidence files

- Live failure states: `crew-walk/shots/fail-{local,prod}-{iphone,android}-{landing,login,join,app,joinStart}.png`, summary in `crew-walk/failstate.json`
- Harness (real CSS, reconstructed markup): `crew-walk/harness/{iphone,android}-{report-trenutno,report-trenutno-2photos,report-dan1-gate,overview-trenutno,incident-sheet,request-sheet,claim,subhome}-{viewport,full}.png`, geometry and tap targets in `crew-walk/harness.json`
- Throttled timing: `crew-walk/perf-*.json`
- Offline: `crew-walk/shots/offline-after-link.png`
- Scripts: `lib.mjs`, `failstate.mjs`, `screens.mjs`, `harness.mjs`, `overflow.mjs`, `perf.mjs`, `offline.mjs`, `walk.mjs` (live walk, read-only, run after DB restore)

## Findings (ranked)

### BLOCKERS

**B1. Supabase project paused: the whole app is down (local and production).**
Evidence: Supabase get_project returns `"status":"INACTIVE"`; get_organization returns `"plan":"free"`. `nslookup xrwncpngjajosstvkign.supabase.co 8.8.8.8` returns Non-existent domain. `curl https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1` returns 404 after 7.5 s; screenshot `shots/fail-prod-iphone-join.png` shows "Povezava ni veljavna". Supabase pricing page (accessed 2026-10-05): "Free projects are paused after 1 week of inactivity", "Projects on paid plans are not paused for inactivity", Pro "from $25/month".
Fix: founder restores the project in the Supabase dashboard (or the agent with explicit permission via restore_project), then upgrades the org to Pro so it cannot pause again 24 h before or during a pilot. Re-run `npm run seed` only after restore, per runbook. Effort 0.25 h plus restore wait.

**B2. Sign-in and notification mail cannot be sent: getbelin.com is "failed" in Resend.**
Evidence: Resend list-domains: getbelin.com Status failed; avesol.si verified. lib/email.ts:19 `const FROM = "Belin <obvestila@getbelin.com>"`. DNS: `resend._domainkey.getbelin.com` NXDOMAIN at 8.8.8.8; nameservers ns1/ns2.dns-parking.com. The crew claim (components/crew/CrewClaim.tsx, app/[locale]/p/[token]/claim-actions.ts) and every office login depend on this mail.
Fix: founder re-adds the DKIM TXT (and checks SPF/MX) at the DNS host, then "Verify" in Resend. Fallback for the meeting if DNS lags: temporary FROM on the verified avesol.si domain behind an env var. 0.5 h.

**B3. There is no way to sign in as the demo personas on production, and the sub office side is unreachable with the local demo login.**
Evidence: lib/email.ts:26 `DEMO_DOMAIN = /-demo\.si$/i` refuses all demo mail; runbook docs/demo/2026-08-12-runbook-v2.md "The password login exists only where DEMO_LOGIN=1 ... On production, sign in by email link". The local demo login (lib/auth-shared.ts:33-34, 12345/54321) yields TOKEN actors, and app/[locale]/app/[projectId]/po/page.tsx:34 and final/page.tsx:29 return notFound for any non-person actor, so runbook beat 6 ("As the subcontractor, Zaključi projekt / Ustvari račun") cannot be performed with it. Locally the office can only sign in by copying the magic link from the dev console (app/actions/auth.ts:117-118).
Fix: a guarded demo entry on production: `/[locale]/demo` gated by a DEMO_PIN env var on Vercel, three big buttons (Naročnik Marko, Podizvajalec Boštjan, Monter Luka) that mint a session for those seeded demo persons only, plus "Telefon" which shows a one-time QR of a login link for Luka so the prospect's phone is in with one scan. 2 h.

**B4. On the signed-in crew report tab the "ODJAVA" (log out) pill sits on top of the "Pošlji poročilo" button.**
Evidence: harness `harness/android-report-trenutno-viewport.png` and `iphone-report-trenutno-full.png`: logout box y 715 to 748 inside submit bar 690 to 776 (harness.json). Cause: app/[locale]/app/[projectId]/page.tsx:96 and pregled/page.tsx:28 render `<LogoutPill raised />` as a SIBLING of CrewHome's `<main class="belin-dark b-tabbed">` (components/crew/CrewHome.tsx:63), so the tabbed rule `.b-tabbed .lp-logout--raised` (app/globals.css:1451) never matches and the base `.lp-logout--raised { bottom: 96px }` (globals.css:1668) puts it inside the submit bar (which sits at 68 px). dnevnik/page.tsx:66 has it inside main and is correct. A gloved thumb on the left half of the send button logs the crew member out and discards the in-memory draft and photos.
Fix: render LogoutPill inside CrewHome's main (or drop it from crew screens entirely and put "Odjava" in the Pregled tab). 0.5 h.

### HIGH

**H1. SubHome card labels are broken: every label escapes its card and piles up garbled at the bottom of the page.**
Evidence: components/sub/SubHome.tsx:90,101,112,116,120,124 use `className="e-proj-lab"`, which is the EPC chart axis label style `position: absolute; bottom: 1px; transform: translateX(-50%)` (globals.css:978); `.sh-card` (globals.css:1983) is not positioned. Harness `harness/iphone-subhome-full.png`: cards show bare "58.3 %" and "0" with no titles, overlapping text at the bottom-left. Present since b4e3624 (2026-07-20).
Fix: own `.sh-lab` class (static, uppercase eyebrow). 0.25 h.

**H2. SubHome "Čaka na vas" is hardcoded empty and lies about the data.**
Evidence: components/sub/SubHome.tsx:107-125 render t("poEmpty") "Naročilnice še ni.", t("hoursEmpty"), t("changeOrdersEmpty"), t("finalizationEmpty") unconditionally; the component receives no PO, hours or change-order data (props at :25-39). Runbook: Dan 1 has a SENT naročilnica waiting for acceptance, Trenutno an accepted PO, a sheet with a countdown and an approved extra. The office would read "no PO yet" on a project whose PO is waiting for his signature.
Fix: feed real state (PO status, sheets awaiting decision with countdown, change orders by status, finalization state) and make each card a deep link to /po, /hours, /hours?tab=co, /final, with a gold "action needed" state. 2 h.

**H3. The boss's "Dnevno poročanje" button is a dead end: it opens the crew sign-up form.**
Evidence: SubHome.tsx:82 links to `/${locale}/p/${crewToken}`; app/[locale]/p/[token]/page.tsx redirects only when `session.role === "crew"`, otherwise renders CrewClaim (name + e-mail form). Boštjan is `role: "admin"` (scripts/seed-demo.mjs:206). If he fills it, lib/data/crew.ts:204-213 returns his existing person and the mailed link lands him back on SubHome. Loop. crew-route.ts:39-40 also redirects non-crew away from the tabs.
Fix: let sub admins/owners use the crew surface (allow `canIssueCrewLink` roles in requireCrewSurface and point the button at /app/<id>/porocaj or a `?view=crew` variant). 1 h.

**H4. Incident and request sheets render UNDER the tab bar and under the command bar; the Prekliči button is covered, and the language switch stays live above the modal.**
Evidence: `.belin-dark .b-screen { position: relative; z-index: 1 }` (globals.css:1337-1339) creates a stacking context, so `.ic-sheet { z-index: 60 }` (globals.css:2248-2251) cannot rise above `.cr-tabs { z-index: 50 }` (globals.css:1407-1415, sibling of b-screen) or the sticky `.e-bar { z-index: 20 }`. Harness `harness/iphone-incident-sheet-viewport.png`: "Prekliči" visible only as text behind the camera tab, bar undimmed above the backdrop, ODJAVA over "Pošlji". `android-request-sheet-viewport.png`: sheet top hidden under the command bar. No close X, no backdrop tap to close (IncidentButton.tsx:121-175).
Fix: render both sheets through a portal to document.body (createPortal), add a top-right close X and swipe/backdrop close, hide tabs while a sheet is open. 0.75 h.

**H5. Marking a material line "Delno" or "Manjka" makes the page wider than the phone (zoom-out / sideways scroll), in the exact step the runbook demos.**
Evidence: overflow.mjs on 390 and 360: innerWidth becomes 405, offending element the `.mc-miss input` at 245 px (`flex: 1` with no `min-width: 0`, globals.css:1532-1535), unit "kpl" pushed off-screen. Harness `harness/android-report-dan1-gate-full.png`. Runbook beat 2: "mark one line Delno and type how much is missing".
Fix: `min-width: 0; width: 100%` on the input. 0.1 h.

**H6. Daily quantities can only be entered in steps of 10, with no way to type a number.**
Evidence: components/crew/CrewReportForm.tsx:115-116 `max={s.targetQty} step={10}`; components/crew/Stepper.tsx renders the value as a non-editable span. 36 modules cannot be recorded; the seed uses only multiples of 10 (seed-demo.mjs:255-258), which hides it. These numbers drive progress and the Abschlagsrechnung evidence (DECISIONS.md 2026-07-17).
Fix: tap the number to type it (inputMode="numeric"), chips +10/+50/+100, show "ostane N", cap at remaining. 1.5 h.

**H7. Filing a typical report is about 33 taps and 35 to 45 s, over the 30 s law.**
Evidence (code-derived count, typical seeded day: 6 workers, +70 modules, +100 m DC, 3 photos): open icon 1; splash 4.25 s (BelinSplash.tsx END 3.05 + HOLD 0.6 + FADE 0.6); scroll past hero, install hint, incident/request, material card (form starts at y 642 on 390x844 and y 658 on 360x740, under the fixed submit bar: harness.json firstFormInput); 3 photos x 3 taps = 9; headcount from default 1 (CrewReportForm.tsx:35) to 6 = 5 taps; modules 7 taps; DC 10 taps; send 1. Total 33 taps, 6 fields, 2 to 3 scrolls.
Fix: on Poročaj show the form first (move hero, install hint, material summary to Pregled); prefill headcount and offer "Kot včeraj" from the last report; numeric entry (H6); splash once (M3). Target: 8 to 12 taps. 2 h.

**H8. No offline capability at all, despite DECISIONS.md 2026-07-17 (night) promising "offline queue, sync on next open".**
Evidence: grep for serviceWorker/indexedDB/navigator.onLine/outbox finds nothing (only InstallHint localStorage); `/sw.js` returns 404 on production; offline.mjs: no service worker registration; a link tap offline goes to `chrome-error://chromewebdata/` (blank, `shots/offline-after-link.png`); reload offline: net::ERR_INTERNET_DISCONNECTED. CrewReportForm.tsx:81-83 on failure only shows "Poročila ni bilo mogoče poslati"; the draft and photo blobs live in React state only, lost on app close, tab change, language switch or logout.
Fix (in order of value): (a) persist the draft incl. photo blobs to IndexedDB on every change, restore on open, 1.5 h; (b) outbox: if offline or send fails, queue with the existing clientGeneratedId (idempotent RPC already exists), show "Čaka na signal, pošlje se samo", retry on `online` and on open, 2 h; (c) minimal service worker caching the app shell for crew routes, 2 h. Do not claim offline in the meeting unless (a) and (b) ship.

**H9. No loading or error states anywhere in the app.**
Evidence: `find app -name error.tsx -o -name loading.tsx -o -name global-error.tsx` returns nothing. Tabs are server routes (CrewTabs.tsx comment), so on rural LTE a tab tap shows no feedback until the server answers; a thrown server error shows the unbranded Next default.
Fix: loading.tsx skeletons for the four crew routes and office routes, a branded error.tsx with "Poskusi znova". 1.5 h.

**H10. Database errors are shown as "this link does not exist or was revoked".**
Evidence: lib/actor.ts:164 `if (error || !data ...) return null` then notFound(); live today on prod (`shots/fail-prod-iphone-join.png`). The not-found page (app/[locale]/not-found.tsx) is a white card with no side margin and no next step.
Fix: distinguish error from absence (throw on error, render error.tsx "Ni povezave s strežnikom"), restyle not-found dark with a button back to /app. 0.75 h.

**H11. No crew QR exists, but the runbook's strongest beat depends on it.**
Evidence: runbook beat 4 "Show the crew link as a QR from Settings"; grep -i qr in components/app/lib finds only a comment; CrewLink.tsx/ShareLink.tsx offer copy, share, WhatsApp, e-mail only.
Fix: QR in Settings and on SubHome, plus a printable A4 "Prijava na gradbišče" poster PDF per project (react-pdf, project language, project name, address, EPC and sub names, big QR, 3 steps). 2 h.

### MEDIUM

**M1. Tap targets under 44x44 on crew and office screens.**
Evidence (harness.json, both viewports): locale links SL/DE/EN 30.7x25.8 (the ::after overlay in globals.css:1841-1845 lifts height to 44 but width stays 31); status pill 113.8x37.5; "Preveri znova" 113.3x40; install hint close 40x40; ODJAVA 78.4x33.3; "Material še ni prispel" 156.6x40; office nav links 40.8 tall; "Koliko manjka?" label 87.7x18.8. Good: steppers 52x52, segment buttons 46 to 103 wide x 46, CTA 53+, tab cells 68 tall.
Fix: 44 min on all, and remove locale switch and status pill from the crew bar (M2). 0.5 h.

**M2. The crew top bar spends its space on a language switch and a status pill, and hides the project name on phones.**
Evidence: CommandBar.tsx:64-65 renders LocaleSwitch and ProjectStatusControl for everyone; globals.css:890 hides `.e-bproj` under 640 px (harness geo: bprojVisible "none"). A language tap mid-report is a full navigation that discards the draft. For the crew the pill is disabled in "active" (lib/project-status.ts:49-53) but still looks like a control.
Fix: crew bar = mark + project name + one menu (language, logout). 0.5 h.

**M3. A 4.25 s launch animation on every cold open.**
Evidence: components/BelinSplash.tsx END 3.05 s + HOLD 0.6 s + FADE 600 ms; SplashGate.tsx never passes `once`; mounted in app/[locale]/layout.tsx:138. perf.mjs on production at Fast 3G + 4x CPU: login loaded at 3.1 to 3.2 s but splash gone only at 6.6 to 7.1 s; landing 3.6 s vs 7.2 to 8.2 s.
Fix: `once` per session, skip entirely in standalone mode, cap at 1 s. 0.25 h.

**M4. Photo thumbnails delete on a single tap with no affordance or undo; gallery may be unreachable.**
Evidence: PhotoCapture.tsx:103 `onClick={() => removeAt(i)}` on the thumbnail div; PhotoCapture.tsx:116 `capture="environment"`.
Fix: an x badge plus 4 s undo toast; two buttons "Fotografiraj" and "Iz galerije" (no capture attribute on the second). 0.75 h.

**M5. "Material še ni prispel" submits immediately and notifies the EPC, with no confirm, 12 px under the main CTA.**
Evidence: MaterialCheck.tsx:144-147 and :328-336.
Fix: confirm sheet. 0.25 h.

**M6. Crew Ure tab shows the office nav row whose links 404 for crew.**
Evidence: hours/page.tsx:64-73 passes `locale` and `active="hours"` with token null, so CommandBar.tsx:72-100 renders Pregled / Naročilnica / Ure in dodatna dela / Zaključek; po/page.tsx:43 and final/page.tsx:29 notFound for crew. Also `main.container` (globals.css:220) has no bottom padding for the 68 px fixed tab bar.
Fix: no office nav when isCrewSurface; add tab-bar bottom padding. 0.5 h.

**M7. 3 px horizontal overflow of the quantity rows at 360 px.**
Evidence: overflow.mjs android: `.b-stepper` right edge 363 on a 360 viewport, innerWidth 363.
Fix: 48 px step buttons under 380 px or let the name wrap above the stepper. 0.25 h.

**M8. Install hint gives no instructions.**
Evidence: components/crew/InstallHint.tsx renders title and body only; no beforeinstallprompt handling; iOS needs Share then "Dodaj na začetni zaslon".
Fix: platform-specific steps with icons, one-tap install button on Android. 1 h.

**M9. Request sheet buries the answers.**
Evidence: RequestButton.tsx:166-190 renders "Vaše zahteve" after the form although its own header comment says the answers are "the first thing visible when it opens"; at 360x740 the list is below the fold under the tab bar (`harness/android-request-sheet-viewport.png`).
Fix: answered requests first, then "Nova zahteva". 0.25 h.

**M10. Small, low-contrast type for sun.**
Evidence: tab labels 10.5 px (globals.css:1422); muted text #8f8a7e on #0b1524 is about 5.3:1, used for quantities "300 od 546 kos", check time, and 12.5 px notes.
Fix: 12 to 13 px tab labels, ink2 for numbers the crew acts on. 0.25 h.

### LOW

- L1. Crew project picker lists every project of the sub org including finished ones, names only (components/crew/CrewProjectPicker.tsx; lib/data/projects-list.ts:49 has no status filter; seed gives AVESOL finished "Poslovna cona Komenda"). Filter to active, add address and progress. 0.5 h.
- L2. Crew sees change-order amounts in EUR on the Ure tab (components/hours/ChangeOrderList.tsx:181-184). Decide whether crew should see prices. 0.25 h.
- L3. Local login with DEMO_LOGIN: the "Pošlji povezavo" button touches the "UPORABNIŠKO IME" label below it, two yellow primaries with no "ali" divider (`shots/fail-local-iphone-login.png`). Local only. 0.25 h.
- L4. Every page has the same `<title>` "Belin, vaš projekt na enem mestu" (failstate.json); history and tab switcher are unreadable. 0.25 h.
- L5. Completed scope lines (546 of 546) still show an active stepper. Grey them out as done. 0.25 h.
- L6. The Slovenian marketing crew-phone.png (2026-08-13 15:41) predates the tab bar commit fdd00f9 (17:34), so SL assets show the old crew layout; the German set (08-31) is current.

## Typical daily report: taps and fields

| Step | Taps | Note |
|---|---|---|
| Open app icon | 1 | then 4.25 s splash |
| Scroll to form | 2 to 3 swipes | form starts below the fixed send bar |
| 3 photos | 9 | + , shutter, use photo, x3 |
| Headcount 1 to 6 | 5 | default is always 1 |
| Moduli +70 | 7 | step 10 |
| DC +100 m | 10 | step 10 |
| Send | 1 | |
| Total | 33 taps, 6 fields | about 35 to 45 s on LTE including upload |

## Fast 3G timing (production shell, Moto-class: 360x740, Fast 3G 562 ms RTT, 4x CPU)

| Page | load | LCP | splash gone | transfer | JS |
|---|---|---|---|---|---|
| /sl/login | 3.06 to 3.24 s | 1.76 to 2.04 s | 6.6 to 7.1 s | 296 to 379 kB | 122 kB |
| /sl (landing) | 3.59 to 3.67 s | 1.83 to 2.10 s | 7.2 to 8.2 s | 392 to 432 kB | 127 kB |

Crew screens could not be timed (DB down). Dev server numbers (2.1 MB JS, 14 to 16 s) are dev-mode only and not representative. walk.mjs times the crew tabs once the DB is back.

## Ideas (no-brainer elements a founder would not think of)

1. One-scan demo phone: laptop shows a QR that signs the prospect's own phone in as the demo crew; they file a report and watch it land on the wall dashboard. Built on B3.
2. Printable site poster PDF with the crew QR (H11), in the project language, to tape to the site container: a physical artifact the EPC can picture on its own sites.
3. "Kot včeraj" one tap: prefill headcount and quantities from the last report, crew only adjusts.
4. Camera tab that actually opens the camera when you are already on Poročaj, then lands on the form with the photos in.
5. Photo-first daily report: 1 tap camera, quantities as big numeric chips, send. Target under 10 taps.
6. Outbox chip in the top bar ("1 čaka na signal") and a green "Poslano, naročnik je videl ob 16:42" receipt when the EPC opens it: proof for the sub, which is the sub's reason to use it.
7. 16:00 reminder to the crew lead if no report today (email or push).
8. 6-digit code in the login mail next to the link, typed inside the installed app: avoids the iOS home-screen web app having separate cookies from Safari, and works for crews who read mail on another device.
9. Boss mode: sub admins get the crew tabs plus the office (H3), because in this market the boss is on the roof.
10. Haptic tick (navigator.vibrate) on stepper taps on Android, big success state after send.

## Unverified

- iOS: home-screen web app cookies are separate from Safari, so a crew member who claims in Safari and then installs may land on the login screen in the installed app (netguru.com blog "How to Share Cookie or State Between PWA in Standalone Mode and Safari on iOS", WWDC23 "What's new in web apps" says cookies are copied only for Mac web apps; both accessed 2026-10-05). Needs a real iPhone test.
- Whether `capture="environment"` removes the photo-library option on current iOS and Android (MDN wording is not conclusive). Needs real-device test.
- All live sub-office screens (portfolio, PO view and accept UI, hours, final, settings roster, vault) at phone widths: not rendered because the DB is down; findings there are code-level only.
- Throttled load of the crew tabs and the soft tab switch time.
- Whether Resend email history for Belin exists under another API key (list-emails showed only two avesol.si mails).
