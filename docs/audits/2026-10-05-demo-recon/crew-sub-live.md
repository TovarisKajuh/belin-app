# crew-sub-live

Live ground truth for the sub office (bostjan@avesol-demo.si, admin, AVESOL d.o.o.) and the crew (luka@avesol-demo.si) on http://localhost:3000 (dev server, DEMO_LOGIN=1), walked 2026-10-05 19:19 to 19:41 UTC after the Supabase resume. Sign-in was by minted login_tokens rows exactly like scripts/marketing/shoot.mjs magicLink() (4 rows: sub x2, crew x2). Nothing was submitted: no report, check, incident, request, PO accept, finalization, claim or settings save. Stepper and "Delno" taps were client state only and were discarded.

## summary

The database is up and every screen renders with live data. The earlier harness predictions hold on the real app almost one for one:
- SubHome card labels escape their cards and pile up garbled at the bottom of the page (phone and desktop).
- SubHome "Čaka na vas" says "Naročilnice še ni." on Dan 1, where a SENT naročilnica has been waiting for this very user's acceptance since 30. 08. 2026.
- "Dnevno poročanje" lands the boss on the crew sign-up form (name plus email, "Pošlji povezavo"), a dead end.
- On the crew report tab the ODJAVA pill sits on top of "Pošlji poročilo" (measured: pill fully inside the send button, and it wins the hit test).
- The incident sheet's "Prekliči" is under the tab bar: Playwright could not click it ("a.cr-tab Dnevnik intercepts pointer events") on both projects at both widths; same for the request sheet on Dan 1.
- Tapping "Delno" widens the page from 390 or 360 to 405 px (innerWidth becomes 405, the unit "kpl" ends at x 405).
- One "+" tap on a quantity stepper jumps 0 to 10, and the value is a non-editable span.

New live findings:
- On Dan 1 the SubHome material card claims "0, Vse postavke so bile prevzete" although no material check exists there.
- On a phone the sub office has no visible way into Settings (Nastavitve hidden) and no way back out (Projekti hidden).
- On localhost the Next dev "N" badge sits on the crew "Pregled" tab and swallows taps.
- One intermittent HTTP 500 occurred on /hours?tab=co.
- The PO grand total is labelled "Vrstica skupaj" (line total).

The demo data is 5 weeks stale:
- The last daily report is 28.08.
- The second hour sheet is already "Potrjeno po poteku roka", so nothing is left to approve.
- The Freistellungsbescheinigung shows POTEKLO (expired 2026-09-18).
- The material check shows "Preverjeno 31.08".

No hydration errors and no page errors on any of the 70 screens.

## server time per navigation (localhost dev, warm)

42 hard navigations (page.goto). The full per-screen list with server Date header, TTFB, load and splash is in crew-sub-live/walk-sub.json and walk-crew.json.
- TTFB (requestStart to responseStart): min 587 ms, median 1711 ms, p90 2298 ms, max 5182 ms (p390 sub TR /hours, 19:20:49 UTC). Over 3 s: sub TR home 3116, TR po 3293, TR hours 5182, TR final 3467, all on first visit at 19:20 to 19:21 UTC.
- Load: median 2625 ms, max 5834 ms.
- After load the launch splash stays another 4438 to 4716 ms (median 4492) on EVERY hard load, so a hard navigation is usable after about 7 s median.
- Soft crew tab switches (Link, no splash): 821 to 1288 ms from tap to URL change with no visible pending state (nav.json).
- First request server Date: Mon, 05 Oct 2026 19:20:10 GMT (sub). Last: 19:32:34 GMT (crew).

## demo data dates seen (today is 2026-10-05)

