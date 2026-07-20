# K2 Parser Implementation Plan (deep dive)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: authored 2026-07-20 by the planning session (Fable). This plan SUPERSEDES Part A (Tasks A1 to A4) of docs/superpowers/plans/2026-07-20-v1-master-plan.md with tasks K1 to K8. The public API (parseK2Pdf, parseK2Xlsx, K2ParseResult) stays exactly as the master plan's consumers (Task C2, the wizard) expect, with the refinements in the Shapes section below. Everything else in the master plan is untouched.

**Goal:** a deterministic, never-throwing parser that turns a K2 Base report PDF (or the article-list Excel export) into a normalized structure: article line items plus project metadata, with warnings instead of failures, proven against five real reports.

**Architecture:** extraction and parsing are strictly separated. unpdf turns bytes into per-page text arrays (the only async, I/O-adjacent step); everything downstream is pure functions over `string[]`, unit-tested against FROZEN extraction snapshots committed to the repo. Real-PDF integration tests exist only to detect extraction drift. The parser is evidence-driven: every rule below cites the fixture and page it was derived from, verified 2026-07-20 by running unpdf over all five fixtures in the planning session.

**Tech:** unpdf (pdf.js wrapper, Node-safe), exceljs (xlsx adapter). Both already in the master plan's dependency list.

## Ground truth: what the five fixtures actually contain (verified by extraction, 2026-07-20)

| Fixture | Pages | Version | Article list | Notes |
|---|---|---|---|---|
| k2-report-2025.pdf | 17 | 3.2.28.0 | NONE | single roof, inline label-value metadata |
| k2-report-2023.pdf | 18 | 3.1.97.0 | NONE | single roof, inline metadata, "Bearbeiter" not "Autor" |
| k2-base-report-annotations.pdf | 10 | none | NONE | K2's explanatory document, NO report fingerprint anywhere: the perfect negative fixture |
| forum1.pdf | 35 | 3.2.21.1 | 3 lists | Dach 1 (p19, 11 rows), Dach 3 (p33, 11 rows), PROJECT TOTAL (p34, 11 rows); block-mode metadata |
| forum2.pdf | 19 | 3.1.97.0 | 1 list | total only (p18, 8 rows) |

Correction to the 2026-07-19 research record: THREE of five fixtures lack the article list, not two. The article list is genuinely optional and the wizard's warnNoArticles path is the common case, not the edge.

### The footer fingerprint (every content page, never the cover)

```
K2 Base Report 3.2.28.0 | 27.02.2025 | 2 Module in Reihe 2/17
K2 Base Report 3.1.97.0 | 19.09.2023 | Neues Projekt 18/19
K2 Base Report 3.2.21.1 | 10.01.2025 | Bietigheim-Bissingen 34/35
```

Constant "K2 Base Report" even in German-language reports (the cover says "K2 Base Bericht", the footer does not translate). The annotations document contains ZERO such lines. Page 1 has no footer, so detection must scan all pages.

### The article table (three pages of forum1, one of forum2; 41 rows total)

```
Position Art-Nr. Artikel Anzahl Gewicht
1 2003215 SingleHook 3S 36 19,1 kg
2 2004115 Wood screw 8×160 72 2,9 kg
7 2003222 SingleRail 36; 4.40 m 9 30,5 kg
...
Summe 58,5 kg
```

Verified properties:
- Every row is ONE physical line. The row regex below matched 41 of 41 real rows with zero partial matches (a line starting like a row but failing the full pattern) across both fixtures. The join-next-line fallback is therefore defensive only.
- Article numbers are exactly 7 digits. Names contain spaces, semicolons, periods used as DECIMALS ("4.40 m"), unicode multiplication signs ("8×160") AND ascii x ("8x100"): the name is captured verbatim, never normalized.
- Anzahl is an integer in all 41 rows (regex tolerates a comma decimal defensively). Gewicht is comma-decimal with " kg" suffix.
- Each list ends with `Summe <weight> kg`. forum1 total (292,9) equals the sum of its per-roof Summe values (207,0 + 85,9): an integrity invariant the parser checks.
- Page classification lives in the BREADCRUMB, which appears near the END of the extracted page text, on the line after the literal `| Connecting Strength`: per-roof lists read `Dächer | Dach 1 | Artikelliste`, the project total reads exactly `Artikelliste`. The table always PRECEDES its breadcrumb in extraction order.

### Metadata: two extraction modes exist in the wild

Inline mode (k2-report-2023 p4, k2-report-2025 p4 and p13): `Windlastzone 2`, `Dachneigung 35°`, `Montagesystem SingleRail`, label and value on one line.

Block mode (forum1 p4): a run of label-only lines followed by a run of value-only lines in the same order, INTERRUPTED by section headings that carry no value (verbatim, including the Lasten heading the pairing must skip):

```
Adresse            <- labels block starts
Lasten             <- HEADING, no value: skipped, does not break the run
Bemessung
Schadensfolgeklasse
Nutzungsdauer
Geländekategorie
Windlastzone
Schneelastzone
Bodenschneelast
74321 Bietigheim-Bissingen, Deutschland    <- values block, same order as labels
DIN EN
CC2
25 Jahre
II/III - gemischtes Profil Wohngebiet
1
2
0,85 kN/m²
```

