# Recon: epc-walk (EPC side, live), 2026-10-05

Scope: the EPC side, signed in as marko@sonce-demo.si (Marko Golob, admin, Sonce Energija d.o.o.).
The walk ran on the local dev server, plus a production timing pass on https://belin-app.vercel.app.
All evidence lives under `scratchpad/recon/epc-walk/`:

| Folder or file | Contents |
|---|---|
| `live/` | Screenshots, PDFs and `results.json` |
| `prod/timing.json` | Production timings |
| `harness/` | Synthetic header test |
| `outage/` | Signed-out pass made before the database was resumed |
| `walk-epc.mjs` | The rerunnable walk script |

Data state: the walk saw the data as it is today, with no reseed.
- The last daily entry is 2026-08-28.
- The second hour sheet's deadline was set to 2026-09-02, so the seed ran on about 2026-08-31.
- Every date-driven number on screen is therefore stale. Stale effects are marked [STALE] and separated from real defects.

## Writes made by this recon (for cleanup)
- **plan_imports row `cdf4cab0-465d-4db9-abe3-900173e97cef`**: created 2026-10-05 19:19:43 UTC, `project_id` null, storage object `plans/pending/cdf4cab0-465d-4db9-abe3-900173e97cef.pdf`. It comes from the one wizard upload (tests/fixtures/k2/planung-engelmeier.pdf). The project was not committed.
- **login_tokens rows for Marko**: minted the same way scripts/marketing/shoot.mjs does. There are 42 rows in total for Marko, the latest at 19:13 UTC, and not all of them are from this recon.
- **Nothing else.** No submit, approve, accept, send, status change or settings save was made. The bell was opened, but Marko had 0 notifications before and after (`live/results.json`: unreadBefore 0, unreadAfter 0).

## current_state: per-screen map (live)