- Last daily report: Kranj (Trenutno) "PET., 28. 08." (daily_entries max entry_date 2026-08-28, 9 entries 18.08 to 28.08). Dan 1: none ("Na tem gradbišču še ni oddanih poročil."). SubHome and crew Pregled show "Danes še ni vnosov."
- Hour sheets (Kranj): List št. 2 "Potrjeno po poteku roka" (deemed_approved, submitted 2026-08-29, deadline 2026-09-02); List št. 1 "Potrjeno", "Matej Kovač · 24. 08. 2026". No countdown text is visible anywhere, because no sheet is pending. Dan 1: "Ni še listov."
- Compliance vault (Settings): "Freistellungsbescheinigung 2026 · Velja do 2026-09-18" with red POTEKLO badge; "Potrdilo A1, Luka Zupan · Velja do 2026-12-29"; "Zavarovanje odgovornosti · Velja do 2027-03-19". ISO dates.
- Material check (Kranj): "Material popoln · Preverjeno 31.08 ob 13:35" (no year). Dan 1: gate "Najprej preverite material", no check (material_checks empty).
- POs: Kranj "Sprejeta 20. 08. 2026"; Dan 1 "Poslana 30. 08. 2026", still waiting for acceptance. PO deadline Kranj 2026-09-29 (passed), Dan 1 2026-10-12.
- Portfolio: Kranj "12 delovnih dni zamude" (planned_end 2026-09-29), Komenda (finished) "4 delovni dnevi zamude". Bell shows 2 notifications.
- Change order: "Zahtevek št. 1 ... Potrjeno, 1.200,00 EUR, Matej Kovač · 25. 08. 2026".
- Seed run time per created_at: 2026-08-31 11:35 UTC.

## confirmed

