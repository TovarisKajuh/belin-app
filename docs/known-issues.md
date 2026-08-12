# Known issues and upstream traps

Problems that are handled in this codebase but whose CAUSE lives outside it, or
that would return quietly if somebody removed the guard. Each entry says what
breaks, how it was proved, what protects us now, and what would end it for good.

Newest first.

## 1. @react-pdf corrupts the text layer of later documents in a process

**Status: fixed and guarded here. NOT fixed upstream.**

**What happens.** @react-pdf keeps one parsed font per registered family and
builds each PDF's glyph subset against that shared state. When a document
introduces glyphs an earlier one in the same process did not use, the ToUnicode
map it writes stops matching the glyphs it draws.

**Why it is dangerous rather than annoying.** The page looks perfect. Only the
invisible text layer is wrong, so the document copies and searches as something
other than what it displays. Our own nine day completion report copied as
"Kraj" for "Kranj" and "Naročik" for "Naročnik", with every letter "n" missing
and full stops turned into control characters. These documents are evidence: a
subcontractor pastes a line into an email, an accountant's system reads the
invoice, somebody searches a report for a date.

**Why it would have reached production.** It never affects the FIRST document a
process renders. A developer generating one PDF locally sees a perfect file
every time. Only a warm server, which renders many documents of different kinds,
hits it, and by then the corrupt files are already with customers.

**How it was proved (2026-08-12).** Rendering the same document repeatedly never
reproduces it. Rendering documents with a GROWING alphabet in one process does:
documents 3, 4 and 5 of a five document sequence came back with missing letters
and control characters. A large document rendered first inoculates everything
after it, which is why the first regression test passed even with the fix
removed.

**What protects us now.**
- `renderDocument` in `lib/pdf/theme.tsx` deletes and re-registers the font
  family before every render, forcing a fresh subset per document.
- `tests/pdf-font-subset.test.tsx` reproduces the bug's exact shape. It must
  stay in its own file, with small documents first: vitest gives each file its
  own worker, and a large document rendered before it hides the failure.
- `tests/pdf-render-guard.test.ts` fails if any file outside the theme calls
  `renderToBuffer` directly, which is how the bug would return when somebody
  adds a document later.

**Do not use instead:** `Font.clear()` also wipes the built-in Helvetica the
renderer needs internally and throws "Font family not registered: Helvetica".
`Font.reset()` nulls the font data without reloading it and crashes the layout
engine with "Cannot read properties of null (reading 'unitsPerEm')".

**What would end it.** An upstream fix that scopes the glyph subset to a single
render. Worth reporting to @react-pdf with the reproduction above. Until then
the guard stays, and any upgrade of @react-pdf/renderer must be followed by
running `npx vitest run tests/pdf-font-subset.test.tsx` before shipping.

## 2. Supabase storage: upsert does not replace, and download serves a cache

**Status: worked around here. Both behaviours are the platform's, not ours.**

Two separate traps at the same boundary, found together on 2026-08-12 while
making the demo seed rerunnable.

**Trap A: `upload(path, bytes, { upsert: true })` on an existing path returns
SUCCESS and keeps the ORIGINAL bytes.** Verified directly: upload "first",
download (gets "first"), upload "second" with upsert, download again, still
"first", no error at any point. Removing the object first does replace it, but
the delete is EVENTUALLY CONSISTENT, so uploading immediately after it races and
the upload silently keeps the old file again.

**Trap B: `storage.download()` serves a CACHED copy.** After an object at a path
was genuinely replaced, `download()` returned the previous file while a signed
URL for the same path returned the new one, in the same process, milliseconds
apart. This is what made the seed appear to fail on a document that had been
written correctly: the write was fine and the verification was reading a ghost.

**What protects us now.**
- `storeReportPdf` removes the object, waits for the removal to become visible,
  then uploads.
- Anywhere the CONTENT matters rather than just fetching a file, the read goes
  through `createSignedUrl` plus a cache-busting query with `cache: "no-store"`.
  That is `scripts/seed-documents.ts` when verifying what it stored, and
  `acceptPo` when re-hashing a naročilnica before binding an acceptance to it.
  The second one is the important one: comparing a current hash against stale
  bytes would refuse a valid acceptance in front of whoever is signing.

**The rule to keep.** A generated document path is written ONCE. Regenerating a
document means a new row and a new path (the completion report already works
this way, carrying a fresh document id). Anything that rewrites a path inherits
both traps and has to handle them explicitly.

**What would end it.** Nothing on our side; these are platform behaviours. If
Supabase makes upsert replace and download consistent, the wait loop and the
signed-URL reads become redundant rather than wrong.
