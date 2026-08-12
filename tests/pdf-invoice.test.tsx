import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { InvoiceDocument } from "@/lib/pdf/invoice";
import { invoiceStrings } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";
import { reverseChargeNote } from "@/lib/invoice-shared";

// The most expensive mistake this product could make is printing VAT on an
// invoice that is reverse charged. The issuer then owes the tax they showed
// under § 14c UStG: real money, for a rendering bug.
//
// Three layers stop it. The database refuses to store the shape, computeTotals
// ignores a rate under reverse charge, and the document's reverse charge
// branch has no VAT row in its JSX at all. This file checks the third, in the
// produced PDF, because that is the only layer a reader ever sees.

function invoice(mode: "reverse_charge" | "standard") {
  return InvoiceDocument({
    number: "2026-001",
    issueDate: "12. 08. 2026",
    dueDate: null,
    servicePeriod: null,
    siteAddress: "Cesta Staneta Žagarja 69, 4000 Kranj",
    supplier: { name: "AVESOL d.o.o.", address: "Tolmin", vatId: "SI10000002" },
    customer: { name: "Sonce Energija d.o.o.", address: "Kranj", vatId: "SI10000001" },
    iban: "SI56 1910 0000 1234 567",
    lines: [
      {
        description: "Izvedba del na projektu PSE Trgovski center Kranj",
        qty: null,
        unitPrice: null,
        total: "118.500,00 EUR",
      },
    ],
    totalNet: "118.500,00 EUR",
    vatMode: mode,
    vatRateLabel: mode === "standard" ? "22 %" : null,
    totalVat: mode === "standard" ? "26.070,00 EUR" : null,
    totalGross: mode === "standard" ? "144.570,00 EUR" : "118.500,00 EUR",
    reverseChargeNote: mode === "reverse_charge" ? reverseChargeNote("si") : null,
    s: invoiceStrings("sl"),
  });
}

async function textOf(mode: "reverse_charge" | "standard"): Promise<string> {
  const buffer = await renderDocument(invoice(mode));
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text).replace(/\s+/g, " ");
}

describe("invoice document", () => {
  it("prints the statutory note and NO tax at all under reverse charge", async () => {
    const text = await textOf("reverse_charge");

    expect(text).toContain(reverseChargeNote("si"));

    // "ID za DDV" is the VAT IDENTIFIER label, which reverse charge REQUIRES on
    // both parties, so its presence is correct. What must be absent is a tax
    // amount: no rate, no VAT figure, and no totals row pairing the word DDV
    // with a number.
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toContain("26.070,00");
    expect(text).not.toMatch(/DDV\s+[\d.,]+/);

    // The amount due equals the net: nothing was added anywhere.
    expect(text).toContain("118.500,00 EUR");
    expect(text).not.toContain("144.570,00");
  }, 60000);

  it("prints the rate and the tax amount under standard taxation", async () => {
    const text = await textOf("standard");

    expect(text).toContain("22 %");
    expect(text).toContain("26.070,00 EUR");
    expect(text).toContain("144.570,00 EUR");
    expect(text).not.toContain(reverseChargeNote("si"));
  }, 60000);

  it("carries both VAT ids either way, which reverse charge requires", async () => {
    for (const mode of ["reverse_charge", "standard"] as const) {
      const text = await textOf(mode);
      expect(text).toContain("SI10000001");
      expect(text).toContain("SI10000002");
      expect(text).toContain("2026-001");
    }
  }, 60000);
});
