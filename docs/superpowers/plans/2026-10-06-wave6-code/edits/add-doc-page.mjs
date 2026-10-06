// Task 6.1m: the doc namespace starts with one key, doc.page. Adds, never replaces.
import { readFileSync, writeFileSync } from "node:fs";
const PAGE = { sl: "Stran {n} od {total}", de: "Seite {n} von {total}", en: "Page {n} of {total}" };
for (const locale of ["sl", "de", "en"]) {
  const file = `messages/${locale}.json`;
  // The Windows checkout has CRLF (core.autocrlf); git stores LF, so compare and write LF.
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const catalog = JSON.parse(raw);
  if (JSON.stringify(catalog, null, 2) + "\n" !== raw) throw new Error(`${file} does not round-trip; add the key by hand`);
  if (catalog.doc?.page === PAGE[locale]) {
    console.log(`${file}: doc.page already there`);
    continue;
  }
  if (catalog.doc) throw new Error(`${file}: a doc namespace already exists; add doc.page inside it by hand`);
  catalog.doc = { page: PAGE[locale] };
  writeFileSync(file, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`${file}: doc.page appended`);
}