| Route | What is on it | Verdict |
|---|---|---|
| `/sl/app` portfolio (`live/d-portfolio.png`, `live/m-portfolio.png`) | Header: bell, SL/DE/EN, Nastavitve, Nov projekt. Below: "Prijavljeni kot Marko Golob", 3 capacity tiles, then 7 project cards (name, facts, waiting line, %, schedule bar, status pill). | Strong dark look, but visible bugs. The tile caption is glued to the unit: "1 MWp4 zaključeni projekti", "491 kWp2 projekta v teku", "265 kWpše ni v izvedbi". Status pills are stretched to input width. Decimal points ("58.3", "245.7"). [STALE] Kranj shows "12 delovnih dni zamude". At 390 px the bell overlaps the BELIN wordmark and Nastavitve disappears. |
| `/sl/app/projects` (`live/d-projects.png`) | Not reached directly: a person session is redirected to `/sl/app` (2 redirects, 3.5 s). | Works, slowly. The header "Projekti" link points here (`CommandBar.tsx:61`). |
| `/sl/app/new` step 1 (`live/d-wizard-step1.png`, `live/d-new.png`) | Step pills (Načrt, Pregled, Podizvajalec), a dashed "drop" box, "Izberite datoteko". | Clean but empty below the fold. The dashed box looks droppable but has no drop handler. There is no way to create a project without a K2 PDF. The wordmark says "Belin", where every other screen says "BELIN". |
| `/sl/app/new` review (`live/d-wizard-review.png`, `live/d-wizard-part0.png`, `live/m-wizard-review.png`) | "Prepoznan K2 načrt" banner, name, address and kWp prefilled, roofs card, 11 material rows as inputs, "Naloži drug načrt", "Naprej". Parse took 2.9 s. | The best "review instead of type" moment, and it works. "Wien, 1100" is labelled country "SI" with a yellow warning. The date field shows "dd/mm/yyyy". |
| `/sl/app/settings` (`live/d-settings-full.png`, `live/m-settings.png`) | Company form (name, address, email, phone, VAT, IBAN, accountant email, Shrani), 11 notification toggles, invite form. | Three cards in three different widths. The demo company address, email and phone are empty. There is no list of existing team members. On a phone there is no way back (the "Projekti" link is hidden below 640 px). |
| `/sl/app/3333...3333` Kranj overview (`live/d-p1-overview.png`, `live/d-p1-overview-part0..2.png`, `live/m-p1-part0..3.png`) | From top to bottom: header and tabs, hero (name, kWp and sub, 3 chips, 58% ring), Dnevni tempo chart, scope by phase, material and add-item form, crew requests, incidents, sub documents, 4 stat tiles, latest on site, day log (9 days), photo gallery (6). | Best screen in the product. EVERY PHOTO IS A BLANK SQUARE. Two tempo numbers disagree (5.9 and 6,5). [STALE] It shows "12 dni zamude", "35 / ~31" working days, an expired Freistellungsbescheinigung and "6 na terenu" from a 5-week-old report. |
| `/sl/app/3333...3334` Ljubljana "Dan 1" overview (`live/d-p2-overview-part0..1.png`) | The same layout with empty states: "Zbiramo podatke" in the chips and chart, a 0% ring, "Ekipa še ni potrdila prevzema materiala". | Reads as dead rather than "day one". [STALE] "Delovni dnevi 26 / ~31" with 0 reports. The empty day-log message wraps into a 92 px column. Nothing tells the EPC what to do next. |
| `/pregled`, `/dnevnik` (both projects) | The EPC is redirected to the overview (`crew-route.ts:44`). | Correct: these are crew tabs. |
| `/po` Kranj (`live/d-p1-po.png`, `live/m-p1-po.png`) | Accepted card: "Sprejeta 20. 08. 2026", one line, total, rate, terms, "Sprejel: Boštjan Novak", Prenesi PDF. | Thin. The grand total is labelled "VRSTICA SKUPAJ" (line total). Its left edge sits at x 124 while the header's is at x 166. |
| `/po` Ljubljana (`live/d-p2-po.png`) | Sent card: a GREEN pill "Poslana 30. 08. 2026" and "Čaka na odločitev podizvajalca" under the card. | The line reads "Montaža FV sistema 245.7 kWp, **Kranj**" on the Ljubljana project. Sent-but-waiting uses the same green as accepted. [STALE] It has been waiting 5 weeks with no nudge. |
| `/hours` Kranj (`live/d-p1-hours.png`, `live/d-hours-tab2.png`, `live/m-p1-hours.png`) | Tabs (Režijske ure, Dodatna dela). Sheet 2 is "Potrjeno po poteku roka", sheet 1 is "Potrjeno", each with Prenesi PDF. Extras tab: one approved extra, 1.200,00 EUR. | [STALE] The countdown beat is gone: no sheet is waiting and there are no Potrdi/Zavrni buttons. No money value is shown for hours, although the rate (48 EUR) is known. |
| `/hours` Ljubljana (`live/d-p2-hours.png`) | "Ni še listov." | A bare text empty state. |
| `/final` Kranj and Ljubljana (`live/d-p1-final.png`, `live/d-p2-final.png`) | A 2x2 grid: Predaja "Projekt še ni predan v prevzem", Zaključno poročilo [Ustvari poročilo], Prevzem "Na voljo po predaji", Račun "Na voljo po prevzemu". | Looks like a placeholder: three of the four cards say "not yet". The real sequence is not visualised. |
| Status menu (`live/d-status-menu.png`, `live/m-status-menu.png`) | "Na pavzo", "Zaključi", "Prekliči projekt". | Each acts on one click with no confirmation. On desktop the "v živo" badge sits over the menu's corner. On a phone the menu runs off screen (page scrollWidth 450 vs 390) and the badge covers "Na pavzo". |
| Lightbox (`live/d-lightbox.png`, `live/d-lightbox-corner.png`, `live/m-lightbox.png`) | A dark overlay with a big blank grey rectangle and prev/next arrows. | The photo is blank. The sticky header and "v živo" render ABOVE the overlay, and the close button (top 22, right 22) is hidden under the header. |
| Bell (`live/d-bell.png`, `live/m-bell.png`) | A panel titled "Obvestila" showing "...". | The demo EPC has 0 notifications (query below). The loading state is three dots. |
| PDFs (`live/pdf-*.pdf`, rendered as `live/pdf-*-p0.png`) | PO Kranj and PO Ljubljana (1 page each), regie sheet 1 and sheet 2. No report, abnahme or invoice exist yet (`generated_documents`, `acceptances`, `invoices` are all empty). | All return 200 application/pdf. They are correct but bare: no letterhead, no addresses, no money on the hour sheet. The Ljubljana PO names Kranj. |

