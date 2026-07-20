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

## Next

Task B4: PersonActor into the Actor union, requireProjectActor and requireOfficeActor, the mechanical ProjectActor rename across lib/data, the session action variants at app/[locale]/app/[projectId]/actions.ts, ProjectList and SubHome. The temporary placeholder dies there.

Open decision for the founder before pushing: production has no DEMO_LOGIN variable, so deploying removes the demo password login from the live site and leaves magic link as the only way in. NEXT_PUBLIC_APP_URL in Vercel must also point at the live domain or the emailed links will point at the wrong host.
