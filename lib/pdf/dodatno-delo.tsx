// The Zahtevek za dodatno delo: one change order as a document.
//
// Change orders carry money but produced no paper until now. This prints what
// a dispute about extra work turns on: what the work was, the photos taken
// when it was found, the amount claimed, and who decided, when, in Belin.
// Rendered on demand from the rows, like the Regiebericht: nothing binds to
// these bytes, so a stored copy would only be a second truth to drift.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";
import { photoRows, type DocPhoto } from "@/lib/pdf/photos";
import { docString, type DocLocale } from "@/lib/pdf/strings";

export interface DodatnoDeloStrings {
  title: string;
  docNo: string;
  project: string;
  client: string;
  contractor: string;
  site: string;
  submitted: string;
  submittedBy: string;
  status: string;
  decided: string;
  description: string;
  amount: string;
  noAmount: string;
  photos: string;
  basisSi: string;
  approvedNote: string;
  rejectedNote: string;
  rejectedReason: string;
  pendingNote: string;
  generated: string;
  page: string;
}

export function dodatnoDeloStrings(locale: DocLocale): DodatnoDeloStrings {
  const t = (key: string) => docString(locale, `doc.co.${key}`);
  return {
    title: t("title"),
    docNo: docString(locale, "po.doc.docNo"),
    project: t("project"),
    client: t("client"),
    contractor: t("contractor"),
    site: t("site"),
    submitted: t("submitted"),
    submittedBy: t("submittedBy"),
    status: t("status"),
    decided: t("decided"),
    description: t("description"),
    amount: t("amount"),
    noAmount: t("noAmount"),
    photos: t("photos"),
    basisSi: t("basisSi"),
    approvedNote: t("approvedNote"),
    rejectedNote: t("rejectedNote"),
    rejectedReason: t("rejectedReason"),
    pendingNote: t("pendingNote"),
    generated: docString(locale, "final.doc.generated"),
    page: docString(locale, "doc.page"),
  };
}

export interface DodatnoDeloInput {
  number: number;
  title: string;
  description: string | null;
  /** formatMoney output, or null when no amount was given. */
  amount: string | null;
  status: "submitted" | "approved" | "rejected";
  statusLabel: string;
  /** change_orders.rejection_reason (Task 3.6), printed for a rejected claim; null otherwise. */
  rejectionReason: string | null;
  submittedOn: string;
  submittedBy: string | null;
  /** "Matej Kovač, 24. 09. 2026 ob 10:14", or null while undecided. */
  decidedLine: string | null;
  projectName: string;
  country: string;
  clientName: string;
  contractorName: string | null;
  siteAddress: string | null;
  photos: DocPhoto[];
  /** The subcontractor: the claimant issues the claim. */
  issuer: DocIssuer;
  s: DodatnoDeloStrings;
}

export function DodatnoDeloDocument(input: DodatnoDeloInput) {
  const { s } = input;
  const docNo = `${s.docNo} ${input.number}`;
  const statusNote =
    input.status === "approved" ? s.approvedNote : input.status === "rejected" ? s.rejectedNote : s.pendingNote;
  const rows = photoRows(input.photos, { keyPrefix: "co" });

  return (
    <Document title={`${s.title} ${input.number}, ${input.projectName}`}>
      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.title} docNo={docNo} projectName={input.projectName} />
        <Header title={s.title} docNo={docNo} projectName={input.projectName} issuer={input.issuer} />

        <View style={{ marginBottom: 12 }}>
          <LabelValue label={s.project} value={input.projectName} />
          <LabelValue label={s.client} value={input.clientName} />
          <LabelValue label={s.contractor} value={input.contractorName ?? ""} />
          {input.siteAddress ? <LabelValue label={s.site} value={input.siteAddress} /> : null}
          <LabelValue label={s.submitted} value={input.submittedOn} />
          {input.submittedBy ? <LabelValue label={s.submittedBy} value={input.submittedBy} /> : null}
          <LabelValue label={s.status} value={input.statusLabel} />
          {input.decidedLine ? <LabelValue label={s.decided} value={input.decidedLine} /> : null}
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>{s.description}</Text>
          <Text style={[styles.body, { fontWeight: 700 }]}>{input.title}</Text>
          {input.description ? <Text style={[styles.body, { marginTop: 3 }]}>{input.description}</Text> : null}
        </View>

        <View
          style={{ marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ink, alignItems: "flex-end" }}
          wrap={false}
        >
          <Text style={{ fontWeight: 700 }}>{`${s.amount}: ${input.amount ?? "-"}`}</Text>
          {input.amount === null ? <Text style={[styles.small, { color: C.muted }]}>{s.noAmount}</Text> : null}
        </View>

        <View style={{ marginTop: 12 }} wrap={false}>
          <Text style={styles.body}>{statusNote}</Text>
          {input.status === "rejected" && input.rejectionReason ? (
            <Text style={[styles.body, { marginTop: 3 }]}>{`${s.rejectedReason}: ${input.rejectionReason}`}</Text>
          ) : null}
          {input.country === "si" ? (
            <Text style={[styles.small, { color: C.muted, marginTop: 4 }]}>{s.basisSi}</Text>
          ) : null}
        </View>

        {rows.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{s.photos}</Text>
            {rows[0]}
          </View>
        ) : null}
        {rows.slice(1)}

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>
    </Document>
  );
}
