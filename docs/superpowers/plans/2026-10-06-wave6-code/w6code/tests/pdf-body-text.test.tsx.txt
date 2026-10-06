import { Document, Page, Text } from "@react-pdf/renderer";
import { getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { renderDocument, styles } from "@/lib/pdf/theme";
import { NarocilnicaDocument } from "@/lib/pdf/narocilnica";
import { poStrings } from "@/lib/pdf/strings";

// The double-spacing bug, pinned by GEOMETRY rather than by eye.
//
// A unitless lineHeight on a Text without its own fontSize resolves against
// @react-pdf's 18 point default, so a 9 point paragraph printed with 27 points
// between its lines: double spaced, on every document with real crew text
// (documents H1). pdf.js reports one text item per line with its baseline in
// transform[5], so the distance between two consecutive baselines IS the line
// gap. It must be 1.5 x 9 = 13.5 points, comfortably under 1.7 x 9.

const LONG =
  "Montaža vrste 2 in 3. Na polju C manjka 14 srednjih sponk, dobava obljubljena za jutri. " +
  "Kabelska trasa položena po navodilu, krovec preboja 4 še ni zatesnil, zato tam ni modulov.";

async function baselines(buffer: Buffer): Promise<{ str: string; y: number }[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return (content.items as { str: string; transform: number[] }[])
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({ str: item.str, y: item.transform[5] }));
}

describe("body text line spacing", () => {
  it("styles.body puts consecutive lines 13.5 points apart", async () => {
    const buffer = await renderDocument(
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.body}>{LONG}</Text>
        </Page>
      </Document>,
    );
    const items = await baselines(buffer);
    expect(items.length).toBeGreaterThanOrEqual(2);
    const gap = items[0].y - items[1].y;
    expect(gap).toBeGreaterThan(9 * 1.3);
    expect(gap).toBeLessThan(9 * 1.7);
  }, 60000);

  it("the naročilnica acceptance paragraph is single spaced in the real template", async () => {
    const s = poStrings("sl");
    const buffer = await renderDocument(
      NarocilnicaDocument({
        number: 1,
        locale: "sl",
        projectName: "SE Hala Brnik",
        siteAddress: "Zgornji Brnik 130, 4210 Brnik",
        issuedOn: "15. 09. 2026",
        deadline: null,
        paymentTerms: null,
        regieHourlyRate: 40,
        totalNet: 100000,
        lines: [{ description: "Montaža FV sistema", qty: 1, unit: "kpl", unitPrice: 100000, total: 100000 }],
        epcOrg: { name: "Solarna Gradnja d.o.o.", address: null, vatId: "SI12345678" },
        subOrg: { name: "Montaža Kos d.o.o.", address: null, vatId: "SI87654321" },
        acceptance: null,
        issuer: { name: "Solarna Gradnja d.o.o.", logo: null },
        s,
      }),
    );
    const items = await baselines(buffer);
    const first = items.findIndex((item) => item.str.startsWith(s.acceptanceBody.slice(0, 24)));
    expect(first).toBeGreaterThanOrEqual(0);
    const gap = items[first].y - items[first + 1].y;
    expect(gap).toBeLessThan(9 * 1.7);
  }, 60000);
});