## Measurements

Local dev server, warm, signed in (`live/results.json`, `walk.log`):

| Route | Server response time (TTFB) |
|---|---|
| Portfolio | 1.6 s |
| Kranj overview | 3.9 s |
| Kranj hours | 6.6 s |
| Ljubljana overview | 2.1 s |
| PO | 1.3 to 1.5 s |
| Final | 1.8 to 2.3 s |

- **Tab click to active tab:** Naročilnica 4.0 s, Ure 1.9 s, Zaključek 1.9 s, Pregled 2.5 s.
- **PDF time to first byte, local:** 0.9 to 11.5 s. The cold regie render took 11.5 s.

Production, warm (`prod/timing.json`):
- The response starts in about 45 ms, but DOMContentLoaded lands at 2.2 s (portfolio), 3.2 to 3.6 s (Kranj), 2.7 s (PO), 2.9 s (hours) and 3.2 to 3.3 s (final).
- PDFs: PO 3.5 s and 1.8 s, regie 2.8 s and 1.6 s.
- The `X-Vercel-Id` header is `fra1::iad1::...`: requests enter in Frankfurt and the functions run in **iad1 (Washington, US)**, while the database is in eu-central-1. Every query crosses the Atlantic.

Console: no errors on any route at either size. Interactions logged the warning "Multiple GoTrueClient instances detected in the same browser context" (x4) and the Next warning "Detected `scroll-behavior: smooth` on the `<html>` element". No hydration warnings. No failed requests, apart from one aborted wizard POST when the page was closed.

Overflow at 390 px: `document.scrollWidth` equals 390 on every route. Two exceptions:
- the open status menu pushes it to 450,
- the tab row is clipped: "Zaključek" ends at x 426 inside its own scroller, with no scroll hint.

Splash: 4.4 to 5.8 s on every hard load of every route (`splash_ms` in `results.json`).

Read-only queries (Supabase `execute_sql`):
- Marko has 0 notifications in total.
- Kranj has 9 entries, the latest on 2026-08-28. Ljubljana has 0.
- Kranj's 6 photo rows are all `seed/photo-N.jpg`. The downloaded `live/photo-sample.jpg` is 800x600 and 3117 bytes, and its pixel extrema are a single colour.

## Findings

### Blockers

**B1. Every demo photo is a solid dark-blue rectangle.**
- Evidence:
  - `scripts/seed-demo.mjs:290-323` generates 6 single-colour JPEGs with sharp; `live/photo-sample.jpg` has a single-colour pixel range.
  - Blank squares appear in the gallery, the lightbox, the day log and "Zadnje na terenu" (`live/d-p1-overview-part1.png`, `live/d-p1-overview-part2.png`, `live/d-lightbox.png`, `live/m-p1-part2.png`).
- Why it blocks: photo proof is the core promise ("Dnevna poročila s fotografijami"), and opening a photo shows a grey box.
- Fix: seed from the 11 real photos already in the repo, `assets/marketing/site/*.jpg` (roofs, crews, DC cabling, drone flights).
  - Resize to about 1600 px with sharp and spread them across entries 3 to 8.
  - Give the Ljubljana project none.
  - Keep the photo step best-effort as it is.
- Effort: 0.75 h. Takes effect with the next seed.

**B2. The demo data is 5 weeks stale and contradicts itself on screen. [STALE, needs a reseed close to the meeting]**
- Evidence:
  - Kranj: "12 dni zamude", "Predviden zaključek 15.10" against planned_end 2026-09-29, "Delovni dnevi 35 / ~31" (`live/d-p1-overview-part1.png`).
  - Kranj: "Freistellungsbescheinigung: Poteklo"; the hour sheet is "Potrjeno po poteku roka", so the countdown and approve beat no longer exist (`live/d-p1-hours.png`).
  - Ljubljana ("Dan 1") shows "26 / ~31" working days with 0 reports and a PO sent 30.08 still waiting (`live/d-p2-overview-part1.png`, `live/d-p2-po.png`).
- Fix: `npm run seed` the evening before and on the meeting morning, followed by B1. Local and production share one database.
- Effort: 0.25 h.
- The logic weakness this exposes is H5.

