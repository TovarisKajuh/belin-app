// The breadcrumb grammar.
//
// K2 prints a breadcrumb near the bottom of every content page, and it is the
// single most stable structure in the whole document. The words inside it
// change with the language and with the K2 version; the SHAPE does not:
//
//   Artikelliste                          the project total list
//   Dächer | Dach 1 | Artikelliste        a per area list, 3.2.2x nesting
//   Bereich 1 | Artikelliste              a per area list, 3.2.7x nesting
//   Statikbericht | Bereich 2             that area's structural pages
//   Bereich 1 | Montageplan               that area's assembly drawing
//
// This matters because K2 stopped calling roofs "Dach". The 3.2.7x era calls
// them "Bereich", the English export calls them "Area", and a planner can type
// whatever they like ("Block 01 - Gezeichnete Belegungsfläche 01"). Detecting
// areas by matching known words loses the moment a customer renames one, which
// is what happened to four of the founder's five real reports. So areas are
// ENUMERATED from the breadcrumbs instead: whatever name the document uses in
// these positions IS the area name.
//
// Leaf plus locale: imports k2-locale only.
import { toLines, readBreadcrumb } from "@/lib/k2/k2-core";
import type { K2LocalePack } from "@/lib/k2/k2-locale";

export type CrumbKind =
  | { kind: "bomTotal" }
  | { kind: "bomArea"; area: string }
  | { kind: "statics"; area: string }
  | { kind: "results"; area: string }
  | { kind: "assembly"; area: string }
  | { kind: "overview" }
  | { kind: "other" };

/** Segments of a crumb. Empty segments are dropped: a truncated crumb can end
 *  in a dangling pipe ("... | Modulfeld 1 |") and must not become an area. */
function segmentsOf(crumb: string): string[] {
  return crumb
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

/** Structural segments that are never part of an area's name. */
function isStructureSegment(segment: string, pack: K2LocalePack): boolean {
  if (segment === pack.terms.roofsSection) return true;
  return pack.terms.moduleFieldPrefixes.some((prefix) => segment.startsWith(prefix));
}

function areaFrom(segments: string[], pack: K2LocalePack): string {
  return segments.filter((s) => !isStructureSegment(s, pack)).join(" | ");
}

/**
 * What a breadcrumb says about its page. Total: never throws.
 *
 * A SINGLE segment crumb is never an area, no matter how much it looks like
 * one: bare "Bereich 1" intro pages, project name crumbs, reseller URLs and
 * section titles all live in that shape, and treating them as areas would
 * invent roofs that do not exist.
 */
export function classifyCrumb(crumb: string, pack: K2LocalePack): CrumbKind {
  if (typeof crumb !== "string") return { kind: "other" };

  const trimmed = crumb.trim();
  if (trimmed === "") return { kind: "other" };

  if (trimmed === pack.terms.billOfMaterial) return { kind: "bomTotal" };
  if (trimmed === pack.terms.overviewCrumb) return { kind: "overview" };

  const segments = segmentsOf(trimmed);
  if (segments.length < 2) return { kind: "other" };

  // A per area article list: the list segment plus the area, possibly nested
  // under the roofs section in the older era.
  if (segments.includes(pack.terms.billOfMaterial)) {
    const area = areaFrom(
      segments.filter((s) => s !== pack.terms.billOfMaterial),
      pack,
    );
    return area === "" ? { kind: "other" } : { kind: "bomArea", area };
  }

  // Statics and results lead with their own word and are followed by the area.
  if (segments[0] === pack.terms.statics) {
    const area = areaFrom(segments.slice(1), pack);
    return area === "" ? { kind: "other" } : { kind: "statics", area };
  }
  if (segments[0] === pack.terms.results) {
    const area = areaFrom(segments.slice(1), pack);
    return area === "" ? { kind: "other" } : { kind: "results", area };
  }

  // The assembly drawing trails its area. The roofs section must be stripped
  // here too, or the older era yields a second, bogus area name.
  if (segments[segments.length - 1] === pack.terms.assembly) {
    const area = areaFrom(segments.slice(0, -1), pack);
    return area === "" ? { kind: "other" } : { kind: "assembly", area };
  }

  return { kind: "other" };
}

/**
 * Every area the document mentions, in the order it first mentions them.
 *
 * Order matters: it is what pairs an area with its row in the overview table.
 */
export function enumerateAreas(pagesText: string[], pack: K2LocalePack): string[] {
  if (!Array.isArray(pagesText)) return [];

  const seen: string[] = [];

  for (const page of pagesText) {
    const crumb = readBreadcrumb(toLines(page));
    if (crumb === null) continue;

    const classified = classifyCrumb(crumb, pack);
    if (
      classified.kind === "bomArea" ||
      classified.kind === "statics" ||
      classified.kind === "results" ||
      classified.kind === "assembly"
    ) {
      if (!seen.includes(classified.area)) seen.push(classified.area);
    }
  }

  return seen;
}
