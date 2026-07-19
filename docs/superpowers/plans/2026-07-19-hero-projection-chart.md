# Hero projection chart, rebuilt from research

The founder rejected two hand-rolled attempts as clunky and rigid and directed:
study the reference designs, search the web for how modern apps actually build
these graphs, plan, then execute. Seven research agents covered app teardowns,
curve math, SVG effects, libraries, scrub interaction, animation and visual
design; a synthesis agent merged them. This is the distilled plan.

## What the industry actually does (the verdict)

- **Coinbase**: SVG + D3, documented in their design system. Gradient area
  fills interpolated in sRGB, dotted projection lines, a first-class Scrubber
  component, clip-path enter animation.
- **Robinhood**: hand-rolls tiny custom chart views (their open-source Spark is
  15KB, "95% smaller than other charting libraries"). The glow is a blurred
  duplicate of the line. Sparklines drawn deliberately without axes.
- **Strava**: D3. **Apple Health**: LineMark + vertical gradient area, same recipe.
- **SVG vs Canvas**: the practitioner threshold is ~1k points (Apache ECharts
  handbook). We have ~30. SVG wins below it: less memory on low-end Android,
  crisp at any zoom, server-renderable.
- **Libraries**: recharts is 145KB gzip vs 5.7KB for d3-shape geometry alone
  (bundlephobia). For ONE hero line, every teardown points the same way:
  hand-roll the SVG, keep library code at zero.

So the founder's instinct was right that the answer is a specific known craft;
it is also the craft we were closest to, executed with the wrong details. The
fundamentals to change are the glow technique, the interaction loop, the
composition, and the axis philosophy, not the renderer.

## Decisions

1. **Renderer**: SVG in the existing client component, zero new dependencies.
   Data stays server-fetched. (Coinbase/Robinhood/Strava pattern.)
2. **Curve**: keep the tested monotone generator for the actual line. D3's own
   docs mark monotone as the only no-overshoot guarantee; on cumulative
   progress an overshoot reads as invented progress. Sanctioned escape hatch if
   the founder still finds it stiff on the phone: curveBumpX semantics (also
   zero vertical overshoot), never Catmull-Rom on the actual line. Forecast
   continues from the last actual point so there is no tangent seam.
3. **Glow**: kill feGaussianBlur (measured ~250ms paints on mobile in the
   wild; the classic frame-killer). Use the layered-stroke glow: the same path
   4 times, widths 12/7/3.5/2.75, opacities .06/.12/.22/1. Pure geometry
   rasterization, safe on weak GPUs.
4. **Gradients**: one shared linearGradient with gradientUnits=userSpaceOnUse
   spanning the plot width, referenced by every stroked layer (objectBoundingBox
   collapses on flat segments, an MDN-documented trap). Warm amber to bright
   gold left to right so the line reads as lit toward now. Area: vertical
   alpha fade of gold (.30/.10/0), never fading to a solid dark hex.
5. **Entrance**: NO clip-path wipe, deliberately, despite it being Coinbase's
   signature. Two reasons from our own environment: SSR paints the chart before
   hydration, so a wipe replays over already-visible content on slow LTE; and
   any animation that starts from hidden freezes at hidden in throttled tabs,
   which is the exact class of bug as the invisible bars. Rule: anything that
   carries information must be correct with animations frozen. Motion budget:
   the existing scroll reveal, a breathing halo on the live dot (pure CSS,
   every frame a valid state), and the scrub.
6. **Scrub**: the Robinhood glide. Pre-sample the rendered path once into a
   Float32Array (one sample per px, rebuilt on resize), binary-search it on
   pointer x, and write dot/hairline transforms directly to the DOM through
   refs inside a single rAF (with a short timeout backstop so throttled tabs
   still respond). No React state during the gesture. The dot glides along the
   curve; the value readout snaps to the nearest reported day, so shown numbers
   are always real reported values. setPointerCapture, pointercancel handled
   like pointerup, touch-action: pan-y so the page still scrolls vertically.
7. **Readout**: the floating flip tooltip is removed (a tooltip flipping sides
   mid-drag is a clunkiness source). A fixed readout slot above the plot shows
   the current percent large; during scrub it swaps to the scrubbed day's
   value, date and gain, and reverts on release. Tabular lining figures with a
   fixed decimal so the number never changes width.
8. **Composition**: chart becomes borderless (no card box), sitting directly
   on the navy with a faint static gold radial behind it. Y-axis labels dropped
   entirely (the Robinhood idiom; values are recoverable via readout, scrub and
   the table-like daily log below). Exactly 3 solid hairline gridlines. 3 to 5
   sparse date labels. Today and deadline markers stay (product meaning),
   deadline one step quieter. Height ~max(220, min(360, width*0.5)).
9. **Keyboard and a11y**: keep the tab stop and arrow stepping, add Home/End,
   Escape clears, aria-live polite readout announcing date and percent on
   keyboard steps. role=img aria-label stays.

## Kept from the previous version (verified right by research)

Server-fetched real data as props; i18n for every string; single y-domain (no
dual axis); container-measured sizing with ResizeObserver + resize fallback;
snap-to-reported-day honesty; one transparent full-plot pointer surface;
monotone path generator with its 15 unit tests; reduced-motion collapsing to
the finished chart.

## Risks the research flagged, and preventions

- Glow janks mobile -> no filter elements at all, layered strokes only.
- Scrub lag -> no setState per move; rAF-coalesced direct DOM writes.
- Stuck crosshair on browser-reclaimed gestures -> pointercancel == pointerup.
- Gradient collapse on flat segments -> userSpaceOnUse everywhere.
- Readout jitter -> tabular nums, fixed decimals, fixed slot.
- Stale sample table after rotate -> rebuild in the same ResizeObserver callback.
- Over-decoration creep -> hard rules: no y labels, 3 gridlines, no plot border.

## Sources (the ones that decided things)

- Coinbase Design System chart docs (SVG+D3, gradient areas, scrubber)
- Robinhood Engineering "Introducing Spark" + RHLinePlot reverse-engineering
- Apache ECharts handbook, Canvas vs SVG thresholds
- D3 curve documentation (monotone guarantee, centripetal Catmull-Rom)
- Visual Cinnamon glow filter caveats; jankfree.org filter cost measurements
- Mike Bostock closestPoint; Codrops path-sampling pattern
- MDN touch-action and setPointerCapture; Motion Tricks dashed-line trap
- Josh Comeau CSS linear() springs; Emil Kowalski clip-path performance
