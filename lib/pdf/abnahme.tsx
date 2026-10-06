// The Abnahmeprotokoll: the record of the handover.
//
// Two things on this page carry more legal weight than anything else Belin
// produces.
//
// 1. THE DECLARATION. Accepted, accepted with reservations, and refused have
//    three different consequences for warranty, payment and risk. The document
//    states which one happened, in words, not as a tick somewhere.
//
// 2. THE PENALTY RESERVATION. A client who accepts without expressly reserving
//    the contractual penalty loses it, permanently. So the sentence is fixed
//    text printed ONLY when the box was ticked, never free text somebody might
//    paraphrase into something that does not hold. When it was not reserved,
//    the document says nothing at all about penalties: an absent reservation
//    must not look like a present one.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, SignatureBox, styles, type DocIssuer } from "@/lib/pdf/theme";

export interface AbnahmeStrings {
  title: string;
  project: string;
  client: string;
  contractor: string;
  site: string;
  kind: string;
  date: string;
  attendees: string;
  defects: string;
  colDefect: string;
  colDue: string;
  colAgreement: string;
  noDefects: string;
  declaration: string;
  penaltyTitle: string;
  penaltySentence: string;
  warranty: string;
  note: string;
  signEpc: string;
  signSub: string;
  generated: string;
  page: string;
}

export interface AbnahmeInput {
  projectName: string;
  clientName: string;
  contractorName: string | null;
  siteAddress: string | null;
  kindLabel: string;
  conductedOn: string | null;
  attendees: string | null;
  declarationLabel: string;
  penaltyReserved: boolean;
  warrantyStart: string | null;
  note: string | null;
  defects: { description: string; dueDate: string | null; agreementLabel: string }[];
  epcSigner: { name: string; image: Buffer | null };
  subSigner: { name: string; image: Buffer | null };
  /** The EPC: the client conducts and issues the protocol. */
  issuer: DocIssuer;
  s: AbnahmeStrings;
}

export function AbnahmeDocument(input: AbnahmeInput) {
  const { s } = input;

  return (
    <Document title={`${s.title} ${input.projectName}`}>
      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.title} projectName={input.projectName} />
        <Header title={s.title} projectName={input.projectName} issuer={input.issuer} />

        <View style={{ marginBottom: 14 }}>
          <LabelValue label={s.project} value={input.projectName} />
          <LabelValue label={s.client} value={input.clientName} />
          <LabelValue label={s.contractor} value={input.contractorName ?? ""} />
          <LabelValue label={s.site} value={input.siteAddress ?? ""} />
          <LabelValue label={s.kind} value={input.kindLabel} />
          {input.conductedOn ? <LabelValue label={s.date} value={input.conductedOn} /> : null}
          {input.attendees ? <LabelValue label={s.attendees} value={input.attendees} /> : null}
        </View>

        <Text style={styles.sectionTitle}>{s.defects}</Text>
        <FlexTable
          columns={[
            { label: s.colDefect, widthPct: 58 },
            { label: s.colDue, widthPct: 21 },
            { label: s.colAgreement, widthPct: 21, align: "right" },
          ]}
          rows={input.defects.map((defect) => [
            defect.description,
            defect.dueDate ?? "",
            defect.agreementLabel,
          ])}
          emptyLabel={s.noDefects}
        />

        {input.note ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>{s.note}</Text>
            <Text style={styles.body}>{input.note}</Text>
          </View>
        ) : null}

        {/* ONE UNBREAKABLE BLOCK: declaration, warranty start, penalty box and
            both signatures. A signature page without the declaration on it is a
            page anybody could staple to anything (documents H7). */}
        <View wrap={false} style={{ marginTop: 16 }}>
          <LabelValue label={s.declaration} value={input.declarationLabel} />
          {input.warrantyStart ? <LabelValue label={s.warranty} value={input.warrantyStart} /> : null}

          {/* Printed ONLY when reserved. Silence here is meaningful: a document
              that mentioned penalties in every case would make a reservation
              that was never made look like one that was. */}
          {input.penaltyReserved ? (
            <View style={{ marginTop: 12, padding: 10, borderWidth: 1, borderColor: C.ink }}>
              <Text style={{ fontWeight: 700, marginBottom: 4 }}>{s.penaltyTitle}</Text>
              <Text style={styles.body}>{s.penaltySentence}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 26, flexDirection: "row", justifyContent: "space-between" }}>
            <SignatureBox name={input.epcSigner.name} image={input.epcSigner.image} caption={s.signEpc} />
            <SignatureBox name={input.subSigner.name} image={input.subSigner.image} caption={s.signSub} />
          </View>
        </View>

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>
    </Document>
  );
}
