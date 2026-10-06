// One day on site, as a page.
//
// The fields are the ones a construction diary is expected to carry: the
// project, the sequential number, the date, the weather, how many people were
// there, what was built and how much of it, what went wrong, and the
// photographs. Nothing here is invented at print time: every value was
// captured on the day by the people who were there, which is the entire
// argument for the document.
//
// Photos arrive as Buffers, never as paths (a path string fails silently in
// @react-pdf). Each one is measured from its own header bytes and fitted WHOLE
// into a cell of a two-column grid, so a phone's portrait photo is never cut
// into a strip (documents H4). A photo that is not JPEG or PNG, or that could
// not be downloaded, is simply absent: a missing picture must never cost the
// page it belonged to.
//
// THE CLOSING BLOCK: the last photo row and the signature line are one
// unbreakable View, so the signature can never land alone on a fresh page.

import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { C, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";
import { fitBox, imageSize } from "@/lib/pdf/image-size";

export interface DayReportStrings {
  title: string;
  reportNo: string;
  date: string;
  weather: string;
  headcount: string;
  work: string;
  quantities: string;
  incidents: string;
  photos: string;
  author: string;
  signature: string;
  noWeather: string;
  generated: string;
  people: string;
  page: string;
}

export interface DayReportData {
  reportNo: number;
  dateLabel: string;
  weatherLabel: string | null;
  headcount: number | null;
  entries: {
    note: string | null;
    author: string | null;
    quantities: { name: string; qty: number; unit: string }[];
  }[];
  incidents: { kindLabel: string; note: string }[];
  photos: Buffer[];
}

/** A4 width minus the page's 36 point side padding, split into two cells with an 8 point gap. */
const CELL_WIDTH = (595.28 - 72 - 8) / 2;
/** Tall enough for a portrait phone photo to read, short enough for two rows on a page. */
const CELL_HEIGHT = 260;

type Cell = { bytes: Buffer; width: number; height: number };

function cellsOf(photos: Buffer[]): Cell[] {
  return photos.flatMap((bytes) => {
    const size = imageSize(bytes);
    if (!size) return [];
    const box = fitBox(size, CELL_WIDTH, CELL_HEIGHT);
    return [{ bytes, width: box.width, height: box.height }];
  });
}

function PhotoRow({ cells }: { cells: Cell[] }) {
  return (
    <View wrap={false} style={{ flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
      {cells.map((cell, i) => (
        <Image key={i} src={cell.bytes} style={{ width: cell.width, height: cell.height }} />
      ))}
    </View>
  );
}

export function DayReportPage({
  day,
  s,
  issuer,
  projectName,
}: {
  day: DayReportData;
  s: DayReportStrings;
  issuer: DocIssuer;
  /** Printed in the header slot, so a loose page still says whose job it is. */
  projectName: string;
}) {
  const docNo = `${s.reportNo} ${day.reportNo}`;
  const cells = cellsOf(day.photos);
  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  const lastRow = rows.pop();

  return (
    <Page size="A4" style={styles.page} wrap>
      <RunningHeader title={s.title} docNo={docNo} projectName={projectName} />
      <Header title={s.title} docNo={docNo} projectName={projectName} issuer={issuer} />

      <View style={{ marginBottom: 10 }}>
        <LabelValue label={s.date} value={day.dateLabel} />
        <LabelValue label={s.weather} value={day.weatherLabel ?? s.noWeather} />
        <LabelValue label={s.headcount} value={day.headcount === null ? "" : `${day.headcount} ${s.people}`} />
      </View>

      <Text style={styles.sectionTitle}>{s.work}</Text>
      {day.entries.map((entry, i) => (
        <View key={i} style={{ marginBottom: 8 }} wrap={false}>
          {entry.note ? <Text style={styles.body}>{entry.note}</Text> : null}
          {entry.quantities.length > 0 ? (
            <Text style={[styles.body, { color: C.inkSoft, marginTop: 3 }]}>
              {entry.quantities.map((quantity) => `${quantity.name}: ${quantity.qty} ${quantity.unit}`).join(" · ")}
            </Text>
          ) : null}
          {entry.author ? <Text style={{ color: C.muted, fontSize: 8, marginTop: 2 }}>{entry.author}</Text> : null}
        </View>
      ))}

      {day.incidents.length > 0 ? (
        <View wrap={false}>
          <Text style={styles.sectionTitle}>{s.incidents}</Text>
          {day.incidents.map((incident, i) => (
            <Text key={i} style={[styles.body, { marginBottom: 3 }]}>
              {incident.note ? `${incident.kindLabel}: ${incident.note}` : incident.kindLabel}
            </Text>
          ))}
        </View>
      ) : null}

      {/* The section title travels with the first row, never alone at a page foot. */}
      {rows.length > 0 ? (
        <View wrap={false}>
          <Text style={styles.sectionTitle}>{s.photos}</Text>
          <PhotoRow cells={rows[0]} />
        </View>
      ) : null}
      {rows.slice(1).map((row, r) => (
        <PhotoRow key={r} cells={row} />
      ))}

      <View wrap={false}>
        {lastRow && rows.length === 0 ? <Text style={styles.sectionTitle}>{s.photos}</Text> : null}
        {lastRow ? <PhotoRow cells={lastRow} /> : null}
        <View style={{ marginTop: 26, flexDirection: "row", justifyContent: "flex-end" }}>
          <View style={{ width: "45%" }}>
            <View style={{ height: 34, borderBottomWidth: 1, borderBottomColor: C.line }} />
            <Text style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>{s.signature}</Text>
          </View>
        </View>
      </View>

      <Footer generatedLabel={s.generated} pageLabel={s.page} />
    </Page>
  );
}

/** A single day as its own document. */
export function DayReportDocument({
  day,
  s,
  issuer,
  projectName,
}: {
  day: DayReportData;
  s: DayReportStrings;
  issuer: DocIssuer;
  projectName: string;
}) {
  return (
    <Document title={`${s.title} ${day.reportNo}, ${projectName}`}>
      <DayReportPage day={day} s={s} issuer={issuer} projectName={projectName} />
    </Document>
  );
}
