// The PDF entry point: the only place in the parser that touches bytes.
// Node safe, NOT "server-only" (see lib/k2/k2-shared.ts).
import { extractText, getDocumentProxy } from "unpdf";
import { emptyMetadata, parseK2Text, type K2ParseResult } from "@/lib/k2/k2-shared";

const MAX_PAGES = 300;

function notK2(): K2ParseResult {
  return { ok: false, metadata: emptyMetadata(), items: [], warnings: [], diagnostics: [] };
}

/**
 * Parses K2 Base report bytes. NEVER throws: a corrupt file, an encrypted file
 * or a photo renamed to .pdf all come back as ok false, which the wizard reads
 * as "this is not a K2 report" and offers the manual path.
 */
export async function parseK2Pdf(bytes: Uint8Array): Promise<K2ParseResult> {
  try {
    const pdf = await getDocumentProxy(bytes);

    // The largest real report we have seen is 46 pages. A crafted file
    // declaring a hundred thousand pages costs nothing to make and would keep
    // a serverless function busy until it timed out, so it is refused before a
    // single page is read.
    if (pdf.numPages > MAX_PAGES) return notK2();

    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return parseK2Text(pages);
  } catch {
    return notK2();
  }
}
