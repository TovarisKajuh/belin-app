import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { InvoiceDocument } from "@/lib/pdf/invoice";
import { invoiceStrings } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// D16: a document carries its ISSUER at the top and Belin only in the footer,
// and every page says which page of how many it is (documents H6, M2).

async function textOf(logo: Buffer | null): Promise<string> {
  const buffer = await renderDocument(
    InvoiceDocument({
      number: "2026-014",
      issueDate: "01. 10. 2026",
      dueDate: null,
      servicePeriod: null,
      siteAddress: "Zgornji Brnik 130, 4210 Brnik",
      supplier: { name: "Montaža Kos d.o.o.", address: "Kidričeva cesta 12, 4220 Škofja Loka", vatId: "SI87654321" },
      customer: { name: "Solarna Gradnja d.o.o.", address: "Šmartinska cesta 152, 1000 Ljubljana", vatId: "SI12345678" },
      iban: null,
      lines: [{ description: "Izvedba del", qty: null, unitPrice: null, total: "1.000,00 EUR" }],
      totalNet: "1.000,00 EUR",
      vatMode: "reverse_charge",
      vatRateLabel: null,
      totalVat: null,
      totalGross: "1.000,00 EUR",
      reverseChargeNote: "Obrnjena davčna obveznost po 76.a členu ZDDV-1",
      issuer: { name: "Montaža Kos d.o.o.", address: "Kidričeva cesta 12, 4220 Škofja Loka", logo },
      s: invoiceStrings("sl"),
    }),
  );
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text).replace(/\s+/g, " ");
}

describe("document chrome", () => {
  it("names the issuer, numbers the page and keeps Belin to the footer", async () => {
    const text = await textOf(null);
    expect(text).toContain("Montaža Kos d.o.o.");
    // Once in the header under the issuer's name, once in the supplier block.
    expect(text.split("Kidričeva cesta 12, 4220 Škofja Loka").length - 1).toBe(2);
    expect(text).toContain("Stran 1 od 1");
    expect(text).toContain("Ustvarjeno v Belinu · getbelin.com");
    expect(text).not.toContain("BELIN");
  }, 60000);

  it("renders with a PNG logo in the header", async () => {
    const text = await textOf(readFileSync("public/icons/icon-192.png"));
    expect(text).toContain("Montaža Kos d.o.o.");
  }, 60000);
});
