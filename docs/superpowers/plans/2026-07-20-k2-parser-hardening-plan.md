# K2 Parser Hardening Plan: locale packs and the breadcrumb grammar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: authored 2026-07-20 by the planning session (Fable), evidence-pinned against five REAL customer reports the founder supplied on top of the five original fixtures, then hardened by two adversarial review passes (data correctness, cold-start executability) whose findings, including two blockers, are folded into this text. Executed by Opus in a separate session. This plan HARDENS the shipped parser (lib/k2/, built earlier today from 2026-07-20-k2-parser-plan.md); public API names stay, every consumer (wizard, k2:try) keeps working.

**Goal:** the parser handles every K2 Base report we have ever seen, German AND English, across the 3.1.x, 3.2.2x and 3.2.7x/3.2.8x eras, with per-area (roof) extraction that survives renamed areas, and refuses nothing it could have partially understood.

## Why this plan exists: what the five real reports broke

Verified by extraction and by running the shipped parser over each file, 2026-07-20 evening. H1 commits the extractions as goldens.

| Report | Version | Language | Pages | Current result | What is wrong |
|---|---|---|---|---|---|
| kadir-trainer-projekt | 3.2.81.0 | ENGLISH | 18 | **"Ni K2 poročilo." (REJECTED)** | Footer date is `24/03/2026`, slashes; the fingerprint regex demands dots. The founder's own K2 account exports English. |
| martin-lang | 3.2.79.0 | German | 46 | 12 items, metadata ok, **roofs []** | Areas are "Bereich 1"/"Bereich 2", not "Dach n". Two areas lost. |
| petra-ullrich | 3.2.78.0 | German | 34 | 11 items, metadata ok, **roofs []** | Same: two "Bereich" areas lost. |
| planung-engelmeier | 3.2.79.0 | German | 22 | 10 items, ok, **roofs [], pitch null** | Area is USER-NAMED "Block 01 - Gezeichnete Belegungsfläche 01"; pitch is "Dachneigung 8.1°", a PERIOD decimal in a German report. |
| thomas-woginger | 3.2.79.0 | German | 31 | 12 items, metadata ok, **roofs []** | Two "Bereich" areas lost. Its two area tail rows are byte-identical ("12 5.34 kWp" twice): tails must be collected as a LIST, never deduplicated. |

### The deep findings, each verified against extracted text

