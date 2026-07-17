# Session log: 2026-07-17 (night), phase 0 foundations

## What was done

- Executed the phase 0 plan end to end. Live result: a deployed Next.js app at belin-app.vercel.app, trilingual (sl, de, en), backed by the real Supabase Frankfurt database, rendering the seeded Slovenian demo project through tokenized links with computed weighted progress (6.3 percent).
- Scaffold, AVE-DC design token port, next-intl i18n with a key-parity test, PWA manifest and generated icons.
- Complete v1 schema (23 tables, all five modules) applied to Supabase Frankfurt, RLS on with zero policies, storage buckets, generated types.
- Actor access layer (token to actor resolution), weighted progress computation with tests, tokenized walking-skeleton page and localized not-found.
- Provisioning done via connectors: deleted stray Ireland project, created belin in Frankfurt, seeded, Resend key, private GitHub repo, Vercel deploy via GitHub import.
- Confirmed the Next.js stack under challenge; wrote the architecture analysis (below).
- 14 unit tests green, clean type check and production build, roughly 15 commits, every change logged.

## What we learned

- The connectors can do almost everything (create DB project, apply migrations, seed, deploy) but deliberately cannot read or set the two most dangerous secrets: the Supabase service_role key and Vercel env vars. That is correct security design, not a gap, and it defines exactly where the founder has to click.
- The production 404 bug was subtle and worth remembering: with deny-all RLS, using any key other than service_role returns zero rows and no error, so the app cleanly renders not-found instead of crashing. The read-only key and the admin key both start with "eyJhbGci", so they are trivially swapped. Diagnosis method that worked: test both keys against the live REST API directly, do not guess.
- Env var changes on Vercel need a fresh deploy to take effect; a push to the connected repo is the clean trigger.
- The founder gets frustrated by ambiguity and by being asked to relay things I can see myself (the live URL). Lesson: when I have access, read the state myself; when the founder must act, give one dead-simple instruction, not a menu.

## Architecture decision (Next.js, challenged and confirmed)

The founder asked, pointedly, whether Next.js is right for a fully shipped mobile and desktop app. Verified against the 2026 state of mobile web and confirmed yes. Reasons: it serves both the data-dense desktop EPC dashboard and the mobile crew PWA; it preserves the AVE-DC CSS design system and the @react-pdf engine that React Native and Flutter would both discard; PWA-via-link is lower-friction than an app-store install and matches the free-for-subs adoption model; EU iPhone home-screen PWAs are confirmed working (Apple reversed the 2024 DMA removal); the remaining iOS gaps (manual install, limited background sync, weak EU push) are all already designed around (install guide, sync-on-open, email reminders). Guardrail baked in: crew capture screens are client-side and local-first (needed for offline anyway), the EPC dashboard is server-rendered, and Capacitor is the named path if app-store native apps are wanted later, so no rework. Logged in DECISIONS.md.

## Where we failed

- First guess at the deploy bug (publishable key pasted) was close but not exact: the value was actually the legacy anon JWT, not the sb_publishable key. Same effect (RLS blocks), but I should have said "a non-admin key" rather than naming the wrong one. Corrected once I saw the masked eyJ prefix in the screenshot.
- Asked the founder to paste the live URL when I had Vercel access to read it myself. Noted, will not repeat.

## Where we succeeded

- The whole stack works end to end on real infrastructure in the EU, hours into the build: schema, actor auth, computed progress, three languages, live URL, auto-deploy.
- Diagnosed and fixed a production-only secret bug with certainty (REST API key test) rather than trial and error.

## Follow-ups (open)

1. SECURITY: rotate the Supabase service_role key before the 27.07 pilot (exposed in chat). Update Vercel and .env.local, redeploy. Only fake demo data at risk today.
2. Rotate the two demo tokens before any real project data enters this database.
3. projekt.getbelin.com custom domain not attached yet (deferred; the vercel.app URL is fine for now). The planned Resend DNS was unnecessary since getbelin.com was already verified.
4. Maskable icon and per-token PWA start URL are phase 2 polish.

## Next

Phase 0 is complete: HARD STOP for founder review. Phase 1 (the demo spine: realtime spike proving a phone entry appears live on the EPC dashboard, then the Tagesbericht flow and the EPC dashboard core) gets its own implementation plan next, per docs/specs/2026-07-17-v1-build-order.md.
