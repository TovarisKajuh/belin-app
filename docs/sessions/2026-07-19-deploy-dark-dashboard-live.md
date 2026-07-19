# Session 2026-07-19: deploy the dark dashboard live and public

## What the founder asked

"continuing with 1b. deploying to vercel. go, so we see it on mobile"

That is the fix for yesterday's failure: get the dark EPC dashboard onto
production at belin-app.vercel.app, publicly, so it opens on a phone with no
login.

## Done

- Read the context first (CLAUDE.md, CHANGELOG, the 2026-07-18 session log),
  which carried the explicit rule: live means production, public, no auth wall.
- Pre-merge verification, before touching main:
  - `npm run lint` (tsc --noEmit) clean.
  - `npm test`: 36 tests pass across 8 files.
  - Checked the live Frankfurt database actually has the branch's migration
    (planned_start and planned_end exist on projects, both nullable dates), so
    production would not break on missing columns.
  - Checked the live database holds the enriched seed: 9 daily entries across 9
    distinct days, planned 2026-07-07 to 2026-08-18, project active.
- Merged feat/dark-epc-dashboard into main as a clean fast-forward (9 commits,
  20 files, +1363 / -87) and pushed to origin.
- Vercel auto-deployed commit 17c7240 to target production, state READY, aliased
  to belin-app.vercel.app.

## Verified live (evidence, not assumption)

- Unauthenticated curl, no cookies: HTTP 200, 43856 bytes, zero matches for any
  auth-wall marker (vercel_sso, Authentication Required, Log in to Vercel).
- All six combinations return HTTP 200: sl, de, en times the epc and sub tokens.
  The three EPC pages contain the `epc-dark` root; the three sub pages do not,
  which is correct because the dark theme is deliberately scoped to the EPC side
  and the crew view stays light.
- A bad token returns a clean 404, not an auth wall.
- Live Slovenian dashboard content, read from the deployed page: BELIN command
  bar, status Aktivno, PSE Trgovski center Kranj, 245.7 kWp, AVESOL d.o.o.,
  tempo 5.9 %/dan, predviden zakljucek 29.07, 6 na terenu, and "izracunano iz 9
  porocil in 6 fotografij". Real seeded data, not placeholders.
- At 375px: no console errors, no horizontal overflow (scrollWidth equals
  clientWidth equals 375), dark root present, warm white text.

## Learned (environment quirk, worth remembering)

The preview browser tab is backgrounded, so it throttles both
requestAnimationFrame and CSS animations. Consequence: the hero ring reads 0
percent with an undrawn arc in the preview, which looks like a data bug and is
not one.

- The count-up starts at `useState(0)` and only advances via rAF.
- The arc starts at stroke-dashoffset 596.9 (the full circumference, empty).
- The true value is server-rendered as an inline CSS variable:
  `--e-arc-offset: 248.907`, which against a 596.9 circumference is 58.3 percent.
- The keyframe is `@keyframes epc-draw { to { stroke-dashoffset: var(--e-arc-offset); } }`
  with `forwards`, so the final state persists.

So on a real device the arc draws to 58.3 percent and the number counts up to 58,
and both stay. This was confirmed statically because this environment cannot run
the animation. The founder confirms the motion on a real phone. Same quirk was
already hit with BelinSplash on 2026-07-17; screenshots also time out for the
same reason, so text-based verification (get_page_text, computed styles, curl)
is the reliable path here.

## Failed

- `computer screenshot` timed out twice against the live site. Not a site
  problem: `javascript_tool` and `get_page_text` both responded fine on the same
  tab. Same backgrounded-renderer quirk. Worked around with text-based checks
  rather than burning more time on pixels.

## Succeeded

Yesterday's failure is corrected. The dashboard is live and public at
belin-app.vercel.app with no login, and the founder can open it on a phone.

## Part two: completed the whole dashboard

The founder saw the deploy, said it was only the first part, and asked for all of
it. Built plan tasks 8 to 13 in one pass.

- `lib/dashboard-shared.ts` (new, pure, 12 unit tests): date formatting, the
  quantity summary, Catmull-Rom path smoothing, and the projection chart
  geometry. The chart math is the piece most likely to hide an off-by-one or a
  divide-by-zero, so it is tested rather than eyeballed. Tests cover the empty
  history, the single-point case, the one-day domain (divide by zero), x
  monotonicity, and the buffer band only appearing when the forecast beats the
  deadline.
- Exposed `history` on `EpcDashboardData`. The data layer already computed the
  cumulative progress curve for the projection but never returned it, so the
  chart had nothing real to draw.
- Six new components: `ProjectionPanel`, `ScopeByPhase`, `StatRow`,
  `LatestOnSite`, `DailyLogFeed`, `PhotoGallery` (client, lightbox), plus
  `RevealController`.
- 8 new i18n keys in all three languages (stat sub-labels, empty states,
  lightbox aria labels, footer).

### Two judgement calls worth recording

1. **The mockup had a real rendering defect.** Its chart SVG stretches
   non-uniformly to the panel width (`preserveAspectRatio="none"`), which
   distorts any text drawn inside it and turns the round marker dot into an
   ellipse. Rather than port that faithfully, geometry stays in the SVG and the
   labels and dot became HTML positioned in percent of the same 0 to 800 domain,
   with `non-scaling-stroke` for even stroke weight. Same approved design, crisp
   and translatable at every width.
2. **The forecast line is straight, not curved.** The mockup drew a graceful
   curve. The rate model is a linear extrapolation, so a curve would imply
   precision the data does not support. The actual-progress curve is smoothed,
   but its control points are clamped inside each segment so the smoothing can
   never bulge above a reported value and imply progress that was never logged.
   That clamp has its own test. This dashboard is evidence an EPC may lean on in
   a dispute, so the drawing should not overstate the data.

### Verified in the dev preview

- All three locales render every segment. German and English checked key by key
  (panel title, badge, today and deadline labels, stat labels and sub-labels,
  live panel, feed, footer).
- 375px: zero horizontal overflow, no offending elements, 6 of 6 reveal sections
  shown, all 15 signed photo URLs loaded.
- 1265px: hero two columns (616 / 456), scope rows four columns, stats four
  columns, gallery six columns, dot inside the plot, no overflow.
- Lightbox: opens, "next" advances to a different photo and stays open, Escape
  closes and restores page scroll, aria labels localized.
- Crew view unchanged: light background, zero dark classes, no console errors.
- tsc clean, 48 tests pass, production build succeeds.
- Scope item names and crew notes stay Slovenian in the German and English views.
  That is intended: they are project data, not UI strings.

### One thing that briefly looked like a bug

A lightbox probe returned nothing and looked like "next closes the lightbox". It
was not: the preview tab had drifted to `/sl` between probes, so the selectors
found no gallery. Re-tested atomically in a single probe with waits between
steps and the lightbox behaved correctly. Worth remembering: in this preview,
verify interaction sequences inside one probe rather than across several.

## Next

1. Founder reviews the full dashboard live on a phone. The ring count-up and the
   arc draw still need a real device to confirm (see the quirk above).
2. Then: plan the sub (crew) side and restyle it, which the founder wants next.
   The dark theme is deliberately scoped to `.epc-dark`, so the crew view can be
   redesigned without touching the EPC side.
3. Deferred and still open: realtime crew to EPC sync, the material-check gate,
   rotating the exposed Supabase service_role key before the 27.07 German pilot,
   and resetting the demo seed before a live showing.

## Live links

- EPC dashboard: https://belin-app.vercel.app/sl/p/demo-epc-k7m2x9q4
- Crew view: https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1
- German and English: swap /sl/ for /de/ or /en/.
