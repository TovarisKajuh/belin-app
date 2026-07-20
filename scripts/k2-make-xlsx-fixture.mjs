// Builds the synthetic K2 article list Excel fixture.
// SYNTHETIC, and that is debt: no real K2 Base Excel export exists in the repo
// yet. Its shape reproduces the PDF article list faithfully (same columns, same
// three real articles, a Summe row at the end). Replace it with a real export
// from the pilot EPC before hardening.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";

const outDir = join("tests", "fixtures", "k2");
mkdirSync(outDir, { recursive: true });

const wb = new ExcelJS.Workbook();
const sheet = wb.addWorksheet("Artikelliste");

sheet.addRow(["Position", "Art-Nr.", "Artikel", "Anzahl", "Gewicht"]);
sheet.addRow([1, "2003215", "SingleHook 3S", 36, "19,1 kg"]);
sheet.addRow([2, "2004115", "Wood screw 8×160", 72, "2,9 kg"]);
sheet.addRow([3, "2003222", "SingleRail 36; 4.40 m", 9, "30,5 kg"]);
sheet.addRow(["Summe", "", "", "", "52,5 kg"]);

await wb.xlsx.writeFile(join(outDir, "articles.xlsx"));
console.log("wrote tests/fixtures/k2/articles.xlsx");

// A second fixture whose header row is not the first row, pinning the
// header search rule rather than a hardcoded row index.
const wb2 = new ExcelJS.Workbook();
const sheet2 = wb2.addWorksheet("Export");
sheet2.addRow(["K2 Base", "", "", "", ""]);
sheet2.addRow(["", "", "", "", ""]);
sheet2.addRow(["Position", "Art-Nr.", "Artikel", "Anzahl", "Gewicht"]);
sheet2.addRow([1, "2003215", "SingleHook 3S", 36, "19,1 kg"]);

await wb2.xlsx.writeFile(join(outDir, "articles-shifted.xlsx"));
console.log("wrote tests/fixtures/k2/articles-shifted.xlsx");
