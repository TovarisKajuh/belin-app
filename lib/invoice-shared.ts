// Composing an invoice, and the VAT rules behind it.
//
// Two properties this module exists to guarantee:
//
// 1. NOTHING IS BILLED AT A PRICE NOBODY SET. Approved hours with no agreed
//    hourly rate, and approved extras with no amount, are LEFT OUT and the
//    omission is reported as a warning. Billing them at zero would quietly pay
//    a subcontractor nothing for work the client already approved, and the
//    subcontractor would only notice when the money did not arrive.
//
// 2. A REVERSE CHARGE INVOICE CANNOT CARRY VAT. Showing tax that is not owed
//    makes the issuer liable for it under § 14c UStG: they owe what they
//    printed. The database enforces this with a check constraint, the document
//    template has no VAT row in its reverse charge branch at all, and
//    computeTotals refuses a rate here as the third layer.
//
// Warnings are CODES, not sentences: this file must not know about i18n
// namespaces, the same rule the K2 parser follows.

import { round2 } from "@/lib/po-shared";

export type VatMode = "reverse_charge" | "standard";
export type Country = "si" | "de" | "at";

export interface InvoiceLine {
  kind: "po" | "regie" | "change_order";
  description: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
}

/**
 * Every pair Belin serves in v1 (Slovenian or German subcontractor, German,
 * Austrian or Slovenian site) is construction work between two VAT registered
 * businesses, which is reverse charged in all three countries. The parameter
 * stays because the day a pair falls outside that, this is where it changes.
 */
export function defaultVatMode(_siteCountry: Country): VatMode {
  return "reverse_charge";
}

/**
 * The statutory sentence of the SITE country, which is where the tax is owed.
 * These are legal text, not UI copy: they live in code, never in the message
 * catalogs, so no translation pass can improve them into something wrong.
 */
export function reverseChargeNote(siteCountry: Country): string {
  switch (siteCountry) {
    case "de":
      return "Steuerschuldnerschaft des Leistungsempfängers";
    case "at":
      return "Übergang der Steuerschuld auf den Leistungsempfänger";
    default:
      return "Obrnjena davčna obveznost po 76.a členu ZDDV-1";
  }
}

export function standardVatRate(siteCountry: Country): number {
  switch (siteCountry) {
    case "de":
      return 19;
    case "at":
      return 20;
    default:
      return 22;
  }
}

export interface ComposeInput {
  po: {
    totalNet: number;
    regieHourlyRate: number | null;
    label: string;
    /**
     * The order's own quantity and unit price, when it is a single priced line
     * that multiplies to its total. Otherwise the order is billed as one lump
     * sum: quantity 1 at the full amount.
     */
    single?: { qty: number; unit: string | null; unitPrice: number } | null;
  } | null;
  approvedRegieHours: { sheetNumber: number; hours: number }[];
  approvedChangeOrders: { number: number; title: string; amount: number | null; label?: string }[];
}

export interface ComposeResult {
  lines: InvoiceLine[];
  totalNet: number;
  /** Codes: "no-rate", "co-no-amount". The UI maps them to sentences. */
  warnings: string[];
}

export function composeInvoiceLines(input: ComposeInput): ComposeResult {
  const lines: InvoiceLine[] = [];
  const warnings: string[] = [];

  if (input.po) {
    // An invoice row with empty Količina and Cena na enoto reads as a form
    // somebody forgot to fill in. The order is billed either at its own single
    // line's quantity and price, or as one lump sum at the full amount.
    const total = round2(input.po.totalNet);
    const single = input.po.single;
    const usesSingle =
      single != null && round2(Number((single.qty * single.unitPrice).toFixed(10))) === total;
    lines.push({
      kind: "po",
      description: input.po.label,
      qty: usesSingle ? single.qty : 1,
      unit: usesSingle ? single.unit : null,
      unitPrice: usesSingle ? single.unitPrice : total,
      total,
    });
  }

  const rate = input.po?.regieHourlyRate ?? null;
  if (input.approvedRegieHours.length > 0) {
    if (rate === null) {
      // The hours are real and approved; what is missing is the price nobody
      // agreed. Omit and announce, never assume.
      warnings.push("no-rate");
    } else {
      for (const sheet of input.approvedRegieHours) {
        lines.push({
          kind: "regie",
          description: `${sheet.sheetNumber}`,
          qty: sheet.hours,
          unit: "h",
          unitPrice: rate,
          total: round2(Number((sheet.hours * rate).toFixed(10))),
        });
      }
    }
  }

  let missingAmount = false;
  for (const order of input.approvedChangeOrders) {
    if (order.amount === null) {
      missingAmount = true;
      continue;
    }
    // An approved extra is a lump sum too: one at its full amount.
    lines.push({
      kind: "change_order",
      description: order.label ?? `${order.number}: ${order.title}`,
      qty: 1,
      unit: null,
      unitPrice: round2(order.amount),
      total: round2(order.amount),
    });
  }
  if (missingAmount) warnings.push("co-no-amount");

  return {
    lines,
    totalNet: round2(lines.reduce((sum, line) => sum + line.total, 0)),
    warnings,
  };
}

export function computeTotals(
  totalNet: number,
  mode: VatMode,
  rate: number | null,
): { totalVat: number | null; totalGross: number } {
  // A rate passed with reverse charge is ignored rather than honoured: the
  // caller cannot make this invoice carry tax by accident.
  if (mode === "reverse_charge" || rate === null) {
    return { totalVat: null, totalGross: round2(totalNet) };
  }

  const vat = round2(Number(((totalNet * rate) / 100).toFixed(10)));
  return { totalVat: vat, totalGross: round2(totalNet + vat) };
}

/**
 * The next number in the year's sequence, per subcontractor organization.
 *
 * Gaps are LEFT ALONE. A missing number usually means a document was voided,
 * and filling the hole would give two documents the same identity, which is
 * exactly what a sequential numbering requirement exists to prevent.
 */
export function nextInvoiceNumber(year: number, existing: string[]): string {
  const prefix = `${year}-`;
  let highest = 0;

  for (const number of existing) {
    if (!number.startsWith(prefix)) continue;
    const parsed = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

/**
 * Days to pay, read from the naročilnica's payment terms ("30 dni od izdaje
 * računa"). The terms are free text the EPC typed, so anything without a
 * plausible number falls back to 30 days.
 */
export function paymentDays(terms: string | null): number {
  const match = terms?.match(/\d{1,3}/);
  const days = match ? Number(match[0]) : Number.NaN;
  return Number.isInteger(days) && days >= 0 && days <= 180 ? days : 30;
}

/** yyyy-mm-dd plus whole days, in calendar arithmetic (no zone can shift it). */
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The period of supply the invoice must state (§ 14 Abs. 4 Nr. 6 UStG,
 * 82. člen ZDDV-1): from the first day a crew reported on site to the day
 * the client accepted the work. Work after the acceptance is defect
 * remedy, not supply, so the acceptance day ends the period.
 */
export function servicePeriod(input: {
  firstEntry: string | null;
  acceptanceDay: string;
}): { start: string; end: string } {
  const end = input.acceptanceDay;
  const start = input.firstEntry && input.firstEntry <= end ? input.firstEntry : end;
  return { start, end };
}
