# Marketing Assets Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every visual asset Belin needs to sell itself, produced by the machine from the product itself, regenerable with one command, with the founder never used as a screenshot robot again.

**The purpose, stated once.** Belin has to convince two audiences: a Slovenian EPC prospect watching a demo, and a German EPC pilot arriving cold through a URL. Three artifacts do that selling: the landing page, a pitch PDF the founder can leave behind or attach to a mail, and a short demo video. All three are made of pictures of the product. Today those pictures are captured by hand, which means they are stale the day after any UI change, and the founder's time is the production line. This plan replaces that with a pipeline: seed the demo, drive a headless browser through every surface, screenshot, render the PDF documents to page images, and compose. Run it again whenever the product changes.

**Architecture:** One script family under `scripts/marketing/`, driven by Playwright (already available, v1.62) against the local dev server with the seeded demo. Screenshots come out as flat PNG masters in `assets/marketing/` (git-tracked, they ARE the deliverable source) and as optimized WebP in `public/landing/`. PDF documents render to page images inside the same headless browser via pdfjs. The pitch brochure is built with the @react-pdf engine the app already uses for its own documents, so it stays trilingual-capable and always current. The video is scripted Playwright runs with recording on, cut together with ffmpeg-static.

**Tech Stack:** Playwright (present), pdfjs-dist (new devDependency), ffmpeg-static (new devDependency, video phase only), sharp (present), @react-pdf/renderer (present).

## Status, end of 2026-08-13

DONE: Task 1 (screenshot pipeline), Task 2 (completion report cover), Task 3
(PDF pages to images), Task 4 (machine-driven demo flow), plus two founder
additions not in the original plan: angled device mockups via CSS 3D capture,
and flood-fill background removal. All committed and pushed.

NEXT: Task 5 (landing page, the "pretty af" pass), Task 6 (pitch PDF brochure),
Task 7 (demo video), Task 8 (close out). Assets are ready and regenerate with
`npm run marketing:all`.

Commands: `marketing:shoot`, `marketing:flow`, `marketing:pdfs`,
`marketing:mockups`, `marketing:all`.

---

## Global Constraints

- Never use em dashes or en dashes in any produced text, including inside generated images' captions, the brochure, and video title cards.
- Marketing copy follows the Slovenian-first mandate: written in Slovenian now, de/en placeholders in catalogs where keys are involved, translated in one pass when the founder approves the wording. The brochure ships Slovenian first for the Slovenian prospect; its German build is one `docLocale` switch later.
- New devDependencies are tooling, not app dependencies: the "ONE new dependency" cap from the v1 plan governed the runtime bundle and is untouched. Log both additions in CHANGELOG.
- One database serves local and production. The pipeline seeds before shooting and re-seeds after, so it always leaves the live demo in its clean staged state.
- Every produced image gets LOOKED AT (Read tool renders PNGs) before it is called done. The validator habit: no asset ships unseen.
- The founder's three device mockups in `screenshots/` (laptop hero, two phone angles) are canon. The pipeline does not regenerate those; it produces the flat shots that future mockups get built from.

## Deemed decisions (founder veto list)

1. Document images for the landing and brochure are RENDERED FROM THE REAL PDFs, not HTML replicas. Slower pipeline, but the picture on the landing is provably the document the product produces.
2. The completion report cover gets a redesign BEFORE anything photographs it (Task 2). The current cover is title plus eight meta rows and 80 percent white space. No asset built on it survives contact with a prospect.
3. The demo video v1 is captions-only, no voiceover: scripted screen recordings with title cards, 45 to 60 seconds. A voiceover needs the founder's voice or a budget decision; captions need neither and work muted on LinkedIn, which is where it will be watched.
4. Flat screenshots use a thin CSS-style browser chrome frame composed in sharp (rounded corners, top bar, shadow) rather than raw rectangles. Device-perspective mockups stay the founder's tool; the pipeline emits the flat masters he feeds into it.

---

### Task 1: The pipeline skeleton and the app screenshots

**Files:**
- Create: `scripts/marketing/shoot.mjs` (the driver)
- Create: `scripts/marketing/frames.mjs` (sharp composition helpers: browser chrome, phone rounding, shadows)
- Create: `assets/marketing/README.md` (what regenerates what)
- Modify: `package.json` (scripts: `"marketing:shoot": "node scripts/marketing/shoot.mjs"`)

**Interfaces:**
- Produces: `assets/marketing/raw/<name>@2x.png` flat masters and `assets/marketing/framed/<name>.png` framed versions, for every entry in the SHOTS table below.

**The SHOTS table** (name, actor, viewport, route, what must be visible):

