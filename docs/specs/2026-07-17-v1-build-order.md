# Design: V1 build order and working discipline

Status: written 2026-07-17 evening. Timeline and logging system approved by founder. Build order analyzed and decided by Claude on founder's delegation ("decide on your own, articulate why, log the decision"). The articulation is this document.

## Goal

Build the complete Belin v1 in ten days, with two immovable dates inside that window:

1. Monday 20.07, morning: live demo in Slovenian for a Slovenian EPC, a potential customer, at a local meeting. Two founders play both roles on their own devices through tokenized links. Scope per the approved demo design (docs/specs/2026-07-17-monday-demo-design.md, including its update note).
2. Monday 27.07: a German EPC starts testing the full v1 with real accounts: magic-link login, organizations with roles, invite links, and all five modules. Everything must be finished and rehearsed by Sunday 26.07 evening.

The UI ships in Slovenian, German and English from the first commit. Generated PDF documents render in the project's language, German for the German pilot project.

Founder ambition note: if velocity allows, the entire app may be finished even earlier ("maybe by Monday morning"). The plan below guarantees the demo and the 26.07 completion, and defines exactly what any surplus time flows into (the upside rule), so extra speed shortens the schedule without ever endangering the demo.

## The corrected calendar

The founding docs labeled the pre-demo build days as Friday 18. to Sunday 19. That was off by one: 17.07.2026 is already Friday. The real window:

- Friday 17.07 (tonight): phase 0
- Saturday 18.07: phase 1
- Sunday 19.07: phase 2, dry run at 18:00
- Monday 20.07: demo in the morning, phase 3 starts in the evening
- Tuesday 21.07 to Saturday 25.07: phases 3 to 7
- Sunday 26.07: phase 8, full rehearsal, done by evening
- Monday 27.07: German EPC onboards

## Build order, with the reasoning

### Phase 0, Friday evening: foundations and external clocks

1. Provision everything with an external lead time immediately: Supabase project (region Frankfurt), Vercel project with a live URL, Resend account and sending-domain DNS verification. Emails ship only in phase 4, but DNS propagation and domain verification run on clocks we do not control, so they start on day one.
2. Scaffold: Next.js App Router with TypeScript, AVE-DC design tokens ported into the new design system, i18n plumbing with sl, de and en message files, PWA manifest, and a deployed walking skeleton on the live URL within hours.
3. Data model: write the complete v1 schema covering all five modules as a reviewed document first, then apply it as the initial migrations. Includes the actor access layer described below.

Why this is first: every later line of code sits on these foundations, and foundation changes are the most expensive and bug-prone kind. Deploying a skeleton on day one means deployment surprises surface when they are cheap. The external clocks (DNS, email verification) are the only tasks whose duration we cannot compress by working harder, so they must start earliest.

### Phase 1, Saturday: the demo spine, riskiest technology first

1. Realtime spike before anything else: prove that an entry submitted on a real phone appears on the laptop dashboard within seconds. This single moment is the heart of the Monday demo. If Supabase Realtime misbehaves, we find out Saturday morning with two days to adapt, not Sunday night with none.
2. Sub Tagesbericht flow end to end: camera photos to private storage, one-line note, headcount stepper, per-scope-item quantities, submit. Tested on a real phone on mobile data, not only in a desktop browser.
3. EPC dashboard core: computed weighted progress, activity feed, daily log list, photo gallery, live updates wired to the spike from step 1.

Why this order inside the day: these two screens are the demo. The two riskiest integrations (Realtime sync, mobile camera upload on weak connections) must fail early if they are going to fail, while there is still time to choose another path.

### Phase 2, Sunday: complete the demo surface, then freeze

1. Stückliste check as the required gate, with the automatic EPC feed notification.
2. Project info screen: address with the Google Maps button, plan PDF shown as-is, contacts, scope overview.
3. Slovenian seed project: realistic Slovenian commercial roof, real hardware names, believable log history.
4. Bautagebuch PDF export.
5. If time allows, in this order: requests flow, simulated 17:00 reminder screen, animation polish.
6. PWA installed and tested on both founders' phones.
7. 18:00: full dry run of the demo script on real devices.

Pivot rule (approved by founder): at the Sunday 18:00 dry run, if anything demo-critical is shaky, every other task freezes and all remaining time goes into making the demo bulletproof.

Upside rule: at any point ahead of schedule, surplus time flows into starting phase 3 early. This honors the ambition to finish the whole app sooner without ever betting the demo on it.

### Phase 3, Monday evening and Tuesday: accounts and parties (M1)

Magic-link auth, organizations, member roles (EPC: admin, Bauleiter; sub: owner, crew), invite links (EPC invites sub company, sub owner invites crew), swap the token actor for the session actor behind the same interface, row level security policies hardened.

Why immediately after the demo: every remaining module attaches data to real identities (whose A1 certificate, who signed which hour sheet, who approved which Nachtrag), so identities must exist before those modules are built. The German EPC's very first action on 27.07 is logging in and inviting AVESOL. And security policies are cheapest to harden while the schema surface is still small.

### Phase 4, Wednesday: compliance vault

Documents per company and per worker with expiry dates, traffic-light status, EPC entitlement views (sees validity, downloads only what it is entitled to), Resend expiry reminder emails go live here.

