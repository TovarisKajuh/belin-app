# Session, 2026-09-16: the Salzburg presentation

Ran on Opus. One deliverable: a German click-through presentation of Belin for
an Austrian EPC with a 250 kWp project in Salzburg, where AVESOL is the
subcontractor and Belin is what the EPC gets for free while we do the montage.

This is the first asset written from the other side of the table. Every earlier
one sells Belin to an EPC as a product. This one sells AVESOL as a
subcontractor and gives the software away as the reason to pick us.

## Done

1. **`npm run marketing:salzburg`.** Source at
   `assets/marketing/source/salzburg-de.html`, builder at
   `scripts/marketing/salzburg.mjs`, output one file at
   `assets/marketing/belin-salzburg-de.html`, 1.7 MB, self contained. Sixteen
   screens in five chapters. Keyboard, swipe, two buttons, a chapter rail, a
   progress bar, hash deep links. Nothing loads from the network.
2. **Nine real app and document screenshots**, reused from the German brochure
   pipeline, resized and inlined as WebP.
3. **Three documents drawn in HTML** in the app's own paper style: the
   Bestellung, the Sicherheitsunterweisung and the Strangmessprotokoll.
4. **`marketing-preview`** in `.claude/launch.json`, a static server on 4173 for
   looking at built marketing HTML in a browser.

## Learned

- **The "-de" folders are not all German.** `docs-de/narocilnica.png` is the
  Slovenian naročilnica with a German folder name. It names Sonce Energija
  d.o.o., a real ZSFV member the GTM base explicitly forbids showing publicly,
  and it prints AVESOL's demo price for a 245 kWp job. It was already placed on
  a slide before it was looked at. Folder names are not evidence: the picture is.
- **ASCII transliteration is not German.** The first draft wrote "fuer" and
  "Stueckliste" out of habit around encoding. In a document going to an Austrian
  buyer that reads as amateur work. Fixed with an explicit stem map and then
  audited by grepping for every remaining `ae`, `oe` and `ue` sequence and
  reading the list, which is what caught `Saetze`, `laesst` and `stuetzt`.
- **A horizontal scroll area inside a swipe deck is a bug by default.** The two
  long documents are wider than a phone. Dragging them sideways to read the
  table turned the page instead. Found by sizing the viewport to a phone and
  looking, not by reasoning about it.
- **Claims are cheap to check against the code and expensive to get wrong.** Four
  were wrong or overstated. The one about expiry notifications turned out to be
  true, and only checking told the difference.

## Failed

- **Shipped a slide built on an unexamined image.** The Slovenian PO went onto
  slide 3 on the strength of its folder name. It was caught in the browser walk
  through, which is the only reason it was caught at all.
- **Opened with a process objection the founder did not want.** Three of the
  listed features do not exist in the product. That was worth saying once. It
  was said at the length of a design review, in the middle of a deadline, and it
  cost a round trip and the founder's patience. Say it in two sentences and keep
  building.

## Succeeded

- The two invented documents are indistinguishable in style from the real PDFs,
  because they were built from the measured values in `lib/pdf/theme.tsx` and
  from looking at the rendered Abnahmeprotokoll, rather than approximated.
- The Strangmessprotokoll numbers hold up to arithmetic. 19 modules at 51,85 V
  is 985 V at STC, about 944 V at the 42 °C the protocol records, and 1071 V at
  minus ten, under the 1100 V system limit. An electrician can check it.
- Austrian law and norm references verified before printing: § 14 ASchG,
  OVE EN 62446-1, OVE E 8101-7-712.

## Next

- **The three promises.** If Salzburg lands, the Strangmessprotokoll and the
  pre-start Sicherheitsunterweisung have to become real modules, and the flights
  have to be flown. Logged in CHANGELOG and DECISIONS.
- **The founder's calls on the built file**: whether to keep the invoice mockup,
  which carries AVESOL's demo price and a demo IBAN in readable type; whether
  the contact block should carry a phone number and address; and whether the
  Ingolstadt reference project should stay or be re-shot as Salzburg.
- **A German Bestellung in the pipeline.** `marketing:germanize` does not produce
  one, which is why this deck renders its own.

---

## Second pass: the founder cut the text

**"800x too much text. LESS TEXT, SIMPLER. IT EXPLAINS THE WORKFLOW."** He was
right, and the correction is worth keeping.