- crew-walk B4 (ODJAVA over send): walk-crew.json p390-crew-tr-logout-vs-send: pill {x12,y715,w78,h33} inside send {x16,y705,w358,h58}, overlap true, elementFromPoint at pill center = "button ODJAVA", pillInsideMain false, main "belin-dark b-tabbed". Same at 360 (pill y618, send y608). Screenshot shots/p390-crew-tr-report-vp.png, p360-crew-tr-report-vp.png. Also on Dan 1 (no send bar) the pill floats over the material rows and covers "Prispelo" of row 2 (shots/p390-crew-d1-report-vp.png, p360-crew-d1-pregled-vp.png).
- crew-walk H1 / ux-standards H4 first half (SubHome labels): walk-sub.json checks p390-sub-tr-labels: every .e-proj-lab is position absolute at y 1145 (page bottom) while cards sit at y 313 to 908, labInsideCard false for all 6 cards; at 1440 all labels at y 709. Garbled overlapping text visible in shots/p390-sub-tr-home-full.png (bottom left) and d1440-sub-tr-home-full.png ("Napredek projekta" over "Naročilnica", "Manki pri materialu" over "Nadgradnje"). Cards show bare "58.3 %" and "0".
- crew-walk H2 / ux-standards H4 second half ("Čaka na vas" hardcoded): live text on both projects: "Naročilnice še ni.", "Ni oddanih listov.", "Ni prijavljenih nadgradenj.", "Projekt še poteka.". Contradicted by the DB: Dan 1 PO 1 status sent (shots/p390-sub-d1-po-full.png shows "Poslana 30. 08. 2026" with the acceptance box), Kranj has 2 hour sheets and 1 approved change order.
- crew-walk H3 / flows-correctness H6 ("Dnevno poročanje" dead end): clicking a.sh-crew goes to /sl/p/demo-sub-r8p3n6w1 (Kranj) and /sl/p/demo-sub-start-q7w4z8 (Dan 1), which render "Prijava na gradbišče" with inputs fullName and email and one button "Pošlji povezavo"; no back link (shots/p390-sub-tr-crewbutton-landing-vp.png, d1440-sub-d1-crewbutton-landing-full.png). Form not submitted.
- crew-walk H4 (sheets under the tab bar): incident sheet on Kranj and Dan 1, 390 and 360: .ic-cancel center hit test returns "a.cr-tab Dnevnik"; Playwright click on Prekliči times out with "nav.cr-tabs subtree intercepts pointer events". The sheet is z 60 inside div.b-screen z=1, tab bar z 50. topAtScreenTop "a DE": the command bar stays above the sheet, undimmed. The ODJAVA pill covers Pošlji (shots/p390-crew-tr-incident-kind-vp.png). No close X (hasCloseX false). Request sheet on Dan 1: Prekliči also covered at both widths. Nuance: on Kranj the request sheet's Prekliči was clickable (y 630 at 390, y 619 at 360) because the previous-requests list pushes the form up, but then the list itself sits under ODJAVA and the tab bar (shots/p390-crew-tr-request-open-vp.png).
- crew-walk H5 (Delno widens the page): walk-crew.json p390-crew-d1-delno: before sw 390 / iw 390; after sw 405 / iw 405, input x133 w245 right 378, unit right 405. At 360: 360 to 405, visualViewport offsetLeft 18 (the page shifts sideways, the logo is cut). Shots: shots/p360-crew-d1-after-delno.png, p390-crew-d1-after-delno.png.
- crew-walk H6 (step 10, not typable): p390 and p360 crew-tr-stepper: "0" then one "+" gives "10"; .b-step-val is a SPAN, not editable, no input. Completed lines still have steppers ("Podkonstrukcija 546 od 546 kos", shots/p390-crew-tr-report-full.png). Side note: the seed does use non-multiples (diary "Podkonstrukcija: 146 kos"), so the evidence line "seed uses only multiples of 10" is wrong; the defect stands.
- crew-walk H7 (partial, the measurable parts): headcount starts at 1 (headcountStart "1"). The form ("Današnje poročilo", photo tile) starts at about y 575 to 642 of 844 at 390 and is entirely below the fold at 360 (shots/p360-crew-tr-report-vp.png). The 4.4 to 4.7 s splash is on every hard load. The tap count itself was not re-counted.
- crew-walk H9 / ux-standards H10 (no loading feedback): crew tab switches take 0.8 to 1.3 s from tap to URL change (nav.json crewSoft) and no loading.tsx exists. No pending UI observed in the screenshots.
- crew-walk H11 (no QR): Settings "Povezava za ekipo" shows only text plus Kopiraj povezavo, WhatsApp, E-pošta (shots/crop-p390-settings-crew.png). No QR on SubHome either.
- flows-correctness H7 (partial): the crew links in Settings and inside the WhatsApp and email share texts are http://localhost:3000/sl/p/... (nav.json "sub390 /sl/app/settings"), so a link shared during a localhost demo is useless on a real phone. The claim needs name plus email.
- crew-walk M1 / ux-standards M9 (targets under 44 px), measured with getBoundingClientRect:
  - SL/DE/EN 30.7x25.8, 31.9x25.8, 32.3x25.8
  - status pill "Aktivno" 96.4x37.5
  - install hint "Zapri" 40x40
  - "Preveri znova" 113.3x40
  - ODJAVA 78.4x33.3
  - "Material še ni prispel" 156.6x40
  - office nav links 40.8 tall
  - "Koliko manjka?" label 87.7x18.8
  - "Nov list" 79.6x39.5, "Nov zahtevek" 118.6x39.5
  - "Prenesi PDF" 100.9x36.8 and 105.8x39.5
  - "Zaključi projekt" and "Ustvari poročilo" 41.5 tall
  - PO accept checkbox 17.7x22
  - notification toggles 44x26
  - "Odstrani" 77.6x34.8
  - bell 36x36
  - steppers 52x52 and segments are fine
  - lists per screen: walk-*.json screens[*].small
