# Session, 13.08.2026: crew identity, and the machine takes over the camera

Continues 2026-08-12. That session finished v1 (tasks 19 to 21: the translation
pass, the security cleanup, the production QA). This one started as "capture the
landing screenshots" and turned into two much larger corrections, both founder
led, both right.

## Done

**The portfolio screen, four passes.** The seed staged the same project twice,
which read as a duplicate row rather than as the two demo scenarios it was meant
to be; the day-one project got its own site. Five more projects joined so the
screen shows a book of work (two active, four delivered, one not started), built
from real scope items and daily entries so a delivered project reads 100 percent
because its quantities reach its targets. The list sorts by what is still
running. The EPC and the subcontractor were seeing an IDENTICAL list, because
every project named AVESOL as the sub; three subcontractors now share the book
and each company sees only its own.

**The card mark was replaced, not restyled.** Cumulative progress on a delivered
project always climbs 0 to 100, so four finished projects drew four identical
curves: a mark that cannot vary is not showing data. It became schedule
variance, working days of buffer or overrun against the promised finish, which
is the one question that means the same thing on a running job and one delivered
two months ago. The palette validator killed the obvious green/red choice at
deltaE 5.3 under deuteranopia; blue and orange score 24.3.

**The headline became capacity.** SKUPAJ IZVEDENO, V IZVEDBI, V PRIPRAVI, done
doing next, partitioning the whole book. The founder rejected "montirano"
correctly: an EPC does not mount anything, and the same screen serves the
subcontractor who does. Izvedba is neutral and shares its root with the tile
beside it. Open hours and incidents moved under the list, because the founder
could not say what either meant, which is the correct verdict on a headline.

**A language switch inside the app.** He opened the dashboard in English with
Slovenian data in it and had no way out. Nothing was mistranslated; the switch
simply only existed on the landing page.

**Crew identity, built twice.** First as a name-tap claim on the project link.
He was right that crew need real accounts, and the claim was wrong for a
different reason I should have caught: anyone holding a forwarded link could tap
"Luka Zupan" and file evidence as him. It became an email magic link, the same
one the office uses, so there is one auth system rather than two. The link now
proves you are on the site; the mail proves you are you. Reports carry a real
author, the boss has a roster where removing a man revokes his sessions
instantly, and sessions roll so an in-use phone never expires.

**The asset pipeline, which is where this session should have started.** He was
being walked through a click-by-click script to photograph his own monitor, to
capture a PDF cover that was 80 percent white space. Playwright now signs in
with real minted tokens, shoots every surface at 2x and 3x, drives the entire
closing chain (handover, report, acceptance with a defect and two drawn
signatures, invoice), and rasterizes the real PDFs through pdfjs. One command,
and it re-seeds behind itself.

**The completion report cover was rebuilt**, which was the actual complaint:
four figures, a register summary, and the day-by-day table.

**Mockups and background removal, both asked for and both done.** Sharp cannot
warp in perspective but a browser can, so angled devices come from a CSS 3D
transform captured with omitBackground. Background removal flood fills from the
edges rather than thresholding, so white text inside the artwork survives.

## Learned

- **A test can stop testing what it used to test without changing a line.** The
  i18n parity test was correct the day it was written and hollow the day the
  translations landed, because identical keys plus non-empty strings only meant
  agreement while de and en held the Slovenian string.
- **The bug is usually in the sequence, not the step.** Every step of the
  finalization chain worked and the seed worked; walking them in the order the
  founder walks them exposed a seed that reset less than it claimed.
- **Automating a flow is also a test of it.** Driving the acceptance headless
  found two defects a human never would: the inputs carry no type attribute, and
  the signature pads sit below the fold, so the first run stored two blank
  signatures on a legal protocol.
- **A Supabase query builder is lazy.** An unawaited chain is a request that
  never leaves. It typechecks, it reads correctly, and it does nothing.
- **React delegates onBlur through focusout**, so a dispatched blur persists
  nothing and looks exactly like a broken feature.
- **When the founder says a screen is confusing, believe the screen.** Twice the
  honest answer was that the product was wrong, not that he had misread it.

## Failed, then fixed

- The first session refresh used a bare `void` on a query builder and refreshed
  nothing.
- `isShotMode` called `cookies()` unguarded and broke a unit test that calls a
  data function directly. It now returns false outside a request scope.
- Wrote `scripts/sweep-plans.ts` as a second entry point to the plan sweep, then
  deleted it: the module is server-only, and duplicating a deletion path is
  worse than having one trigger.
- The first production QA harness POSTed a server action directly; nothing
  happened and five checks failed against a working app.

## Next

Plan: `docs/superpowers/plans/2026-08-13-marketing-assets.md`. Tasks 1 to 4 are
done (pipeline, cover, PDF rendering, demo flow) plus mockups and background
removal, which were founder additions.

**Remaining, in his words: create good graphics and make the landing page pretty
af.**

1. **Task 5, the landing page.** Rebuild on the real assets now sitting in
   `assets/marketing/`: his own device mockups plus the generated angled ones as
   hero pieces, the framed screens in the story sections, and the real document
   pages finally filling the paperwork slots. This is the "pretty af" job and
   should get a proper design pass, not just image swaps: the page was written
   text-first when there were no pictures, and it can now be composed around
   them.
2. **Task 6, the pitch PDF brochure**, four A4 pages built on the same PDF
   engine as the app's documents, so the German version later is a locale switch
   rather than a redesign.
3. **Task 7, the demo video**, 45 seconds, captions only, scripted Playwright
   takes cut with ffmpeg.
4. **Task 8**, close out: docs, and the optional list of extra mockup angles.

Also outstanding, unrelated to assets:

- The translation debt from this session: the `claim` namespace, the
  `settings.crew*` keys and the new completion-cover keys carry Slovenian in de
  and en.
- The founder's service-role key is the one he screenshotted into this chat. He
  decided knowingly not to rotate it; noted, his call.
