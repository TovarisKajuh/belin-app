# Recon: ux-standards (design system and UI/UX quality bar)

Date: 2026-10-05. Read-only recon. Scratch folder: `scratchpad/recon/ux-standards/` (scripts, screenshots, compiled CSS, replica page).

## 0. Read this first: the database is paused

The Supabase project `xrwncpngjajosstvkign` reports `"status":"INACTIVE"` (Supabase connector `get_project`, 2026-10-05). Its hostname no longer resolves (`Resolve-DnsName xrwncpngjajosstvkign.supabase.co`: "DNS name does not exist"). Consequences measured today:

- Every crew link renders "Povezava ni veljavna": `https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1` returns 404 after 7.45 s; locally 404 after 9.6 s (`shots/claim-phone.png`).
- A request with a session cookie hangs about 19.7 s (local) and 19.3 s (production) and then lands on the login page (`errorpage.mjs` output).
- Sign-in is impossible, so no signed-in screen works, locally or in production (they share the database).

Supabase docs (https://supabase.com/docs/guides/platform/free-project-pausing, accessed 2026-10-05): Free plan projects are paused after low activity over 7 days; restore with "Resume project" in the dashboard within 90 days, data and config return; paid plans are never paused. Restoring is a write, so this recon did not do it.

Because of this I could not take fresh signed-in screenshots. Signed-in screens were judged from the existing marketing screenshots plus code. `git log` shows the UI code (components, globals.css) has not changed since 2026-08-31 except the legal pages, so the 2026-08-31 German shots (`assets/marketing/raw-de`, `framed-de`) show the current UI. The 2026-08-13 Slovenian shots predate the crew tab bar (commit fdd00f9, 2026-08-13 17:34) but are otherwise current.

## 1. Verdict

The look is a strong, distinctive dark and gold aesthetic, and the hero dashboard screenshot is genuinely good. What makes it read as "not a real professional app" is not the palette. The design system is a stylesheet rather than a system, and it shows in ways a buyer notices within minutes:

- 32 distinct font sizes (9px to 46px in half-pixel steps), 19 border radii, 37 letter-spacing values, 44 spacing values with 369 of 614 off the 4px grid, 32 hard-coded hex colors and 162 rgba literals in the Belin section of `app/globals.css`.
- About 40 bespoke button classes. 10 of them are gold primaries with different radius, height and font size. Primary buttons have no hover, many buttons have no `cursor: pointer`, and one has a visible misalignment.
- No icon system. The desktop EPC side is text only.
- No `loading.tsx`, no `error.tsx`, no `global-error.tsx`, no root `not-found.tsx`, no toast, no favicon. Every page has the same `<title>`.
- A 4.5 s launch splash on every hard load, every new tab and every language switch.
- Several visible layout bugs on screens that would be shown tomorrow: portfolio tiles, portfolio status chips, sub office home, hours buttons, page column alignment, the floating LIVE badge, and dev pills floating over the UI.

Nearly all of the visible items are CSS or small TSX changes that an agent can make tonight without touching the approved aesthetic.

## 2. Evidence base

| What | Where |
|---|---|
| Full read of `app/globals.css` (2898 lines) and diff against `C:\DevEnv\AVE-DC\dashboard\app\globals.css` | Lines 1 to 805 are the AVE-DC light system ported verbatim. Only `html`/`body` background changed (diff). Belin dark system from line 806. |
| All existing product screenshots opened | `assets/marketing/raw`, `raw-de`, `framed`, `framed-de` (28 files). Viewed at `existing/` and the contact sheets `sheet-*.jpg` |
| Fresh Playwright shots, signed out | `shots/landing-desk*.png`, `landing-phone*.png`, `login-desk.png`, `notfound-desk.png`, `notfound-desk-en.png`, `impressum-desk.png`, `claim-phone.png`, `locale-switch-de-after400ms.png`, `landing-focus-tab3.png` |
| Replica render of SubHome markup against the real compiled CSS from the dev server | `replica-subhome.html`, `shots/replica-subhome-desk.png`, `replica.mjs` |
| Measurements | `shots/report.json` (status, load time, splash time, small targets, font sizes), contrast math (section 5) |

## 3. Prioritized findings

Severity is relative to presenting tomorrow and then letting the buyer use the product.

### BLOCKER

**B1. Supabase project paused, whole app down (local and production).** Evidence in section 0. Fix: the founder clicks "Resume project" in the Supabase dashboard tonight, not tomorrow morning, then reruns the demo seed (seed dates are relative to run time: `scripts/seed-demo.mjs:493` `daysAgoIso`). Consider the Pro plan so it cannot pause again before the pilot (docs above; price not verified here). Effort: 0.25 h plus restore wait.

### HIGH (visible in a 30 minute demo)

**H1. Launch splash blocks every hard load for about 4.5 s, and replays on language switch.** Measured: landing 4530 ms, login 4465 ms, claim 4635 ms (`report.json`). Clicking DE on the landing remounts the root layout: the splash is on screen 400 ms after the click with 3389 ms remaining (`shots/locale-switch-de-after400ms.png`). With `prefers-reduced-motion` it still takes 2185 ms. Cause: `components/SplashGate.tsx` mounts `BelinSplash` without `once`, in the root `[locale]/layout.tsx`, and switching locale changes the root layout.
Fix (keeps DECISIONS 2026-08-13, "no client signal in a server render"): pure CSS gate in `globals.css`: `[data-splash]{display:none!important}` plus `@media (display-mode: standalone){[data-splash]{display:flex!important}}`. The `!important` is needed because `BelinSplash.tsx:132-137` sets `display:"flex"` inline. Also pass `once` in `SplashGate.tsx`. Result: no splash in a browser, splash kept for the installed PWA cold start. Effort: 0.3 h.

**H2. Portfolio headline tiles glue the sub-line to the unit.** Current UI shows "1 MWp4 abgeschlossene Projekte", "246 kWp1 laufendes Projekt", "265 kWpnoch nicht begonnen" (`shots/crop-de-portfolio-tiles.png`; SL: "1 MWp4 zaključeni projekti"). Cause: `.pf-tile-v` and `.pf-tile-s` are inline spans (`globals.css:2581-2588`, `2648`; `PortfolioHeader.tsx:43-50`). This is the first screen after sign-in. Fix: `.belin-dark .pf-tile-v{display:block}` `.belin-dark .pf-tile-s{display:block;margin-top:6px}`. Effort: 0.1 h.

**H3. Portfolio status chips stretch into long bars.** In the same screenshot "AKTIV" is a pill about 350px wide and widths vary per card. Cause: `.pl-status` is a grid item in `.pl-link--rich` and stretches under the container query (`globals.css:1867`, `2739-2742`). Fix: `.belin-dark .pl-status{justify-self:start}`. Better: place it top right beside `.pl-name`. Effort: 0.2 h.

**H4. Sub office home is broken.** `components/sub/SubHome.tsx` labels every card with `className="e-proj-lab"`, which is the tempo chart's absolutely positioned axis label (`globals.css:978`: `position:absolute; bottom:1px; transform:translateX(-50%)`). Rendered against the real compiled CSS, all six labels leave their cards and pile up overlapping at the bottom of the page ("Napredek" over "Naročilnica", "Manki pri materialu" over "Nadgradnje"). The cards show "58.3 %" and "0" with no title (`shots/replica-subhome-desk.png`; positions logged by `replica.mjs`: all at y=697, `position:absolute`). The "Čaka na vas" section is four hard-coded `sh-card--empty` cards at opacity .62 that always say "Naročilnice še ni.", "Ni oddanih listov.", "Ni prijavljenih nadgradenj.", "Projekt še poteka." (`SubHome.tsx`, `messages/sl.json:362-368`), even though the demo project has a PO and two hour sheets. AVESOL is a subcontractor, so the founder is likely to show this view.
Fix: replace `e-proj-lab` with `pf-tile-l` (7 places), 0.1 h. Then either wire the four cards to real data with links to `/po`, `/hours`, `/final` (status of PO, count of submitted sheets, change orders, finalization state; the portfolio loader already computes `openHours`), 1.5 h, or delete that section for tomorrow, 0.1 h.

**H5. No favicon, and the same title on every page.** `/favicon.ico` returns 404 locally and on production. The head carries only `apple-touch-icon` (`locale-switch.mjs` output; `[locale]/layout.tsx:96-98`). Every page title is "Belin, vaš projekt na enem mestu", including login and 404 (`report.json` `title`). The browser tab shows a generic icon for the whole meeting. Fix: add `app/icon.svg` (from `public/icons/logo.svg`) or `app/icon.png` 32px plus `app/favicon.ico`. Set `title: { default: share.title, template: "%s · Belin" }` in `[locale]/layout.tsx` `generateMetadata`, and per-page `generateMetadata` for portfolio ("Projekti"), project (project name), po/hours/final (tab name and project), settings, login. Effort: 0.75 h.

**H6. Numbers and dates are not localized.** The hero shows "5.9 %/dan" in the chip next to "6,5 %/dan" in the chart (`raw__epc-dashboard.jpg`). Every kWp and percent uses a JS dot decimal ("245.7 kWp", "58.3 %"), also in the German UI ("58.3 %", "245.7 kWp" in `crop-de-portfolio-tiles.png`). Dates are mixed: ISO "2026-12-11" in the vault (`components/settings/VaultPanel.tsx:154`), ISO in the acceptance line (`components/final/AcceptanceFlow.tsx:123` `conductedAt.slice(0,10)`), day.month without year from `ddmm` (`lib/dashboard-shared.ts:7-10`, "Velja do 11.12", "25.08"), and "15. 08. 2026" from Intl elsewhere. Only 5 files use Intl number formatting. A German buyer reads this as unfinished.
Fix: `lib/format.ts` with `fmtNumber(n, locale, maxFrac)`, `fmtKwp`, `fmtPct`, `fmtDate(iso, locale, "short"|"long")` on `Intl.NumberFormat`/`DateTimeFormat`. Apply in `EpcDashboard.tsx:42,73`, `ProjectList.tsx` (facts, `pl-pct`), `PortfolioHeader`/`formatCapacity`, `CrewHome` progress, `SubHome` `sh-big`, `RoofPanel`, `CompliancePanel`, `VaultPanel.tsx:154`, `AcceptanceFlow.tsx:123`, `MaterialCheck.tsx:185`, `SheetList.tsx:154`. Effort: 2 h.

**H7. Developer chrome floats over the live product.** `LogoutPill` is rendered on every app screen and is the only way to sign out (`app/[locale]/app/page.tsx:44,52,84`, `[projectId]/page.tsx:76,96,119`, `dnevnik/page.tsx:66`, `pregled/page.tsx:28`). `ScenarioPill` (page.tsx:83) and the yellow "DEV" swap pill (`p/[token]/page.tsx:61`) also float there. They are hidden only for the screenshot pipeline (`lib/shot-mode.ts`), so the marketing shots look cleaner than what the buyer will see. On localhost the Next dev indicator "N" also sits bottom left (`shots/locale-switch-de-after400ms.png`).
Fix: move sign out (and, when `DEMO_LOGIN=1`, the scenario switch) into an account menu in the header (H-M1). Render `DevSwapBar` only when `process.env.NODE_ENV === "development"`. Present from production, or set `devIndicators: false` in `next.config.ts`. Effort: 1.5 h with the header work, or 0.3 h for a stopgap that hides the pills behind a `?present=1` cookie reusing `isShotMode`.

**H8. No icon system.** There are 9 inline SVGs in 6 files: bell, login arrow, splash, 4 crew tabs, ring, chart. Elsewhere there are ad hoc glyphs: `×` `‹` `›` in `Lightbox.tsx:50,63,74`; `▴▾` in `ProjectStatusControl.tsx:87`; `&times;` in five files; a text "!" in a gold box (`MaterialCheck.tsx:214`, `AlertStrip`); `&larr;` as the back link (`p/[token]/hours/page.tsx:75`). The desktop EPC side (nav tabs, header buttons, PDF buttons, approve and reject, empty states, incident kinds) has no icons at all, which is the clearest gap against Linear, Stripe, PlanRadar and Fieldwire.
Fix: add `lucide-react` (npm 2026-10-05: v1.52.0, ISC, peer React ^19). Add `components/ui/Icon.tsx` with defaults size 16, strokeWidth 1.75, aria-hidden. Place icons in:
- nav tabs: LayoutDashboard, FileText, Clock, FileCheck
- header: FolderKanban for Projekti, Settings, Plus for "Nov projekt"
- PDF links: FileDown
- approve and reject: Check, X
- alert strip: TriangleAlert
- incidents: CloudRain, Construction, TriangleAlert
- lightbox: X, ChevronLeft, ChevronRight
- status caret: ChevronDown
- empty states: Camera, Inbox, Images

Effort: 2 h.

**H9. Buttons are inconsistent, have missing states, and one is misaligned.** 10 gold primary variants (`lp-enter`, `lp-submit`, `b-btn`, `mp-add-btn`, `wz-primary`, `pl-new`, `sh-crew`, `hr-submit`, `cl-join`, `lp-cta-btn`) use radii of 999, 16, 14, 11 and 10px and fonts from 12.5 to 17px. No `:hover` on `pl-new` ("Nov projekt"), `wz-primary`, `hr-submit`, `lp-cta-btn`, `mp-add-btn`, `rp-send`, `rp-open`, `hr-reject`, `hr-new`, `hr-tab`, `hr-chip`, `e-alert-b`. No `cursor` on `hr-reject`, `hr-new`, `hr-submit`, `hr-tab`, `hr-chip`, `ic-cta`, `ic-kind`, `rq-cta`, `rq-type`, `cl-name`, `cl-join`, `po-x`, `po-add`, `sig-clear`, `b-step-btn`, `ih-x`, so desktop shows the arrow cursor on them. The visible bug: on the Hours screen "Potrdi"/"Anerkennen" sits about 11px lower than "Zavrni"/"Ablehnen" (`shots/crop-de-hours-buttons.png`), because `.rp-send` carries `margin-top:11px` (`globals.css:2369-2373`) inside `.hr-decide` (`SheetList.tsx:172-189`). The money decision is also styled as a tinted secondary, not a primary.
Fix (CSS only, no TSX rewrite tonight; keeps the gold aesthetic):
1. `.belin-dark :is(button,[role=button],[role=radio],[role=tab],summary,label.np-switch):not(:disabled){cursor:pointer}`
2. One primitive appended to `globals.css`: `.belin-dark :is(.pl-new,.wz-primary,.mp-add-btn,.hr-submit,.cl-join,.sh-crew,.lp-cta-btn,.lp-submit,.lp-enter)` gets min-height 44px, radius 12px, font 14px/700, a hover of `filter:brightness(1.06)` plus the glow shadow, `:active{transform:translateY(1px)}`, and a common `:disabled`.
3. A secondary group `:is(.wz-ghost,.po-ghost,.sl-btn,.hr-pdf,.cb-nav,.cr-toggle,.mc-recheck-btn,.rp-open,.hr-new)` gets surface-2 background, `--e-line-strong` border, radius 12, hover `rgba(255,255,255,.09)`.
4. A danger outline for `.hr-reject`.
5. `.belin-dark .hr-decide .rp-send{margin-top:0}`. Make approve a gold primary (`hr-submit` style) with a Check icon.

Effort: 2.5 h.

**H10. No loading or error boundaries.** Zero `loading.tsx`, zero `error.tsx`, no `app/global-error.tsx`, no `Suspense`. Clicking a project tab gives no feedback until the server answers. With a slow database the page sits for about 19.7 s (measured above). Any thrown server error shows Next's default error screen.
Fix:
- `app/[locale]/app/loading.tsx`: portfolio skeleton, three tiles and six cards with a shimmer on `--e-surface`.
- `app/[locale]/app/[projectId]/loading.tsx`: command bar plus ring and chips skeleton.
- `po/hours/final/loading.tsx`.
- `app/[locale]/error.tsx` and `app/global-error.tsx`: dark, a short message, a "Poskusi znova" button calling `reset()`, and a link to `/app`.

Effort: 2 h.

**H11. No feedback after actions, and money actions are one click with no confirm.** Success paths are a silent `router.refresh()`: `SheetList.tsx:55-58`, `RequestsPanel.tsx:35-40`, `PoBuilder.tsx:99-102`, `PoView.tsx:46-49`, `InvoiceCard.tsx:52-55`. Approve and reject of an hour sheet fire immediately, with no confirm, no undo and no rejection reason (`SheetList.tsx:175-187`). The crew report shows a 2.5 s "done" state (`CrewReportForm.tsx:73-80`), which is good, but the office side does not.
Fix: add `sonner` (npm 2026-10-05: v2.0.8, MIT) or a 60-line in-house toaster in `components/ui/Toaster.tsx`, mounted in `[locale]/layout.tsx`. Call `toast.success("List ur št. 2 potrjen")` after each action. Add a small confirm sheet for PO send, invoice create, and sheet approve and reject, with an optional reason on reject. Effort: 2 h.

**H12. Page column misalignment and an inconsistent header.** PO, Hours, Final and the token hours page wrap content in the light AVE-DC `.container` (1240px, 24px padding) while the command bar uses `.e-wrap` geometry (1160px, 26px). The content edge sits 42px left of the header edge at 1600px (`raw__hours-countdown.jpg`: tabs card x=178 against brand x=213 at 1400px scale). Files: `po/page.tsx:78`, `hours/page.tsx:75`, `final/page.tsx:111`, `p/[token]/hours/page.tsx:61`. Fix: `className="e-wrap"`. Also, the header meta shows the sub company on Overview ("AVESOL d.o.o.") and the city on the other three tabs ("Kranj"), so the header changes as you click tabs (`EpcDashboard.tsx:51` against `po/page.tsx`/`final/page.tsx` `meta={city}`). Use the same value on all four. Effort: 0.3 h.

**H13. The LIVE badge is orphaned.** `.e-live-fixed` (`globals.css:1636-1640`) pins "V ŽIVO" at `right:16px; top:58px`, outside the 1160px column and over the nav row (`raw__epc-dashboard.jpg`, top right at x=1315). Fix: render the live indicator inside `CommandBar`'s `.e-br` (a small gold dot plus "Živo") and delete the fixed rule. Effort: 0.3 h.

**H14. 404 and invalid link screens are off-brand.** An unmatched URL (`/sl/this-does-not-exist`, `/en/nope/nope`) renders Next's default white English "404 This page could not be found." (`shots/notfound-desk.png`), because there is no root `app/not-found.tsx`. `app/[locale]/not-found.tsx:6-9` uses light AVE-DC classes (`container section card card-full fade-up section-title section-label`), so invalid tokens and wrong project ids show a white card flush to the top of the navy page, with muted text at 3.03:1 (`shots/claim-phone.png`). While the database is paused, every crew link shows this. Fix: a dark not-found in `.belin-dark .lp` with the wordmark, a title, one line and a gold "Na začetek" button; a root `app/not-found.tsx` with its own `<html><body>` because the root layout returns children only. Effort: 0.75 h.

### MEDIUM

**M1. The navigation model has dead ends.** The header is implemented five times: `CommandBar.tsx`, `ProjectList.tsx:52-73`, `app/projects/page.tsx:32-46`, `app/settings/page.tsx:79`, and `Wizard.tsx:192`, which uses a title-case "Belin" wordmark against "BELIN" everywhere else. The logo is not a link anywhere. "Projekti" in the project header goes to `/app/projects`, a second, poorer list with no bell, no settings and no link back to the portfolio. The bell exists only on the portfolio. On phones up to 640px, `.cb-nav` and `.e-bproj` are hidden (`globals.css:890`, `1879`), so an EPC on a phone has no way back to the project list. There is no account or avatar menu, no breadcrumb and no project switcher.
Fix: one `components/app/AppHeader.tsx` with:
- the logo linking to `/app`
- a breadcrumb "Projekti / {project} ▾" whose chevron opens a project switcher popover
- the bell on every screen
- an account menu: name, org, language (SL/DE/EN), Nastavitve, Odjava, demo scenario switch when `DEMO_LOGIN=1`

Move the project status pill into the page hero beside the H1, since it is state, not navigation. Redirect `/app/projects` to `/app`. Effort: 3 h. This is the largest single "pro app" signal, so do it if time allows.

**M2. Typography has no scale, and hierarchy relies on tiny uppercase labels.** 32 font sizes in `globals.css`: 9px(4) 9.5px(2) 10px(15) 10.5px(14) 11px(23) 11.5px(16) 12px(32) 12.5px(38) 13px(36) 13.5px(19) 14px(21) 14.5px(12) 15px(16) 15.5px(2) 16px(13) 16.5px(1) 17px(8) 18px(6) 19px(2) 20px(4) 21px(1) 22px(4) 23px(1) 24px(2) 26px(4) 28px(3) 30px(3) 32px(1) 34px(1) 36px(1) 44px(1) 46px(1). Dashboard section titles are 11px uppercase muted with .2em tracking (`.e-sec-h`, `globals.css:909`). Chip and stat labels are 9.5px (`globals.css:928`, `1022`), unreadable on a projector. The ring label tracks mixed case at .26em, rendering "S k u p n i  n a p r e d e k" (`globals.css:942`, `raw__epc-dashboard.jpg`).
Fix tonight, as tokens only:
- define `--fs-12:12px; --fs-13:13px; --fs-14:14px; --fs-16:16px; --fs-20:20px; --fs-28:28px; --fs-40:40px` on `.belin-dark`
- raise every 9 to 10.5px label to 11px
- `.e-sec-h` to 13px/700 with .12em tracking and `--e-ink2`
- `.e-ringc .lab{text-transform:uppercase}`

Effort: 1 h. The full remap to the scale is deep work (section 4).

**M3. Contrast is weak on a projector and in sunlight.** See section 5. Placeholders 2.76:1, chart axis labels 2.64:1, muted text on surface-2 4.45:1, card borders 1.32:1, card surface against page 1.09:1. Fix values are in section 5. Effort: 0.75 h.

**M4. Colors are not tokenized.** Nine near-duplicate warning and danger hues are hard-coded: #ff9f6b(10) #ffb45c(5) #ff7a6b(3) #ff8f6a #ff5c5c #e5484d #ffb9b9(2) #ffb9a3, plus #d9a441 through `var(--e-warn, #d9a441)`, where `--e-warn` is never defined (`globals.css:1711-1712`, `2701`). Crew errors use the light system's `var(--warn)` #f59e0b (`CrewReportForm.tsx:136`, `MaterialCheck.tsx:312`, `PhotoCapture.tsx:123`, `globals.css:1608`). Fix: on `.belin-dark` define `--e-warn:#ffb45c; --e-danger:#ff7a6b; --e-danger-ink:#ffb9b9; --e-info:#6bb8ff` and replace the literals. Effort: 1 h.

**M5. The crew material check shows contradictory duplicate cards.** With changed items, the crew sees the alert "7 neue oder geänderte Positionen... Erneut prüfen" and directly under it "Material vollständig ... Erneut prüfen": two identical buttons and a "complete" badge that contradicts the alert (`raw-de__crew-phone.jpg`; `MaterialCheck.tsx:207-232`). Fix: when `uncoveredOrChanged > 0`, render one card with an amber "7 novih postavk" badge and one button. Effort: 0.5 h.

**M6. Empty states are one grey line.** `DailyLogFeed.tsx:19-22`, `PhotoGallery.tsx:29-30`, `IncidentsPanel.tsx:21-22`, `RequestsPanel.tsx:51-52`, `.pl-empty`, `.wz-empty`. On the "Dan 1" project the dashboard is a column of grey sentences. Fix: `components/ui/EmptyState.tsx` with an icon, a title, one line and a primary action. On the empty daily log the action is "Pošlji povezavo ekipi", reusing `ShareLink`'s WhatsApp and copy buttons. Effort: 1.5 h.

**M7. Dashboard information architecture.** There are 13 sections in one column. The site photos, the most persuasive content, come last, after compliance and the stat row (`EpcDashboard.tsx:110-131`). There is no in-page navigation. Fix: order hero, AlertStrip, LatestOnSite, ProjectionPanel, ScopeByPhase, PhotoGallery, DailyLogFeed, Requests, Incidents, Material, Roofs, Compliance, StatRow. Add sticky anchor chips under the nav. Effort: 1 h.

**M8. Reduced motion is only partly honored.** 7 guarded rules. Unguarded: `epc-breathe` (`globals.css:935`), `epc-pulse` (1032), `pulse` (126), ring draw `epc-draw` (938), `e-fadein` (1070), `e-reveal` transition (910). Fix: one global `@media (prefers-reduced-motion: reduce){.belin-dark *,.belin-dark *::before,.belin-dark *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`. Forwards fills still land on their final state, so the bar-at-zero trap in `globals.css:1001-1004` is not reintroduced. Effort: 0.2 h.

**M9. Some tap targets are under 44px.** Measured: landing and login locale links are 29px tall, `lp-enter` 37 to 40px (`report.json` `small`). From CSS: `.e-alert-b` about 33px (the crew re-check), `.sig-clear` about 26px (`globals.css:2540-2543`, clearing a signature on a roof), `.po-x` 34px, `.cr-toggle` about 33px, `.hr-pdf` about 35px. Fix: `min-height:44px`, or the `::after` hit-area trick already used on `.cb-locales a` (`globals.css:1841-1845`). Effort: 0.3 h.

**M10. Photos load at full size.** 10 plain `<img>` with no `loading="lazy"`, no `decoding="async"` and no size (`DailyLogFeed.tsx:53`, `PhotoGallery.tsx:35`, `LatestOnSite.tsx:52`, `IncidentPhotos.tsx:26`, `MaterialDocs.tsx:30`, `RequestsPanel.tsx:65`, `ChangeOrderList.tsx:193`, `TodayPosts.tsx:38`). Every full-size photo downloads for 36 to 52px thumbnails, which slows the dashboard on weak LTE (design law 4). Fix: add the attributes, 0.3 h. Image transforms come later.

**M11. The local login page stacks two forms.** With `DEMO_LOGIN=1` it shows the magic link form, then the username and password form with no separator: two gold primaries, and the "UPORABNIŠKO IME" label touching the first button (`shots/login-desk.png`, `login/page.tsx:73-77`). Production does not show the password form (no `type="password"` in the production HTML). Fix: an "ali" divider with 20px gap and a secondary style for the demo button. Effort: 0.3 h.

**M12. No public Impressum.** `/sl/impressum` and `/sl/zasebnost` return 404 on purpose until the company is real (`impressum/page.tsx:20`). A German B2B buyer expects one on the landing page. This is a legal and trust item for another surface. Flagged here only because it is visible.

### LOW, and deep refactors not worth doing before tomorrow

- **D1.** About 730 lines of dead light AVE-DC CSS still ship (`globals.css:75-805`: `.hero`, `.nav`, `.stat-value`, `.donut`, `.timeline`, `.log-table`, `.gallery`, `.weather-strip`, `.cta-big`, `.footer`, `.lightbox` and others). Delete after the demo, once the not-found and `.container` users are migrated.
- **D2.** Full token refactor: spacing scale (44 values, 60% off the 4px grid), radius scale (19 values down to 4: 8/12/16/999), 162 rgba literals to semantic tokens, 23 inline `style={{}}` props (for example `CrewReportForm.tsx:106,136`, `TodayPosts.tsx:16-29`).
- **D3.** Real component library (`components/ui/Button`, `Card`, `Badge`, `Field`, `Sheet`) replacing the 40 button classes in TSX. Tonight's `:is()` aliasing is the bridge.
- **D4.** Semantic headings: dashboard panels use `div.e-sec-h` instead of `h2`. Add a skip link.
- **D5.** A sunlight or high-contrast crew theme (light surfaces for the crew report screen, `prefers-contrast: more`). A dark UI with 1.09:1 surfaces is the wrong default under direct sun.
- **D6.** Cmd+K command palette and keyboard shortcuts for the EPC office.
- **D7.** PWA manifest polish (`app/manifest.ts`): English-only description, no `id`, no `lang`, no `screenshots` (richer Android install sheet), no `shortcuts` (for example "Pošlji poročilo").
- **D8.** JetBrains Mono is loaded on every page for one URL field (`.st-url`). The splash text uses a system font stack, not Inter (`BelinSplash.tsx:171`).
- **D9.** Form validation is server-side only: no `aria-invalid`, no `aria-describedby`, no inline field errors. Fine for the demo.

## 4. The plan split the founder asked for

### (a) Visible in a 30 minute demo, ordered by impact per hour

| # | Change | Files | Hours |
|---|---|---|---|
| a1 | Restore Supabase, reseed (founder action) | Supabase dashboard; `npm run seed` | 0.25 + wait |
| a2 | Splash only in installed PWA, `once` | `globals.css`, `SplashGate.tsx` | 0.3 |
| a3 | Portfolio tile glue and stretched status chips | `globals.css` (`.pf-tile-v`, `.pf-tile-s`, `.pl-status`) | 0.3 |
| a4 | Sub office home labels, and real or removed "Čaka na vas" | `SubHome.tsx` | 0.2 (labels) + 1.5 or 0.1 |
| a5 | Column alignment, header meta, LIVE badge in header, approve and reject alignment | `po/hours/final/p hours page.tsx`, `CommandBar.tsx`, `LiveRefresh`, `globals.css` | 0.8 |
| a6 | Favicon and per-page titles | `app/icon.svg`, `[locale]/layout.tsx`, page `generateMetadata` | 0.75 |
| a7 | Dark 404, root not-found, error boundaries, loading skeletons | `app/not-found.tsx`, `[locale]/not-found.tsx`, `error.tsx`, `global-error.tsx`, 5 `loading.tsx` | 2.75 |
| a8 | Button primitive via `:is()` aliases, cursor, hover, states | `globals.css` | 2.5 |
| a9 | Localized numbers and dates | `lib/format.ts` + about 12 call sites | 2 |
| a10 | Contrast and token tune (section 5 values) plus label sizes and ring label | `globals.css` | 1.25 |
| a11 | Icons (lucide-react) | `components/ui/Icon.tsx` + about 15 call sites | 2 |
| a12 | Toasts, plus confirm on PO send, invoice, approve and reject | `components/ui/Toaster.tsx`, 5 action components | 2 |
| a13 | Unified header with account menu, project switcher, bell everywhere; pills removed | `components/app/AppHeader.tsx`, 5 header sites | 3 |
| a14 | Material check single card | `MaterialCheck.tsx` | 0.5 |
| a15 | Empty states with an action | `components/ui/EmptyState.tsx`, 5 panels | 1.5 |
| a16 | Dashboard reorder and anchor chips | `EpcDashboard.tsx`, `globals.css` | 1 |
| a17 | Reduced motion, tap targets, lazy images, login divider | `globals.css`, 8 `img` sites, `login/page.tsx` | 1.1 |

Suggested cut for tonight: a1 to a10 is about 13 h of agent time and fixes every visible bug. a11 to a13 add the "real SaaS" layer, about 7 h. a14 to a17 if time remains.

### (b) Deep refactors not worth doing before tomorrow

D1 to D9 above. Rebuilding components in TSX, the full token remap, the sunlight theme, the command palette and semantic restructuring each risk regressions on screens that work today.

## 5. Contrast table (WCAG 2.x, computed from the actual tokens)

Page background `#0c1826` (top of the `.belin-dark` gradient). Surface = `rgba(255,255,255,.035)` over it = `#15202e`. Surface-2 (.06) = `#1b2633`. Field = `rgba(4,9,16,.55)` over surface = `#0c131e`.

| Pair | Ratio | Verdict |
|---|---|---|
| `--e-ink #f4f1ea` on bg / surface | 15.85 / 14.57 | pass |
| `--e-ink2 #cfcabf` on bg / surface | 10.95 / 10.06 | pass |
| `--e-muted #8f8a7e` on bg / surface / surface-2 / menu `#101a28` | 5.20 / 4.78 / **4.45** / 5.09 | marginal, fails on surface-2, weak at 9.5 to 11px |
| placeholder `#5f5b53` on field | **2.76** | fail (and placeholders are the only visible label in AddMaterialItem and CrewRoster) |
| gold `#ffd21a` on bg | 12.34 | pass |
| `#14100a` on gold `#ffd21a` / `#ffe488` | 13.07 / 15.07 | pass |
| gold-2 `#ffe488` on gold tint .12 | 9.97 | pass |
| `--e-ok #4ad07a` on bg / on ok tint | 9.02 / 6.82 | pass |
| `#ff9f6b` / `#ff7a6b` / `#ffb45c` on bg | 8.88 / 7.02 / 10.16 | pass |
| `--e-ahead #4692e0` / `--e-behind #d9762f` on bg | 5.49 / 5.61 | pass |
| chart axis `rgba(255,255,255,.30)` on `#080f1a` | **2.64** | fail |
| threshold and ring sub-line `rgba(255,255,255,.42)` | 4.09 | fail for text under 18px |
| light `--muted #8a95a6` on white (404 and bad-token card) | **3.03** | fail |
| border `--e-line` .10 on bg / surface | **1.32 / 1.34** | non-text 3:1 fail; input boundaries rely on it |
| surface .035 against bg | **1.09** | cards nearly invisible on a projector |

Proposed values (all on `.belin-dark`):
- `--e-muted: #a39e92` (4.78 to 6.15 on surface, 4.45 to 5.73 on surface-2, 5.20 to 6.70 on bg)
- placeholders `#8a8478` (2.76 to 5.01) in `.lp-input::placeholder`, `.b-field::placeholder`
- `.e-chartx-axis text{fill:rgba(255,255,255,.55)}` (2.64 to 6.23); `.e-tempo-thresh` and `.e-ringc .pf` to .55
- `--e-line: rgba(255,255,255,.12)` (1.32 to 1.41)
- new `--e-line-strong: rgba(255,255,255,.22)` (about 2.0:1) on inputs, fields and secondary buttons
- `--e-surface: rgba(255,255,255,.05)` (1.09 to 1.14) plus `box-shadow: inset 0 1px 0 rgba(255,255,255,.04)` on cards so edges survive a projector
- light leftovers: replace with dark components (H14) rather than retinting

## 6. Ideas the founder would not think of

1. **The CSS-only splash gate** (`display-mode: standalone`). The installed app keeps its launch moment and the browser demo loses 4.5 s per page. There is no hydration risk, so it respects DECISIONS 2026-08-13.
2. **Presenter mode.** `?present=1` sets the existing `belin-shot` cookie (reuse `lib/shot-mode.ts`), so the product looks exactly like the marketing shots: no pills, no DEV badge. One URL before the meeting.
3. **"Za vas" action queue at the top of the EPC dashboard.** Pending hour sheets with their live countdown, open crew requests, a PO awaiting signature, expiring A1 documents, each one click to resolve. It turns the dashboard from a report into a work inbox, the strongest "this saves me time" moment.
4. **Undo toasts on decisions.** "List ur št. 2 potrjen. Razveljavi (5 s)" signals maturity more than any visual polish, and makes a one-click approve safe.
5. **Empty states that recruit.** On a new project the empty daily log shows "Ekipa še ni poslala poročila" with the WhatsApp share button for the crew link. Adoption happens inside the empty state.
6. **Project switcher in the breadcrumb**, the Vercel-style chevron next to the project name. An EPC with eight projects moves between them without the list.
7. **Per-page tab titles and a favicon**, plus an unread count in the favicon later. Tabs read "PSE Trgovski center Kranj · Belin" during the demo.
8. **Projector rehearsal settings.** The surface and border bumps in section 5 exist because cards at 1.09:1 vanish on a meeting-room TV. Rehearse at 1280x720 and 125% zoom.
9. **A "last updated 3 min ago" line beside the live dot.** It proves the dashboard is live without explaining realtime.
10. **The status pill moves into the hero beside the project title.** The header becomes pure navigation, which is how Linear and Stripe separate "where am I" from "what state is this in".

## 7. Questions for the founder

1. Will you present on a projector or TV, or by screen share? That decides how hard to push the contrast tokens.
2. Will you present from `belin-app.vercel.app` or from localhost? Localhost shows the Next dev badge and the password form, and compiles each route on first visit.
3. Is the meeting in Slovenian or German? If German, number and date localization (a9) moves to the top.
4. Are two small libraries acceptable: `lucide-react` (icons) and `sonner` (toasts)? Otherwise in-house equivalents, about 1 h more.
5. Will you show the subcontractor office view? It is currently broken (H4).
6. May the Supabase project be resumed now, and do you want the Pro plan so it cannot pause again before the pilot?

## 8. Unverified

- No signed-in screen could be freshly rendered (database paused). PO, Final, the current wizard, settings top, crew pregled, dnevnik and hours, the EPC phone view and the Dan 1 dashboard were judged from code and the 2026-08-13 and 2026-08-31 screenshots. The UI code is unchanged since 2026-08-31 except the legal pages.
- Real navigation latency with a healthy database. The absence of `loading.tsx` is verified; the delay the user sees is not measured.
- The Vercel function region against the Frankfurt database. Not in `next.config.ts`; the project API response did not show it.
- Whether the demo data is stale today. The seed is relative to run time, but I could not query the paused database.
- Tap sizes on signed-in crew screens are derived from CSS, not measured.
- How long the Supabase resume takes for this project, and the current Pro plan price.
