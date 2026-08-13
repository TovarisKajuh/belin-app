# Session, 2026-08-13 (second session): the landing, the roof tabs, the video, the ship list

Ran on Opus, from a plan written on Fable earlier the same day
(`docs/superpowers/plans/2026-08-13-papirologija-tabs-video-ship.md`), executed
autonomously while the founder was away.

## Done

1. **The hero, on the founder's mockups.** His two exports arrived with the
   transparency checkerboard painted into the pixels and a vertical gradient
   over it on the phone. A new `cutout.mjs` learns the two tones per row from
   the margins, flood fills, and un-composites the antialiased fringe so no pale
   halo survives on a dark page. Login moved to `/[locale]/login` behind one
   gold button; eight guarded routes now bounce there with their `next`.
2. **Section 04, the three documents.** A `paper` renderer joins the device
   mockups: crop to the top 65 percent, fade the cut edge with a CSS mask, tilt
   in 3D, capture with `omitBackground`. Born transparent. The section went full
   width so the sheets read at 406 and 451px instead of 250.
3. **The roof tab bar.** Pregled, Poročaj (default, raised gold camera),
   Dnevnik, Ure. Routes, not client state. Dnevnik is a new read-only screen on
   a new `lib/data/diary.ts`.
4. **The translation debt, cleared** (35 strings) and a test that fails on the
   next one.
5. **The share card** and per-locale metadata.
6. **`start_url: "/app"`** and the **seed tripwire**.
7. **The 40 second demo video**, five scenes, plus a 9x16 crop, plus a
   storyboard doc that answers how app companies usually make these and why this
   repo does it differently.
8. The headline the founder sent mid-session, applied to the hero, the share
   card and the video end card, with the typography rebuilt around it.

## Learned

- **A cookie check in a server-rendered component can break hydration
  silently.** Server rendered the splash, client rendered null, React kept the
  server DOM, nothing on the page was interactive, and no console error was
  raised. The symptom that gave it away was the splash sitting at opacity 1
  forever instead of animating.
- **`elementFromPoint` needs the splash waited out.** Five "COVERED" results
  that looked like a z-index disaster were the launch overlay, in both dev and
  production. Always wait for the app before hit-testing.
- **Metadata and generateMetadata cannot both be exported** from one file, so a
  per-locale share card means folding the static half into a plain constant.
- **A guard that cries wolf gets deleted.** The seed tripwire found a real
  non-demo org on its first run, which turned out to be the founder's own
  account; hard-refusing on it would have trained him to pass the override flag
  every time.
- **Rotation signs are worth rendering twice.** The document fan splayed outward
  on the first attempt and read as three separate objects.

## Failed, then fixed

- The submit bar sat 7px under the tab bar: two hard-coded heights that
  disagreed, now one variable.
- The hours tab had no bar, so it was a dead end.
- The sub office boss could reach the crew tab routes, where Poročaj would have
  landed him on his own office view.
- The first video cut put a caption plate over the submit button and the tab bar
  in the portrait scene; the phone moved right and the caption became a headline
  in the empty third.
- The OG card and the video end card both needed retypesetting after the
  headline change, and the hero needed 46px instead of 58.

## Next

- **Impressum and Datenschutzerklärung**, and the custom domain: both explicitly
  deferred by the founder this session, both blockers for German outreach.
- The pitch PDF brochure (task 6 of the marketing plan) is still unbuilt.
- Resend deliverability (SPF, DKIM, DMARC) unverified.
- The service_role key is still the one screenshotted into a chat, knowingly.
- The demo and any future pilot still share one Supabase project. The tripwire
  buys time; a separate project is the fix.
