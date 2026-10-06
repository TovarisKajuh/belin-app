// One day on site, as a page.
//
// The fields are the ones a construction diary is expected to carry: the
// sequential number, the date, the weather, how many people were there, what
// was built and how much of it, what went wrong, and the photographs. Nothing
// here is invented at print time: every value was captured on the day by the
// people who were there, which is the entire argument for the document.
//
// Photos arrive as Buffers, never as paths (a path string fails silently in
// @react-pdf), and a photo that could not be downloaded is simply absent: a
// missing picture must never cost the page it belonged to.

import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { C, Footer, Header, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";

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

export function DayReportPage({ day, s, issuer }: { day: DayReportData; s: DayReportStrings; issuer: DocIssuer }) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <RunningHeader title={s.title} docNo={`${s.reportNo} ${day.reportNo}`} projectName={day.dateLabel} />
      <Header title={s.title} docNo={`${s.reportNo} ${day.reportNo}`} projectName={day.dateLabel} issuer={issuer} />

      <View style={{ flexDirection: "row", gap: 24, marginBottom: 14 }}>
        <View style={{ width: "50%" }}>
          <Text style={styles.label}>{s.weather}</Text>
          <Text>{day.weatherLabel ?? s.noWeather}</Text>
        </View>
        <View style={{ width: "50%" }}>
          <Text style={styles.label}>{s.headcount}</Text>
          <Text>{day.headcount === null ? "" : `${day.headcount} ${s.people}`}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{s.work}</Text>
      {day.entries.length === 0 ? (
        <Text style={{ color: C.muted }}>{""}</Text>
      ) : (
        day.entries.map((entry, i) => (
          <View key={i} style={{ marginBottom: 8 }} wrap={false}>
            {entry.note ? <Text style={styles.body}>{entry.note}</Text> : null}
            {entry.quantities.length > 0 ? (
              <Text style={{ color: C.inkSoft, marginTop: 3 }}>
                {entry.quantities
                  .map((quantity) => `${quantity.name}: ${quantity.qty} ${quantity.unit}`)
                  .join(" · ")}
              </Text>
            ) : null}
            {entry.author ? (
              <Text style={{ color: C.muted, fontSize: 8, marginTop: 2 }}>{entry.author}</Text>
            ) : null}
          </View>
        ))
      )}

      {day.incidents.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{s.incidents}</Text>
          {day.incidents.map((incident, i) => (
            <Text key={i} style={[styles.body, { marginBottom: 3 }]}>
              {incident.note ? `${incident.kindLabel}: ${incident.note}` : incident.kindLabel}
            </Text>
          ))}
        </>
      ) : null}

      {day.photos.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{s.photos}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {day.photos.map((photo, i) => (
              <Image
                key={i}
                src={photo}
                style={{ width: "48%", height: 150, objectFit: "cover" }}
              />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 26, flexDirection: "row", justifyContent: "flex-end" }} wrap={false}>
        <View style={{ width: "45%" }}>
          <View style={{ height: 34, borderBottomWidth: 1, borderBottomColor: C.line }} />
          <Text style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>{s.signature}</Text>
        </View>
      </View>

      <Footer generatedLabel={s.generated} pageLabel={s.page} />
    </Page>
  );
}

/** A single day as its own document, for the crew-facing "print today" case. */
export function DayReportDocument({ day, s, issuer }: { day: DayReportData; s: DayReportStrings; issuer: DocIssuer }) {
  return (
    <Document title={`${s.title} ${day.reportNo}`}>
      <DayReportPage day={day} s={s} issuer={issuer} />
    </Document>
  );
}
