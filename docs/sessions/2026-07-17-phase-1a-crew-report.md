# Session log: 2026-07-17 (night), phase 1a crew report flow

## What was done

- Executed the phase 1a plan end to end: the crew Tagesbericht screen is built and verified. Photos (camera input, in-browser downscale, direct-to-storage signed uploads), headcount and per-scope-item quantity steppers, note, automatic weather snapshot, sticky submit, today's entries list, computed progress header.
- /p/[token] became a role router: sub token opens the crew screen, epc token keeps the phase 0 summary until the 1b dashboard.
- Dev-only party swap bar added (founder request): a pinned DEV pill jumps between the connected EPC and crew views of the same project. Removal before launch is logged as debt.
- Responsive rule now global (founder decision): both account views built for phone and laptop.
- Verified end to end in the preview browser: submit wrote entry, quantities, weather (clear, 29.3 C, live from Open-Meteo) and activity to Frankfurt; progress recomputed 6.3 to 9.4 percent exactly per the formula; EPC view reflects the crew submission; three languages; phone and laptop layouts; photo signed-URL path proven by script including the privacy check (publishable key cannot list the private bucket).
- Two real bugs found by verification and fixed: stale-closure stepper swallowed rapid taps (now ref-accumulated), and the dev pill covered the submit button on phones (raised above the bar).

## What we learned

- The preview pane's synthetic ref clicks are unreliable on fixed-position elements in this environment (clicks reported success but never landed; page-level JS clicks work). Screenshots also time out. Verification strategy that works here: read_page and get_page_text for content, javascript_tool for interaction and layout probes (elementFromPoint proved the overlap bug), server logs for the POST, SQL for the persisted truth, and real-device checks by the founder on the live URL.
- The Next dev server's incremental cache corrupts after heavy file churn ("Cannot find module ./vendor-chunks/...js"). Cure: stop server, delete .next, restart. Not a code bug; production builds are unaffected.
- Stale-closure state updates are a genuine field risk for tap-heavy UIs (gloves, cold, hurry). Steppers and similar controls must accumulate through a ref or functional updates. This lesson applies to every future crew control.
- vitest cannot import server-only modules; pure logic must live in shared files (reports-shared.ts now, actor-shared.ts before). Bake this into future plans instead of rediscovering it.

## Where we failed

- The plan placed summarizeTodayPosts inside the server-only module despite phase 0 having taught exactly this; the test run caught it immediately and the split matches the established pattern now.
- First E2E interaction attempt was derailed by a dev-cache 500 and by trusting pane ref-clicks; roughly 20 minutes lost before switching to the JS-based verification strategy.

## Where we succeeded

- The founder's differentiator works visibly: a crew entry of 30 modules moved computed progress from 6.3 to exactly 9.4 percent, and the EPC side shows it. Progress as evidence, working, on real infrastructure.
- The security model held up under an explicit probe: deny-all RLS plus server-minted signed URLs means the browser key can upload only what it was permitted to and can read nothing.
- Careful verification paid for itself twice over (two real bugs that unit tests could never catch).

## Follow-ups (open)

1. Founder real-phone test of the crew flow on the live URL, including the camera picker (the one piece automation cannot exercise).
2. Reset the demo project's daily_entries before the Monday demo (test entry from today is in the data).
3. Standing items: rotate the service_role key before 27.07, rotate demo tokens before real data, custom domain, dev swap bar removal at launch.

## Founder feedback round (same night, after the real-phone test)

The founder's phone test found the one thing automation could not: some phone photo formats silently crashed the in-browser downscale (createImageBitmap rejects HEIC and friends), so those photos never uploaded, while other photos uploaded fine but had no UI showing them anywhere. Fixed the decode with an img-element fallback, made upload failures loud and non-poisoning, and added signed-URL thumbnails to today's entries; the founder's earlier photos immediately became visible (1200x1600, correctly downscaled on-device). Dev swap became an orange DEV pill top right per founder direction. Scope names staying in the project language was explained as intended (project data, not UI strings). Extra lesson: loading="lazy" images never load in the preview pane's renderer; dropped it for the thumbs. All fixes verified locally and live.

## Next

Phase 1b: the EPC dashboard rebuilt from the AVE-DC Poljubinj design (hero, computed progress with scope breakdown, cumulative chart, daily log feed, photo gallery with signed URLs, activity feed) plus the live-update moment (crew submit appears on the dashboard within seconds, Supabase Broadcast with polling fallback). Then the Stueckliste gate and requests flow complete the demo surface.
