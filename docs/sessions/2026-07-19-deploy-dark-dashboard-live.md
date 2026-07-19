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

## Next

1. Founder opens the live URL on a phone and confirms the ring animates to 58
   percent and the dark hero reads well outdoors.
2. Continue phase 1b on main, deploying each segment live as it lands: projection
   line, scope, stats, live panel, daily log, gallery.
3. Still open from earlier sessions: rotate the exposed Supabase service_role key
   before the 27.07 German pilot, and reset the demo seed before showing it.

## Live links

- EPC dashboard: https://belin-app.vercel.app/sl/p/demo-epc-k7m2x9q4
- Crew view: https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1
- German and English: swap /sl/ for /de/ or /en/.