| name | actor | viewport | route | must show |
|---|---|---|---|---|
| epc-dashboard | Marko session | 1600x1000 @2x | /sl/app/<kranj> | hero, 58 percent ring, tempo chart |
| epc-dashboard-day | Marko | 1600x1000 | same, scrolled to day feed | day cards with photos |
| portfolio | Marko | 1600x1000 | /sl/app | three capacity tiles, seven projects, schedule bars |
| crew-phone | crew session | 390x844 @3x | /sl/app/<kranj> | progress, report form, send button |
| crew-join | none | 390x844 | /sl/p/<crew token> | Prijava na gradbišče form |
| wizard-review | Marko | 1600x1000 | /sl/app/new after fixture upload | prefilled fields, roofs, material list |
| hours-countdown | Marko | 1600x1000 | /sl/app/<kranj>/hours | sheet with the six-day countdown |
| acceptance | Marko | 1600x1000 | /sl/app/<kranj>/final mid-acceptance | signature pads, penalty checkbox |
| settings-roster | Boštjan session | 1600x1000 | /sl/app/settings | crew roster, crew link card |

**Steps:**

- [ ] **Step 1:** `npx playwright install chromium` if no browser is present. Verify with a trivial `browser.newPage()` smoke run.
- [ ] **Step 2:** `npm run seed` for the clean staged state.
- [ ] **Step 3:** Write `shoot.mjs`: boots against `http://localhost:3000` (dev server must be running; the script checks and refuses with a clear message otherwise). Mints login tokens directly against the database exactly as the session's mint scripts already do, signs in by driving `/sl/auth/verify/<raw>` and submitting the confirm form, then walks the SHOTS table: `page.setViewportSize`, `page.goto`, wait for a selector proving the load (per-shot `readySelector`), `page.screenshot({ deviceScaleFactor })`. The wizard shot uploads `tests/fixtures/k2/k2-report-2025.pdf` through `setInputFiles`, which is the step a human file picker was needed for and Playwright is not.
- [ ] **Step 4:** Write `frames.mjs`: `frameBrowser(png)` composes a 1200-wide rounded card with a slim dark top bar and three dots plus a soft shadow on transparent background; `framePhone(png)` rounds corners with a thin bezel. Sharp only, no perspective.
- [ ] **Step 5:** Run the pipeline. Read EVERY produced PNG and check: correct screen, no dev overlays (DevSwapBar, scenario pill, logout pill must be hidden; shoot with a `?shot=1` marker? NO: hide by driving production-like state, DEMO_LOGIN off in the script env is not possible against the running dev server, so instead `shoot.mjs` sets a `belin-shot` cookie and the three dev pills return null when it is present; that gate lives beside the DEMO_LOGIN gates and is three one-line changes).
- [ ] **Step 6:** Commit: `feat(marketing): screenshot pipeline, every app surface from one command`.

### Task 2: The completion report cover earns its page

**Files:**
- Modify: `lib/pdf/completion.tsx` (cover only)
- Modify: `tests/pdf-completion.test.tsx` (cover assertions)

The cover currently renders the brand mark, the title, and a meta list, then nothing. It becomes the executive page a client actually files:

- Header band: BELIN mark, "Zaključno poročilo", project name, period.
- Meta grid as today (naročnik, izvajalec, lokacija, moč).
- A stats band of four tiles: število dni, skupaj režijskih ur, fotografij, zapletov. All four values already exist in `CompletionInput` or are derivable (`photos` summed across days).
- A registers summary table: hour sheets with count and total hours and status mix, change orders with count and summed amounts where priced, incidents with count. The data is already passed for the register pages; the cover reuses it.
- Footer: "Ustvarjeno v Belinu, getbelin.com" and the generation date, as on other documents.

**Steps:**

- [ ] **Step 1:** Extend the cover test first: page 1 text must contain "Skupaj režijskih ur", the day count, the register counts. Run, watch it fail on the summary pieces.
- [ ] **Step 2:** Implement the cover sections with the existing `styles` vocabulary from `lib/pdf/theme.tsx`. No new fonts, no color beyond the existing accents.
- [ ] **Step 3:** Render the seeded project's report through the app code (the `scripts/seed-documents.ts` machinery shows how), rasterize page 1 (Task 3 renderer), and LOOK at it. Iterate until the page reads as full without being crowded.
- [ ] **Step 4:** Full gates, commit: `feat(pdf): a completion report cover that carries the summary`.

### Task 3: PDF documents to page images

**Files:**
- Create: `scripts/marketing/pdf-shots.mjs`
- Create: `scripts/marketing/pdf-view.html` (tiny pdfjs viewer page)
- Modify: `package.json` (devDependency `pdfjs-dist`, script `"marketing:pdfs"`)

**Interfaces:**
- Consumes: the seeded, staged documents (naročilnica) plus documents generated by driving the app (completion report, abnahme, invoice) in Task 4's flow.
- Produces: `assets/marketing/docs/<doc>-p1@2x.png` for naročilnica, completion report, abnahme, invoice.

**Steps:**

- [ ] **Step 1:** `pdf-view.html`: loads `pdfjs-dist` from node_modules, takes a PDF via `postMessage` bytes, renders page N to a canvas at scale 3, signals done. `pdf-shots.mjs` opens it in Playwright, feeds each PDF (downloaded via signed URL with the service key, same as every verification script this session), screenshots the canvas element.
- [ ] **Step 2:** Rasterize all four documents, page 1, plus the completion report's best day page (photos and weather visible), since that page is the daily-loop proof.
- [ ] **Step 3:** Read every image. The abnahme must show the penalty sentence and both signature blocks; the invoice must show the reverse-charge note and no VAT row; the naročilnica must show the acceptance block with Boštjan Novak.
- [ ] **Step 4:** Commit.

