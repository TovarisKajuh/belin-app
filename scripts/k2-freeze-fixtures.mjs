// Freezes the extracted text of the five K2 fixture PDFs into JSON.
// The pure parser tests read these frozen texts, never the PDFs, so an unpdf
// extraction change fails only the two integration tests and localizes the fault.
// Rerunnable and deterministic: run twice, git diff stays empty.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

const FIXTURES = [
  "k2-report-2025",
  "k2-report-2023",
  "k2-base-report-annotations",
  "forum1",
  "forum2",
];

const pdfDir = join("tests", "fixtures", "k2");
const outDir = join(pdfDir, "text");

mkdirSync(outDir, { recursive: true });

for (const name of FIXTURES) {
  const bytes = new Uint8Array(readFileSync(join(pdfDir, `${name}.pdf`)));
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  writeFileSync(
    join(outDir, `${name}.pages.json`),
    JSON.stringify({ totalPages, pages }, null, 1) + "\n",
    "utf8",
  );
  console.log(`${name}: ${totalPages} pages`);
}