**B3. There is no reliable way to sign in as the demo EPC on production.**
- Evidence:
  - Magic link mail to `*-demo.si` is refused (`lib/email.ts:26,56`), and the link is only printed to the terminal in dev (`app/actions/auth.ts:117-118`).
  - The runbook's `12345/12345` creates a TOKEN session (`docs/demo/2026-08-12-runbook-v2.md:38`). That session gets no tab row (`components/project/CommandBar.tsx:71`), and `/po` and `/final` 404 for non-person actors (`po/page.tsx:34`, `final/page.tsx:29`).
- Fix: replace the DEMO_LOGIN username and password form with three persona buttons (EPC, podizvajalec, ekipa). Each mints a PERSON session through the existing verify code, gated on `DEMO_LOGIN=1`. Then decide whether production gets the flag for the meeting, and update the runbook.
- Effort: 1.5 h.

### High

**H1. Every page takes about 3 s on production because the functions run in the US.**
- Evidence:
  - `X-Vercel-Id: fra1::iad1::...` on `/sl/login` and `/api/pdf/po/...` (curl, 2026-10-05).
  - Production DOMContentLoaded of 2.2 to 3.6 s per page; PDFs 1.6 to 3.5 s (`prod/timing.json`).
  - There is no `vercel.json` in the repo.
- This also undercuts the login footer "Podatki v EU, Frankfurt": data is processed in the US.
- Fix:
  - add `vercel.json` with `{ "regions": ["fra1"] }` (or set the Function Region in project settings),
  - add `loading.tsx` skeletons for `/app`, `/app/[projectId]` and its subroutes so a tab click shows something at once.
- Effort: 0.1 h for the region, 1.5 h for the skeletons. Verify the region change with the same curl afterwards.

**H2. The lightbox opens under the sticky header, and its close button is hidden.**
- Evidence:
  - In `live/d-lightbox.png` and `live/d-lightbox-corner.png` the header and the "v živo" badge are fully visible above the overlay.
  - `.e-lightbox` has z-index 100 (`globals.css:1062`) but is rendered inside `.e-wrap` (`position:relative; z-index:1`, `globals.css:877`). That creates a stacking context, so the sticky bar (z 20, `:880`) and the badge (z 30, `:1636`) paint over it.
- Fix: render `Lightbox` through `createPortal(..., document.body)` in `components/epc/dashboard/Lightbox.tsx`, and add a "3 / 6" counter and the date caption.
- Effort: 0.3 h.

**H3. Two different "tempo" figures, and the badge contradicts the chart.**
- Evidence (`live/d-p1-overview.png`):
  - The chip shows "5.9 %/dan" while the chart headline shows "6,5 %/dan".
  - The stat tile reads "5.9 zadnjih 6 delovnih dni" against a chart that says "Potreben tempo 3,2 · tempo je stabilen" next to a "12 dni zamude" badge.
- Code: the chip is a 6-point regression (`lib/projection-shared.ts:77-89`); the chart is a mean (`components/epc/dashboard/TempoChart.tsx:100,115`).
- Fix: one definition for both, label it ("zadnjih 6 dni"), and one number formatter.
- Effort: 0.5 h.

**H4. Numbers are not locale-formatted, so a point and a comma appear on the same screen.**
- Evidence: "58.3 %", "245.7 kWp", "5.9" next to "6,5" (`live/d-portfolio.png`, `live/d-p1-overview.png`), and "245.7 kWp" in the PO PDF text (`live/pdf-po-...801.pdf`).
- Code: raw interpolation in `components/app/ProjectList.tsx`, `components/epc/EpcDashboard.tsx:40,59`, `components/app/PortfolioHeader.tsx`, and `app/[locale]/app/[projectId]/po/page.tsx:55`, which also feeds the PDF.
- Fix: one `formatNumber(locale, n, digits)` helper on next-intl's formatter, used everywhere, including the PDFs.
- Effort: 1.5 h.

**H5. The dashboard does not notice a silent site.**
- Evidence (live, stale data): after 38 days with no report, Kranj still says "tempo je stabilen", "Ekipa 6 na terenu" and "Zadnje na terenu ... v živo" (`live/d-p1-overview-part0/1.png`).
- Real projects have weekends, rain and stalls; a buyer will ask "what if they stop reporting?".
- Fix:
  - when the latest entry is more than 2 working days old, show an amber strip: "Zadnje poročilo pred N delovnimi dnevi (28.08)",
  - the Ekipa chip says "zadnjič 28.08",
  - the chart includes zero days since the last report.
