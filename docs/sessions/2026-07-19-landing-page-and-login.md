# Session 2026-07-19 (second): landing page, demo login, and a new working order

## What the founder asked

Two things. First, a bug: belin-app.vercel.app still showed the phase 0
skeleton. Second, a change in how the project is tested and developed from now
on: a landing page with a login (no registration), 12345/12345 for the EPC side
and 54321/54321 for the sub side, landing straight in the real account.

Then an ordered plan: login first, then fix the sub visuals to match the EPC,
then live sync, then Stueckliste, then the automatic project report PDF, then
polish and prepare for the demo.

## Two founder corrections worth recording

1. **I told them "is 1b finished" was mostly yes, and it was.** The dashboard is
   done. But the live-update moment was part of 1b's own definition and does not
   exist: grepping for channel, broadcast or postgres_changes returns nothing.
   Stated plainly rather than counted as done.
2. **I estimated the sub side rebuild at "several days".** The founder corrected
   it to a maximum of 10 hours and told me to record that I work far faster than
   I estimate. They are right and my own repo proves it: phase 0 (whole schema
   plus provisioning) was one evening, phase 1a (crew report flow with photo
   downscaling and a transactional submit) was one day, the entire dark
   dashboard with four from-scratch chart rebuilds was one day. Saved to memory
   as velocity-calibration, with the anchors rather than a literal 50x divisor,
   because a literal 50x turns 10 hours into 12 minutes and is wrong the other
   way. The damage from a slow estimate is not the number, it is that I proposed
   triage and scope cuts that were never necessary.

## Done

Landing page at `/[locale]`, signed-in view at `/[locale]/app`, both live.

- `lib/auth-shared.ts`: the pure credential check, split out so it is testable
  without the server-only and next/headers imports. Same split as
  actor-shared.ts. Six unit tests, including that the two accounts cannot cross
  roles and that the password is compared exactly while the username is trimmed
  (trimming a password would silently accept a secret the user never set).
- `lib/auth.ts`: session cookie plumbing plus `resolveActorFromSession`, the
  mirror of `resolveActorFromToken`.
- `app/actions/auth.ts`: login and logout server actions, with the locale
  validated against the routing table instead of trusted from the form.
- Landing page built on `.epc-dark`, so the palette, background gradients and
  grain are literally the dashboard's. The first screen a prospect sees must not
  look like a different product from the one behind the login.
- `/p/[token]` deliberately untouched, so existing links and the DEV swap survive.

## The useful architectural note

DECISIONS.md (2026-07-17 night) deferred the token-transport refactor, moving
identity out of the URL into the request context, to M1 so it would not be done
twice. Building this login **is** that refactor. The session actor now exists and
phase 3's magic link changes only how the cookie is issued. One hop remains and
is left on purpose: the view components still take the raw token as a prop
because their server actions do, so `/app` reads it back out of the cookie and
passes it down. Recorded so it is not mistaken for finished.

## Verified by driving it, not by reading it

EPC pair lands on the dark dashboard with the real seeded project; sub pair
lands on the crew screen with real scope items; wrong password shows the
localized error and stays put; logout returns to the landing page; revisiting
`/` while signed in skips to the app; a forged cookie is rejected because the
token is still validated against the database. At 375px zero horizontal
overflow, sign-in card ordered above the hero, 16px inputs so iOS does not zoom
on focus. At 1280px two columns, 580 and 428.

## Two false alarms, both mine, both instructive

1. **"The login is broken."** After submitting, the page stayed on `/sl` with no
   error. The server logs said otherwise: `POST /sl 303` then `GET /sl/app 200`.
   The action had worked. The client navigation was aborted by an HMR recompile
   of the brand-new route, visible as `net::ERR_ABORTED` in the network log.
   Dev-server artifact, not a bug. Reading the server log settled in seconds what
   the browser state made look like a failure.
2. **"The cookie was never set."** I checked `document.cookie` and saw no
   session. That check is invalid by construction: the cookie is httpOnly, so
   JavaScript cannot see it. I proved a property my own code was designed to
   guarantee. Same family as the earlier probe mistakes: test the thing the way
   the system actually exposes it.

## One thing worth checking that turned out fine

The production build marked `/[locale]/app` as SSG, which would mean a
prerendered page reading a cookie at build time and therefore always redirecting
to the landing page. Rather than reason about it, tested against a real
production server: no cookie gives 307 to `/sl`, an EPC cookie renders the
dashboard. The marking is about the locale params; the `cookies()` call still
forces per-request rendering. Worth the two minutes.

## Debt taken, logged in CHANGELOG.md

- Hardcoded demo credentials on a deliberately public site. Safe today (fake
  seed data only), unsafe from 27.07 when real project data lands. Hard removal
  with phase 3. No rate limiting on the login action either, fine for two fixed
  accounts, must not survive into real auth.
- First i18n placeholders since the Slovenian-first rule: `landing` and `auth`
  keys are real Slovenian, de and en hold the Slovenian strings.
- Removed the dead `home` i18n section along with the skeleton page it served.

## Part two: the mark, the white bar, and the crew side

The founder sent a phone screenshot with four items.

### 1. One mark instead of three

The launch animation built a 16x24 grid, the command bar drew a 3x4 mark, and
the icon was a placeholder letter B in Arial. Three different logos. Now all
one: 3 wide, 4 tall, columns rising 1, 2, 3 gold cells from the bottom, used by
the splash, the header, the landing page and the home screen icon (icon without
the wordmark). Timing was re-tuned rather than reused, because with 3 columns
the old 0.06s stagger reads as a single flash. The gold was unified on the
`--e-gold` token; the splash had been ending on a slightly different gold from
every other surface, which nobody would name but everybody would feel.

