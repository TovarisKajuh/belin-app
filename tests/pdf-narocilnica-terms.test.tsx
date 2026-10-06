import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { NarocilnicaDocument } from "@/lib/pdf/narocilnica";
import { poStrings } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// D9: the six-day deemed approval of hour sheets is an order term printed on the
// naročilnica, with the site country's non-working days and contract basis.

async function textOf(country: string): Promise<string> {
  const buffer = await renderDocument(
    NarocilnicaDocument({
      number: 1,
      locale: "sl",
      projectName: "SE Hala Brnik",
      siteAddress: "Zgornji Brnik 130, 4210 Brnik",
      issuedOn: "15. 9. 2026",
      deadline: "10. 10. 2026",
      paymentTerms: "30 dni od izdaje računa",
      regieHourlyRate: 40,
      totalNet: 100000,
      lines: [{ description: "Montaža FV sistema", qty: 1, unit: "kpl", unitPrice: 100000, total: 100000 }],
      epcOrg: { name: "Solarna Gradnja d.o.o.", address: null, vatId: "SI12345678" },
      subOrg: { name: "Montaža Kos d.o.o.", address: null, vatId: "SI87654321" },
      acceptance: null,
      issuer: { name: "Solarna Gradnja d.o.o.", logo: null },
      s: poStrings("sl", country),
    }),
  );
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text).replace(/\s+/g, " ");
}

describe("naročilnica order terms", () => {
  it("prints the clause with the Slovenian non-working days and the Slovenian basis", async () => {
    const text = await textOf("si");
    expect(text).toContain(poStrings("sl", "si").termsTitle);
    expect(text).toContain("razen dela prostih dni v Republiki Sloveniji");
    expect(text).toContain("Posebne gradbene uzance 2020");
    expect(text).not.toContain("delovnih dni");
  }, 60000);

  it("names the site country's holidays and basis on a German site", async () => {
    const text = await textOf("de");
    expect(text).toContain("VOB/B");
    expect(text).toContain("v vsej Nemčiji");
  }, 60000);
});
