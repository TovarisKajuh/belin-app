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

## Part three: founder found a shipped bug, and the chart was rebuilt

The founder opened it on their phone and reported two things. Both were real.

### 1. The scope progress bars never rendered (my bug)

Track and fill are both `<span>`. The track is a direct child of the
`display:grid` row, so it was blockified and its grey background showed. The
fill sits one level deeper, so it stayed `display:inline`, and inline elements
silently ignore `width` and `height`. Every fill rendered 0 by 0, including the
100 percent one. Ported straight from the mockup, which carries the same latent
flaw.

**Why I missed it.** I "verified" that screen by reading the page text, checking
`gridTemplateColumns`, and confirming no console errors. All passed. I never
measured the one element whose entire job is to have a width. Saved as an
auto-memory: measure the rendered geometry of the element that carries the
value, not the container or the text.

Fixed with `display:block` plus an amber to gold gradient and a soft glow.
Verified by measurement: 100/46/25 percent render 714/329/179 px against a
714 px track on desktop, and 286/131/71 against 286 on a phone.

### 2. The projection chart was clunky and did not reflect current progress

Three separate causes, only one of them cosmetic.

- **It was being squashed.** Drawn into a fixed 800 wide viewBox and then
  stretched to fit, so on a phone it compressed about 3x horizontally while the
  vertical stayed 1:1. Gentle slopes became steep steps, and the chart looked
  different on every screen size. It now measures its container and draws at
  true pixel size. Verified 1:1 at both 375 px and 1265 px.
- **Wrong smoothing algorithm.** The first version clamped control point
  positions to stop the curve overstating progress. That worked, but it
  flattened the curve at every data point into a staircase, which is exactly
  what read as rigid. Replaced with monotone cubic interpolation
  (Fritsch-Carlson, what d3 calls `curveMonotoneX`), which constrains the
  tangents instead. Genuinely fluid, and still provably unable to overshoot, so
  it remains impossible to draw progress that was never reported. Fluid and
  honest turned out not to be a tradeoff: the better algorithm gives both.
- **The line really did stop short of today.** Last report Friday, viewed
  Sunday. Cumulative progress is a step function, so the value today is still
  the current percent. The line now carries flat to today and the forecast
  starts from there instead of from a stale point.

Visual craft added per the founder's reference screenshots: gradient stroke, a
blurred copy of the stroke underneath for glow, a vertical gradient area fill, a
fading dashed forecast, and a pulsing halo on the current-value dot.

### A regression I caught in my own fix

I had animated the bar fill with a grow-from-zero keyframe and `fill-mode:
both`. That renders the bar at zero width until the animation actually runs, so
any throttled or blocked animation makes it invisible: precisely the bug being
fixed. Removed. Rule taken from it: anything that carries a number must be
correct with no motion at all.

### A wrong conclusion I nearly recorded

A browser probe reported the curve was not monotone. It was invalid: it compared
raw numbers parsed out of the path string, which include Bezier control points,
not points on the curve. Re-checked properly by sampling 301 points along the
rendered path with `getPointAtLength`: zero backward steps in x or y on real
data. Parse the geometry, not the markup.

### Known limitation, stated plainly

The chart re-measures on resize via ResizeObserver plus a window resize
listener, but this preview changes the viewport without dispatching resize
events and starves ResizeObserver. So only the mount path is verified here
(correct at phone and desktop widths on fresh loads). Live resize and device
rotation use two standard mechanisms and should work on real hardware, but I
have not proven them.

## Part four: the chart rebuild I should have done the first time

The founder sent three reference screenshots of high quality charts and asked how
those are made. I answered the engineering question (interpolation, distortion)
and ignored the design one, shipping a tweaked version of my own thin line. They
called it out, correctly and bluntly.

**The honest gap**, measured against the references rather than argued about:
thick luminous strokes vs my 3.2px hairline; full axes (JAN..DEC, 0..500k) vs my
three lonely labels; deep layered gradient fills vs a faint wash; a scrub
interaction with a value readout vs nothing; a centrepiece vs a 180px strip.