- crew-walk M2: crew bar shows BELIN, SL DE EN and the "Aktivno" pill; .e-bproj is display none at 390, so the project name is never shown (misc probe). Shots p390-crew-tr-report-vp.png.
- crew-walk M3 / ux-standards H1 (splash): splash still on screen 4438 to 4716 ms after load on all 42 hard loads.
- crew-walk M6: crew Ure tab renders the office nav (Pregled, Naročilnica, Ure in dodatna dela, Zaključek) above the crew tabs; as crew /sl/app/{TR}/po and /final return 404 (walk-crew.json p390-crew-probe-po, -final). main.container padding-bottom 0px; with today's short data no content is hidden behind the tab bar (lastContentBottom 638 vs tabs top 776).
- crew-walk M7: Kranj report at 360: scrollWidth 363, innerWidth 363 (p360-crew-tr-report).
- crew-walk M8: install hint is only "Dodajte Belin na začetni zaslon / Odpre se z eno potezo, brez iskanja povezave." plus a close X (shots/p390-crew-tr-report-vp.png).
- crew-walk M9: request sheet on Kranj renders "Vaše zahteve" (with "Potrebujemo shemo priklopa za razdelilnik R2.") last, below Prekliči, under ODJAVA and the tab bar (shots/p390-crew-tr-request-open-vp.png).
- crew-walk M10: tab label 10.5px rgb(143,138,126); "546 od 546 kos" 14px muted; "Preverjeno 31.08 ob 13:35" 12.5px muted (misc probe).
- crew-walk L1: crew entry is "Katero gradbišče?" with Poslovna cona Komenda (finished) first, names only (shots/p390-crew-entry-full.png).
- crew-walk L2: crew Ure, Dodatna dela shows "1.200,00 EUR" (shots/p390-crew-tr-ure-co-vp.png).
- crew-walk L4 / ux-standards H5 title half: every screen's title is "Belin, vaš projekt na enem mestu" (walk-*.json title). Favicon: GET /favicon.ico returns 404 (curl).
- ux-standards H2 (portfolio tiles): "180 kWp1 zaključen projekt", "491 kWp2 projekta v teku", "0 kWpše ni v izvedbi" (shots/d1440-sub-portfolio-full.png, p390-sub-portfolio-full.png).
- ux-standards H3 (status chips stretch): AKTIVNO and ZAKLJUČENO chips stretch to about 300 px bars (same shots).
- ux-standards H6 (number and date formats): "58.3 %", "245.7 kWp", "Velja do 2026-09-18", "28.08" and "31.08" without a year, next to localized "118.500,00 EUR" and "20. 08. 2026".
- ux-standards H7 (partial): ODJAVA floats on every sub and crew screen. The Next dev badge is present on 52 of 60 screens on localhost (devPortal true) and blocks a crew tab (see N2). No ScenarioPill or DEV pill observed on sub or crew screens.
- ux-standards H12: at 1440 the hours, change-order, PO and final content starts at x 124 while the header brand is at x 166 (shots/d1440-sub-tr-co-full.png). Header meta is the full address on Pregled but "Kranj" on the other tabs.
- ux-standards M1 (mobile dead ends): at 390 the portfolio "Nastavitve" link and the Settings "Projekti" link are both rendered but hidden (nav.json; globals.css:1879 hides .cb-nav at 640 px and below). The BELIN logo is not a link. On a phone the sub office cannot reach the roster, crew links or vault, and cannot return from Settings except with the browser back button.
- flows-correctness H12 / backend-ops BO-07 (flat seed photos): the diary renders 6 images, all 800x600 from .../seed/photo-N.jpg, which load fine but are flat dark rectangles. One is nearly invisible against the card (shots/p390-crew-tr-dnevnik-vp.png, imgs probe output).
- flows-correctness M9 (expired countdown): sheet 2 is already deemed approved ("Potrjeno po poteku roka", deadline 2026-09-02). There is nothing to approve live without a reseed.
- backend-ops BO-10 (a): the Dan 1 PO line reads "Montaža FV sistema 245.7 kWp, Kranj" on the Ljubljana project (purchase_order_lines 88888888-...-812, shots/p390-sub-d1-po-full.png). BO-10 (d) is consistent with what is live: the vault rows render as text with no download link (no document anchors on Settings, nav.json).

## refuted

