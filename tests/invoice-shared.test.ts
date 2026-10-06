import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  composeInvoiceLines,
  computeTotals,
  defaultVatMode,
  nextInvoiceNumber,
  paymentDays,
  reverseChargeNote,
  servicePeriod,
  standardVatRate,
} from "@/lib/invoice-shared";

// The invoice composition rules. Two properties matter more than the rest:
// nothing is ever billed at a price nobody set, and a reverse charge invoice
// can never carry VAT.

describe("composeInvoiceLines", () => {
  const po = { totalNet: 118500, regieHourlyRate: 48, label: "Montaža FV sistema 245.7 kWp" };

  it("bills the naročilnica, the approved hours and the approved extras", () => {
    const result = composeInvoiceLines({
      po,
      approvedRegieHours: [
        { sheetNumber: 1, hours: 8 },
        { sheetNumber: 2, hours: 6 },
      ],
      approvedChangeOrders: [{ number: 1, title: "Zamenjava letev", amount: 1200 }],
    });

    expect(result.lines).toHaveLength(4);
    expect(result.lines[0]).toMatchObject({ kind: "po", total: 118500 });
    expect(result.lines[1]).toMatchObject({ kind: "regie", qty: 8, unitPrice: 48, total: 384 });
    expect(result.lines[2]).toMatchObject({ kind: "regie", qty: 6, total: 288 });
    expect(result.lines[3]).toMatchObject({ kind: "change_order", total: 1200 });
    expect(result.totalNet).toBe(120372);
    expect(result.warnings).toEqual([]);
  });

  // An invoice row with empty Količina and Cena na enoto read as unfinished on
  // the demo invoice (production verification, 2026-10-06).
  it("bills a lump sum order as quantity 1 at the full amount", () => {
    const result = composeInvoiceLines({ po, approvedRegieHours: [], approvedChangeOrders: [] });
    expect(result.lines[0]).toMatchObject({ kind: "po", qty: 1, unit: null, unitPrice: 118500, total: 118500 });
  });

  it("bills an approved extra as quantity 1 at its amount", () => {
    const result = composeInvoiceLines({
      po: null,
      approvedRegieHours: [],
      approvedChangeOrders: [{ number: 1, title: "Popravilo membrane", amount: 1200 }],
    });
    expect(result.lines[0]).toMatchObject({ kind: "change_order", qty: 1, unitPrice: 1200, total: 1200 });
  });

  it("bills a single priced order line at its own quantity and unit price", () => {
    const result = composeInvoiceLines({
      po: { ...po, totalNet: 1250, single: { qty: 2.5, unit: "kWp", unitPrice: 500 } },
      approvedRegieHours: [],
      approvedChangeOrders: [],
    });
    expect(result.lines[0]).toMatchObject({ kind: "po", qty: 2.5, unit: "kWp", unitPrice: 500, total: 1250 });
  });

  it("falls back to the lump sum when the single line does not multiply to the total", () => {
    const result = composeInvoiceLines({
      po: { ...po, single: { qty: 3, unit: "kos", unitPrice: 100 } },
      approvedRegieHours: [],
      approvedChangeOrders: [],
    });
    expect(result.lines[0]).toMatchObject({ kind: "po", qty: 1, unit: null, unitPrice: 118500 });
  });

  // The rule that protects the subcontractor from being paid nothing for real
  // work: hours with no agreed rate are NOT billed at zero, they are left out
  // and the omission is announced.
  it("omits regie hours when the naročilnica set no hourly rate, and says so", () => {
    const result = composeInvoiceLines({
      po: { ...po, regieHourlyRate: null },
      approvedRegieHours: [{ sheetNumber: 1, hours: 8 }],
      approvedChangeOrders: [],
    });

    expect(result.lines.filter((line) => line.kind === "regie")).toHaveLength(0);
    expect(result.warnings).toContain("no-rate");
    expect(result.totalNet).toBe(118500);
  });

  it("omits an unpriced extra rather than billing it as zero, and says so", () => {
    const result = composeInvoiceLines({
      po,
      approvedRegieHours: [],
      approvedChangeOrders: [
        { number: 1, title: "Zamenjava letev", amount: null },
        { number: 2, title: "Dodatni nosilci", amount: 400 },
      ],
    });

    expect(result.lines.filter((line) => line.kind === "change_order")).toHaveLength(1);
    expect(result.warnings).toContain("co-no-amount");
    expect(result.totalNet).toBe(118900);
  });

  it("does not warn about a rate when there are no hours to bill", () => {
    const result = composeInvoiceLines({
      po: { ...po, regieHourlyRate: null },
      approvedRegieHours: [],
      approvedChangeOrders: [],
    });
    expect(result.warnings).toEqual([]);
  });

  it("produces nothing at all when there is nothing to bill", () => {
    const result = composeInvoiceLines({
      po: null,
      approvedRegieHours: [],
      approvedChangeOrders: [],
    });
    expect(result.lines).toEqual([]);
    expect(result.totalNet).toBe(0);
  });

  it("rounds hour lines to cents", () => {
    const result = composeInvoiceLines({
      po: { ...po, regieHourlyRate: 47.55 },
      approvedRegieHours: [{ sheetNumber: 1, hours: 2.5 }],
      approvedChangeOrders: [],
    });
    // 2.5 x 47.55 is 118.875, which is 118.88 in money.
    expect(result.lines[1].total).toBe(118.88);
  });
});

