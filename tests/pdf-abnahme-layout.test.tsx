import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { AbnahmeDocument } from "@/lib/pdf/abnahme";
import { abnahmeStrings, docString } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// The Zapisnik's closing block never splits (documents H7): with 28 defects the
// two signatures used to stand alone on page 3, with no declaration beside them.

async function pages(buffer: Buffer): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((page) => page.replace(/\s+/g, " "));
}

describe("Zapisnik o prevzemu closing block", () => {
  const s = abnahmeStrings("sl");
  const protocol = (defectCount: number) =>
    AbnahmeDocument({
      projectName: "SE Hala Brnik",
      clientName: "Solarna Gradnja d.o.o.",
      contractorName: "Montaža Kos d.o.o.",
      siteAddress: "Zgornji Brnik 130, 4210 Brnik",
      kindLabel: "Končni prevzem",
      conductedOn: "5. 10. 2026",
      attendees: null,
      declarationLabel: docString("sl", "final.decl.with_reservations"),
      penaltyReserved: true,
      warrantyStart: "5. 10. 2026",
      note: "Zaključna dela na strehi 2 do 14. 10. 2026.",
      defects: Array.from({ length: defectCount }, (_, i) => ({
        description: `Manjka tesnilo na kabelskem prehodu, polje ${i + 1}, potrebna ponovna obdelava.`,
        dueDate: "14. 10. 2026",
        agreementLabel: docString("sl", i % 4 === 1 ? "final.disputed" : "final.agreed"),
      })),
      epcSigner: { name: "Marko Golob", image: null },
      subSigner: { name: "Boštjan Novak", image: null },
      issuer: { name: "Solarna Gradnja d.o.o.", logo: null },
      s,
    });

  it("keeps the declaration, the penalty box and both signatures on one page", async () => {
    const all = await pages(await renderDocument(protocol(28)));
    const declarationPage = all.findIndex((page) => page.includes(s.declaration));
    expect(declarationPage).toBeGreaterThanOrEqual(0);
    expect(all[declarationPage]).toContain(s.penaltySentence);
    expect(all[declarationPage]).toContain("Marko Golob");
    expect(all[declarationPage]).toContain("Boštjan Novak");
  }, 60000);

  it("numbers every page", async () => {
    const all = await pages(await renderDocument(protocol(28)));
    all.forEach((page, i) => expect(page).toContain(`Stran ${i + 1} od ${all.length}`));
  }, 60000);
});