**Process failure, the root cause.** This environment has a `dataviz` skill that
says in its own text to load it before writing the first line of chart code. I
wrote two chart versions without loading it. Loading it changed the design
materially, so this was not a formality I skipped, it was the step that would
have prevented the miss.

What the skill changed:
- The hover layer is part of the deliverable, not an upgrade. That is exactly the
  missing piece from the founder's screenshot 4.
- Dashed gridlines are an anti-pattern (dashing reads as a threshold). The grid
  is now solid hairlines; only the today and deadline markers stay dashed,
  because those genuinely are thresholds.
- The container must include the x-axis band so labels are never clipped.
- It killed an idea before I built it: I was about to add daily-gain bars behind
  the line to echo the bar reference. Daily gain and cumulative percent need
  different y-scales, which is a dual-axis chart, the single worst listed
  anti-pattern, because the alignment of the two scales is arbitrary and invents
  a correlation that is not in the data. One series, drawn well, instead.

**What shipped:** 400px tall on desktop, 230px on a phone; y-axis 0/25/50/75/100;
x-axis of evenly spaced date ticks across the whole span (8 / 6 / 4 by width); a
4.5px three-stop gradient stroke over a 10px blurred copy for the glow; a
three-stop area gradient; and the scrub layer. Pointer or touch anywhere on the
plot snaps a crosshair to the nearest reported day and reads out that day's exact
percent, date and gain over the previous report. Arrow keys walk the days,
Escape clears, and the readout flips side near the right edge.

