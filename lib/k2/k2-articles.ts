// Article list extraction and selection. Pure, total, never throws.
// See lib/k2/k2-core.ts for why nothing here imports "server-only".
import {
  parseFooters,
  readBreadcrumb,
  toLines,
  type K2LineItem,
  type K2WarningCode,
} from "@/lib/k2/k2-core";
import { classifyCrumb } from "@/lib/k2/k2-crumbs";
import { inferLocale, parseLocaleNumber, LOCALES, type K2Lang } from "@/lib/k2/k2-locale";

export type ArticleScope =
  | { kind: "total" }
  // The area NAME as the document writes it. Not a number: K2 renamed roofs to
  // Bereich and Area, and planners rename them to anything at all.
  | { kind: "roof"; area: string }
  | { kind: "unknown" };

export interface ArticlePage {
  pageIndex: number;
  scope: ArticleScope;
  rows: K2LineItem[];
  summeKg: number | null;
}

// "1 2003215 SingleHook 3S 36 19,1 kg"
// The name capture is lazy so the trailing quantity and weight anchor the
// split. Verified against all 41 real rows with zero partial matches.
const ROW_RE = /^(\d{1,3})\s+(\d{7})\s+(.+?)\s+(\d+(?:,\d+)?)\s+([\d.,]+)\s*kg$/;
// A line that starts like a row but does not complete: candidate for rejoining.
const ROW_START_RE = /^\d{1,3}\s+\d{7}\s+/;
/** "Summe 292,9 kg" and "Total 94.6 kg" are the same row in two languages. */
function summeRe(pack: { terms: { totalWord: string } }): RegExp {
  return new RegExp(String.raw`^${pack.terms.totalWord}\s+([\d.,]+)\s*kg$`);
}

function parseRow(line: string, position: number, lang: K2Lang): K2LineItem | null {
  const m = ROW_RE.exec(line);
  if (!m) return null;

  const qty = parseLocaleNumber(m[4], lang);
  if (qty === null) return null;

  return {
    position,
    articleNo: m[2],
    name: m[3].trim(),
    qty,
    weightKg: parseLocaleNumber(m[5], lang),
  };
}

function readScope(lines: string[], lang: K2Lang): ArticleScope {
  const crumb = readBreadcrumb(lines);
  if (crumb === null) return { kind: "unknown" };

  const classified = classifyCrumb(crumb, LOCALES[lang]);
  if (classified.kind === "bomTotal") return { kind: "total" };
  if (classified.kind === "bomArea") return { kind: "roof", area: classified.area };

  return { kind: "unknown" };
}

/** Every page that carries at least one article row, in page order. */
export function extractArticleLists(pagesText: string[], lang?: K2Lang): ArticlePage[] {
  if (!Array.isArray(pagesText)) return [];

  // Callers that already know the language pass it; everyone else (including
  // every existing test) gets it inferred here, so the one argument form stays
  // valid.
  const resolved: K2Lang = lang ?? inferLocale(pagesText, parseFooters(pagesText));
  const pack = LOCALES[resolved];
  const SUMME_RE = summeRe(pack);

  const out: ArticlePage[] = [];

  pagesText.forEach((pageText, pageIndex) => {
    const lines = toLines(pageText);
    const rows: K2LineItem[] = [];
    let summeKg: number | null = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      const row = parseRow(line, rows.length + 1, resolved);
      if (row) {
        rows.push(row);
        continue;
      }

      // Defensive rejoin: a line that starts like a row but does not complete
      // is retried ONCE joined with the next line. Zero occurrences in the five
      // fixtures; this guards against future name wrapping.
      if (ROW_START_RE.test(line) && i + 1 < lines.length) {
        const joined = parseRow(`${line} ${lines[i + 1]}`, rows.length + 1, resolved);
        if (joined) {
          rows.push(joined);
          i += 1;
          continue;
        }
      }

      const summe = SUMME_RE.exec(line);
      if (summe) summeKg = parseLocaleNumber(summe[1], resolved);
    }

    if (rows.length > 0) {
      out.push({ pageIndex, scope: readScope(lines, resolved), rows, summeKg });
    }
  });

  return out;
}

function renumber(items: K2LineItem[]): K2LineItem[] {
  return items.map((item, i) => ({ ...item, position: i + 1 }));
}

function sumWeights(items: K2LineItem[]): number | null {
  const known = items.filter((i) => i.weightKg !== null);
  if (known.length === 0) return null;
  return known.reduce((acc, i) => acc + (i.weightKg ?? 0), 0);
}

/**
 * Row weights are printed rounded to 0,1 kg, so the accumulated rounding error
 * grows with the row count. Anything inside this band is agreement.
 */
function weightTolerance(rowCount: number): number {
  return 0.05 * rowCount + 0.2;
}

function aggregateByArticle(items: K2LineItem[]): K2LineItem[] {
  const byArticle = new Map<string, K2LineItem>();

  for (const item of items) {
    const seen = byArticle.get(item.articleNo);
    if (!seen) {
      byArticle.set(item.articleNo, { ...item });
      continue;
    }
    seen.qty += item.qty;
    // A null weight anywhere leaves the aggregate null rather than understating it.
    seen.weightKg =
      seen.weightKg === null || item.weightKg === null
        ? null
        : Math.round((seen.weightKg + item.weightKg) * 1000) / 1000;
  }

  return renumber([...byArticle.values()]);
}

/**
 * Picks the authoritative item list out of the extracted pages.
 *
 * A project total list wins outright. Failing that, per roof lists are summed
 * per article number and flagged, because the EPC is then looking at a number
 * this parser computed rather than one K2 printed.
 */
export function selectItems(pages: ArticlePage[]): {
  items: K2LineItem[];
  warnings: K2WarningCode[];
} {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { items: [], warnings: ["no_articles"] };
  }

  const warnings: K2WarningCode[] = [];

  const totals = pages.filter((p) => p.scope.kind === "total");
  const roofs = pages.filter((p) => p.scope.kind === "roof");
  const unknowns = pages.filter((p) => p.scope.kind === "unknown");

  let selected: ArticlePage[];
  let items: K2LineItem[];

  if (totals.length > 0) {
    selected = totals;
    items = renumber(totals.flatMap((p) => p.rows));
  } else if (roofs.length > 0) {
    selected = roofs;
    items = aggregateByArticle(roofs.flatMap((p) => p.rows));
    warnings.push("per_roof_fallback");
  } else if (unknowns.length > 0) {
    selected = unknowns;
    items = renumber(unknowns.flatMap((p) => p.rows));
  } else {
    return { items: [], warnings: ["no_articles"] };
  }

  if (items.length === 0) return { items: [], warnings: ["no_articles"] };

  // Integrity: the printed Summe against what the rows actually add up to.
  // A disagreement is surfaced, never fatal: the EPC still gets the list.
  const printed = selected
    .map((p) => p.summeKg)
    .filter((s): s is number => s !== null);

  if (printed.length === selected.length && printed.length > 0) {
    const printedTotal = printed.reduce((a, b) => a + b, 0);
    const rowTotal = sumWeights(items);
    if (
      rowTotal !== null &&
      Math.abs(rowTotal - printedTotal) > weightTolerance(items.length)
    ) {
      warnings.push("weight_mismatch");
    }
  }

  return { items, warnings };
}
