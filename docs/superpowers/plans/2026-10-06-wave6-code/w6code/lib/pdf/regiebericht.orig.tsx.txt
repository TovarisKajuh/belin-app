// The Regiebericht: one hour sheet as a document.
//
// This is what gets attached to an email when somebody disputes an invoice
// line months later, so it prints the things a dispute turns on: which days,
// how many hours, what the work was, when it was submitted, and HOW it was
// approved. That last one matters most. A sheet approved by silence carries a
// different sentence from one somebody actually signed off, and pretending
// they are the same would misrepresent the record.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, FlexTable, Footer, Header, LabelValue, styles } from "@/lib/pdf/theme";

export interface RegieberichtStrings {
  title: string;
  docNo: string;
  project: string;
  contractor: string;
  submitted: string;
  status: string;
  decidedBy: string;
  colDate: string;
  colPerson: string;
  colHours: string;
  colDescription: string;
  totalHours: string;
  deemedNote: string;
  generated: string;
  hoursUnit: string;
}

export interface RegieberichtInput {
  number: number;
  projectName: string;
  contractorName: string | null;
  submittedOn: string | null;
  statusLabel: string;
  /** True when the sheet was approved by the deadline passing, not by a person. */
  deemed: boolean;
  decidedByName: string | null;
  decidedOn: string | null;
  totalHours: number;
  lines: { date: string; person: string | null; hours: number; description: string }[];
  s: RegieberichtStrings;
}

export function RegieberichtDocument(input: RegieberichtInput) {
  const { s } = input;

  return (
    <Document title={`${s.title} ${input.number}`}>
      <Page size="A4" style={styles.page}>
        <Header
          title={s.title}
          docNo={`${s.docNo} ${input.number}`}
          projectName={input.projectName}
        />

        <View style={{ marginBottom: 14 }}>
          <LabelValue label={s.project} value={input.projectName} />
          <LabelValue label={s.contractor} value={input.contractorName ?? ""} />
          {input.submittedOn ? <LabelValue label={s.submitted} value={input.submittedOn} /> : null}
          <LabelValue label={s.status} value={input.statusLabel} />
          {input.decidedByName && input.decidedOn ? (
            <LabelValue
              label={s.decidedBy}
              value={`${input.decidedByName}, ${input.decidedOn}`}
            />
          ) : null}
        </View>

        <FlexTable
          columns={[
            { label: s.colDate, widthPct: 14 },
            { label: s.colPerson, widthPct: 22 },
            { label: s.colDescription, widthPct: 50 },
            { label: s.colHours, widthPct: 14, align: "right" },
          ]}
          rows={input.lines.map((line) => [
            line.date,
            line.person ?? "",
            line.description,
            `${line.hours}`,
          ])}
        />

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
          <Text style={{ fontWeight: 700 }}>
            {`${s.totalHours}: ${input.totalHours} ${s.hoursUnit}`}
          </Text>
        </View>

        {/* Printed only when silence is what approved it. An approval nobody
            actively gave has to say so on its face. */}
        {input.deemed ? (
          <Text style={{ marginTop: 18, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>
            {s.deemedNote}
          </Text>
        ) : null}

        <Footer generatedLabel={s.generated} />
      </Page>
    </Document>
  );
}
