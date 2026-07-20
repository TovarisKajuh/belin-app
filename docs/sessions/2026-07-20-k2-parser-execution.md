# Session: K2 parser execution (K1 to K8)

Date: 2026-07-20. Model: Opus, executing docs/superpowers/plans/2026-07-20-k2-parser-plan.md written by Fable.

## Done

All eight tasks, eight commits, each with its own CHANGELOG entry.

- K1: unpdf and exceljs added; scripts/k2-freeze-fixtures.mjs; the extracted text of all five fixture PDFs frozen into tests/fixtures/k2/text/ and committed; tests/k2-extract.test.ts as the drift detector.
- K2: lib/k2/k2-core.ts with the shapes and parseGermanNumber (16 tests).
- K3: detectK2 and parseFooters, the footer fingerprint (5 tests).
- K4: lib/k2/k2-articles.ts, extractArticleLists and selectItems (10 tests).
- K5: lib/k2/k2-metadata.ts, inline and block mode pairing (8 tests).
- K6: lib/k2/k2-shared.ts as the public facade with parseK2Text, lib/k2/k2-pdf.ts (6 tests).
- K7: lib/k2/k2-xlsx.ts plus synthetic fixtures (6 tests).
- K8: scripts/k2-try.ts, `npm run k2:try`, master plan Part A marked superseded and executed.

Final gate: 143 tests green, tsc clean, production build clean, zero em or en dashes in anything touched.

## Learned

- The plan was pinned to real extracted text and it held up: every predicted page count, breadcrumb, label order and pinned value matched the fixtures exactly. Executing an evidence-pinned plan is a different activity from executing a described one; there was almost no discovery work left to do, which is the whole argument for the plan-on-Fable, execute-on-Opus split.
- Verifying the evidence myself before writing each regex still paid, because it is what surfaced the shape of the two failures below.

## Failed, then fixed

- Composing parseK2Text inside k2-shared.ts as the plan specified would have made it import the two modules that already import it: an import cycle in foundation code. Split the primitives into k2-core.ts (leaf) and left k2-shared.ts as a pure facade. The public entry point is unchanged, so Task C2's contract is unaffected.
- The block mode value run swallowed page furniture. A synthetic test (not any fixture) showed that a page carrying more labels than values silently absorbs the breadcrumb anchor and the footer as values and shifts every field. Fixed in the parser by stopping the value run at structural lines, rather than by weakening the test. No fixture triggers it; a future layout would have.
- exceljs ships `declare interface Buffer extends ArrayBuffer {}`, which merges into the global Buffer type and makes its load() parameter unsatisfiable by any real value. One documented cast on one line, logged as debt.

## Debt taken

- Both xlsx fixtures are synthetic. Get a real K2 Base Excel export from the pilot EPC before hardening.
- The exceljs typings cast, to revisit when upstream fixes its declarations.

## Next

Master plan Task C2: the plan-first project wizard (upload, review, sub attach). It needs migration M2 applied to the live Frankfurt database, so it waits on a founder go-ahead. The parser is usable today without any UI: `npm run k2:try -- <file>`.
