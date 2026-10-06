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
import { FlexTable, Footer, Header, LabelValue, RunningHeader, StatTile, styles, type DocIssuer } from "@/lib/pdf/theme";
import { DayReportPage, type DayReportData, type DayReportStrings } from "@/lib/pdf/day-report";
import { clipAtWord } from "@/lib/pdf/doc-format";

export interface CompletionStrings {
  title: string;
  project: string;
  client: string;
  contractor: string;
  site: string;
  period: string;
  power: string;
  days: string;
  approvedHours: string;
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
  photos: string;
  incidents: string;
  summary: string;
  incidentsCount: string;
  dayList: string;
  crew: string;
  page: string;
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
  /** Approved hours, formatted: the number the invoice bills. */
  approvedHours: string;
  /** Label and value pairs, assembled and worded by the data layer. */
  summaryRows: { label: string; value: string }[];
  days: DayReportData[];
  hoursRegister: { number: number; hours: string; status: string }[];
  coRegister: { number: number; title: string; amount: string; status: string }[];
  incidentRegister: { date: string; kindLabel: string; note: string }[];
  /** The subcontractor: the report is its account of the job. */
  issuer: DocIssuer;
  s: CompletionStrings;
}

export function CompletionDocument(input: CompletionInput) {
  const { s } = input;

  const photoCount = input.days.reduce((sum, day) => sum + day.photos.length, 0);

  return (
    <Document title={`${s.title} ${input.projectName}`}>
      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.title} projectName={input.projectName} />
        <Header title={s.title} projectName={input.projectName} issuer={input.issuer} />

        <View style={{ marginTop: 8 }}>
          <LabelValue label={s.project} value={input.projectName} />
          <LabelValue label={s.client} value={input.clientName} />
          <LabelValue label={s.contractor} value={input.contractorName ?? ""} />
          <LabelValue label={s.site} value={input.siteAddress ?? ""} />
          {input.periodLabel ? <LabelValue label={s.period} value={input.periodLabel} /> : null}
          {input.powerLabel ? <LabelValue label={s.power} value={input.powerLabel} /> : null}
        </View>

        {/* The four numbers somebody opens this document to find, as figures
            rather than as another row of the list above. A cover that is only a
            meta list makes the reader turn the page to learn anything, and this
            is the page that gets filed, mailed and printed on its own. */}
        <View style={styles.statBand}>
          <StatTile label={s.days} value={input.dayCount} />
          <StatTile label={s.approvedHours} value={input.approvedHours} />
          <StatTile label={s.photos} value={photoCount} />
          <StatTile label={s.incidents} value={input.incidentRegister.length} />
        </View>

        {/* What the registers at the back add up to. The detail is still there,
            three pages later; this is the line a client checks against their
            own file before deciding whether to read further. */}
        <Text style={styles.sectionTitle}>{s.summary}</Text>
        <FlexTable
          columns={[
            { label: "", widthPct: 62 },
            { label: "", widthPct: 38, align: "right" },
          ]}
          rows={input.summaryRows.map((row) => [row.label, row.value])}
          emptyLabel={s.none}
          hideHeader
        />

        {/* The shape of the job on one page: which days carried work, how many
            men, and what they did. A reader who never turns the page still
            learns whether this was ten steady days or four frantic ones, and a
            reader who does turn it knows where to look. */}
        <Text style={styles.sectionTitle}>{s.dayList}</Text>
        <FlexTable
          columns={[
            { label: s.colNo, widthPct: 8 },
            { label: s.colDate, widthPct: 16 },
            { label: s.crew, widthPct: 10, align: "right" },
            { label: s.colNote, widthPct: 66 },
          ]}
          rows={input.days.map((day) => [
            day.reportNo,
            day.dateLabel,
            day.headcount ?? "",
            clipAtWord(
              day.entries
                .map((entry) => entry.note)
                .filter(Boolean)
                .join(" "),
              90,
            ),
          ])}
          emptyLabel={s.none}
        />

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>

      {/* Every day that carried work or an incident, in order. The numbering
          comes from buildDayReports, so it can never skip. */}
      {input.days.map((day) => (
        <DayReportPage key={day.reportNo} day={day} s={s.day} issuer={input.issuer} projectName={input.projectName} />
      ))}

      <Page size="A4" style={styles.page}>
        <RunningHeader title={s.registers} projectName={input.projectName} />
        <Header title={s.registers} projectName={input.projectName} issuer={input.issuer} />

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

        <Footer generatedLabel={s.generated} pageLabel={s.page} />
      </Page>
    </Document>
  );
}
