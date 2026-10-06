// The invoice.
//
// Everything on this page is an Art. 226 mandatory field, and the totals block
// is where the product's most expensive mistake would live.
//
// THE REVERSE CHARGE BRANCH HAS NO VAT ROW IN ITS JSX AT ALL. Not a hidden row,
// not a row rendering an empty value, not a conditional inside a cell: a
// separate block that has no way to print tax. Showing VAT that is not owed
// makes the issuer liable for the amount they printed under § 14c UStG, and
// "we remembered not to render it" is a weaker guarantee than "there is
// nothing there to render".
//
// The parties are SNAPSHOTS taken when the invoice was issued. If a company
// changes its address next year, this document must keep saying what it said.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";

export interface InvoiceParty {
  name: string;
  address: string | null;
  vatId: string | null;
}

export interface InvoiceStrings {
  title: string;
  docNo: string;
  supplier: string;
  customer: string;
  vatId: string;
  issueDate: string;
  dueDate: string;
  servicePeriod: string;
  site: string;
  colDescription: string;
  colQty: string;
  colUnitPrice: string;
  colTotal: string;
  totalNet: string;
  vat: string;
  totalGross: string;
  iban: string;
  reverseChargeTitle: string;
  generated: string;
  regieLine: string;
  page: string;
}

export interface InvoiceInput {
  number: string;
  issueDate: string;
  dueDate: string | null;
  servicePeriod: string | null;
  siteAddress: string | null;
  supplier: InvoiceParty;
  customer: InvoiceParty;
  iban: string | null;
  lines: { description: string; qty: string | null; unitPrice: string | null; total: string }[];
  totalNet: string;
  vatMode: "reverse_charge" | "standard";
  vatRateLabel: string | null;
  totalVat: string | null;
  totalGross: string;
  reverseChargeNote: string | null;
  /** The subcontractor: the supplier issues its own invoice. */
  issuer: DocIssuer;
  s: InvoiceStrings;
}

export function InvoiceDocument(input: InvoiceInput) {
  const { s } = input;

  return (
    <Document title={`${s.title} ${input.number}`}>
      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.title} docNo={`${s.docNo} ${input.number}`} />
        <Header title={s.title} docNo={`${s.docNo} ${input.number}`} issuer={input.issuer} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>{s.supplier}</Text>
            <Text>{input.supplier.name}</Text>
            {input.supplier.address ? (
              <Text style={{ color: C.inkSoft }}>{input.supplier.address}</Text>
            ) : null}
            {input.supplier.vatId ? (
              <Text style={{ color: C.inkSoft }}>{`${s.vatId}: ${input.supplier.vatId}`}</Text>
            ) : null}
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>{s.customer}</Text>
            <Text>{input.customer.name}</Text>
            {input.customer.address ? (
              <Text style={{ color: C.inkSoft }}>{input.customer.address}</Text>
            ) : null}
            {input.customer.vatId ? (
              <Text style={{ color: C.inkSoft }}>{`${s.vatId}: ${input.customer.vatId}`}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginBottom: 14 }}>
          <LabelValue label={s.issueDate} value={input.issueDate} />
          {input.dueDate ? <LabelValue label={s.dueDate} value={input.dueDate} /> : null}
          {input.servicePeriod ? (
            <LabelValue label={s.servicePeriod} value={input.servicePeriod} />
          ) : null}
          {input.siteAddress ? <LabelValue label={s.site} value={input.siteAddress} /> : null}
        </View>

        <FlexTable
          columns={[
            { label: s.colDescription, widthPct: 52 },
            { label: s.colQty, widthPct: 14, align: "right" },
            { label: s.colUnitPrice, widthPct: 17, align: "right" },
            { label: s.colTotal, widthPct: 17, align: "right" },
          ]}
          rows={input.lines.map((line) => [
            line.description,
            line.qty ?? "",
            line.unitPrice ?? "",
            line.total,
          ])}
        />

        {input.vatMode === "reverse_charge" ? (
          /* REVERSE CHARGE. There is no VAT row here, by construction. */
          <View style={{ marginTop: 12, alignItems: "flex-end" }} wrap={false}>
            <View style={{ width: "58%" }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: C.ink,
                }}
              >
                <Text style={{ fontWeight: 700 }}>{s.totalGross}</Text>
                <Text style={{ fontWeight: 700 }}>{input.totalGross}</Text>
              </View>
            </View>
            {input.reverseChargeNote ? (
              <View style={{ width: "100%", marginTop: 14 }}>
                <Text style={{ fontWeight: 700, marginBottom: 3 }}>{s.reverseChargeTitle}</Text>
                <Text style={styles.body}>{input.reverseChargeNote}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* STANDARD TAXATION. Net, tax, gross. */
          <View style={{ marginTop: 12, alignItems: "flex-end" }} wrap={false}>
            <View style={{ width: "58%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text>{s.totalNet}</Text>
                <Text>{input.totalNet}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text>{`${s.vat}${input.vatRateLabel ? ` ${input.vatRateLabel}` : ""}`}</Text>
                <Text>{input.totalVat ?? ""}</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: C.ink,
                }}
              >
                <Text style={{ fontWeight: 700 }}>{s.totalGross}</Text>
                <Text style={{ fontWeight: 700 }}>{input.totalGross}</Text>
              </View>
            </View>
          </View>
        )}

        {input.iban ? (
          <View style={{ marginTop: 20 }}>
            <LabelValue label={s.iban} value={input.iban} />
          </View>
        ) : null}

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>
    </Document>
  );
}
