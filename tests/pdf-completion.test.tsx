import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { Document, Page, Text } from "@react-pdf/renderer";
import { CompletionDocument } from "@/lib/pdf/completion";
import type { DayReportData } from "@/lib/pdf/day-report";
import { completionStrings } from "@/lib/pdf/strings";
import { renderDocument, styles } from "@/lib/pdf/theme";

// A control character where a letter belongs means the ToUnicode map is wrong.
const CONTROL = new RegExp("[" + String.fromCharCode(1) + "-" + String.fromCharCode(31) + "]");

// The completion report is the document the whole product exists to produce,
// so its two load-bearing properties are pinned here: the day numbering never
// skips, and the text layer is READABLE. The second one is not cosmetic. These
// documents are evidence: somebody will search them, copy a sentence into an
// email, or feed them to a system that reads text. A PDF that looks right and
// copies as "Kraj" instead of "Kranj" is worse than one that fails loudly.

const photo = (() => {
  try {
    return readFileSync("tests/fixtures/pdf/site-photo.jpg");
  } catch {
    return null;
  }
})();

function day(reportNo: number, dateLabel: string): DayReportData {
  return {
    reportNo,
    dateLabel,
    weatherLabel: "Pretežno oblačno, 23 °C",
    headcount: 6,
    entries: [
      {
        note: "Montaža podkonstrukcije na južnem delu strehe, Kranj.",
        author: "Luka Zupan",
        quantities: [
          { name: "Podkonstrukcija", qty: 120, unit: "m" },
          { name: "Moduli", qty: 30, unit: "kos" },
        ],
      },
    ],
    incidents: reportNo === 2 ? [{ kindLabel: "Dež, prekinitev", note: "" }] : [],
    photos: photo ? [photo] : [],
  };
}

function buildDocument(dayCount: number) {
  const days = Array.from({ length: dayCount }, (_, i) =>
    day(i + 1, `${String(i + 1).padStart(2, "0")}. 08. 2026`),
  );

  return CompletionDocument({
    projectName: "PSE Trgovski center Kranj",
    clientName: "Sonce Energija d.o.o.",
    contractorName: "AVESOL d.o.o.",
    siteAddress: "Cesta Staneta Žagarja 69, 4000 Kranj",
    periodLabel: "30. 07. 2026 - 11. 08. 2026",
    powerLabel: "245.7 kWp",
    dayCount,
    totalHours: 14,
    days,
    hoursRegister: [{ number: 1, hours: 8, status: "Potrjeno" }],
    coRegister: [
      { number: 1, title: "Zamenjava letev", amount: "1.200,00 EUR", status: "Potrjeno" },
    ],
    incidentRegister: [{ date: "02. 08.", kindLabel: "Dež, prekinitev", note: "" }],
    issuer: { name: "AVESOL d.o.o.", logo: null },
    s: completionStrings("sl"),
  });
}

async function textOf(dayCount: number): Promise<string> {
  const buffer = await renderDocument(buildDocument(dayCount));
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(Array.isArray(text) ? text.join(" ") : text).replace(/\s+/g, " ");
}

describe("completion report", () => {
  it("numbers its day pages without gaps", async () => {
    const text = await textOf(9);
    for (let n = 1; n <= 9; n++) expect(text).toContain(`št. ${n}`);
    expect(text).not.toContain("št. 10");
  }, 120000);

  // The regression this file was written for: at nine days the produced text
  // layer dropped every letter "n" and turned periods into control characters,
  // while the page still LOOKED correct. Copying "Kranj" out of the document
  // gave "Kraj".
  it("produces a text layer that reads back correctly", async () => {
    const text = await textOf(9);
    expect(text).toContain("Kranj");
    expect(text).toContain("Zaključno poročilo");
    expect(text).toContain("Sonce Energija");
    expect(text).toContain("Naročnik");
    // No control characters where punctuation belongs.
    expect(text).not.toMatch(CONTROL);
  }, 120000);

  it("keeps the text layer intact on a short report too", async () => {
    const text = await textOf(2);
    expect(text).toContain("Kranj");
    expect(text).toContain("Naročnik");
  }, 120000);
});

// The exact shape that produced the corruption: several documents with
// DIFFERENT alphabets rendered one after another in a single process, which is
// what a warm server does all day. Rendering the same document repeatedly never
// reproduced it; introducing new glyphs is what breaks the map.
describe("documents rendered in sequence", () => {
  it("keeps every text layer intact as the alphabet grows", async () => {
    const bodies = [
      "Naročilnica Sonce Energija Kranj",
      "Poročilo o režijskih urah Matej Kovač Čiščenje po neurju",
      "Zaključno poročilo · 23 °C · 30. 07. - 11. 08. Kranj Naročnik",
      "Prevzem Pomanjkljivosti Pogodbena kazen Garancijska doba xyzq QWXY",
      "Račun Obrnjena davčna obveznost po 76.a členu ZDDV-1 Kranj Naročnik",
      // German last, on purpose: ä ö ü ß enter the process only here, which is
      // the exact shape that corrupted the map. German is the pilot language,
      // so a document that copies as "Auftraggeber" minus its umlauts would be
      // found by the customer rather than by us.
      "Abschlussbericht Auftraggeber Nachunternehmer Vertragsstrafe Gewährleistung",
      "Regiestunden Werktage Mängel Ausführungsfrist Umsatzsteuer Straße 30",
    ];

    for (const body of bodies) {
      const buffer = await renderDocument(
        <Document>
          <Page size="A4" style={styles.page}>
            <Text>{body}</Text>
          </Page>
        </Document>,
      );
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const out = String(text).replace(/\s+/g, " ");

      // Every WORD the document was asked to draw must read back, not just the
      // first one: the corruption dropped single letters out of the middle of
      // words, so checking one token would have missed it.
      for (const word of body.split(" ")) expect(out).toContain(word);
      expect(out).not.toMatch(CONTROL);
    }
  }, 180000);
});