- Effort: 1 h.

**H6. The portfolio tiles run unit and caption together.**
- Evidence: "1 MWp4 zaključeni projekti", "491 kWp2 projekta v teku", "265 kWpše ni v izvedbi" (`live/d-portfolio.png`, `live/m-portfolio.png`). This is the first screen after login.
- Code: `components/app/PortfolioHeader.tsx:47` renders `.pf-tile-s`, and `globals.css:2648` does not make it a block element.
- Fix: `display:block`, and print "1,0 MWp".
- Effort: 0.15 h.

**H7. The status control finishes or cancels a project on one click, and the menu is covered or clipped.**
- Evidence:
  - `components/project/ProjectStatusControl.tsx:62-75` sets the status straight from the menu, and `lib/project-status.ts:24-38` offers "Zaključi" and "Prekliči projekt" with no way back.
  - The badge sits over the menu (`live/d-status-menu.png`).
  - On a phone the menu runs off screen (`live/m-status-menu.png`, scrollWidth 450), because `.b-status-menu` is anchored `left:0` (`globals.css:850`).
- One misclick on stage kills the demo project until a reseed.
- Fix:
  - a confirm sheet for finish and cancel, with cancel styled red,
  - remove "Zaključi" from the EPC menu (finishing goes through the acceptance on /final),
  - anchor the menu `right:0`,
  - move the live badge into the header.
- Effort: 1.25 h.

**H8. The mobile header is broken for the EPC.**
- Evidence:
  - The bell overlaps the BELIN wordmark on the portfolio (`live/m-portfolio.png`).
  - `.cb-nav` is hidden at 640 px or less (`globals.css:1879`), which removes Nastavitve, Projekti and the Settings back link (`live/m-settings.png`).
  - The "v živo" badge sits on the tab row, and "Zaključek" is clipped at x 426 (`live/m-p1-overview.png`).
- Fix:
  - phone header: mark, bell and an avatar menu holding Projekti, Nastavitve, Jezik and Odjava,
  - tabs scroll with a fade edge,
  - the badge becomes a dot in the header.
- Effort: 2 h.

**H9. The Ljubljana naročilnica names the wrong city, and PO dates are frozen.**
- Evidence:
  - The PDF text for `...802` reads "Montaža FV sistema 245.7 kWp, Kranj"; the on-screen card says the same (`live/d-p2-po.png`). The seed hard-codes it at `scripts/seed-demo.mjs:545`.
  - Both POs print "Datum 12. 08. 2026": `lib/pdf/render-po.tsx:78` uses `created_at`, which upsert never refreshes, while the Ljubljana PO was sent 30.08.
  - Acceptance prints in a different date format ("20. 8. 2026").
- Fix:
  - seed line "..., Ljubljana",
  - `issuedOn = sent_at ?? created_at`,
  - one date format,
  - reseed so `seed:documents` re-renders and re-hashes.
- Effort: 0.5 h.

**H10. Generated documents look like Belin's paperwork, not the client's.**
- Evidence: `live/pdf-regie-...902-p0.png` and `live/pdf-po-...801-p0.png` show:
  - "BELIN" top right, no company logo,
  - no addresses (the demo EPC has an empty address, `live/d-settings-full.png`),
  - no money on the hour sheet (5 h at 48 EUR is never priced),
  - no signature or approval block on the regie sheet.
- An EPC buyer judges the product by its PDFs.
- Fix:
  - a letterhead block (issuer name, address, VAT, optional logo upload in Settings) in `lib/pdf/theme.tsx`, used by all documents,
  - an amount column and total on the regiebericht,
  - "Belin" moves to the footer only,
  - seed real-looking addresses, emails and phone numbers for both demo companies.
- Effort: 2.5 h.

**H11. The demo EPC carries a real company's name, on screen and on every PDF.**
- Evidence:
  - "Sonce Energija d.o.o." in Settings (`live/d-settings-full.png`) and as Naročnik on both POs.
  - `docs/gtm/INDEX.md:53` and `docs/gtm/knowledge/market-icp-si.md:56` say it must be renamed before anything shows it.