### Task 4: One command end to end, and the demo walked by the machine

**Files:**
- Create: `scripts/marketing/run-demo-flow.mjs`
- Modify: `package.json`: `"marketing:all"` chains seed, shoot, demo flow, pdf shots, seed again.

The finalization chain (handover, acceptance with defect and signatures, invoice) is driven by Playwright exactly as I drove it by hand on production earlier: Boštjan requests handover, Marko generates the report, conducts the acceptance with the staged defect text and both signature scribbles (pointer event sequences, already proven to work), Boštjan generates the invoice. Then `pdf-shots` captures, then a final `npm run seed` returns the demo to its clean state. The whole asset set regenerates with `npm run marketing:all` and leaves no trace.

- [ ] Implement, run end to end twice (idempotence proof), verify the demo is clean after (status active, no acceptances, no invoices, the same query used all session).
- [ ] Commit.

### Task 5: The landing page, rebuilt on real assets

**Files:**
- Modify: `components/landing/Story.tsx`, `app/globals.css`, `public/landing/*`

Composition, using what exists:

1. Hero: the founder's laptop mockup (canon) on the dark ground, headline unchanged.
2. Section 01 plan-in: `wizard-review` framed shot.
3. Section 02 daily loop: the founder's angled phone mockup beside the framed `epc-dashboard`, as laid out now, plus the `crew-join` shot small with the caption that joining is typing your name and email once.
4. Section 03 truth moments: `hours-countdown` framed shot replaces one text card's emptiness (cards keep text, the section gains the image).
5. Section 04 paperwork: the three real document page images in the existing A4 slots, finally.
6. WebP everything, true aspect ratios, verified at 1440 and 375 with the measured-geometry checks used all session.

- [ ] Implement, verify, commit, deploy, verify on production.

### Task 6: The pitch PDF brochure

**Files:**
- Create: `lib/pdf/brochure.tsx` (a @react-pdf document, A4 landscape, 4 pages)
- Create: `scripts/marketing/brochure.mjs` (renders it with embedded asset PNGs)
- Output: `assets/marketing/belin-predstavitev.pdf`

Four pages, Slovenian:
1. Cover: mark, one sentence of what Belin is, the laptop mockup, getbelin.com.
2. The problem and the loop: WhatsApp-and-Excel pain in three lines, the crew phone and dashboard images, the 30-second claim.
3. The moments that cost money: countdown, incidents, material check, with the hours shot and the three truth statements.
4. The paperwork: three document thumbnails, the compliance strip lines (A1, Freistellungsbescheinigung, reverse charge, EU data), contact block.

Built with the same theme.tsx engine, so the German version later is a locale switch plus the translation pass, not a redesign. Images embed as PNG at 2x.

- [ ] Implement, render, READ every page, iterate on density, commit.

### Task 7: The demo video, captions-only v1

**Files:**
- Create: `scripts/marketing/video-takes.mjs` (Playwright with `recordVideo`, one take per scene)
- Create: `scripts/marketing/video-cut.mjs` (ffmpeg-static: trim takes, splice, title cards, end card)
- Create: `docs/marketing/2026-08-13-video-storyboard.md`
- Output: `assets/marketing/belin-demo-45s.mp4` (1080p) and a 9x16 crop of the crew scene

Storyboard, 45 seconds:
1. 0-4s title card: "Vsak dan na strehi, dokumentiran." on the dark ground with the mark.
2. 4-14s crew phone take: join screen appears, then the report: quantities tapped, photo added, Pošlji poročilo. Caption: "Ekipa poroča v 30 sekundah."
3. 14-24s dashboard take: the EPC dashboard, the new report appearing in the feed (two browser contexts in one take, the same live-update proof driven earlier). Caption: "Naročnik vidi v živo."
4. 24-36s money take: the hours countdown, approve; the acceptance signatures. Caption: "Ure, prevzem, podpisi. Brez papirja."
5. 36-45s documents take: the three PDFs fanned (a slow pan over the composed image), end card: mark, getbelin.com. Caption: "Papirologija? Narejena."

- [ ] Implement takes, cut, WATCH the result (ffprobe duration checks plus frame extraction at scene boundaries, Read the frames), iterate once, commit the scripts and storyboard. The mp4 itself: committed under assets/ (small at 45s/1080p) so the founder always has the current cut.

### Task 8: Close out

- [ ] CHANGELOG (the pipeline, the cover redesign, both devDependencies, the founder-as-robot process failure this replaces), DECISIONS (assets regenerate from the product; documents photographed, never mocked), session log, task list cleanup.
- [ ] Tell the founder exactly which optional mockup passes remain HIS if he wants them (feeding new flat masters through his mockup tool for extra angled shots), with the file list. Nothing blocks on it.

## What I need from the founder

Nothing to produce any of this. Optional, later: his mockup tool passes over new flat masters, and a voiceover if the video should ever speak.