- crew-walk B1, ux-standards B1, flows-correctness B1, backend-ops BO-01 (database paused): at 19:16 UTC execute_sql answered (db now() 2026-10-05 19:16:36), and all 42 hard navigations returned data. The pause risk itself remains a planning item; the outage is over.
- ux-standards M5 (contradictory "7 novih postavk" alert next to "Material popoln"): live on Kranj the card shows only "Material popoln · Preverjeno 31.08 ob 13:35" and "Preveri znova", with no alert (shots/p390-crew-tr-report-vp.png). Not reproduced with the current seed. It may come back if material items are edited after the check.
- crew-walk M1 detail "status pill 113.8x37.5": the live pill measures 96.4x37.5. It is still under 44 tall, so the substance stands; only the width was off.
- ux-standards M1 detail "on phones up to 640px, .cb-nav ... hidden" as the reason the project tabs are missing: the project office nav row (.e-nav: Pregled, Naročilnica, Ure in dodatna dela, Zaključek) IS visible on phones. Only the header .cb-nav links (Projekti, Nastavitve) are hidden.

## new findings

- [high] N1: SubHome material card states "Vse postavke so bile prevzete." on Dan 1, where no material check exists
  evidence: walk-sub.json p390-sub-d1-labels: card 2 big "0", note "Vse postavke so bile prevzete."; material_checks for 33333333-...-334 is empty (SQL). components/sub/SubHome.tsx:53 computes missing from material.latest?.items ?? [], so no check gives 0 and the "OK" text.
  impact: The office is told all material arrived on the exact project whose crew is being asked to check it. This is a false statement on the demo's day-one project.
  fix: When material.latest is null, show "Material še ni preverjen" (neutral state) instead of materialOk; same three-state logic as the crew summary badge (mc-sum-badge none/ok/short).
  files: components/sub/SubHome.tsx, messages/sl.json | 0.25h
- [medium] N2: On localhost the Next dev indicator covers the crew "Pregled" tab and swallows taps
  evidence: badge.mjs: nextjs-portal #devtools-indicator at x20 y788 36x36 inside the Pregled tab (0,777,98,67); nav.mjs first run: tap on .cr-tab nth(0) timed out with "nextjs-portal ... intercepts pointer events". shots/p390-crew-tr-devbadge-vp.png shows the N over the Pregled icon.
  impact: If the meeting phone runs against localhost, one of four crew tabs fails to respond, and a dev badge is on screen.
  fix: devIndicators: false in next.config.ts for the demo, or present from production.
  files: next.config.ts | 0.1h
- [medium] N3: Intermittent HTTP 500 on the sub's change-order tab
  evidence: walk-sub.json p390-sub-tr-co: status 500 at 19:20:58 GMT for GET /sl/app/33333333-...-333/hours?tab=co, console "Failed to load resource: 500". The page still rendered (shots/p390-sub-tr-co-full.png). The next 10 loads (1440 walk, probe.mjs x3, probe2.mjs x4 plus /hours x4) all returned 200.
  impact: Unknown cause, probably a transient on the first minutes after the resume or a dev-server render error with client recovery. If it is real it would show Next's error page in production (there is no error.tsx).
  fix: Check the dev server console or Vercel runtime logs for a stack at that time. I could not read the dev server output from here.
  files: app/[locale]/app/[projectId]/hours/page.tsx | 0.25h to investigate
- [medium] N4: The naročilnica grand total is labelled "Vrstica skupaj" (line total), with no net or VAT hint
  evidence: components/po/PoView.tsx:93 uses t("lineTotal"); messages/sl.json:552 "lineTotal": "Vrstica skupaj". Rendered "VRSTICA SKUPAJ 118.500,00 EUR" (shots/p390-sub-d1-po-full.png), the very screen where the sub accepts the price.
  impact: Odd wording on the legally meaningful acceptance screen. A Slovenian buyer reads "row total", not "total (net)".
  fix: Use a dedicated key such as "Skupaj (brez DDV)".
  files: components/po/PoView.tsx, messages/sl.json (+ de/en placeholders) | 0.1h
- [low] N5: The office nav row on phones clips "Zaključek" with no scroll cue
  evidence: misc probe: .e-nav scrollWidth 446 vs clientWidth 390, overflow-x auto, Zaključek right edge 426 (shots/p390-sub-tr-home-vp.png shows "Zaklju").
  impact: The fourth tab looks cut off. It can be scrolled, but nothing tells the user that.
  fix: Smaller gaps under 420 px, or a fade edge.
  files: app/globals.css | 0.2h
