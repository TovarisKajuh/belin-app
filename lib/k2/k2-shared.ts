// The PUBLIC K2 parser API. App code and scripts import from here and nowhere
// else under lib/k2; the split into k2-core, k2-articles and k2-metadata is an
// internal detail that exists to keep the module graph acyclic.
//
// DELIBERATELY NOT "server-only": these modules are Node safe pure logic, and
// both the vitest suite and scripts/k2-try.ts import them under plain Node,
// where `import "server-only"` throws. They hold no secrets and read no
// environment. The wizard's server actions are the only app callers.
export type { K2Lang, K2LocalePack } from "@/lib/k2/k2-locale";
export { LOCALES, inferLocale, parseLocaleDate, parseLocaleNumber } from "@/lib/k2/k2-locale";

export type {
  K2Footer,
  K2LineItem,
  K2Metadata,
  K2ParseResult,
  K2Roof,
  K2WarningCode,
} from "@/lib/k2/k2-core";

export {
  detectK2,
  emptyMetadata,
  parseFooters,
  parseGermanNumber,
  readBreadcrumb,
  toLines,
} from "@/lib/k2/k2-core";

export { extractArticleLists, selectItems } from "@/lib/k2/k2-articles";
export { extractMetadata } from "@/lib/k2/k2-metadata";

import { detectK2, emptyMetadata, type K2ParseResult, type K2WarningCode } from "@/lib/k2/k2-core";
import { extractArticleLists, selectItems } from "@/lib/k2/k2-articles";
import { extractMetadata } from "@/lib/k2/k2-metadata";

/**
 * The whole parser over already extracted page text.
 *
 * ok is false ONLY when the K2 fingerprint is absent, which is the signal for
 * the wizard to offer the manual path. Everything else that can go wrong comes
 * back as a warning next to a usable result: the EPC reviews and corrects, and
 * never hits a dead end.
 */
export function parseK2Text(pagesText: string[]): K2ParseResult {
  const detected = detectK2(pagesText);
  if (!detected.isK2) {
    return { ok: false, metadata: emptyMetadata(), items: [], warnings: [], diagnostics: [] };
  }

  const metadata = extractMetadata(pagesText);
  const { items, warnings } = selectItems(extractArticleLists(pagesText));

  // Machine notes, assembled ONLY here: the extract functions keep their own
  // return types and know nothing about diagnostics.
  const roofsPaired =
    metadata.roofs.length === 0
      ? "none"
      : metadata.roofs.every((r) => r.moduleCount !== null)
        ? "yes"
        : "no";
  const diagnostics = [
    `locale:${detected.lang ?? "unknown"}`,
    `areas:${metadata.roofs.length}`,
    `roofsPaired:${roofsPaired}`,
    `items:${items.length}`,
  ];

  // Fewer than three resolved fields means the review screen opens mostly empty
  // and the EPC types the rest. The parse is still ok.
  const resolved = [
    metadata.address,
    metadata.kwpTotal,
    metadata.moduleCount,
    metadata.mountingSystem,
    metadata.windZone,
  ].filter((v) => v !== null).length;

  const all: K2WarningCode[] = [...warnings];
  if (resolved < 3) all.push("meta_incomplete");

  return { ok: true, metadata, items, warnings: all, diagnostics };
}