The parser must try inline pairing first and fall back to positional block pairing. Headings (Lasten, Projektinformation, Materialeigenschaften, Dächer) are skipped while collecting the label run: they neither count nor break it. Without that skip, the literal walk pairs Adresse with "Lasten" and shifts every zone value off by one (review finding 1, verified against the raw extraction). This duality is a fact of pdf.js text ordering over K2's two-column layout, not a version difference we can pin down, so both modes are always attempted. Block pairing is FORBIDDEN on the cover page: cover fields are inline-only and null out when the cover extracts in block mode (forum1's cover would otherwise pair Gesellschaft with a project subtitle; review finding 13).

### Numbers are context-dependent, and this is the nastiest fact in the file

- Weights and the Summe: comma decimal ("292,9 kg").
- Roof-row kWp: PERIOD decimal ("18.655 kWp" means 18.655, verified: 41 modules x 455 Wp; "6.4 kWp", "0.91 kWp").
- Summe kWp row: COMMA decimal ("Summe 57 26,02 kWp", "Summe 2 0,91 kWp").
- Module dimensions: periods as thousands ("1.757x1.134x30 mm" is 1757 mm).

Consequence: a single universal number parser is impossible. The plan defines parseGermanNumber for comma-decimal contexts (weights, Summe values) and computes kWp totals from the Summe row (comma mode) while per-roof kWp prefers Wp x count arithmetic over parsing the period-decimal cell.

### Other verified variance

- Cover labels: 2025 has Projektadresse, Kunde, Gesellschaft, Autor; 2023 has Projektadresse, Gesellschaft, Bearbeiter (no Kunde). "Ausgabedatum & Version 27.02.2025 | K2 Base Version 3.2.28.0" appears on both covers (redundant with the footer; footer wins on conflict).
- Roof overview table columns changed between versions: 2023 "Dach System Modul Leistung Stückzahl Gesamtleistung", 2025 "Dach System Modul Höhe Stückzahl Gesamtleistung".
- Roof rows wrap heavily in 3.2.x (module name split across up to 4 lines). The per-roof count and kWp are reliably the LAST line of the roof's block, matching `^(\d+) ([\d.,]+) kWp$`.
- The statics section's "Allgemeine Informationen" page (one per roof) carries clean inline pairs: Montagesystem, Dachtyp, Dachneigung (with a degree sign), Eindeckung, Gebäudehöhe.
- The project verification banner exists in two states: "DAS PROJEKT IST VERIFIZIERT." and "DAS PROJEKT ENTHÄLT WARNUNG(EN)": captured as a metadata flag, useful signal for the EPC.

## Shapes (refining the master plan; public names unchanged)

```ts
// lib/k2/k2-shared.ts: the public pure API. No imports from server code.
export interface K2LineItem {
  position: number;       // for review-screen ordering
  articleNo: string;      // exactly 7 digits, kept as string
  name: string;           // verbatim, unicode preserved
  qty: number;
  weightKg: number | null;
}

export type K2WarningCode =
  | "no_articles"         // fingerprint ok, zero article rows anywhere
  | "per_roof_fallback"   // no total list; items aggregated from per-roof lists
  | "weight_mismatch"     // sum of row weights disagrees with the printed Summe
  | "meta_incomplete";    // fewer than 3 metadata fields resolved
// The UI (master plan Task C2) maps codes to wizard.* i18n keys; the parser
// emits CODES, not keys (refinement over the master plan: parsers must not
// know about i18n namespaces).

export interface K2Roof {
  name: string;           // "Dach 1"
  moduleCount: number | null;
  kwp: number | null;     // Wp x count / 1000 when both known, else null
}

export interface K2Metadata {
  projectName: string | null;    // from the footer fingerprint (authoritative)
  reportVersion: string | null;  // "3.2.28.0"
  reportDate: string | null;     // ISO "2025-02-27" from "27.02.2025"
  author: string | null;         // cover Autor OR Bearbeiter
  customer: string | null;       // cover Kunde (often absent)
  company: string | null;        // cover Gesellschaft
  address: string | null;        // cover Projektadresse, fallback overview Adresse
  mountingSystem: string | null; // "Allgemeine Informationen" Montagesystem label,
                                 // fallback: known-prefix scan of roof rows
  moduleDesc: string | null;     // raw wrapped module cell, single-spaced
  moduleWp: number | null;       // first /(\d{3,4}) Wp/ in the roof section
  moduleCount: number | null;    // Summe row, second-to-last number
  kwpTotal: number | null;       // Summe row kWp (comma-decimal mode)
  windZone: string | null;       // kept as string ("2", "II/III" style values exist)
  snowZone: string | null;
  roofType: string | null;       // Eindeckung ("Ziegel")
  pitchDeg: number | null;       // Dachneigung
  verified: boolean | null;      // true "IST VERIFIZIERT", false "ENTHÄLT WARNUNG"
  roofs: K2Roof[];
}

export interface K2ParseResult {
  ok: boolean;            // false ONLY when the fingerprint is absent
  metadata: K2Metadata;
  items: K2LineItem[];
  warnings: K2WarningCode[];
}

export function detectK2(pagesText: string[]): { isK2: boolean; version: string | null };
export function parseK2Text(pagesText: string[]): K2ParseResult;
export function parseGermanNumber(raw: string): number | null;
// comma-decimal contexts only: "292,9" 292.9; "1.234,5" 1234.5; "1 234,56" 1234.56;
// "17" 17; "" and "-" null. A bare period with 3+ trailing digits is thousands
// ("2.700" 2700); with 1-2 trailing digits it is a decimal ("2.9" 2.9): rule
// needed because kg values quote one decimal and dimension strings quote thousands.

// internal modules, pure, re-exported for tests:
// lib/k2/k2-articles.ts: extractArticleLists(pagesText) -> ArticlePage[] and
//   selectItems(pages: ArticlePage[]) -> { items; warnings }
// lib/k2/k2-metadata.ts: extractMetadata(pagesText) -> K2Metadata
```