- Fix: rename in `scripts/seed-demo.mjs:143` (and the `sonce-demo.si` emails), then reseed.
- Effort: 0.5 h.

**H12. The wizard cannot create a project without a K2 PDF, and its drop zone does not accept drops.**
- Evidence:
  - `Wizard.tsx:121` returns early unless `importId` is set. The only entry is the file picker (`Wizard.tsx:217-240`).
  - There is no onDrop or onDragOver, but the box has a dashed "drop" border (`live/d-new.png`), and the runbook says "Drop a real K2 report onto the first step".
  - An EPC using Schletter or another mounting vendor has no way in.
- Fix:
  - real drag and drop on `.wz-drop`, with a hover state,
  - a secondary "Brez načrta, vnesi ročno" button that opens the review step with `emptyDraft`,
  - allow a commit without an `importId`.
- Effort: 1.5 h.

**H13. The final page is four "not yet" cards.**
- Evidence: `live/d-p1-final.png`. The EPC can only click "Ustvari poročilo"; the flow (predaja, poročilo, prevzem, račun) is not visualised and there are no document previews.
- Fix:
  - a horizontal 4-step timeline with state per step and who acts next ("Čaka na podizvajalca: predaja"),
  - a thumbnail of each document once it exists,
  - an EPC "Opomni podizvajalca" action that sends a notification.
- Effort: 2 h.

**H14. Missing error, 404 and loading states.**
- Evidence:
  - There is no `error.tsx`, `global-error.tsx` or `loading.tsx` under `app/`.
  - An unknown URL shows the dev runtime overlay locally and the white English Next 404 on production (`outage/local-d-notfound.png`, `outage/prod-d-notfound.png`).
  - `app/[locale]/not-found.tsx` uses old light styles with project-link copy for every 404.
- Fix: a catch-all `app/[locale]/[...rest]/page.tsx`, a dark generic not-found, a branded `error.tsx` and `global-error.tsx`, and skeletons (shared with H1).
- Effort: 2 h.

**H15. A 4.4 to 5.8 s splash plays on every hard load.**
- Evidence: `splash_ms` in `live/results.json`. `components/SplashGate.tsx` mounts `BelinSplash` without `once`.
- Fix: `once`, at most 1.2 s, and never on `/sl` or `/sl/login`.
- Effort: 0.5 h.

### Medium

**M1. The PO page labels the grand total "VRSTICA SKUPAJ" (line total).**
Evidence: `components/po/PoView.tsx:93` uses `po.lineTotal`.
Fix: `po.doc.totalNet` ("Skupaj neto").
Effort: 0.1 h.

**M2. A sent PO uses the same green pill as an accepted one, and "Čaka na odločitev podizvajalca" sits outside the card.**
Evidence: `live/d-p2-po.png`.
Fix: an amber "Čaka na sprejem" pill with days waiting, plus a "Pošlji opomnik" button.
Effort: 0.75 h.

**M3. Page width differs between tabs.**
Evidence: PO, Hours and Final use `.container` (1240 px, `globals.css:220`; `po/page.tsx:78`, `hours/page.tsx:75`, `final/page.tsx:111`). The overview and header use `.e-wrap` (1160 px). Content starts at x 124 under a brand at x 166 (`live/d-p1-po.png`).
Fix: switch to `e-wrap`.
Effort: 0.25 h.

**M4. The header subtitle changes meaning between tabs.**
Evidence: it shows the sub company on the overview and the city on PO, Hours and Final (`meta={core.addressCity}`).
Fix: always show the sub.
Effort: 0.1 h.

**M5. Empty states are bare text.**
Evidence: "Ni še listov.", "Ni odprtih zahtev.", "Še ni fotografij s terena.", "Zbiramo podatke" set in the bold value font inside the chips (`live/d-p2-overview-part0.png`).
Also, "Še ni dnevnih vnosov." wraps inside the 92 px date column, because the empty row reuses `.e-day` (`DailyLogFeed.tsx:20-22`, `globals.css:1043`).
Fix: one `EmptyState` component (icon, one line, next action), and the chips show a muted "ni podatkov" caption instead.
Effort: 1 h.