1. **"Dach" is dead vocabulary.** The 3.2.7x+ era names areas "Bereich n" (de), "Area n" (en), or whatever the planner typed ("Block 01 - Gezeichnete Belegungsfläche 01"). The structure that HOLDS across all ten fixtures is the breadcrumb grammar: `<area> | Artikelliste`, `Statikbericht | <area>`, `Ergebnisse | <area>`, `<area> | Montageplan` (English twins: `Bill of material`, `Structural analysis report`, `Results`, `Assembly plan`). Area names must be ENUMERATED from breadcrumbs, not pattern-matched.
2. **BOTH 3.1.97 fixtures get roofs back for free.** k2-report-2023 AND forum2 carry `Statikbericht | Dach 1` and `Ergebnisse | Dach 1` crumbs (review finding: the first draft of this plan wrongly pinned forum2 as roofless; the two files are structurally identical and BOTH resurrect). The two shipped pins that declare their roofs empty are deliberately REPLACED, see H5.
3. **English inverts the number locale.** Weights "0.6 kg", total "Total 94.6 kg", kWp "Total 20 10.00 kWp", dimensions "1,961x1,134x30 mm" (comma thousands: 1961 mm). German keeps comma decimals but STILL prints period decimals in kWp cells and in Dachneigung ("8.1°" in engelmeier). Consequence: locale is a per-REPORT property inferred once (footer date separator: dots germanic, slashes english; fallback term frequency), number parsing is per-locale, and the German branch KEEPS the period-ambiguity rule because German reports genuinely mix.
4. **The English term set is a clean 1:1 mirror.** Cover: Project address / Customer / Company / Author / Planner / Issue date. Overview: heading "Project information", table "Roof System Module Height Quantity Total power", "Total 20 10.00 kWp". Statics: General information / Mounting System (capital S, verified) / Roof type / Roof pitch / Roof covering. Banner: "THE PROJECT IS VERIFIED." Articles: "Position Item no. Item description Quantity Weight", "Total 94.6 kg", crumb "Bill of material".
5. **The cover address trap.** New-era covers (both languages, all five new fixtures) carry the PLANNING COMPANY block: `Gesellschaft/Company <name>` then `Adresse/Address <company HQ>`. On kadir that HQ is the founder's own Maribor address. Rule: on the COVER only `Projektadresse`/`Project address` may fill the project address; bare `Adresse`/`Address` is the company's and is never read there. On the OVERVIEW page `Adresse`/`Address` IS the project address: same label, different page, different meaning.
6. **The area tail row is the end of the line, not the whole line.** German new-era: `12 5.34 kWp` alone on a line, but the area NAME wraps arbitrarily above ("Bereich\n2", four wrapped lines for the custom name). petra merges height in German exactly like English does: `5,00 m 9 4.005 kWp`. English: `7.50 m 20 10 kWp`. The 3.1.97 era merges the whole roof row: `Meyer Burger White 400 400 Wp 16 6.4 kWp`. One END-ANCHORED regex `(\d+)\s+([\d.,]+)\s+kWp$`, excluding lines starting with Summe/Total, matches the count and kWp cell in ALL eras and both languages; verified across all ten overview pages that NO other line false-positives (r2023's "Name 6,400 kWp Meyer Burger" does not end in kWp). Pairing: Nth tail belongs to the Nth enumerated area; accepted only when counts match exactly, else names survive with null numbers. Never guess, never deduplicate tails (thomas).
7. **Austria has no zones.** Austrian reports print `Windgeschwindigkeit 25,8 m/s` / `Basic wind speed 26.7 m/s` and no Windlastzone/Schneelastzone, always as INLINE pairs on the overview (verified: block mode is never involved). The wind figure is harvested into the existing windZone string field only when windZone itself is null; snowZone stays null.
8. **New harvestable fields:** `Planned installation date 23/03/2026` (kadir, on BOTH cover and overview, either source acceptable), Planer as a cover author label, coverings "Blechfalz" and "Tile".
9. **Per-area statics are a gift.** Every area's FIRST `Statikbericht | <name>` page carries the anchor line plus Dachtyp/Dachneigung/Eindeckung (Roof type/Roof pitch/Roof covering), verified for every area of every fixture that has statics pages (martin p20: 20°, Ziegel; martin p37: 40°, Ziegel; kadir p12: 45°, Tile; engelmeier p15: 8.1°, Blechfalz). Pitch and covering become PER-AREA attributes on project_roofs.
10. **Latent double-count bug now reachable:** the shipped selector concatenates unknown-scope article pages as a total. A new-era report with per-area lists and no grand total would double-count every article (martin/petra/thomas escape only because their grand-total page exists and totals win). The grammar routes per-area lists through aggregate-plus-warning instead.
11. **The German warning banner phrasing drifted.** All four new German reports print `DAS PROJEKT IST VERIFIZIERT.` followed by `Bitte überprüfen Sie die Warnung(en)!`. K2 itself calls these verified, so verified=true is CORRECT there; the pack's warningBanner ("ENTHÄLT WARNUNG") covers only the genuinely-unverified old state (k2-report-2023). Comment this in the pack so nobody "fixes" it.

## Architecture: two small modules, everything else stays

```
lib/k2/k2-locale.ts   NEW, leaf: locale packs, locale-aware number/date primitives
lib/k2/k2-crumbs.ts   NEW: breadcrumb grammar, area enumeration (imports k2-locale only)
lib/k2/k2-core.ts     shapes + footer parsing; detection gains lang
lib/k2/k2-articles.ts rewired onto the grammar; selection logic otherwise intact
lib/k2/k2-metadata.ts rewired onto label tables and area enumeration
lib/k2/k2-shared.ts   public facade, same names; parseK2Text assembles diagnostics
lib/k2/k2-pdf.ts      shell + page cap + diagnostics: [] in its notK2 literal
lib/k2/k2-xlsx.ts     English headers; diagnostics: [] in its two literals
```

### k2-locale.ts (leaf, no k2 imports)

```ts
export type K2Lang = "de" | "en";

export interface K2LocalePack {
  lang: K2Lang;
  terms: {
    billOfMaterial: string;        // "Artikelliste" | "Bill of material"
    statics: string;               // "Statikbericht" | "Structural analysis report"
    results: string;               // "Ergebnisse" | "Results"
    overviewCrumb: string;         // "Projektübersicht" | "Project overview"
    overviewHeading: string;       // "Projektinformation" | "Project information" (findOverviewPage fallback)
    roofsSection: string;          // "Dächer" | "Roofs"
    assembly: string;              // "Montageplan" | "Assembly plan"
    moduleFieldPrefixes: string[]; // de ["Modulfeld","Modulbl","Vormontage"] (the "Modulbl" prefix
                                   // catches "Modulblock 4" AND the umlaut plural "Modulblöcke");
                                   // en ["Module array","Module block"]
    totalWord: string;             // "Summe" | "Total"
    verifiedBanner: string;        // "DAS PROJEKT IST VERIFIZIERT" | "THE PROJECT IS VERIFIED"
    warningBanner: string;         // "ENTHÄLT WARNUNG" | "CONTAINS WARNING". NOTE: new-era German
                                   // reports print "Bitte überprüfen Sie die Warnung(en)!" AFTER the
                                   // verified banner; K2 still calls them verified, so verified=true
                                   // is correct there and this phrase is deliberately NOT matched.
  };
  labels: {
    coverAddress: string[];        // ["Projektadresse"] | ["Project address"]  COVER-ONLY address source
    customer: string[];            // ["Kunde"] | ["Customer"]
    company: string[];             // ["Gesellschaft"] | ["Company"]
    author: string[];              // ["Autor","Bearbeiter","Planer"] | ["Author","Planner"] (array order = priority)
    plannedInstall: string[];      // ["Geplantes Installationsdatum"] | ["Planned installation date"]
    address: string[];             // overview only: ["Adresse"] | ["Address"]
    windZone: string[];            // ["Windlastzone"] | ["Wind load zone"]
    snowZone: string[];            // ["Schneelastzone"] | ["Snow load zone"]
    windSpeed: string[];           // ["Windgeschwindigkeit"] | ["Basic wind speed"]
    name: string[];                // ["Name"]
    mountingSystem: string[];      // ["Montagesystem"] | ["Mounting System"]
    staticsAnchor: string;         // "Allgemeine Informationen" | "General information"
    roofType: string[];            // ["Eindeckung"] | ["Roof covering"]
    pitch: string[];               // ["Dachneigung"] | ["Roof pitch"]
  };
  blockLabels: string[];           // de set as shipped; en mirror
  blockHeadings: string[];         // de set as shipped plus "Load settings","Project information","Material values" for en
  coverings: string[];             // de: Ziegel, Blech, Blechfalz, Bitumen, Trapezblech, Wellblech, Kies, Folie
                                   // en: Tile, Sheet metal, Corrugated sheet, Bitumen, Gravel, Foil
                                   // pinned by fixtures: Ziegel, Blechfalz, Tile; the rest best-effort
}

export const LOCALES: Record<K2Lang, K2LocalePack>;

/** Footer date separators first ('.' -> de, '/' -> en); zero footers or mixed:
 *  count pack term occurrences across all pages, majority wins, tie or zero hits -> de. */
export function inferLocale(pagesText: string[], footers: K2Footer[]): K2Lang;

/** de: the shipped comma-decimal rules INCLUDING the period-ambiguity rule.
 *  en: period decimal; commas stripped as thousands ("1,961"->1961, "10.00"->10, "94.6"->94.6).
 *  Total, never throws, null on junk. */
export function parseLocaleNumber(raw: string, lang: K2Lang): number | null;

/** "24.03.2026" and "24/03/2026" -> "2026-03-24" (day-first in both). Null on junk. */
export function parseLocaleDate(raw: string): string | null;
```

parseGermanNumber stays exported from k2-core; its body becomes `parseLocaleNumber(raw, "de")`; its 15-case test table (tests/k2-numbers.test.ts, fifteen cases, count verified) stays green.

### k2-crumbs.ts

```ts
export type CrumbKind =
  | { kind: "bomTotal" }
  | { kind: "bomArea"; area: string }
  | { kind: "statics"; area: string }
  | { kind: "results"; area: string }
  | { kind: "assembly"; area: string }
  | { kind: "overview" }
  | { kind: "other" };

export function classifyCrumb(crumb: string, pack: K2LocalePack): CrumbKind;
export function enumerateAreas(pagesText: string[], pack: K2LocalePack): string[];
```

classifyCrumb, normative rules in order (segments = crumb split on " | ", trimmed, EMPTY TRAILING SEGMENTS DROPPED: engelmeier's PDF truncates some crumbs to "... | Modulfeld 1 |" with a dangling pipe and the classifier must tolerate it):

1. crumb equals billOfMaterial -> bomTotal.
2. segments contain billOfMaterial -> bomArea. Area = the segments minus the billOfMaterial segment, minus any segment equal to roofsSection, minus any segment starting with a moduleFieldPrefixes entry, joined " | ". Verified this leaves exactly one segment on every fixture ("Dächer | Dach 1 | Artikelliste" -> "Dach 1"; "Bereich 1 | Artikelliste" -> "Bereich 1").
3. first segment equals statics or results, 2+ segments -> statics/results with area = remaining segments joined (statics/results crumbs never carry roofsSection in any fixture).
4. LAST segment equals assembly -> assembly, area = the OTHER segments minus roofsSection minus moduleFieldPrefixes-prefixed, joined. (REVIEW BLOCKER FIX: "Dächer | Dach 1 | Montageplan" must yield "Dach 1", not "Dächer | Dach 1"; without stripping roofsSection here, forum1 enumerates four bogus names and pairing refuses, a regression.)
5. crumb equals overviewCrumb -> overview.
6. else other (covers, "Inhalt"/"Contents", "Über uns"/"About us", reseller URLs like "www.Photovoltaik4all.de", bare project-name crumbs like "Kadir Trainer Projekt", bare area intros like "Bereich 1": single-segment crumbs are NEVER area sources, they collide with project names and ads).

enumerateAreas: ordered unique area names by FIRST appearance, from bomArea, statics, results and assembly kinds. Pinned truth (every entry hand-verified against the crumb maps):
forum1 ["Dach 1","Dach 3"]; k2-report-2025 ["Dach 1"]; k2-report-2023 ["Dach 1"] (UPGRADE);
forum2 ["Dach 1"] (UPGRADE, review blocker fix: it has Statikbericht/Ergebnisse/Montageplan crumbs for Dach 1);
martin-lang ["Bereich 1","Bereich 2"]; petra-ullrich ["Bereich 1","Bereich 2"]; thomas-woginger ["Bereich 1","Bereich 2"];
planung-engelmeier ["Block 01 - Gezeichnete Belegungsfläche 01"]; kadir ["Area 1"]; annotations [].

### Detection, shapes and signatures (executability fixes folded)

- FOOTER_RE date part widens to `(\d{2})[./-](\d{2})[./-](\d{4})`; still >= 2 footers.
- detectK2 returns `{ isK2: boolean; version: string | null; lang: K2Lang | null }`; rejection pin is `{ isK2: false, version: null, lang: null }`. tests/k2-detect.test.ts toEqual pins ALL change; that file is in H2's Files list.
- `extractArticleLists(pagesText, lang?: K2Lang)` and `extractMetadata(pagesText, lang?: K2Lang)`: lang OPTIONAL, inferred internally when omitted, so every existing one-argument call site and test stays valid.
- ArticleScope changes shape: `{ kind: "total" } | { kind: "roof"; area: string } | { kind: "unknown" }`. The shipped pins in tests/k2-articles.test.ts (`{ kind: "roof", n: 1 }` etc) are named UPGRADES: they become `{ kind: "roof", area: "Dach 1" }` and `{ kind: "roof", area: "Dach 3" }`.
- K2Metadata gains `reportLanguage: K2Lang | null` and `plannedInstallDate: string | null` (ISO); emptyMetadata() gains both nulls.
- K2Roof and DraftRoof gain `pitchDeg: number | null` and `covering: string | null`.
- K2ParseResult gains `diagnostics: string[]`, ASSEMBLED ONLY inside parseK2Text from what it observes: "locale:<lang>", "footers:<n>", "areas:<n>" (enumerateAreas result length), "roofsPaired:<yes|no|none>" (derived: roofs.length === 0 -> none; every roof has non-null moduleCount -> yes; else no). No other module produces diagnostics; the extract functions keep their return types. The three not-K2/failure literals that must gain `diagnostics: []`: k2-pdf.ts notK2(), k2-xlsx.ts failed() AND its success literal, lib/data/plan-imports.ts catch fallback, k2-shared.ts parseK2Text's not-K2 branch.

### The area algorithm, exactly (replaces ROOF_HEAD walking)

1. names = enumerateAreas(pages, pack).
2. On the overview page (crumb equals overviewCrumb; fallback: first page containing the standalone overviewHeading line, BOTH languages defined), collect tail rows IN ORDER AS A LIST (thomas has two identical ones): lines matching `(\d+)\s+([\d.,]+)\s+kWp$` end-anchored, excluding lines starting with totalWord.
3. Blocks: the text between consecutive tail rows; the first block starts after the roofsSection header line when present, else at the top of the page. Tail rows themselves belong to no block. Per block: own Wp match (`(\d{3,4}) Wp`); covering = first line equal to a pack covering; moduleType = lines strictly between the covering line and the Wp line, joined single-spaced, minus a leading known mounting-system prefix. If the block has NO covering line or NO Wp line, moduleType is NULL (review fix: the merged-row 3.1.97 blocks would otherwise sweep the table header into moduleType and the wizard's leading material line would be garbage). Area names are never read from blocks (they wrap arbitrarily).
4. kwp per area: block Wp x count / 1000 when both known (this covers every fixture: verified each block carries its own Wp line in all nine article-bearing reports), else the tail's kWp cell via parseLocaleNumber (de ambiguity rule handles "5.34"; the "18.655"-style 3-digit hazard never reaches cell parsing in any fixture).
5. Pairing: names.length === tails.length -> pair by order. Else names survive with null counts/kwp. Never guess.
6. Per-area statics enrichment: for each name, the FIRST page classified statics(name) carrying the staticsAnchor line yields pitchDeg via `(Dachneigung|Roof pitch) ([\d.,]+)°?` parsed period-tolerant, and covering via the roofType labels. These fill that K2Roof.
7. PROJECT-level pitch uses the SAME period-tolerant regex (review fix: engelmeier's project pitchDeg must come out 8.1, not stay null; the shipped comma-only regex is replaced in both places). Project-level roofType keeps its shipped meaning. Project-level moduleDesc: when the shipped `^Dach \d+$` walk finds nothing (all new-era reports), moduleDesc = the FIRST area's moduleType (may be null for merged-row-era reports; that is honest).
8. Modules total: `(Summe|Total) (\d+) ([\d.,]+) kWp` with locale numbers ("10.00" en -> 10).

### Metadata label pass (bilingual)

Every inlineValue goes through pack label arrays (array order = priority, Autor before Bearbeiter before Planer). Cover: STRICTLY coverAddress for address (the trap, finding 5; kadir pin asserts Wiener Neustadt, never Maribor). Overview adds windSpeed -> windZone fallback (only when windZone null) and plannedInstall -> plannedInstallDate (cover or overview, first found, via parseLocaleDate). Verified banner via pack; block mode keeps the shipped algorithm with pack-supplied label and heading sets, still forbidden on the cover.

## Tasks

Environment per task: `npx vitest run tests/<file>`, then `npm run lint`; CHANGELOG.md entry in the same commit; no em or en dashes anywhere; the suite must be GREEN after every task's commit (test-file updates ride in the SAME task as the change that forces them).

### Task H1: freeze the five real reports, extend the harness

**Files:** scripts/k2-freeze-fixtures.mjs (add the five names), regenerate tests/fixtures/k2/text/*.pages.json (ten committed), tests/k2-extract.test.ts.

- [ ] Extend the freeze list; run; page counts kadir 18, martin-lang 46, petra-ullrich 34, planung-engelmeier 22, thomas-woginger 31; rerun for byte-identity.
- [ ] tests/k2-extract.test.ts has two prose tests and NO page-count table: ADD a per-fixture page-count assertion block for all ten, plus the kadir canary (page index 1 contains "K2 Base Report 3.2.81.0").
- [ ] Commit: "test(k2): freeze five real customer reports as goldens"

### Task H2: locale core (TDD)

**Files:** create lib/k2/k2-locale.ts; modify lib/k2/k2-core.ts (FOOTER_RE, detectK2 lang, parseGermanNumber delegates, emptyMetadata new nulls); modify tests/k2-detect.test.ts (all toEqual pins gain lang); create tests/k2-locale.test.ts.

- [ ] Failing tests: parseLocaleNumber en "0.6"->0.6, "94.6"->94.6, "10.00"->10, "1,961"->1961, "26.7"->26.7, "0.900"->0.9, ""->null; de branch: the 15-case shipped table green via parseGermanNumber; parseLocaleDate both formats -> "2026-03-24", junk -> null; inferLocale kadir "en", all nine others "de".
- [ ] Detection pins: kadir {isK2 true, version "3.2.81.0", lang "en"}; martin/petra/engelmeier/thomas lang "de" versions 3.2.79.0/3.2.78.0/3.2.79.0/3.2.79.0; five originals unchanged plus lang "de"; annotations and junk -> {isK2 false, version null, lang null}.
- [ ] Commit: "feat(k2): locale packs, english detection, locale-aware numbers"

### Task H3: the breadcrumb grammar (TDD)

**Files:** create lib/k2/k2-crumbs.ts; create tests/k2-crumbs.test.ts.

- [ ] Failing tests: the classifyCrumb rule table including "Dächer | Dach 1 | Artikelliste" -> bomArea "Dach 1", "Dächer | Dach 1 | Montageplan" -> assembly "Dach 1" (the blocker fix), "Bill of material" -> bomTotal, "Structural analysis report | Area 1" -> statics "Area 1", dangling-pipe "Block 01 - Gezeichnete Belegungsfläche 01 | Modulfeld 1 |" -> other, "www.Photovoltaik4all.de" -> other, "Kadir Trainer Projekt" -> other, "Bereich 1" -> other; enumerateAreas pinned for ALL TEN fixtures exactly as this plan's table, forum2 ["Dach 1"] included.
- [ ] Commit: "feat(k2): breadcrumb grammar and area enumeration"

### Task H4: articles on the grammar (TDD)

**Files:** modify lib/k2/k2-articles.ts (ArticleScope area string; scope via classifyCrumb; Summe|Total; locale numbers); tests/k2-articles.test.ts (extend AND upgrade the named scope pins).

- [ ] Scope pin upgrades named: forum1's `{kind "roof", n 1}`/`{kind "roof", n 3}` become `{kind "roof", area "Dach 1"}`/`{kind "roof", area "Dach 3"}`.
- [ ] New pins: kadir 8 exact rows (row 2 `{articleNo "2004545", name "K2 Clamp EC 25-40 Black", qty 8, weightKg 0.6}`), scope bomTotal via "Bill of material", summeKg 94.6 from "Total 94.6 kg"; martin three lists (bomArea "Bereich 1" 10 rows, "Bereich 2" 11 rows, total 12 wins); petra 11; engelmeier 10; thomas 12; synthetic per-area-without-total -> aggregation + per_roof_fallback (kills the double-count).
- [ ] Every other shipped article test stays green verbatim.
- [ ] Commit: "feat(k2): article extraction across languages and the area grammar"

### Task H5: metadata across languages and areas (TDD)

**Files:** modify lib/k2/k2-metadata.ts; tests/k2-metadata.test.ts; tests/k2-project.test.ts (the 2023 draft test and the moduleItemsFromRoofs literals MUST update in this task or the suite goes red mid-plan); lib/k2/k2-project.ts ONLY if DraftRoof literal compatibility requires optional fields now (prefer updating test literals instead).

- [ ] kadir full pin: projectName "Kadir Trainer Projekt", reportDate "2026-03-24", reportLanguage "en", customer "Kadir", company "Avesol d.o.o.", author "Jan Drozg", address "Felixdorfer G. 34B, 2700 Wiener Neustadt, Austria" (the trap test: NEVER the Maribor company address), mountingSystem "SolidRail", moduleWp 500, moduleCount 20, kwpTotal 10, roofType "Tile", pitchDeg 45, verified true, plannedInstallDate "2026-03-23", roofs [{name "Area 1", moduleCount 20, kwp 10, moduleType "TSM-500NEG18R.25 (Vertex S+) 1,961x1,134x30 mm", pitchDeg 45, covering "Tile"}].
- [ ] martin pin: roofs [{Bereich 1, 12, 5.34, pitchDeg 20, covering "Ziegel"}, {Bereich 2, 10, 4.45, pitchDeg 40, covering "Ziegel"}], kwpTotal 9.79, moduleCount 22, windZone "25,8 m/s", author "Samuel Wolf", company "Lumix Solutions GmbH".
- [ ] engelmeier pin: one roof {name "Block 01 - Gezeichnete Belegungsfläche 01", moduleCount 33, kwp 14.85, covering "Blechfalz", pitchDeg 8.1, moduleType "TSM-450 NEG9R.25 Vertex S+ 1.762x1.134x30 mm" (wrap-mangled SKU, pinned AS-IS so nobody "fixes" it into refusal)}; PROJECT pitchDeg 8.1 (the period fix applies at both levels). petra: two roofs 9+6=15; thomas: two roofs 12+12=24 (identical tails, list not set).
- [ ] UPGRADES named: k2-report-2023 roofs -> [{name "Dach 1", moduleCount 16, kwp 6.4, moduleType null (merged-row block: no covering, no Wp line inside the block), pitchDeg and covering from its statics pages, pin the frozen-golden values}]; forum2 roofs -> [{name "Dach 1", moduleCount 16, kwp 6.88, moduleType null, statics values pinned from goldens}]; both replaced pins' comments name this plan. tests/k2-project.test.ts "roofs never break out" test rewritten to assert the RESURRECTED roofs and the panel line (16 modules).
- [ ] forum1 and k2-report-2025 roof pins gain pitchDeg/covering from their statics goldens; all ten never-throw.
- [ ] Commit: "feat(k2): bilingual metadata, per-area statics, resurrected 3.1.97 roofs"

### Task H6: shapes to the product (schema, wizard, dashboard, draft)

**Files:** NEW migration supabase/migrations/20260720180000_create_project_from_review_baseline.sql (step 0 below); NEW migration supabase/migrations/20260720190000_roofs_pitch_covering.sql; lib/database.types.ts (hand-mirror: project_roofs Row/Insert/Update gain pitch_deg and covering; rpc Args unchanged, jsonb); lib/k2/k2-project.ts (DraftRoof pitchDeg/covering, ProjectDraft.plannedStart, draft mapping); lib/data/plan-imports.ts (ReviewPayload roofs fields ride through as jsonb, no type change needed beyond DraftRoof); components/wizard/Wizard.tsx (roof card small line, plannedStart visible field, hardcoded null replaced); lib/data/epc-dashboard.ts (DashboardRoof + select gain pitch_deg, covering); components/epc/dashboard/RoofPanel.tsx; tests/k2-project.test.ts (kadir draft: plannedStart "2026-03-23").

- [ ] STEP 0, the drift repair (review blocker): the repo's migration 20260720150000 holds the OLD 7-argument function; the LIVE database runs the 8-argument body with the roofs loop that was applied via connector this morning and never committed. Write 20260720180000_create_project_from_review_baseline.sql containing EXACTLY the live definition (verified via pg_get_functiondef during planning): the 8-arg signature `(p_import_id uuid, p_epc_org_id uuid, p_sub_org_id uuid, p_project jsonb, p_items jsonb, p_epc_token text, p_sub_token text, p_roofs jsonb default null)`, country/language whitelists, for-update import lock, double-commit refusal, sub-org type check, the projects insert (16 columns ending plan_pdf_path), the two token inserts, the items loop (skip blank names, default unit kos, sequential sort_order), the ROOFS loop inserting (project_id, name, module_count, kwp, module_type, sort_order), the plan_imports backfill. Do NOT write this from the repo file: pull it live (`select pg_get_functiondef('public.create_project_from_review(uuid,uuid,uuid,jsonb,jsonb,text,text,jsonb)'::regprocedure)`) and diff against expectations before committing.
- [ ] 20260720190000: `alter table public.project_roofs add column pitch_deg numeric(4,1) check (pitch_deg >= 0), add column covering text;` then create-or-replace the function ON TOP OF the baseline body with the roofs loop extended to insert pitch_deg `(v_roof->>'pitchDeg')::numeric` and covering `nullif(trim(coalesce(v_roof->>'covering', '')), '')`. Apply via connector AND commit both files. Probe: roof with pitch/covering round-trips; pitch -1 refused.
- [ ] plannedStart chain, all four stops (review fix: the wizard hardcodes plannedStart null today): K2Metadata.plannedInstallDate -> ProjectDraft.plannedStart (k2-project mapping) -> a VISIBLE date input in the review grid using the EXISTING wizard.fieldStart i18n key (input type="date", b-field styling; no new i18n keys anywhere in this plan: the roof card's pitch/covering line renders raw data like "45° · Tile", no label, so messages parity is untouched) -> Wizard commit payload sends draft.plannedStart instead of null.
- [ ] Wizard roof card and RoofPanel show the pitch/covering line when present; epc-dashboard select and DashboardRoof carry them.
- [ ] Manual drive per the house ritual, dev server: kadir end to end (English report -> Wiener Neustadt address, Area 1 roof card "45° · Tile", 20 panels leading material, plannedStart prefilled 2026-03-23 and visible), martin-lang (two Bereich roofs), phone viewport 375px no overflow, then DELETE the test projects and storage objects, database back to seeded counts.
- [ ] Commit: "feat(wizard): per-roof pitch and covering, planned start from the plan"

### Task H7: hostile-input hardening

**Files:** lib/k2/k2-core.ts (toLines slices each line to 400 chars before any regex: the lazy row regex backtracks quadratically on crafted lines), lib/k2/k2-pdf.ts (reject > 300 pages before extractText), lib/k2/k2-xlsx.ts (header search: /item\s*no/i alongside /art.?-?nr/i; "Item description" name column), tests: fuzz suite (10MB single line, 400 junk pages, null bytes, RTL, emoji, dangling-pipe crumbs), a synthetic English-header xlsx fixture case.

- [ ] Commit: "feat(k2): hostile input caps and english xlsx headers"

### Task H8: acceptance sweep and the paper trail

- [ ] k2:try over all ten PDFs, pinned: kadir "K2 3.2.81.0, 8 artiklov, 94,6 kg, opozorila: brez"; martin 12; petra 11; engelmeier 10; thomas 12; forum1 11; forum2 8; k2-report-2025 0 + no_articles; k2-report-2023 0 + no_articles; annotations "Ni K2 poročilo." (k2:try itself needs no changes, verified.)
- [ ] Full gate: npm test, lint, build, dash sweep over every touched file.
- [ ] DECISIONS: (a) locale packs + breadcrumb grammar are THE extension mechanism, vocabulary is data; (b) the cover-address trap rule; (c) pairing refuses on count mismatch and never guesses; (d) diagnostics live only in parseK2Text and are machine notes, not UI. CHANGELOG per commit already done. Session log. Master-plan Part A note gains one line pointing here.
- [ ] Commit: "docs(k2): hardening session log and decisions"

## Scope fence (deliberately NOT in this plan)

- No third language (French/Italian exist in K2 Base; a future pack is data plus fixtures, not design).
- No OCR, no scanned PDFs, no other vendors, no LLM fallback (founder decision 3 stands).
- No xlsx beyond the header widening: still zero real Excel exports seen; the debt stays open and loud.
- No re-parse of committed plan_imports.
- The new-era German "Bitte überprüfen Sie die Warnung(en)" phrase is NOT a warning state (finding 11); do not chase it.

## Risks

1. K2 renames a term: detection still passes (footers are language-stable), metadata degrades to meta_incomplete, diagnostics plus k2:try pinpoint the missing term; the fix is a pack-table edit plus a fixture.
2. Mixed-language report: footers decide; term-frequency fallback is majority across pages.
3. An overview omits a tail row: pairing refuses, names survive with null counts, the wizard's reconciliation line surfaces the gap.
4. H6 touches live schema and a live function: additive nullable columns; the baseline file is pulled from the database, not reconstructed; probes before commit, same discipline as every prior migration.

## Acceptance: this plan is done when

1. The H8 table holds via k2:try against all ten PDFs.
2. npm test green; the ONLY replaced pins are the ones this plan names (detect lang shapes, forum1 article scopes, 2023 and forum2 roofs, the k2-project 2023 draft test), each comment naming this plan.
3. kadir round-trips through the WIZARD into a project whose address is Wiener Neustadt (not Maribor), roof card "Area 1, 20 modulov, 45° · Tile", material list led by 20 panels, plannedStart 2026-03-23 visible on review and stored.
4. martin-lang round-trips with two Bereich roofs and 22 panels leading the material list.
5. Zero em or en dashes in every touched file; every commit carries its CHANGELOG entry.
