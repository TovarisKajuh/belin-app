// What the invoice card renders, kept out of the server-only data module.

export interface InvoiceView {
  id: string;
  number: string;
  issueDate: string;
  totalNet: number;
  totalVat: number | null;
  totalGross: number;
  vatMode: "reverse_charge" | "standard";
  accountantEmail: string | null;
  sentToAccountantAt: string | null;
  hasPdf: boolean;
}

/** Codes from composeInvoiceLines, mapped to sentences by the UI. */
export type InvoiceWarning = "no-rate" | "co-no-amount";
