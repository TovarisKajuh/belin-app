// The naročilnica: the document that turns a project into a priced job.
//
// It is the first thing in Belin that carries money and the first that either
// side would ever put in front of a lawyer, so two properties matter more than
// its looks. Every fact on it is a snapshot taken when it was sent, and the
// sha256 of the produced bytes is printed on the document itself, so the
// acceptance record can name the exact file that was accepted.
//
// Strings arrive as a plain object rather than through next-intl, because
// @react-pdf components render outside React's normal tree and cannot call
// hooks. The caller resolves them in the PROJECT's language, not the reader's.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";
import { formatMoney } from "@/lib/po-shared";

export interface NarocilnicaParty {
  name: string;
  address: string | null;
  vatId: string | null;
}

export interface NarocilnicaLine {
  description: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
}

export interface NarocilnicaStrings {
  title: string;
  docNo: string;
  orderer: string;
  contractor: string;
  vatId: string;
  site: string;
  date: string;
  deadline: string;
  paymentTerms: string;
  regieRate: string;
  colDescription: string;
  colQty: string;
  colUnitPrice: string;
  colTotal: string;
  totalNet: string;
  acceptanceTitle: string;
  acceptanceBody: string;
  acceptedBy: string;
  acceptedAt: string;
  hashLabel: string;
  generated: string;
  perHour: string;
  page: string;
  termsTitle: string;
  /** The režijske ure clause, the site country's non-working days already filled in. */
  regieClause: string;
  /** The contract-basis line for the SITE's country, already chosen. */
  basis: string;
}

export interface NarocilnicaInput {
  number: number;
  locale: "sl" | "de" | "en";
  projectName: string;
  siteAddress: string | null;
  issuedOn: string;
  deadline: string | null;
  paymentTerms: string | null;
  regieHourlyRate: number | null;
  totalNet: number;
  lines: NarocilnicaLine[];
  epcOrg: NarocilnicaParty;
  subOrg: NarocilnicaParty;
  /**
   * Present only once the document describes an acceptance that already
   * happened, which is the copy stored beside the signed record. The version
   * sent for review has none, and that difference is deliberate: the hash the
   * acceptance binds to is the hash of the UNACCEPTED document.
   */
  acceptance?: { name: string; at: string } | null;
  /** sha256 of the sent bytes, printed once known. */
  sha256?: string | null;
  /** The EPC: the orderer issues the naročilnica. */
  issuer: DocIssuer;
  s: NarocilnicaStrings;
}

export function NarocilnicaDocument(input: NarocilnicaInput) {
  const { s, locale } = input;
  const money = (n: number) => formatMoney(n, locale);

  return (
    <Document title={`${s.title} ${input.number}`}>
      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.title} docNo={`${s.docNo} ${input.number}`} projectName={input.projectName} />
        <Header
          title={s.title}
          docNo={`${s.docNo} ${input.number}`}
          projectName={input.projectName}
          issuer={input.issuer}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>{s.orderer}</Text>
            <Text>{input.epcOrg.name}</Text>
            {input.epcOrg.address ? <Text style={{ color: C.inkSoft }}>{input.epcOrg.address}</Text> : null}
            {input.epcOrg.vatId ? (
              <Text style={{ color: C.inkSoft }}>{`${s.vatId}: ${input.epcOrg.vatId}`}</Text>
            ) : null}
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>{s.contractor}</Text>
            <Text>{input.subOrg.name}</Text>
            {input.subOrg.address ? <Text style={{ color: C.inkSoft }}>{input.subOrg.address}</Text> : null}
            {input.subOrg.vatId ? (
              <Text style={{ color: C.inkSoft }}>{`${s.vatId}: ${input.subOrg.vatId}`}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <LabelValue label={s.site} value={input.siteAddress ?? ""} />
          <LabelValue label={s.date} value={input.issuedOn} />
          {input.deadline ? <LabelValue label={s.deadline} value={input.deadline} /> : null}
          {input.paymentTerms ? <LabelValue label={s.paymentTerms} value={input.paymentTerms} /> : null}
          {input.regieHourlyRate !== null ? (
            <LabelValue
              label={s.regieRate}
              value={`${money(input.regieHourlyRate)} ${s.perHour}`}
            />
          ) : null}
        </View>

        <View style={{ marginTop: 14 }}>
          <FlexTable
            columns={[
              { label: s.colDescription, widthPct: 52 },
              { label: s.colQty, widthPct: 16, align: "right" },
              { label: s.colUnitPrice, widthPct: 16, align: "right" },
              { label: s.colTotal, widthPct: 16, align: "right" },
            ]}
            rows={input.lines.map((line) => [
              line.description,
              line.qty === null ? "" : `${line.qty}${line.unit ? ` ${line.unit}` : ""}`,
              line.unitPrice === null ? "" : money(line.unitPrice),
              money(line.total),
            ])}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 10,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: C.ink,
          }}
        >
          <Text style={{ fontWeight: 700 }}>{`${s.totalNet}: ${money(input.totalNet)}`}</Text>
        </View>

        {/* The order terms (D9): the deemed approval of hour sheets is a term the
            subcontractor accepts with this order, not a statute. */}
        <View style={{ marginTop: 18 }} wrap={false}>
          <Text style={styles.sectionTitle}>{s.termsTitle}</Text>
          <Text style={styles.body}>{s.regieClause}</Text>
          <Text style={[styles.body, { marginTop: 4 }]}>{s.basis}</Text>
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>{s.acceptanceTitle}</Text>
          <Text style={[styles.body, { color: C.inkSoft }]}>{s.acceptanceBody}</Text>

          {input.acceptance ? (
            <View style={{ marginTop: 8 }}>
              <LabelValue label={s.acceptedBy} value={input.acceptance.name} />
              <LabelValue label={s.acceptedAt} value={input.acceptance.at} />
            </View>
          ) : null}

          {input.sha256 ? (
            <Text style={{ marginTop: 8, fontSize: 7, color: C.muted }}>
              {`${s.hashLabel}: ${input.sha256}`}
            </Text>
          ) : null}
        </View>

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>
    </Document>
  );
}