**Palette computed, not eyeballed.** Ran the validator. Contrast passes on the
dark surface. The reported lightness failure is against the validator's own
reference surface (#1a1a19), while ours is far darker navy (#0b1524), so brighter
marks are correct. One genuine finding: the ahead-of-schedule green and the
behind-schedule orange are deltaE 8.6 apart under protanopia, which is inside the
band that is legal only with secondary encoding. They already carry different
words, so colour is never the sole signal. The badge must keep its text label.

**A German-only bug the rebuild exposed.** The stat tiles overflowed the phone
viewport by 4px in German only. A plain `1fr` grid track cannot shrink below its
content's minimum width, so the unbreakable compound "Baustellendokumentation"
pushed the grid off screen. Fixed with `minmax(0, 1fr)` plus wrapping on the long
labels, applied to the scope grid too. Slovenian and English never showed it,
which is the argument for checking every locale at phone width, not just one.

**Verification note.** A synthetic `pointerleave` suggested the tooltip did not
clear. It was an artifact: React synthesises leave from `pointerout`. Dispatching
`pointerout` with a relatedTarget confirmed it clears correctly. Second time this
session that a naive probe produced a false alarm, so: drive the event the way
the framework actually listens for it.

## Part five: research first, then rebuild (the founder's correction of my method)

The founder's diagnosis was sharper than mine: I was iterating on my own
artifact instead of questioning whether the artifact was the right starting
point. Their instruction: study the reference designs, search the web for how
modern apps actually build these graphs, find code to learn from, plan, then
execute.

Ran a 7-angle research workflow (app teardowns, curve mathematics, SVG effect
recipes, library landscape, scrub interaction, animation, visual design) plus a
synthesis pass, ~490k tokens of agent work, all sources cited in
docs/superpowers/plans/2026-07-19-hero-projection-chart.md.

**The humbling and useful result**: the industry does NOT use some exotic
renderer. Coinbase documents its charts as SVG + D3 in its public design
system. Robinhood hand-rolls tiny custom views (their Spark library brags about
being 15KB). The Canvas threshold is ~1k points; we have ~30. recharts costs
145KB gzip; hand-rolled costs zero. So my renderer choice was right all along,
and the founder's dissatisfaction was fully explained by four wrong details:
the glow technique (blur filter, a documented mobile frame-killer), the
gradient plumbing (objectBoundingBox collapses on flat segments), the
interaction (a flipping tooltip and per-move React state instead of the
Robinhood glide with direct DOM writes), and the composition (card box, y-axis
labels, cramped height, instead of full-bleed, no y labels, big fixed readout).

All four rebuilt per research. Two researched techniques rejected with reasons
logged in the CHANGELOG (the Coinbase entrance wipe, and Catmull-Rom on the
actual line).

**Verified by driving it**: scrub at three positions and keyboard stepping at
375px and 1265px in sl, de and en. The dot glides with interpolated y between
samples; the readout snaps to real reported days with locale decimal commas;
past-the-end clamps to today; release and Escape restore; aria-live announces
keyboard steps; zero filter elements in the DOM; both gradients userSpaceOnUse;
no overflow anywhere; no console errors; 55 tests, tsc and build clean.

**Method lesson saved to memory**: when the founder rejects work and provides
references, the first move is research into how the referenced results are
actually produced, not another iteration on my own output. The scrub's timeout
backstop also proved its worth immediately: the whole interaction verified in a
throttled preview tab where rAF alone would have been silent.

## Part six: the chart became a tempo chart

The founder proposed removing the projection line and the buffer band and
turning the graph into a tempo view (percent done per day, working day 1 to N),
then asked whether that was right or whether something better existed. Three
research agents ran: construction reporting standards, pace-chart patterns and
failure modes, and bar-and-threshold visual craft.

**The instinct was right, with hard evidence.** MeasuringU ran two controlled
studies (n=50, n=51) asking people to judge rate of change from cumulative
versus per-period charts of identical data. Cumulative was misread 82 to 88
percent of the time, and the direction of the read flipped entirely: shown
cumulative, most read "increase"; shown the same data daily, most read "rapid
decrease". Respondents were equally confident in both and not equally accurate.
Combined with the fact that the curve duplicated the hero percentage directly
above it, the cumulative chart was both redundant and actively misleading for
the one question it was there to answer.

**It is also the construction standard.** Incremental quantity as bars is the
canonical project-controls pairing, and a solar-specific source describes crews
reporting daily module, post and row counts feeding exactly these charts. The
founder reinvented the industry convention from first principles.

**The rule that shaped the implementation most:** plot per WORKING day and never
draw a non-working day. A zero bar accuses the crew of idling, so a weekend must
never be drawn as one. That forced three genuinely distinct states into the data
layer, all tested: reported zero (crew present, nothing installed) gets a
deliberate flat 3px stub, missing report gets no bar at all, non-working day is
absent from the axis. The trailing mean skips missing reports rather than
averaging them as zero, which would manufacture a slowdown that never happened.

**Chosen against the research's own top pick.** Both pace agents ranked a
days-ahead/behind delta chart first, and it is genuinely elegant: one line, zero
baseline, position answers "fast enough" and slope answers "improving or
degrading". The founder was shown it as a real option with their own numbers
(+0.9 to +9.1 days) and chose tempo bars. That is the right call for this
product: Belin exists to document what a subcontractor did on a given day, and a
bar keeps a weak Tuesday visible and inspectable where a delta line abstracts it
into a curve.

**The payoff, visible immediately.** With no prompting, the live readout says
"tempo pada" (pace falling). The last three reported days are 8.5, 5.1, 4.6
against a required 3.2. Every bar still clears the line, so the project is
comfortably ahead, and the pace is degrading. Both facts are true, both matter,
and the old cumulative curve showed neither.

**Craft notes worth keeping:** bar at 72 percent of slot, 3px top-only radius
clamped to half the bar, y anchored at zero because bar length is the encoding,
threshold dashed and thinner than the bars at about half their contrast so bars
read as figure and the line as reference, and always numerically labelled since
a colour-only threshold fails WCAG 1.4.1. Colouring bars above/below the line
with a second hue was rejected: position already encodes it, and red/green is
the worst possible pair for colour vision deficiency.

**Verification lesson, third time this session.** Hovering the per-bar hit rects
appeared to do nothing. It was the same synthetic-event artifact as before:
React synthesises pointerenter from pointerover. Rather than test around it, the
interaction was refactored to a single surface with pointermove that divides x
by the slot width, which is both verifiable here and better on a phone, since a
finger can drag across days instead of needing to land on a 3px bar.

Dead code from the old chart was removed rather than left behind:
buildProjectionChart, areaPath, nearestIndex, isoFromDays, daysSinceEpoch and
their tests.

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
