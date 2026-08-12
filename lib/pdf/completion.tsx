// The completion report: the whole job in one document.
//
// This is what the subcontractor hands over and what the EPC keeps. It is the
// single artefact that justifies the entire product, because assembling it by
// hand from photos in WhatsApp and hours on paper is the job Belin exists to
// delete.
//
// Structure: a cover with the facts and the totals, then every day in order,
// then the registers (hours, extras, incidents). The registers come last on
// purpose. The days are the evidence; the registers are the summary somebody
// checks a number against, and a summary before its evidence invites reading
// only the summary.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, FlexTable, Footer, Header, LabelValue, styles } from "@/lib/pdf/theme";
import { DayReportPage, type DayReportData, type DayReportStrings } from "@/lib/pdf/day-report";

export interface CompletionStrings {
  title: string;
  project: string;
  client: string;
  contractor: string;
  site: string;
  period: string;
  power: string;
  days: string;
  totalHours: string;
  registers: string;
  hoursRegister: string;
  coRegister: string;
  incidentRegister: string;
  colNo: string;
  colHours: string;
  colStatus: string;
  colTitle: string;
  colAmount: string;
  colDate: string;
  colKind: string;
  colNote: string;
  none: string;
  generated: string;
  day: DayReportStrings;
}

export interface CompletionInput {
  projectName: string;
  clientName: string;
  contractorName: string | null;
  siteAddress: string | null;
  periodLabel: string | null;
  powerLabel: string | null;
  dayCount: number;
  totalHours: number;
  days: DayReportData[];
  hoursRegister: { number: number; hours: number; status: string }[];
  coRegister: { number: number; title: string; amount: string; status: string }[];
  incidentRegister: { date: string; kindLabel: string; note: string }[];
  s: CompletionStrings;
}

export function CompletionDocument(input: CompletionInput) {
  const { s } = input;

  return (
    <Document title={`${s.title} ${input.projectName}`}>
      <Page size="A4" style={styles.page}>
        <Header title={s.title} projectName={input.projectName} />

        <View style={{ marginTop: 8 }}>
          <LabelValue label={s.project} value={input.projectName} />
          <LabelValue label={s.client} value={input.clientName} />
          <LabelValue label={s.contractor} value={input.contractorName ?? ""} />
          <LabelValue label={s.site} value={input.siteAddress ?? ""} />
          {input.periodLabel ? <LabelValue label={s.period} value={input.periodLabel} /> : null}
          {input.powerLabel ? <LabelValue label={s.power} value={input.powerLabel} /> : null}
          <LabelValue label={s.days} value={input.dayCount} />
          <LabelValue label={s.totalHours} value={input.totalHours} />
        </View>

        <Footer generatedLabel={s.generated} />
      </Page>

      {/* Every day that carried work or an incident, in order. The numbering
          comes from buildDayReports, so it can never skip. */}
      {input.days.map((day) => (
        <DayReportPage key={day.reportNo} day={day} s={s.day} />
      ))}

      <Page size="A4" style={styles.page}>
        <Header title={s.registers} projectName={input.projectName} />

        <Text style={styles.sectionTitle}>{s.hoursRegister}</Text>
        <FlexTable
          columns={[
            { label: s.colNo, widthPct: 20 },
            { label: s.colHours, widthPct: 40, align: "right" },
            { label: s.colStatus, widthPct: 40, align: "right" },
          ]}
          rows={input.hoursRegister.map((row) => [row.number, row.hours, row.status])}
          emptyLabel={s.none}
        />

        <Text style={styles.sectionTitle}>{s.coRegister}</Text>
        <FlexTable
          columns={[
            { label: s.colNo, widthPct: 12 },
            { label: s.colTitle, widthPct: 48 },
            { label: s.colAmount, widthPct: 22, align: "right" },
            { label: s.colStatus, widthPct: 18, align: "right" },
          ]}
          rows={input.coRegister.map((row) => [row.number, row.title, row.amount, row.status])}
          emptyLabel={s.none}
        />

        <Text style={styles.sectionTitle}>{s.incidentRegister}</Text>
        <FlexTable
          columns={[
            { label: s.colDate, widthPct: 18 },
            { label: s.colKind, widthPct: 24 },
            { label: s.colNote, widthPct: 58 },
          ]}
          rows={input.incidentRegister.map((row) => [row.date, row.kindLabel, row.note])}
          emptyLabel={s.none}
        />

        <Text style={{ marginTop: 20, fontSize: 8, color: C.muted }}>{s.generated}</Text>
        <Footer generatedLabel={s.generated} />
      </Page>
    </Document>
  );
}
