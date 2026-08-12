import { Document, Page, Text } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { renderDocument, styles } from "@/lib/pdf/theme";

// THIS FILE MUST RENDER SMALL DOCUMENTS FIRST, AND MUST STAY ON ITS OWN.
//
// The bug it guards: @react-pdf keeps one parsed font per registered family and
// builds each PDF's glyph subset against that shared state. When a later
// document introduces glyphs an earlier one did not use, the ToUnicode map it
// writes stops matching the glyphs it draws. The page looks perfect; the text
// underneath is wrong. Our nine day completion report copied as "Kraj" for
// "Kranj", with every "n" gone and full stops turned into control characters.
//
// Reproducing it needs a GROWING alphabet in one process: rendering the same
// document repeatedly never breaks, and rendering a large document first
// inoculates everything after it, which is why this cannot live in the same
// file as the completion report tests. Vitest gives each file its own worker,
// so the order here is the whole experiment.

const CONTROL = new RegExp("[" + String.fromCharCode(1) + "-" + String.fromCharCode(31) + "]");

const BODIES = [
  "Naročilnica Sonce Energija Kranj",
  "Poročilo o režijskih urah Matej Kovač Čiščenje po neurju",
  "Zaključno poročilo · 23 °C · 30. 07. - 11. 08. Kranj Naročnik",
  "Prevzem Pomanjkljivosti Pogodbena kazen Garancijska doba xyzq QWXY",
  "Račun Obrnjena davčna obveznost po 76.a členu ZDDV-1 Kranj Naročnik",
];

async function renderAndRead(body: string): Promise<string> {
  const buffer = await renderDocument(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>{body}</Text>
      </Page>
    </Document>,
  );
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text).replace(/\s+/g, " ");
}

describe("font subset across documents", () => {
  it("keeps every text layer readable as the alphabet grows", async () => {
    const corrupted: string[] = [];

    for (const body of BODIES) {
      const out = await renderAndRead(body);
      // Every word must read back exactly as it was drawn.
      for (const word of body.split(" ").filter((w) => w.length > 3)) {
        if (!out.includes(word)) corrupted.push(`${word} missing from: ${out}`);
      }
      if (CONTROL.test(out)) corrupted.push(`control characters in: ${out}`);
    }

    expect(corrupted).toEqual([]);
  }, 180000);
});
