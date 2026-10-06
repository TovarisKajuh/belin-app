import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy, getResolvedPDFJS } from "unpdf";
import { describe, expect, it } from "vitest";
import { DayReportDocument, type DayReportData } from "@/lib/pdf/day-report";
import { completionStrings } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// A day page names its project, and its signature line never stands on a page
// without the last photo row (documents H4). Real JPEGs from the repo, one of
// them portrait (dc-verkabelung.jpg, 2000 x 2667), so the layout is a real one.

const SITE = "assets/marketing/site";
const s = completionStrings("sl").day;

function day(names: string[]): DayReportData {
  return {
    reportNo: 4,
    dateLabel: "1. 10. 2026",
    weatherLabel: "Delno oblačno, 14 °C",
    headcount: 5,
    entries: [{ note: "Montaža modulov v vrsti 2 in 3.", author: "Luka Zupan", quantities: [{ name: "Moduli", qty: 96, unit: "kos" }] }],
    incidents: [],
    photos: names.map((name) => readFileSync(`${SITE}/${name}`)),
  };
}

async function render(names: string[]): Promise<{ pages: string[]; images: number[] }> {
  const buffer = await renderDocument(
    DayReportDocument({
      day: day(names),
      s,
      issuer: { name: "Montaža Kos d.o.o.", logo: null },
      projectName: "SE Hala Brnik",
    }),
  );
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const { OPS } = await getResolvedPDFJS();
  const images: number[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const ops = await (await pdf.getPage(p)).getOperatorList();
    images.push(ops.fnArray.filter((fn: number) => fn === OPS.paintImageXObject).length);
  }
  return { pages: (text as string[]).map((page) => page.replace(/\s+/g, " ")), images };
}

describe("day page", () => {
  it("names the project and the date", async () => {
    const { pages } = await render(["crew-montage.jpg"]);
    expect(pages[0]).toContain("SE Hala Brnik");
    expect(pages[0]).toContain("1. 10. 2026");
  }, 60000);

  it("prints the signature on a page that also carries the last photo row", async () => {
    const { pages, images } = await render([
      "crew-montage.jpg",
      "dc-verkabelung.jpg",
      "unterkonstruktion.jpg",
      "dc-verkabelung.jpg",
      "crew-module.jpg",
    ]);
    const signPage = pages.findIndex((page) => page.includes(s.signature));
    expect(signPage).toBeGreaterThanOrEqual(0);
    expect(images[signPage]).toBeGreaterThan(0);
  }, 60000);
});