IMPORTANT (finding 4): NO file under lib/k2/ imports "server-only", breaking the repo's usual server-lib convention DELIBERATELY: these modules are Node-safe pure logic plus file parsing, and both the vitest integration tests and the K8 tsx harness import them directly under plain Node, where `import "server-only"` throws. They contain no secrets and touch no environment; the wizard's server actions are the only app callers.

```ts
// lib/k2/k2-pdf.ts (Node-safe, NOT server-only, see above)
export async function parseK2Pdf(bytes: Uint8Array): Promise<K2ParseResult>;
// getDocumentProxy + extractText({ mergePages: false }) inside try/catch;
// ANY extraction throw returns { ok: false, metadata: empty, items: [], warnings: [] }.
// Callers (wizard) treat ok false as the warnNotK2 manual path. NEVER throws.

// lib/k2/k2-xlsx.ts (Node-safe, NOT server-only, see above)
export async function parseK2Xlsx(bytes: Uint8Array): Promise<K2ParseResult>;
// exceljs workbook read in try/catch; first worksheet; header row located by
// finding the row whose cells include "Art-Nr." (tolerant: any cell matching
// /art.?-?nr/i) and "Anzahl"; data rows until the first row whose Art-Nr cell
// is not 7 digits; position from the Position cell when numeric, else the
// running row index (finding 12); ok true when >= 1 item parsed; metadata all null.
```

### The article algorithm, exactly

1. Per page, split to trimmed lines. A page is an ARTICLE PAGE when at least one line matches the ROW regex:
   `^(\d{1,3})\s+(\d{7})\s+(.+?)\s+(\d+(?:,\d+)?)\s+([\d.,]+)\s*kg$`
   (verified: 41 of 41 real rows match; the interior name capture is lazy so trailing qty and weight anchor the split).
2. Defensive join: a line matching `^\d{1,3}\s+\d{7}\s+` but failing the full regex is joined with the following line (single space) and retried ONCE (zero occurrences in fixtures; guards against future name wrapping).
3. Page scope from the breadcrumb: the line immediately after the line that EXACTLY equals `| Connecting Strength` (exact equality, finding 11: the annotations document carries "Connecting Strength" without the pipe, and on covers and closing pages the anchor is the LAST line, so a missing next line means no breadcrumb). `Artikelliste` alone: scope total. Containing `| Dach <n> |`: scope roof n. Missing or unrecognized breadcrumb (future language variants): scope unknown.
4. Page Summe: `^Summe\s+([\d.,]+)\s*kg$` parsed in comma mode.
5. Selection: if any total-scope page exists, its rows are the items (multi-page totals: consecutive total-scope pages concatenated in page order, positions renumbered). Else if roof-scope pages exist: aggregate by articleNo (sum qty, sum weight, keep first name and first-seen order), emit per_roof_fallback. Else if unknown-scope pages exist: treat as total. Else: no_articles.
6. Integrity: when a printed Summe exists for the selected scope, compare against the sum of row weights with tolerance `0.05 * rowCount + 0.2` kg (row weights are printed rounded to 0,1). Mismatch emits weight_mismatch, never failure. For per_roof_fallback, compare against the SUM of the roof Summe values.

### The metadata algorithm, exactly

1. projectName, reportVersion, reportDate from the footer: regex over all pages
   `^K2 Base Report (\S+) \| (\d{2})\.(\d{2})\.(\d{4}) \| (.+?) \d+\/\d+$` (multiline, per line). Take the most frequent (version, date, name) triple: robust against a coincidental body line.
