# Session, 2026-09-16: the workflow document on the brand

Ran on Opus. One deliverable: the founder's Slovenian walk-through of the whole
Belin process, `belin-workflow (1).html`, re-themed onto the brand, with every
empty photo slot filled, the vloga za soglasje sourced and filled out, and the
phone signing gesture demonstrated rather than described.

The file arrived green on cream with a drag-and-drop photo editor and 28 empty
boxes. It is now gold on navy, self contained, and the boxes are pictures.

## Done

1. **`npm run marketing:workflow`.** Source at
   `assets/marketing/source/workflow-sl.html`, builder at
   `scripts/marketing/workflow.mjs`, output one file at
   `assets/marketing/belin-workflow-sl.html`, 2.8 MB, self contained. Same
   source-plus-builder shape as the Salzburg deck, including the guards that
   refuse an unfilled placeholder or a declared-and-unused image key.
2. **The theme is the real one, not an approximation.** Colours from
   `.belin-dark` in `app/globals.css`, the rising-grid mark rebuilt from the
   geometry in `scripts/marketing/lockup.mjs` (3 columns, 4 rows, 22px cells on
   a 28px step, gold rising 1, 2, 3 from the bottom), Inter inlined.
3. **`npm run marketing:vloga`.** Elektro Gorenjska's real application form,
   downloaded, committed blank at `assets/marketing/forms/`, and filled with
   this project's data by writing onto its own AcroForm rectangles. Signed by
   hand on page 2.
4. **Two working signature pads** in the document, ported from
   `components/SignaturePad.tsx`. They sign themselves on scroll and the reader
   can clear them and sign with a finger.
5. **A badge vocabulary**: `app`, `teren`, `dokument`, `predlog`, plus a `todo`
   tile that names the missing shot. Seventeen tiles are real, six are drawn,
   five are admissions.

## Learned

- **pdfjs is a PDF writer if you only need a picture.** `getFieldObjects()`
  returns every AcroForm field's rectangle in PDF user space and
  `viewport.convertToViewportPoint()` maps it onto the canvas the page was just
  rendered to. Values land on the authority's own blank lines at any scale, with
  no pdf-lib and no new dependency. The field NAMES are the anchor, so this
  survives the operator reissuing the file with a different layout.
- **Substring matching in a PDF text layer finds the wrong word.** Circling the
  "DA" and "NE" options put rings on PODATKI and PROIZVODNE, because both
  contain the needle. They are standalone text items, so matching a whole item
  fixes it. Same class of bug: plain `fotonapetostni` matched
  `fotonapetostnih modulov` two lines earlier; `/fotonapetostni` is unique.
- **Government forms have bugs and you have to decide whose fault the picture
  looks like.** Page 2 of this form places its three address widgets a full row
  below their own printed labels. Filled faithfully it reads as sloppy work by
  us. Lifted 11 points it reads correct, and the reason is in a comment so the
  next person does not "fix" it back.
- **`requestAnimationFrame` needs the element on screen, and a full-page
  screenshot resizes the viewport.** The first verification run reported zero
  ink on both canvases with no errors, because scrolling past in 720px steps is
  not the same as letting the observer settle, and because the resize handler
  restarted the animation mid-capture. Measuring the pixels was the only thing
  that caught it: the page looked finished.
- **A resize must restore a finished signature, not replay it.** Rotating a
  phone re-scales the canvas, which wipes it. Replaying meant the signature
  vanished and redrew every rotation. It repaints the completed stroke instead.

## Failed

- **Shipped three wrong pictures into the first build and only caught them by
  looking.** `crew-panel.jpg` was captioned "DC in AC ožičenje" and has no cable
  in the frame. `site/phone-melden.png` is the GERMAN crop from the Salzburg
  deck and was sitting in a Slovenian document reading "Tagesbericht". This is
  the third session in a row where a filename was trusted over the picture, and
  the fix each time was to open the image at full size.
- **Built the single-line diagram at a font size that is unreadable at the width
  it actually renders.** 10px in a 900-unit viewBox inside a 525px card is about
  6px on screen. Same mistake as the thumbnail lesson from the Salzburg deck, in
  a different unit.
- **The first "no picture yet" tiles were full-width 4:3 boxes**, so an
  admission that a screenshot was missing became the largest object on the
  screen. They are compact now.

## Succeeded

- **The form is genuinely checkable.** 546 modules at 450 W is 245,7 kWp, two
  100 kVA inverters is the 200 kVA on the form, 1,23 DC/AC follows, and the
  258.000 kWh splits 180.600 / 77.400. Strings are 19 rather than the 21 that
  would divide 546 evenly, because 21 at 51,85 V exceeds 1100 V when cold. Trina
  Voc was checked against the datasheet rather than recalled.
- **The regulator makes our own argument for us.** The form's last line tells a
  signer without a qualified certificate to draw the signature with a mouse.
  That sentence is in the picture, next to the step that claims signing works
  with a finger.
- **Text preservation was verified by script, not by reading.** 131 strings from
  the original, 127 present, and the four missing are the editor instructions
  for an editor that no longer exists.

## Next

- **The founder's calls.** Whether the real documents naming Sonce Energija
  d.o.o. should stay (it is an internal file, but internal files get forwarded);
  and whether to translate to de and en now or leave it Slovenian.
- **The shot list**, which is what the five `todo` tiles are: SMS-password
  signing on a desktop, photographing the soglasje, the supplier picker, the
  filing confirmation, and site photographs of an inverter being mounted and of
  terminations being measured.
- **Nine `predlog` tiles are nine unbuilt modules.** The document now states
  that plainly on its face, which it did not before.