- [low] N6: Seed vault shows a German tax document, expired, for a Slovenian sub on a Slovenian project
  evidence: documents row type freistellungsbescheinigung, valid_until 2026-09-18, rendered with a red POTEKLO badge (shots/crop-p390-settings-vault.png).
  impact: For tomorrow's Slovenian buyer this is an untranslated German term plus an expired badge. If kept, it can be the "expiry warning" demo moment. Otherwise reseed or swap it for a Slovenian document.
  fix: Reseed with future validity, or a deliberate "poteče čez 7 dni" example.
  files: scripts/seed-demo.mjs | 0.25h
- [low] N7: The request sheet's list load fires an aborted POST on Dan 1
  evidence: walk-crew.json p390-crew-d1-request-open and p360: "requestfailed: POST /sl/app/33333333-...-334 net::ERR_ABORTED" within 1.5 s of opening (RequestButton.tsx:55-67 listRequests server action in an effect). Kranj did not show it.
  impact: Likely a dev StrictMode double effect. Harmless unless it also happens in production.
  fix: None for the demo. Recheck on production.
  files: components/crew/RequestButton.tsx | 0h

## console and network

- No hydration warnings, no pageerror, no React errors on any of the 70 captured screens (walk-sub.json, walk-crew.json, screens[*].log).
- Warnings: on every soft navigation into /sl/p/<token>, Next warns "Detected `scroll-behavior: smooth` on the `<html>` element ... add data-scroll-behavior=\"smooth\"".
- Failed requests:
  - RSC prefetch GET /sl/p/<token>?_rsc=... net::ERR_ABORTED when clicking Dnevno poročanje (normal navigation abort)
  - POST ERR_ABORTED on the Dan 1 request sheet (N7)
  - one HTTP 500 (N3)
- Images: 6 of 6 diary images load (no 4xx), signed URLs fresh on first view.

## unverified

- flows-correctness H11 (signed photo URLs expire after an hour idle): first view after the resume was fine; the idle case was not tested.
- crew-walk H8 offline, H10 (DB error shown as invalid link), M4 (photo tap deletes), M5 ("Material še ni prispel" submits without confirm): not exercised. Each would need a submit, an outage or a file upload.
- crew-walk H7 exact tap and second counts: not re-timed.
- Production behaviour (belin-app.vercel.app) was not walked; all timings are localhost dev with on-demand compile and are not representative of production.
- The cause of N3.

## artifacts

- Report: C:/Users/ejand/AppData/Local/Temp/claude/C--DevEnv-belin-app/fc02d7f1-c666-4861-aeb4-7e5eac16051f/scratchpad/recon/crew-sub-live.md
- Folder: C:/Users/ejand/AppData/Local/Temp/claude/C--DevEnv-belin-app/fc02d7f1-c666-4861-aeb4-7e5eac16051f/scratchpad/recon/crew-sub-live/
  - walk.mjs (live walk), walk-sub.json, walk-crew.json (per-screen URL, status, server Date, TTFB, load, splash, small targets, console log, page text, checks)
  - nav.json (phone links, crew tab-switch timing), probe.mjs, probe2.mjs (500 retries), delno.mjs, imgs.mjs, badge.mjs, misc.mjs, montage.mjs, crop.mjs
  - shots/ (117 PNGs; key ones: p390-crew-tr-report-vp.png, p390-crew-tr-incident-kind-vp.png, p360-crew-d1-after-delno.png, p390-sub-tr-home-full.png, d1440-sub-tr-home-full.png, p390-sub-tr-crewbutton-landing-vp.png, p390-sub-d1-po-full.png, crop-p390-settings-vault.png, crop-p390-settings-crew.png, p390-crew-tr-devbadge-vp.png, d1440-sub-portfolio-full.png)
  - montage/ (contact sheets of every screenshot, all reviewed)
  - state-sub.json and state-crew.json hold live demo session cookies. Delete them after planning.