**M6. The "Dan 1" dashboard does not guide the EPC.**
Evidence: `live/d-p2-overview-part0.png`.
Fix: a "Začetek projekta" checklist at the top of a project with 0 reports:
- naročilnica poslana ✓, sprejeta,
- ekipa povabljena,
- material preverjen,
- prvo poročilo.

Each step shows its status and a deep link.
Effort: 1.5 h.

**M7. The bell is empty for the demo EPC and loads with "...".**
Evidence: 0 rows for Marko (SQL above); `live/d-bell.png`.
Fix: the seed creates 5 to 6 realistic notifications for Marko (report filed, material partial, extra submitted, sheet submitted, document expiring); a skeleton row replaces the dots.
Effort: 0.75 h.

**M8. Settings has no team list.**
Evidence: "Ljudje in dostopi" holds only an invite form.
Fix: list members with their roles above the form, and give all cards one width (`live/d-settings-full.png`).
Effort: 1 h.

**M9. The day log is not interactive.**
Evidence: rows cannot be opened; on a phone the weather and thumbnails are hidden (`globals.css:1055`).
Fix: tap a day to open a drawer with its quantities, photos, crew, weather and note, and a "PDF dneva" link (`lib/pdf/day-report.tsx` already exists).
Effort: 2 h.

**M10. The wizard guesses country "SI" for "Wien, 1100".**
Evidence: `live/d-wizard-review.png`.
Fix: infer the country from the city or ZIP (a small AT/DE/SI city list; a 5-digit ZIP means DE), and keep the warning.
Effort: 0.5 h.

**M11. The logout control is a floating "ODJAVA" pill at the bottom left, overlapping content.**
Evidence: with the Next dev indicator on top of it (`live/d-portfolio.png`). It is missing on PO, Hours, Final and Settings. There is no user menu.
Fix: an avatar menu in the header (shared with H8).
Effort: covered by H8.

**M12. The compliance list shows a German tax document name on a Slovenian project for a Slovenian sub.**
Evidence: "Freistellungsbescheinigung" (`live/d-p1-overview-part1.png`). A Slovenian buyer will not know it.
Fix: seed documents per country (SI: potrdilo FURS o plačanih davkih, A1, zavarovanje; DE: Freistellungsbescheinigung).
Effort: 0.5 h.

**M13. Every tab shows the same title.**
Evidence: "Belin, vaš projekt na enem mestu" (`results.json` `title`).
Fix: `generateMetadata` per route.
Effort: 0.5 h.

**M14. The sticky header is only 60% opaque, so scrolled text shows through.**
Evidence: `globals.css:880`.
Fix: raise to .88.
Effort: 0.1 h.

### Low

- **L1.** The wizard wordmark is "Belin" (`Wizard.tsx:178-189`). Use BelinMark plus "BELIN".
- **L2.** The date input shows "dd/mm/yyyy" in the Slovenian wizard.
- **L3.** The disabled "Dodaj" button is a muddy beige (`globals.css:1607`).
- **L4.** "Multiple GoTrueClient instances" warnings: `createBrowserClient()` makes a new client per mount (`lib/supabase/client.ts:7-11`, `LiveRefresh.tsx:49`). Memoize it as a module singleton.
- **L5.** The header "Projekti" link goes through two redirects (`/app/projects`, then `/login`, then `/app`, 3.5 s). Link straight to `/app` (`CommandBar.tsx:61`, `Wizard.tsx:199`).

## Professional-grade critique (senior product designer view)

**What is already good:**
- a coherent dark identity,
- the gold ring and tempo chart are memorable,
- the wizard's review step genuinely demonstrates "you review, you do not type",
- the type scale on the hero is confident,
- the phone layouts mostly stack well.

What reads as "not yet a 2026 product":

1. **Navigation chrome.**
   - There is no user or avatar menu, no global search or Cmd+K, and no breadcrumb.
   - Logout is a floating pill.
   - On a phone, settings and project navigation disappear.
   - The "v živo" badge floats outside the layout grid and collides with menus.
2. **Feedback states.**
   - No skeletons, so every tab is a blank wait of 2 to 4 s.
   - No toasts and no confirmation for destructive actions.
   - The loading indicator is "...".
   - Empty states are plain grey sentences with no next action.