Extracted `components/BelinMark.tsx` so the mark stops being a magic array
duplicated per surface.

### 2. The white bar

`themeColor: "#f5f6f8"`, a near-white, which is exactly what iOS paints behind
the clock on an installed app. Now #0b1524 plus `viewport-fit=cover` and a
translucent status bar, so the app's own background runs edge to edge, with
safe-area insets on every fixed and sticky edge.

Told the founder the part they will not like: the clock and battery cannot be
hidden by any web app, and most native apps do not hide them either. What was
actually broken was the white strip, and that is fixed. Also flagged that iOS
caches both the icon and the status bar style at install time, so the app has to
be removed from the home screen and re-added before either change appears.

### 3. The crew side, and a question I should never have asked

The founder had already written "then we fix visuals for the sub so it fits the
epc visuals" in their own ordered plan. I then asked them dark or light. They
were right to be annoyed. **Rule: before asking a question, check whether the
user already answered it earlier in the conversation.**

Renamed `.epc-dark` to `.belin-dark` across 144 rules and three components,
because the class now wraps the crew screen too and a lying name in foundation
code is the kind of shortcut CLAUDE.md forbids. Rebound every `.b-*` surface to
the `--e-*` tokens and gave the crew the shared command bar and grain. Layout
stays crew-specific and one-handed; only the skin changed.

### 4. A defect in their screenshot they did not mention

The orange DEV pill was sitting on top of the status control, covering
"Aktivno". Moved it to the bottom right. Both it and the logout pill now lift
96px on the crew screen to clear its 86px fixed submit bar.

## Two dev-environment traps, both self-inflicted

1. **`npm run build` while the dev server was running.** Both write to `.next`,
   so the dev server's chunks were clobbered and every page 500'd with
   `Cannot find module './vendor-chunks/@supabase.js'`. It looks exactly like a
   broken import. Fix: stop the server, delete `.next`, restart. Production was
   never affected. Do not run a production build against a live dev server.
2. **The CSS specificity trap, twice.** Safe-area and raised-pill rules override
   properties set in base rules and media queries at equal specificity, so they
   must come last in the file. I caught it the first time before it shipped and
   nearly repeated it with the raised pills.

## Verified live

Crew screen renders the dark shell and the shared command bar on production,
theme colour #0b1524 in both the page and the manifest, and the EPC dashboard is
unchanged after the rename, with the scope bar fills still measuring
286/131/71px so yesterday's invisible-bar fix has not regressed.

## Part three: the white bar, again, and the day one switch

### The white bar, and why my first fix did not work

The founder reported it still white after the first fix. The cause: iOS ignores
`apple-mobile-web-app-status-bar-style` unless `apple-mobile-web-app-capable` is
also present, and Next.js only emits the standardised `mobile-web-app-capable`
for `appleWebApp.capable`. So the style tag was there and being thrown away, and
iOS fell back to its default, which is precisely the white bar.

**The part worth recording:** my own verification printed `webAppCapable: null`
and I moved past it. I saw the exact signal that would have caught this and did
not chase it, then told the founder it was fixed. Same shape as the invisible
progress bars: the check ran, the anomaly showed, and I did not follow it.
Fixed by setting the Apple tag explicitly through `metadata.other`, with all
four tags now verified present in the live production HTML.

### Day one switch

The seeded project is half built, so the screens a real customer actually starts
from (material check, empty log, zero progress) could not be seen or tested.
Added a second seeded project at day zero and a pill that flips the session
between the two, keeping the role.

Two real projects rather than a date filter over one: switching is instant and
non-destructive, neither state can corrupt the other, and the ground zero
project is cleared of entries on every seed run so it always returns to a true
day one. The switch refuses any token outside the demo set, so it can never move
a real project session. Six unit tests cover the mapping, the round trip, role
preservation and the refusal.

**A good surprise:** the EPC dashboard at day one renders correctly with zero
reports, showing "Zbiramo podatke", 0 percent and "izračunano iz 0 poročil in 0
fotografij", with no NaN, no Infinity and no malformed SVG paths. The empty
states written yesterday were already sound and had simply never been seen.

### A fourth false alarm, same family as the other three

The console showed `MISSING_MESSAGE` for the new scenario keys after they had
been added. It was stale: `read_console_messages` returns accumulated history,
so errors logged during the window between writing the component and adding the
keys stay visible forever. The DOM showed the correct Slovenian and no raw key
strings. **Read current state, not log history.**

Similarly, the live `/sl` HTML contains "Povezava ni veljavna", which looks like
the landing page rendering the invalid-link screen. It does not: Next.js ships
the not-found boundary inside the RSC payload for client navigation. Confirmed
by checking the page actually returns 200 with the login form.

## Next

Founder reviews the login on a phone. Then step 2 of their order: the sub side
visuals. Two decisions still open and both block design rather than just code:
dark or light for the crew (daylight readability on a roof is the real argument
for light), and the material-check model (one authoritative Stueckliste check
per project versus a running history, my read is history because a single check
stops being true after the second delivery).

Also still unanswered: which mark to use for the app icon, the splash cell grid
or a real logo file if one exists. The current icon is a placeholder, a navy
square with an Arial B.

## Live

- Landing and login: https://belin-app.vercel.app/sl
- EPC 12345 / 12345, sub 54321 / 54321