Why now: in a real project's lifecycle, compliance documents come before crews enter the site, so it is the first module the German EPC will exercise seriously. It is also the sharpest differentiator in the sales story, and it stress-tests the fresh orgs-and-roles model while that code is still warm.

### Phase 5, Thursday: Regiestunden

Hour sheets submitted by the crew, digital countersigning by the EPC, the visible § 15 VOB/B six-working-day countdown with automatic "gilt nach § 15 VOB/B als anerkannt" marking, and the § 2 Abs. 10 VOB/B pre-approval flag gate. The finger-signature canvas is built here and reused in phase 6.

Why before Nachträge and Abnahme: it is simpler and self-contained, the VOB clock is the crown jewel of the pitch and deserves unhurried attention, and building the signature canvas once here removes it from the critical path of the most complex module.

### Phase 6, Friday and Saturday: Nachträge and Abnahme

Change requests with photos and the submitted-before-work-starts gate, approve or reject in-app, Abnahme flow with defect list and finger-drawn signatures, and the auto-generated completion report PDF (compiled log, approved hours, approved changes, document index).

Why last of the modules: it sits latest in a real project's lifecycle, so the German EPC will not touch it in the first days, and its completion report consumes data from every other module, so building it last means all of its inputs actually exist.

### Phase 7, parallel filler through the week: PDF plan auto-extraction

Upload a plan PDF (K2 Base or similar), extract project facts (kWp, module count and type, mounting system, roof type, address) through an EU-safe AI path, EPC reviews and edits in a short form. K2 plans contain no personal data, so AI extraction is safe under the agreed legal approach.

Why parallel filler: it is the most isolated feature in v1 (one upload, one extraction, one review form, no coupling to other modules), which makes it perfect for filling spare capacity between phases. It must be ready before 27.07 because creating a project is the German EPC's first act.

### Phase 8, Sunday 26.07: full rehearsal

Walk the entire product as the German EPC would: create the organization, create the project from a plan PDF, invite AVESOL, upload compliance documents, log days, submit and countersign hours, raise and approve a Nachtrag, run an Abnahme, export every PDF. Fix everything found. Done by evening.

## Alternatives considered and rejected

1. Accounts first, demo on real logins. Rejected: auth is the least visual, most fiddly work in the app, the Slovenian EPC cannot see it, and the actor abstraction makes deferred auth cheap. Demo polish is the binding constraint before Monday, so the weekend must buy polish, not plumbing.
2. Strict lifecycle order from day one (accounts, vault, log, hours, Abnahme). Rejected: it puts the demo surface last, exactly backwards for the nearest immovable date.
3. Maximum parallelism, several tracks merged before Monday. Rejected: merging half-done tracks the night before a customer demo is an unforced risk, and it defeats the founder's mandate of careful, reviewable, small steps.
4. Incremental schema, one migration per module as it is built. Rejected: the five modules share entities heavily (projects, organizations, workers, documents, scope items all feed the completion report and later the Abschlagsrechnung documentation), and the domain is already fully specified in the founding docs, so designing the whole schema up front is possible and prevents the migration churn that breeds bugs. The schema stays amendable while pre-production, but the shape is decided once.

## Architectural decisions that make this order safe

1. Actor access layer: every data access goes through a server-side layer that resolves "who is acting" into an actor with an organization and a role. Until phase 3 the actor comes from a project token, after phase 3 from an auth session. Module code never knows the difference, so the demo build is permanent and the auth swap touches one layer, not every feature.
2. Complete schema before module code, as argued above.
3. Deploy after every phase, never a big-bang deploy at the end.
4. Risk-first spikes: any technology a demo moment depends on (Realtime, camera upload, PWA install, PDF render) gets a minimal proof on real devices before features are built on top of it.
5. Real-device testing is part of every crew-facing feature's definition of done: a phone, one hand, mobile data.

## Working discipline and logging (founder mandate, approved)

EXTREME CARE AND THOUGHTFULNESS WHEN WRITING CODE AND BUILDING THE SCAFFOLD, TO PREVENT FUTURE BUGS. Concretely:

- Plan before code: data shapes and interfaces are written down before implementation.
- Small verified steps: after each step, run it and look at it, on a phone viewport for crew-facing screens.
- No quick hacks in foundation code (schema, access layer, i18n, design tokens). Any knowingly taken shortcut is logged as debt in CHANGELOG.md the moment it is taken.
- CHANGELOG.md at the repo root: every change is logged with date, what and why, in the same commit as the change.
- docs/sessions/: one markdown log per chat session: what was done, what we learned, where we failed, where we succeeded, what comes next.
- Session start ritual: read CLAUDE.md, DECISIONS.md, recent CHANGELOG.md entries and the latest session log before touching anything.
- Session end ritual: update the session log, CHANGELOG.md and DECISIONS.md.

## Risks being watched

- Realtime or camera upload misbehaving: mitigated by Saturday morning spikes with two days of slack.
- iOS PWA install friction at the demo: mitigated by installing on both founders' phones on Sunday, not Monday.
- Resend domain verification lag: mitigated by starting DNS on day one, and emails are not needed before phase 4.
- AI extraction quality on real K2 PDFs: mitigated by the review form (the EPC corrects, never types from scratch) and by treating extraction as parallel filler rather than critical path.
- Schedule pressure on phases 5 and 6: mitigated by lifecycle ordering, the German EPC cannot reach hour sheets or Abnahme in their first days even if those land mid-week.