describe("computeTotals", () => {
  it("adds no VAT under reverse charge, and gross equals net", () => {
    expect(computeTotals(1000, "reverse_charge", null)).toEqual({
      totalVat: null,
      totalGross: 1000,
    });
  });

  it("adds VAT at the given rate under standard taxation", () => {
    expect(computeTotals(1000, "standard", 22)).toEqual({ totalVat: 220, totalGross: 1220 });
    expect(computeTotals(1000, "standard", 19)).toEqual({ totalVat: 190, totalGross: 1190 });
  });

  it("rounds VAT to cents", () => {
    expect(computeTotals(120372, "standard", 22)).toEqual({
      totalVat: 26481.84,
      totalGross: 146853.84,
    });
  });

  // Belt and braces on top of the database constraint: a rate handed in for a
  // reverse charge invoice is ignored rather than honoured.
  it("ignores a rate passed with reverse charge", () => {
    expect(computeTotals(1000, "reverse_charge", 22)).toEqual({
      totalVat: null,
      totalGross: 1000,
    });
  });
});

describe("VAT rules by country", () => {
  it("defaults the pilot country pairs to reverse charge", () => {
    expect(defaultVatMode("si")).toBe("reverse_charge");
    expect(defaultVatMode("de")).toBe("reverse_charge");
    expect(defaultVatMode("at")).toBe("reverse_charge");
  });

  it("carries the statutory note of the SITE country", () => {
    expect(reverseChargeNote("si")).toBe("Obrnjena davčna obveznost po 76.a členu ZDDV-1");
    expect(reverseChargeNote("de")).toBe("Steuerschuldnerschaft des Leistungsempfängers");
    expect(reverseChargeNote("at")).toBe("Übergang der Steuerschuld auf den Leistungsempfänger");
  });

  it("knows the standard rates", () => {
    expect(standardVatRate("si")).toBe(22);
    expect(standardVatRate("de")).toBe(19);
    expect(standardVatRate("at")).toBe(20);
  });
});

describe("nextInvoiceNumber", () => {
  it("starts at one for a year with no invoices", () => {
    expect(nextInvoiceNumber(2026, [])).toBe("2026-001");
  });

  it("continues from the highest number, leaving gaps alone", () => {
    // A gap is normal (a cancelled draft, a number issued elsewhere) and must
    // never be filled: reusing a number means two documents share an identity.
    expect(nextInvoiceNumber(2026, ["2026-001", "2026-003"])).toBe("2026-004");
  });

  it("ignores numbers from other years", () => {
    expect(nextInvoiceNumber(2027, ["2026-014"])).toBe("2027-001");
  });

  it("tolerates malformed stored numbers", () => {
    expect(nextInvoiceNumber(2026, ["2026-001", "rocno-42", ""])).toBe("2026-002");
  });

  it("keeps three digits past ninety nine", () => {
    expect(nextInvoiceNumber(2026, ["2026-099"])).toBe("2026-100");
  });
});

describe("paymentDays", () => {
  it("reads the days from the naročilnica's terms", () => {
    expect(paymentDays("30 dni od izdaje računa")).toBe(30);
    expect(paymentDays("Zahlbar innerhalb von 14 Tagen")).toBe(14);
  });
  it("falls back to 30 days when the terms carry no usable number", () => {
    expect(paymentDays(null)).toBe(30);
    expect(paymentDays("takoj")).toBe(30);
    expect(paymentDays("999 dni")).toBe(30);
  });
});

describe("addDaysIso", () => {
  it("crosses month and year ends", () => {
    expect(addDaysIso("2026-10-06", 30)).toBe("2026-11-05");
    expect(addDaysIso("2026-12-20", 30)).toBe("2027-01-19");
  });
});

describe("servicePeriod", () => {
  it("runs from the first report day to the acceptance day", () => {
    expect(servicePeriod({ firstEntry: "2026-09-21", acceptanceDay: "2026-10-06" })).toEqual({
      start: "2026-09-21",
      end: "2026-10-06",
    });
  });
  it("collapses to the acceptance day when nobody reported", () => {
    expect(servicePeriod({ firstEntry: null, acceptanceDay: "2026-10-06" })).toEqual({
      start: "2026-10-06",
      end: "2026-10-06",
    });
  });
});

it("labels an extra with the caller's localized label", () => {
  const result = composeInvoiceLines({
    po: null,
    approvedRegieHours: [],
    approvedChangeOrders: [
      { number: 1, title: "Zamenjava letev", amount: 1200, label: "Dodatno delo št. 1: Zamenjava letev" },
    ],
  });
  expect(result.lines[0].description).toBe("Dodatno delo št. 1: Zamenjava letev");
});