The first deck was written the way a spec is written: every claim justified in
its own sentence, every module given its paragraph. That is the right density
for DECISIONS.md and the wrong density for a page someone clicks through on a
phone before a call. 2189 words became 656, and most of the 656 is inside the
two document tables rather than on a slide. Sixteen slides became thirteen.

- **Nine real AVESOL photographs** now carry the deck, from the founder's own
  `avesolsi/CnI` folder. Committed to `assets/marketing/site/`, rotated by
  their EXIF orientation, capped at 2000px.
- **The Tolmin drone set carries its dates in the filenames**, so the same
  installation appears as bare substructure on 12.05, half covered on 22.05 and
  finished on 20.06. Three photographs replaced a drawn flight plan and a
  paragraph. Real evidence beats an illustration of evidence.
- **The central slide is photo, arrow, log entry**, three times down the page.
  Sixteen words of prose. That is the founder's brief rendered literally: show
  how the crew takes photos and how they are logged.

### Learned

- **Density belongs to the medium, not to the content.** The same facts were
  right in CHANGELOG and wrong on a slide. Nothing was cut for being untrue;
  everything was cut because nobody would read it there.
- **sharp does not apply EXIF orientation unless you call `.rotate()`.** Every
  contact sheet built before that was wrong about half the photographs, and the
  mistake is invisible unless you look at the pictures.
- **Photographs are the expensive thing in a self-contained file.** The first
  photo build was 6 MB, which is not an attachment. Per-image quality brought it
  to 3.9 MB.

---

## Third pass: the pictures had to show what the captions said

Four corrections from the founder, all the same class of mistake: a photograph
that is roughly about the right subject is not a photograph of the subject.

- **The Unterkonstruktion shot read as modules.** It was not the wrong photo, it
  was an ambiguous crop: a 3:4 portrait, top third sky, bottom half empty
  concrete, and the tilted rails catching low sun looked like panel rows at
  thumbnail size. Cropped to the rail field it is unarguable. He suggested a
  stock photo from the web; his own photo cropped is better on authenticity and
  on licensing, and that is worth saying rather than just doing.
- **The phone step did not read as a phone.** Cropped to the reporting half now,
  where the send button and the tab bar do the work.
- **The log flow's photos did not match its own log lines.** On the one slide
  whose entire argument is that the photo becomes the record, that was the worst
  place for it.
- **The dashboard slide had percentages and no pictures.** A new slide carries
  four dated progress photos.

### Learned

- **Check a photo against the sentence next to it, not against its filename.**
  `unterkonstruktion.jpg` was correctly named and still wrong in place.
- **A thumbnail is a different photograph.** Every one of these read fine at full
  size and wrong at the size the deck actually renders them.

---

## Fourth pass: hosting it

The founder asked for it on Vercel and to do as much of it myself as possible.

- **The Vercel connector was the wrong tool for it.** `deploy_to_vercel` takes
  the file tree inline; a 3.8 MB deck is about 5 MB of base64 through the model.
  The repo already auto-deploys from main, which moves the same bytes over git.
  Checked the connector before reaching for git rather than after.
- **Live at https://belin-app.vercel.app/p/salzburg.html.** Verified after the
  deploy: 200 and 3.9 MB on the URL, the deck rendering in a browser, the
  robots meta in the served bytes, and all four app routes still correct,
  because a push to main deploys the product and not just the file.
- **Build output moved to `public/p/salzburg.html`**, and the old copy in
  `assets/marketing/` is deleted. Two copies of a 3.8 MB artifact in git is
  waste that compounds on every rebuild.
- **Checked the middleware before assuming the route worked.** The matcher is
  `/((?!api|_next|_vercel|.*\..*).*)`, so a path with a dot is excluded and the
  static file is served. That is why the deck keeps `.html`: a prettier dotless
  URL would need the i18n matcher rewritten, which is foundation code and not
  worth touching for a marketing asset.
- **Another session was working in this repo at the same time**, building a
  Slovenian workflow deck. Its half-finished `package.json` scripts and
  untracked files were in the working tree. Committed by path rather than with
  `git add -A`, which is the only reason they did not go out in this commit.

### Learned

- **`git add -A` is unsafe in a repo someone else is also working in.** The
  habit was already there from three commits earlier in this same session; it
  happened to be harmless then and would not have been now.