2. Cover (page 1): inline labels Projektadresse, Kunde, Gesellschaft, Autor, Bearbeiter, each `^<Label> (.+)$`; Autor wins over Bearbeiter when both. INLINE ONLY: never block-pair the cover (finding 13; a block-mode cover like forum1's simply yields nulls here and the overview fallback fills what it can). Date and version also parse from `Ausgabedatum & Version` but the footer wins on conflict.
3. Find the overview page: the page whose breadcrumb is `Projektübersicht` (fallback: first page containing the literal `Projektinformation`). On it, two passes:
   - Inline pass: `^Windlastzone (.+)$`, `^Schneelastzone (.+)$`, `^Adresse (.+)$`, `^Name (.+)$`.
   - Block pass (only for labels still null): collect the ordered label run over the known label set (Adresse, Bemessung, Schadensfolgeklasse, Nutzungsdauer, Geländekategorie, Windlastzone, Schneelastzone, Bodenschneelast), SKIPPING the heading set (Lasten, Projektinformation, Materialeigenschaften, Dächer) so a heading neither counts nor breaks the run (finding 1); the value run is the same count of consecutive lines following the LAST label of the run; pair positionally. Pairing is accepted ONLY when the counts match exactly; otherwise the fields stay null (never guess).
4. Summe row anywhere in the overview: `^Summe (\d+) ([\d.,]+) kWp$` gives moduleCount and kwpTotal (comma mode).
5. moduleWp: first `(\d{3,4}) Wp` in the overview. moduleDesc: the lines between the first `^Dach \d+$` line and the Wp line, joined single-spaced, minus a known covering word when it stands alone (Ziegel, Blech, Bitumen, Trapezblech: it belongs to roofType).
6. Roofs: every `^Dach (\d+)$` line in the overview opens a roof block; its count and kwp come from the LAST matching `^(\d+) ([\d.,]+) kWp$` line before the next roof or the Summe. Roof kwp uses, in order (finding 3): the `(\d{3,4}) Wp` match INSIDE the roof's own block times count / 1000 (forum1's Dach 3 carries a different module than Dach 1, so the global Wp would compute 7.28 against the report's 7.36); else the global moduleWp times count / 1000; else the kWp cell parsed in PERIOD-decimal mode. Version limitation (finding 10): in 3.1.97-era reports the roof row is a single merged line, `^Dach (\d+)$` never matches alone, and roofs comes back EMPTY by design; kwpTotal and moduleCount still resolve from the Summe row. Do not chase this; the K5 pins assert roofs only for the 3.2.x fixtures.
7. Statics detail: the first page containing a STANDALONE `Allgemeine Informationen` line AND an inline `^Montagesystem (.+)$` (finding 2: `Montagesystem` alone first matches the Modulfeld pages, p8/p8/p9/p8 across the four reports, which carry no roof detail; the statics pages are p13/p12/p14/p13). That page yields `^Dachtyp (.+)$`, `^Dachneigung (\d+(?:,\d+)?)°$`, `^Eindeckung (.+)$` (roofType prefers Eindeckung; pitch strips the degree sign). Fallback mountingSystem when no such page exists: first `^Montagesystem (.+)$` anywhere, else scan roof blocks for a known system prefix (SingleRail, CrossRail, MiniRail, SpeedRail, D-Dome, S-Dome, SolidRail, TiltUp).
8. verified: presence of `DAS PROJEKT IST VERIFIZIERT` (true) or `ENTHÄLT WARNUNG` (false), else null.
9. meta_incomplete warning when fewer than 3 of {address, kwpTotal, moduleCount, mountingSystem, windZone} resolved: the wizard shows the review screen with mostly empty prefills and the EPC types; the parse is still ok.

## Global constraints

- CLAUDE.md discipline: CHANGELOG.md in the same commit, no em or en dashes anywhere including test fixture names and comments.
- Every parser function is total: bad input yields nulls, empty arrays and warnings, NEVER a throw. tests assert `expect(() => ...).not.toThrow()` on junk inputs.
- Frozen-text testing: pure tests read tests/fixtures/k2/text/*.pages.json, committed in Task K1. Only the two integration tests in K6 touch the real PDFs. If unpdf ever changes its extraction output, the integration tests fail while the pure tests stay green: that split localizes the fault immediately.
- The five PDFs are never modified. The freeze script is rerunnable and deterministic.
- Environment: vitest node environment (existing config), `npx vitest run tests/<file>` per task; `npm run lint` (tsc) after every task.

## Task K1: dependencies, freeze script, extraction smoke

**Files:** package.json (add unpdf, exceljs; @react-pdf/renderer and resend belong to master-plan tasks, NOT here). Create scripts/k2-freeze-fixtures.mjs. Commit generated tests/fixtures/k2/text/*.pages.json (5 files). Test tests/k2-extract.test.ts.

**Interfaces:** produces the frozen `{ totalPages, pages: string[] }` JSON shape every later test consumes.

- [ ] `npm install unpdf exceljs` (two deps only). Commit the lockfile change alone: "chore: add unpdf and exceljs for the k2 parser".
- [ ] scripts/k2-freeze-fixtures.mjs: for each of the five PDFs, `getDocumentProxy(new Uint8Array(readFileSync(...)))`, `extractText(pdf, { mergePages: false })`, write tests/fixtures/k2/text/<name>.pages.json with `{ totalPages, pages }` (JSON.stringify with indent 1). Deterministic: run twice, `git diff` empty.
- [ ] Write tests/k2-extract.test.ts (integration, real PDF): parseK2Pdf does not exist yet, so this test uses the raw unpdf calls inline: extract k2-report-2025.pdf, assert totalPages 17 and that page 2 (index 1) contains "K2 Base Report 3.2.28.0". Run: `npx vitest run tests/k2-extract.test.ts`, expect FAIL (missing dep wiring or path), fix, expect PASS.
- [ ] Run the freeze script, verify the five JSONs exist and page counts are 17, 18, 10, 35, 19.
- [ ] Commit: "feat(k2): fixture text freezing and extraction smoke test"

## Task K2: the number core (TDD)

**Files:** Create lib/k2/k2-shared.ts (parseGermanNumber only, plus the exported types). Test tests/k2-numbers.test.ts.

**Interfaces:** produces parseGermanNumber consumed by K4 and K5.

- [ ] Failing tests, the full pinned table:

```ts
import { describe, expect, it } from "vitest";
import { parseGermanNumber } from "@/lib/k2/k2-shared";

const cases: [string, number | null][] = [
  ["292,9", 292.9],        // forum1 total Summe
  ["58,5", 58.5],          // forum2 Summe
  ["19,1", 19.1],          // row weight
  ["0,85", 0.85],          // Bodenschneelast
  ["26,02", 26.02],        // Summe kWp comma mode
  ["17", 17],
  ["188", 188],
  ["1.234,5", 1234.5],     // thousands dot plus comma decimal
  ["1 234,56", 1234.56],   // stray space (research-documented K2 quirk)
  ["2.700", 2700],         // period with 3 trailing digits: thousands (density value, forum1 p4)
  ["2.9", 2.9],            // period with 1-2 trailing digits: decimal
  ["4.40", 4.4],
  ["", null],
  ["-", null],
  ["kg", null],
];

it.each(cases)("parseGermanNumber(%j) -> %j", (raw, want) => {
  expect(parseGermanNumber(raw)).toBe(want);
});
```

- [ ] Run: `npx vitest run tests/k2-numbers.test.ts`, expect FAIL (not implemented).
- [ ] Implement: trim; empty string or "-" returns null IMMEDIATELY (finding 6: `Number("")` is 0, not NaN, so the early return is load-bearing); strip internal spaces; if both "." and "," present: remove dots, comma to dot; else if only ",": comma to dot; else if only ".": count trailing digits after the last dot, 3 or more means thousands (remove dots), 1 to 2 means decimal; Number(); NaN to null; round to 3 decimals.
- [ ] Run green. `npm run lint` clean.
- [ ] Commit: "feat(k2): german number core with the period-ambiguity rule"

## Task K3: fingerprint and detection (TDD)

**Files:** Modify lib/k2/k2-shared.ts (detectK2, plus an internal parseFooters helper). Test tests/k2-detect.test.ts.

**Interfaces:** produces detectK2 and the footer triples (version, dateIso, projectName) consumed by K5.

- [ ] Failing tests against frozen texts:

```ts
const load = (n: string) =>
  JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")).pages as string[];

it("detects all four real reports with their exact versions", () => {
  expect(detectK2(load("k2-report-2025"))).toEqual({ isK2: true, version: "3.2.28.0" });
  expect(detectK2(load("k2-report-2023"))).toEqual({ isK2: true, version: "3.1.97.0" });
  expect(detectK2(load("forum1"))).toEqual({ isK2: true, version: "3.2.21.1" });
  expect(detectK2(load("forum2"))).toEqual({ isK2: true, version: "3.1.97.0" });
});
it("rejects the annotations document and junk", () => {
  expect(detectK2(load("k2-base-report-annotations")).isK2).toBe(false);
  expect(detectK2([])).toEqual({ isK2: false, version: null });
  expect(detectK2(["random text", "  binary junk"]).isK2).toBe(false);
});
```

- [ ] Implement: per page, per line, match `^K2 Base Report (\S+) \| (\d{2})\.(\d{2})\.(\d{4}) \| (.+?) (\d+)\/(\d+)$`; collect triples; isK2 when at least TWO pages carry a footer (a quoted footer inside some other document cannot false-positive a one-line fluke); version is the most frequent.
- [ ] Run green. Commit: "feat(k2): footer fingerprint detection"

## Task K4: article extraction and selection (TDD)

**Files:** Create lib/k2/k2-articles.ts. Test tests/k2-articles.test.ts.

**Interfaces:** produces extractArticleLists and selectItems consumed by K6's parseK2Text. ArticlePage = `{ pageIndex: number; scope: { kind: "total" } | { kind: "roof"; n: number } | { kind: "unknown" }; rows: K2LineItem[]; summeKg: number | null }`.

- [ ] Failing tests, pinned to the real rows:

```ts
it("forum2: one total list, 8 exact rows", () => {
  const pages = extractArticleLists(load("forum2"));
  expect(pages).toHaveLength(1);
  expect(pages[0].scope).toEqual({ kind: "total" });
  expect(pages[0].summeKg).toBe(58.5);
  const { items, warnings } = selectItems(pages);
  expect(warnings).toEqual([]);
  expect(items).toHaveLength(8);
  expect(items[0]).toEqual({ position: 1, articleNo: "2003215", name: "SingleHook 3S", qty: 36, weightKg: 19.1 });
  expect(items[1].name).toBe("Wood screw 8×160");        // unicode preserved
  expect(items[6]).toEqual({ position: 7, articleNo: "2003222", name: "SingleRail 36; 4.40 m", qty: 9, weightKg: 30.5 });
});

it("forum1: total list wins over the two roof lists", () => {
  const pages = extractArticleLists(load("forum1"));
  expect(pages.map(p => p.scope)).toEqual([
    { kind: "roof", n: 1 }, { kind: "roof", n: 3 }, { kind: "total" },
  ]);
  const { items, warnings } = selectItems(pages);
  expect(items).toHaveLength(11);
  expect(warnings).toEqual([]);
  const summe = pages[2].summeKg!;
  expect(summe).toBe(292.9);
  expect(pages[0].summeKg! + pages[1].summeKg!).toBeCloseTo(summe, 1); // 207,0 + 85,9
});

it("forum1 without page 34: per-roof aggregation with warning", () => {
  const pages = extractArticleLists(load("forum1")).filter(p => p.scope.kind === "roof");
  const { items, warnings } = selectItems(pages);
  expect(warnings).toContain("per_roof_fallback");
  expect(items).toHaveLength(11);
  const screws = items.find(i => i.articleNo === "2004112")!;
  expect(screws.qty).toBe(272);                            // 188 + 84
  expect(screws.weightKg).toBeCloseTo(7.4, 1);             // 5,1 + 2,3
});

it("reports without lists yield no article pages", () => {
  expect(extractArticleLists(load("k2-report-2025"))).toHaveLength(0);
  expect(extractArticleLists(load("k2-report-2023"))).toHaveLength(0);
});

it("a total list spanning two pages concatenates in page order", () => {
  const real = load("forum2");
  const page18 = real[17];
  const extra = "12 2004115 Wood screw 8×160 10 0,4 kg\nSumme 0,4 kg\n| Connecting Strength\nArtikelliste\nK2 Base Report 3.1.97.0 | 19.09.2023 | Neues Projekt 19/19";
  const { items } = selectItems(extractArticleLists([...real.slice(0, 18), extra]));
  expect(items).toHaveLength(9);
  expect(items[8].articleNo).toBe("2004115");
});

it("weight mismatch is a warning, not a failure", () => {
  const doctored = [ "1 2003215 SingleHook 3S 36 19,1 kg\nSumme 99,9 kg\n| Connecting Strength\nArtikelliste\nK2 Base Report x | 01.01.2025 | T 1/1" ];
  const { warnings, items } = selectItems(extractArticleLists(doctored));
  expect(items).toHaveLength(1);
  expect(warnings).toContain("weight_mismatch");
});
```

- [ ] Run FAIL, implement per "The article algorithm, exactly" (row regex, defensive join, breadcrumb classification via the `| Connecting Strength` anchor, selection, Summe tolerance).
- [ ] Run green. Commit: "feat(k2): article lists with breadcrumb scoping and roof aggregation"

## Task K5: metadata extraction (TDD)

**Files:** Create lib/k2/k2-metadata.ts. Test tests/k2-metadata.test.ts.

**Interfaces:** produces extractMetadata consumed by K6. Uses K3's footer triples and K2's number core.

- [ ] Failing tests, one block per fixture, pinned to the verified values:

```ts
it("k2-report-2025: inline mode, full metadata", () => {
  const m = extractMetadata(load("k2-report-2025"));
  expect(m.projectName).toBe("2 Module in Reihe");
  expect(m.reportVersion).toBe("3.2.28.0");
  expect(m.reportDate).toBe("2025-02-27");
  expect(m.author).toBe("Phillip Theele");
  expect(m.customer).toBe("Mustermann");
  expect(m.company).toBe("SEC SolarEnergyConsult Energiesysteme GmbH");
  expect(m.address).toBe("Berliner Ch 11, 39307 Genthin");
  expect(m.mountingSystem).toBe("SingleRail");
  expect(m.moduleWp).toBe(455);
  expect(m.moduleCount).toBe(2);
  expect(m.kwpTotal).toBe(0.91);
  expect(m.windZone).toBe("2");
  expect(m.snowZone).toBe("2");
  expect(m.roofType).toBe("Ziegel");
  expect(m.pitchDeg).toBe(35);
  expect(m.verified).toBe(true);
  expect(m.roofs).toEqual([{ name: "Dach 1", moduleCount: 2, kwp: 0.91 }]);
});

it("k2-report-2023: Bearbeiter maps to author, Leistung-era columns", () => {
  const m = extractMetadata(load("k2-report-2023"));
  expect(m.projectName).toBe("6,400 kWp Meyer Burger");
  expect(m.author).toBe("Phillip Theele");
  expect(m.customer).toBeNull();
  expect(m.moduleWp).toBe(400);
  expect(m.moduleCount).toBe(16);
  expect(m.kwpTotal).toBe(6.4);
  expect(m.verified).toBe(false);      // "ENTHÄLT WARNUNG(EN)"
});

it("forum1: block-mode pairing and two roofs", () => {
  const m = extractMetadata(load("forum1"));
  expect(m.projectName).toBe("Bietigheim-Bissingen");
  expect(m.windZone).toBe("1");        // proves positional block pairing
  expect(m.snowZone).toBe("2");
  expect(m.address).toBe("74321 Bietigheim-Bissingen, Deutschland");
  expect(m.moduleCount).toBe(57);
  expect(m.kwpTotal).toBe(26.02);
  expect(m.roofs).toEqual([
    { name: "Dach 1", moduleCount: 41, kwp: 18.655 },   // 41 x 455 Wp computed
    { name: "Dach 3", moduleCount: 16, kwp: 7.36 },     // 16 x 460: NOTE below
  ]);
});

it("never throws on junk", () => {
  expect(() => extractMetadata([])).not.toThrow();
  expect(extractMetadata(["x"]).projectName).toBeNull();
});
```

NOTE for the forum1 roof test: Dach 3 carries a DIFFERENT module (460 Wp) than Dach 1 (455 Wp). moduleWp is the FIRST Wp found and roofs compute kwp from their OWN block's Wp match when one exists inside the block, falling back to the period-decimal cell parse. The implementer derives per-block Wp exactly this way; the pinned values are the report's own (18.655, 7.36).

- [ ] Run FAIL, implement per "The metadata algorithm, exactly".
- [ ] Run green. Commit: "feat(k2): metadata extraction, inline and block modes"

## Task K6: assembly, the public API, integration tests

**Files:** Modify lib/k2/k2-shared.ts (parseK2Text composing K3+K4+K5, warnings assembly). Create lib/k2/k2-pdf.ts. Test tests/k2-parse.test.ts.

**Interfaces:** produces parseK2Text and parseK2Pdf exactly as the master plan's Task C2 consumes them.

- [ ] Failing tests:

```ts
it("full parse of each frozen fixture", () => {
  const r25 = parseK2Text(load("k2-report-2025"));
  expect(r25.ok).toBe(true);
  expect(r25.items).toEqual([]);
  expect(r25.warnings).toContain("no_articles");
  const rf2 = parseK2Text(load("forum2"));
  expect(rf2.ok).toBe(true);
  expect(rf2.items).toHaveLength(8);
  expect(rf2.warnings).toEqual([]);
  const ann = parseK2Text(load("k2-base-report-annotations"));
  expect(ann.ok).toBe(false);
});

// INTEGRATION (real PDFs, the only tests allowed to read them):
it("parseK2Pdf end to end on forum2", async () => {
  const r = await parseK2Pdf(new Uint8Array(readFileSync("tests/fixtures/k2/forum2.pdf")));
  expect(r.ok).toBe(true);
  expect(r.items).toHaveLength(8);
  expect(r.metadata.reportVersion).toBe("3.1.97.0");
});
it("parseK2Pdf never throws on garbage bytes", async () => {
  const r = await parseK2Pdf(new Uint8Array([1, 2, 3, 4]));
  expect(r.ok).toBe(false);
});
```

- [ ] Implement parseK2Text (detect; not K2 means ok false with empty metadata shell; else metadata + articles + warnings: no_articles when items empty, meta_incomplete per the rule) and parseK2Pdf (try/catch shell per the shape comment).
- [ ] Run the ENTIRE suite: `npm test` green, `npm run lint` clean.
- [ ] Commit: "feat(k2): assembled parser and pdf entry point"

## Task K7: the Excel adapter (TDD)

**Files:** Create lib/k2/k2-xlsx.ts, scripts/k2-make-xlsx-fixture.mjs, generated tests/fixtures/k2/articles.xlsx (committed). Test tests/k2-xlsx.test.ts.

- [ ] Fixture script: exceljs workbook, sheet "Artikelliste", row 1 headers Position, Art-Nr., Artikel, Anzahl, Gewicht; rows: (1, "2003215", "SingleHook 3S", 36, "19,1 kg"), (2, "2004115", "Wood screw 8×160", 72, "2,9 kg"), (3, "2003222", "SingleRail 36; 4.40 m", 9, "30,5 kg"), then a "Summe" row: reproduces the PDF list shape faithfully. Run once, commit the xlsx.
- [ ] Failing tests: parseK2Xlsx returns 3 items matching the K4 pins for those articles; metadata all null; ok true; empty workbook bytes yield ok false without throwing; a sheet with a shifted header row (headers on row 3) still parses (the header-search rule).
- [ ] Implement per the k2-xlsx shape (cells may arrive as numbers or strings; qty Number() when numeric cell, else parseGermanNumber; weight strips " kg" then parseGermanNumber).
- [ ] Run green. Commit: "feat(k2): xlsx article adapter with synthetic fixture"
- [ ] CHANGELOG debt line (carried from the design record): the xlsx fixture is synthetic; obtain one real K2 Base Excel export from the pilot EPC before hardening, and extend the header-search if its shape differs.

## Task K8: the try-harness and the wizard contract

**Files:** Create scripts/k2-try.ts. Modify docs/superpowers/plans/2026-07-20-v1-master-plan.md (Part A heading AND its Data shapes K2 block, see below).

- [ ] scripts/k2-try.ts: `npm run k2:try -- <path-to-pdf-or-xlsx>` prints the K2ParseResult as formatted JSON plus a one-line human summary ("K2 3.1.97.0, 8 artiklov, 58,5 kg, opozorila: brez" / "Ni K2 poročilo."). Purpose: the founder or the pilot EPC can drop ANY fresh K2 export on the parser the moment it exists, days before the wizard UI lands, and future planner-vendor PDFs can be probed the same way. The script imports only lib/k2. Because lib/k2 is TypeScript, the runner is tsx: `npm install -D tsx` in this task (one devDependency, logged in CHANGELOG), and package.json gains `"k2:try": "tsx scripts/k2-try.ts"`.
- [ ] Update the master plan in TWO places (finding 5: otherwise two conflicting shape contracts exist): the Part A heading gains "SUPERSEDED by docs/superpowers/plans/2026-07-20-k2-parser-plan.md (tasks K1 to K8); entry points parseK2Pdf and parseK2Xlsx unchanged", and the master plan's Data shapes K2 block (the lib/k2/k2-shared.ts snippet) gains a first line "SUPERSEDED: the authoritative shapes live in the K2 parser plan's Shapes section (warnings are CODES not i18n keys, K2LineItem carries position, normalizeArticleRows is internal, K2Metadata is the richer shape)". Task C2's executor reads the parser plan's Shapes section as the contract.
- [ ] Dependency note: tsx is one devDependency beyond the master plan's "capped at four" rule; the cap covered runtime dependencies, and this extension is deliberate and logged in CHANGELOG (finding 9).
- [ ] Verify: `npm run k2:try tests/fixtures/k2/forum2.pdf` prints 8 items; `npm run k2:try tests/fixtures/k2/k2-base-report-annotations.pdf` prints "ni K2 poročilo".
- [ ] Commit: "feat(k2): try-harness cli and master plan handoff"

## What this parser deliberately does NOT do (scope fence)

- No OCR, no scanned PDFs: K2 exports are true text (verified all five); a scanned upload fails detection and takes the manual path.
- No language variants beyond German in v1: the row regex and footer fingerprint are language-agnostic (pure numbers and the untranslated "K2 Base Report" footer), so ARTICLES parse from any-language reports already; only METADATA labels are German-bound, and a non-German report degrades to meta_incomplete plus articles, which is acceptable. Extending the label table is a data change, not a design change.
- No other vendors (Schletter, Renusol, Aerocompact, Van der Valk): the adapter seam is parseK2Pdf's normalized K2ParseResult; a future vendor adapter emits the same shape behind a detector chain. Parking lot per the master plan.
- No LLM fallback (founder decision 3, closed 2026-07-20).
- No persistence, storage or UI: plan_imports rows, size caps, mime gates and the review screen belong to master plan Task C2, which consumes this API unchanged.

## Risks and their mitigations

1. K2 ships a new Base version with a changed footer or table layout. Mitigation: the version is captured on every parse and stored in plan_imports.parsed; the try-harness makes a fresh export testable in seconds; detection failing degrades to the manual wizard path, never a broken flow.
2. unpdf extraction order changes on upgrade. Mitigation: frozen-text tests stay green while the two integration tests fail, pinpointing extraction drift; unpdf stays pinned in the lockfile until deliberately upgraded.
3. A real report interleaves the label and value blocks differently than forum1. Mitigation: pairing accepts only exact-count runs and otherwise leaves fields null; meta_incomplete keeps the EPC in control; nothing is guessed.
4. An article list longer than one page. Mitigation: consecutive same-scope pages concatenate (algorithm step 5); a synthetic frozen-text test in K4 covers a two-page total list (append a doctored second page in the test file itself, not in the fixtures).
5. Weight column absent in some export variant. Mitigation: the row regex requires it today because all evidence has it; if a fresh EPC export lacks it, the regex gains an optional weight group and weightKg null flows through the whole chain already (the type allows null from day one).

## Acceptance: this plan is done when

1. `npm test` is green including all six k2 test files, and `npm run lint` is clean.
2. The frozen texts of all five fixtures are committed and regenerable byte-identical by the freeze script.
3. `npm run k2:try tests/fixtures/k2/forum1.pdf` prints 11 items with total-list selection, `... forum2.pdf` prints 8 items, `... k2-report-2025.pdf` prints the no_articles warning with full metadata, `... k2-base-report-annotations.pdf` prints the not-K2 message.
4. Zero em or en dashes in every file this plan touched.
5. Master plan Task C2 can consume parseK2Pdf and parseK2Xlsx without reading this plan (the shapes section is the contract).
