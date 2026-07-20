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

## Then, in the same session: Task C2, the wizard

The founder approved applying M2 and building the wizard, so the session continued into it.

- Migration M2 applied and verified at the database level (plan_imports, purchase_orders, purchase_order_lines, change_orders.amount, plans bucket accepting xlsx), plus a second migration for create_project_from_review.
- lib/k2/k2-project.ts turns a parse result into an editable project draft (9 tests): splitAddress, and the rule that the plan's own country beats the EPC's.
- lib/data/plan-imports.ts (upload, size caps on received bytes, parse, known subs) and lib/data/orgs.ts.
- app/[locale]/app/new (page plus server actions) and components/wizard/Wizard.tsx, styled in the existing dark system with no new palette.

Verified by driving the real UI, not by reading code: forum1.pdf uploaded through the browser prefilled Bietigheim-Bissingen, 26.02 kWp, 57 modules, SingleRail, Ziegel and 11 material rows; committing created the project with 11 items, 2 tokens and the sub attached; the EPC link opened a correct day one dashboard; and the crew link showed the material check gate carrying the same 11 lines with quantities. Re-verified against a real production build after the unpdf import.meta build warning appeared, which turned out to be bundler noise. Every test row, upload and storage object was removed afterwards.

Two probes caught real defects before any UI existed: projects.country is a lowercase de/at/si check constraint (my draft emitted uppercase), and the activity table's kind check has no project_created value, so that insert was dropped rather than widening the constraint for no information gain.

## Next

Master plan Part B (accounts and magic-link auth), which also replaces the wizard's one-function demo gate with requireOfficeActor and unlocks inviting a sub by email. Two debts logged in CHANGELOG.md: orphaned uploads from abandoned wizard runs, and the synthetic xlsx fixture still awaiting a real K2 Excel export.

## Addendum, evening: the hardening plan (Fable planning session)

The founder supplied five real customer reports (kadir-trainer-projekt, martin-lang, petra-ullrich, planung-engelmeier, thomas-woginger) and mandated a bulletproof parser. Following the extract-first rule, all five were run through unpdf and the shipped parser before planning. Findings: kadir is an ENGLISH export (the founder's own K2 account) rejected outright by the slash-date footer; the 3.2.7x era renamed areas (Bereich/Area/custom names) so all four German reports lose their roofs; German prints period decimals in pitch and kWp cells; new covers carry the planner company's own HQ under a bare Adresse label; Austria has wind speed, not zones. Wrote docs/superpowers/plans/2026-07-20-k2-parser-hardening-plan.md (H1 to H8): locale packs as data, breadcrumb grammar instead of area vocabulary, per-area pitch and covering, planned-start harvest, hostile-input caps. Two adversarial reviews produced 24 findings including 2 blockers (a factually wrong forum2 pin; repo-vs-database drift of create_project_from_review, itself a discipline breach from the morning session, repaired by the plan's H6 step 0). All folded. Executed by Opus in a fresh session.

## Third act, same day: the hardening plan executed (Opus, H1 to H8)

Executed docs/superpowers/plans/2026-07-20-k2-parser-hardening-plan.md end to end. Eight tasks, eight commits, 257 tests (up from 152), tsc and build clean.

What actually changed for the product: the founder's own English K2 exports parse (they were rejected outright), all four new German reports recovered their roofs (they had none), both 3.1.97 era fixtures gained roofs previously declared unrecoverable, pitch and covering became per roof data, and the planned installation date the plan states now prefills a visible field.

The plan held up because it was pinned to real extracted text: every predicted page count, breadcrumb, area name and number matched. Three things still needed correcting during execution, all caught by tests rather than by reading:
- A test pin of mine was wrong, not the code: German "4.005" is 4005 under the thousands rule, while petra-ullrich's kWp cell means 4.005. The pin now documents the hazard and explains why roof kWp is computed from wattage times count instead of from that cell.
- The metadata test's roof pins and the k2-project 2023 draft test both had to be upgraded mid plan, exactly where the executability review predicted, each with a comment naming this plan.
- Python string escaping silently mangled two regexes written through a script (a template literal collapsed "\s" to "s"); caught by the type checker and a failing test, then rewritten with String.raw.

The drift repair landed as planned: the deployed create_project_from_review was pulled out of the database with pg_get_functiondef and committed as a baseline migration before being extended, so the repo and the database agree again.

## Next

Master plan Part B (accounts and magic-link auth), which replaces the wizard's one function demo gate and unlocks inviting a sub by email. Standing debt: still no real K2 Excel export has ever been seen, so all three xlsx fixtures remain synthetic.