3. **The overview is one 3,700 px scroll of hairline sections.**
   - All sections carry equal weight, and there is no in-page navigation.
   - Problems (expired document, overdue PO, silent site) are not pulled to the top.
4. **Data presentation.**
   - Mixed decimal separators, two tempo definitions, unformatted kWp.
   - Status colours do not distinguish waiting from done (sent PO in green).
   - Hours are never shown as money.
5. **Documents.**
   - Correct but generic: no issuer identity, no addresses, no logo, no amounts on the régie sheet.
6. **Consistency.**
   - Three content widths (1160, 1240, 620 px forms) and three header variants (the wizard has its own).
   - Card widths in Settings are arbitrary.

## Ideas that would make it a no-brainer for an EPC (not asked for, high leverage)

1. **"Danes" strip on the portfolio.**
   Example line: "3 ekipe na strehah · 14 fotografij · 1 zahteva čaka · 1 dokument podizvajalca poteče čez 18 dni · 1 naročilnica čaka 5 dni".
   Every item is a deep link, built from `lib/data/portfolio.ts` queries that already exist. The buyer sees in five seconds what costs him ten phone calls today.
   Effort: 2 h.
2. **Project map on the portfolio.**
   - Every seeded project already has lat/lng (`scripts/seed-demo.mjs:229,380`).
   - Pins coloured by status, with a click opening the project. Leaflet with OSM tiles or a static SVG of SI/AT.
   - It is the single most "real software" visual for a regional EPC.
   - Effort: 1.5 h.
3. **Hours and extras as money everywhere.**
   - "Režijske ure: 19 h · 912,00 EUR · dodatna dela 1.200,00 EUR · skupaj nad naročilnico 2.112,00 EUR" on the overview and on the Hours tab.
   - The rate is already on the PO.
   - EPC owners think in euros, not hours.
   - Effort: 1 h.
4. **Silent-site alarm and a "Pokliči / Opomni" button** (see H5).
   The buyer's first objection is "what if the crew does not report"; answer it on screen.
   Effort: 1 h on top of H5.
5. **Read-only owner link.**
   - The EPC forwards a no-money progress page (ring, tempo, photos) to its own investor.
   - The token surface and `components/share/ShareLink.tsx` already exist.
   - Effort: 3 h.
6. **Weekly PDF to the EPC.**
   - Monday "Tedensko poročilo" per project: progress, days, photos, incidents.
   - Built from `lib/pdf/day-report.tsx` and `completion.tsx`.
   - Effort: 3 h.
7. **Cmd+K command palette.**
   - Jump to a project or tab, "Nov projekt", "Nastavitve".
   - Effort: 2 h.
8. **Drop a K2 PDF anywhere on the portfolio** to start a project straight on the review step.
   Effort: 1 h on top of H12.
9. **"Ponastavi demo" button, visible only with DEMO_LOGIN**, so beat 6 can be shown twice in one meeting without a terminal.
   Effort: 1.5 h.

## Questions for the founder

1. Will tomorrow's demo run on belin-app.vercel.app or on the laptop? This decides B3 and how much H1 matters.
2. Is the prospect Slovenian (UI in sl) or Austrian (de)?
3. What fictional name should replace "Sonce Energija d.o.o."?
4. Should "Zaključi" leave the EPC status menu, so that finishing only happens through the acceptance on /final?
5. May the seed use the real photos in `assets/marketing/site/`? Are any of them from a client who has not agreed to be shown?

## Unverified

- **Visuals of the report, abnahme and invoice PDFs, and of the acceptance and invoice screens.** None exist in the data (`generated_documents`, `acceptances` and `invoices` are empty), and creating them would mutate data.
- **The hours approve and reject buttons and the countdown.** They are not rendered with today's data (H5 and B2). The one-click behaviour comes from code (`components/hours/SheetList.tsx:177-193`), not from a screen.
- **Dropping a file onto the wizard box.** That it navigates the tab to the PDF is inferred from the missing handlers and standard browser behaviour; it was not exercised.
- **Production timings with the region set to fra1.** Not measured, because the change was not made.
- **Whether the photos in `assets/marketing/site/` may be shown to a prospect.** Rights were not checked.
- **The 390 px header harness in `harness/`.** It is synthetic and is superseded by the live `live/m-*.png` screenshots, which agree with it.
