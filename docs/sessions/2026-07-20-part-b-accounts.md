# Session: master plan Part B, accounts and magic-link auth (B1 to B3)

Date: 2026-07-20 (evening). Model: Opus, executing docs/superpowers/plans/2026-07-20-v1-master-plan.md Part B.

## Done

Three tasks, three commits, each with its own CHANGELOG entry.

- B1: migration M1 (org money fields, people.notification_prefs, projects.vat_mode, login_tokens, sessions), types hand mirrored, seed completeness (VAT ids, IBANs, accountant address, vat_mode on both demo projects, emails on every person, Ana Novak as sub office admin, the founder person from SEED_FOUNDER_EMAIL = info@avesol.eu).
- B2: lib/auth-core.ts, lib/notify-shared.ts, lib/email-shared.ts, all test first; lib/email.ts sending through Resend; email_log pulled forward out of M3 as its own migration.
- B3: magic-link login end to end, person sessions, the verify confirm card, the fail-closed demo login gate.

Gates: 280 tests (up from 250), tsc clean, production build clean apart from the known unpdf import.meta bundler noise.

## Learned

- The plan's two migration prefixes (M1 at 20260720120000) were already behind the migrations the morning session applied, which run to 20260720190000. Renumbered to 20260720200000 so the file order and the apply order tell the same story. Worth checking prefixes against the live list rather than trusting a plan authored earlier the same day.
- The plan and this repo's own rules genuinely conflicted on one point: the plan wants login mail off the response path (response time otherwise reveals whether an address is registered), while lib/realtime-server.ts documents that a detached promise can be frozen by a serverless runtime before it lands. Next 15.5 exports a stable after(), which satisfies both. Neither rule had to be bent.
- The founder's first real email went out through Resend during verification, with a provider id in email_log. The sending path has now been proven once end to end, which every later notification depends on.

## Failed, then fixed

- A latent infinite redirect, older than this task: the landing decided "already signed in" from the cookie alone, while /app redirected back to the landing whenever the cookie failed to resolve. Any expired, revoked or rebuilt-database cookie looped between the two forever. It had never bitten because token cookies rarely go stale; sessions make stale cookies ordinary. Fixed by resolving the session on the landing, and probed with curl across four stale cookie shapes.
- The first click on the submit button did nothing, which is environment trap 4 in the plan (synthetic events do not reach React). form.requestSubmit() worked. Cost one wasted cycle despite the trap being written down; read the trap list before driving the UI, not after.

## Deviations from the plan, each deliberate

- Migration renumbered, as above.
- email_log created in Part B rather than with the rest of M3, because login sends mail before the notifications engine exists and an unlogged send cannot be debugged.
- renderEmail lives in lib/email-shared.ts (pure, tested) and is re-exported from lib/email.ts, so it can be tested without importing the Resend SDK. The public shape the plan specifies is unchanged.
- safeNext lives in lib/auth-core.ts rather than the actions file, because a "use server" module may only export async functions. It is tested there.
- PersonActor is NOT yet in the Actor union, and /app carries a temporary signed-in placeholder. Both belong to B4; adding the union in B3 would have dragged B4's whole lib/data rename forward. The placeholder exists only so the login flow has somewhere to land instead of bouncing.

## Deployed, and the bug that only production could show

The founder chose to deploy with magic link only (no DEMO_LOGIN in Vercel) and to find out empirically whether NEXT_PUBLIC_APP_URL was set. It was not, and had never been. The live landing therefore offered exactly one way in, and that way could not send: the guard written minutes earlier refused to build a link without a base URL.

The diagnosis came from the data rather than from guessing. A login_tokens row existed but email_log was empty, and there is only one code path that inserts a token and then returns without attempting a send. If the Resend key had been the problem instead, email_log would have carried a failed row with error no-api-key.

Fixed by lib/app-url.ts: NEXT_PUBLIC_APP_URL still wins when present, so a custom domain can override later without a code change, but it now falls back to VERCEL_PROJECT_PRODUCTION_URL, which the platform injects itself. The request Host header is still never used: a poisoned Host is the classic way to steal an account, because the attacker triggers a login email for somebody else and the link points at the attacker's server. Re-tested on production afterwards: the send succeeded with a provider id.

The lesson is the plan's own rule, paid for again. Deploying is not verifying. The local flow was green in every respect and the deployed one was completely dead.

## B4, finished

The founder logged in on production, landed on the placeholder and asked what now, which was the right question: the placeholder was the whole remaining gap. B4 closed it.

- /app for a person is the project list, scoped to whichever side their org sits on. listProjectsForPerson exists because listProjectsForOrg only asks about epc_org_id, which would show a subcontractor nothing at all.
- /app/[projectId] renders the full surface with no token: EpcDashboard, SubHome, or the crew screen for a crew person.
- SubHome is new and is deliberately not the crew screen. Sending a company owner to the roof reporting form would ask them to log headcount and photos while hiding the naročilnica and the hours they actually sign.
- Components take a (token, projectId) pair. The two action families were given identical signatures so a component picks one in a single line rather than growing a second code path.

Verified by driving it: signed in by magic link, three real projects listed, opened one, added a material item and confirmed the row reached the database through the session path. A stranger's project returns an unleaky not found. The sub admin was probed with a session minted by hand (her seeded address is on the fake demo domain and cannot receive mail): she gets SubHome, sees only her org's projects, has no new project button and is bounced out of the wizard.

## What the earlier B4 checkpoint had already landed

Committed with the URL fix, because widening the Actor union and leaving the tree red was not an option:

- Actor is now TokenActor plus PersonActor. TokenActor gained personId: null so it satisfies ProjectActor structurally, which is what let every existing token call site keep working untouched.
- ProjectActor, requireProjectActor and requireOfficeActor added; resolveProjectRole extracted pure into lib/actor-shared.ts with 7 tests. The office gate is person only by design, and excludes Bauleiter unless a caller opts in.
- OrgActor added, which the plan did not anticipate: the wizard's three functions (uploadAndParsePlan, listKnownSubs, createProjectFromReview) only ever read orgId, and at upload time no project exists to scope to. Forcing them through ProjectActor would have meant inventing a project id that does not exist yet.

287 tests green, tsc and build clean.

## Next

B5 (invites) and B6 (settings and the compliance vault), which close Part B. B5 matters most: until it lands, the only person who can sign in on production is the founder, because every other seeded address is fake. It is also what lets a real subcontractor create their own account.

Loose end to raise with the founder: a project named "Bietigheim-Bissingen" from the previous session's wizard testing is still in the database and now shows up in the project list for both the founder and the sub. It was created as a test but never removed, so it is left alone rather than deleted unilaterally.
