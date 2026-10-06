import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { AbnahmeDocument } from "@/lib/pdf/abnahme";
import { abnahmeStrings, docString } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// The acceptance protocol has one property worth a test of its own: the
// contractual penalty reservation must appear VERBATIM when it was reserved,
// and must be completely ABSENT when it was not.
//
// Both halves matter and only one is visible by inspection. A client who
// accepts without expressly reserving the penalty loses it permanently, so a
// document that mentioned penalties in every case would make a reservation
// that was never made look like one that was, which is a claim the protocol
// would be inventing on its own.

const SENTENCE = docString("sl", "final.penaltySentence");

function protocol(penaltyReserved: boolean) {
  return AbnahmeDocument({
    projectName: "PSE Trgovski center Kranj",
    clientName: "Sonce Energija d.o.o.",
    contractorName: "AVESOL d.o.o.",
    siteAddress: "Cesta Staneta Žagarja 69, 4000 Kranj",
    kindLabel: "Končni prevzem",
    conductedOn: "12. 08. 2026",
    attendees: "Matej Kovač, Boštjan Novak",
    declarationLabel: "Prevzeto s pridržki",
    penaltyReserved,
    warrantyStart: "12. 08. 2026",
    note: null,
    defects: [
      {
        description: "Manjka tesnilo na prehodu kabla skozi kritino.",
        dueDate: "20. 08. 2026",
        agreementLabel: "Usklajeno",
      },
    ],
    epcSigner: { name: "Matej Kovač", image: null },
    subSigner: { name: "Boštjan Novak", image: null },
    issuer: { name: "Sonce Energija d.o.o.", logo: null },
    s: abnahmeStrings("sl"),
  });
}

async function textOf(penaltyReserved: boolean): Promise<string> {
  const buffer = await renderDocument(protocol(penaltyReserved));
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text).replace(/\s+/g, " ");
}

describe("acceptance protocol", () => {
  it("prints the penalty reservation verbatim when it was reserved", async () => {
    const text = await textOf(true);
    expect(SENTENCE.length).toBeGreaterThan(20);
    expect(text).toContain(SENTENCE);
  }, 60000);

  it("says nothing whatsoever about penalties when it was not", async () => {
    const text = await textOf(false);
    expect(text).not.toContain(SENTENCE);
    expect(text.toLowerCase()).not.toContain("kazni");
    expect(text.toLowerCase()).not.toContain("pridržek");
  }, 60000);

  it("records the declaration, the defect and both signers either way", async () => {
    for (const reserved of [true, false]) {
      const text = await textOf(reserved);
      expect(text).toContain("Prevzeto s pridržki");
      expect(text).toContain("Manjka tesnilo");
      expect(text).toContain("Matej Kovač");
      expect(text).toContain("Boštjan Novak");
    }
  }, 60000);
});
