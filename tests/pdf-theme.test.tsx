// The PDF engine smoke test, and the loop that closes it: we render a document
// with our own primitives and then read the produced bytes back with the same
// extractor the K2 parser uses. Every later document test (day numbering, the
// penalty reservation sentence, the reverse-charge invoice) is this same trick
// applied to real content, so if this file is red none of those can be trusted.
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { C, Footer, FlexTable, Header, LabelValue, SignatureBox, styles } from "@/lib/pdf/theme";

function SmokeDocument() {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header title="Naročilnica" docNo="N-1" projectName="Belin test" issuer={{ name: "Solarna Gradnja d.o.o.", logo: null }} />
        <LabelValue label="Naročnik" value="Sonce Energija d.o.o." />
        <FlexTable
          columns={[
            { label: "Opis", widthPct: 60 },
            { label: "Količina", widthPct: 20, align: "right" },
            { label: "Skupaj", widthPct: 20, align: "right" },
          ]}
          rows={[
            ["Montaža", "1", "1.000,00 EUR"],
            ["Režijske ure", "8", "320,00 EUR"],
          ]}
        />
        <View style={{ marginTop: 18 }}>
          <SignatureBox name="Boštjan Novak" />
        </View>
        <Text style={{ color: C.muted }}>Šumniki: čšž ČŠŽ</Text>
        <Footer generatedLabel="Ustvarjeno v Belinu" />
      </Page>
    </Document>
  );
}

async function textOf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join(" ") : text;
}

describe("pdf engine", () => {
  it("renders a document built from the shared primitives", async () => {
    const buffer = await renderToBuffer(<SmokeDocument />);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  }, 30000);

  it("produces text our own extractor can read back", async () => {
    const text = await textOf(await renderToBuffer(<SmokeDocument />));
    expect(text).toContain("Belin");
    expect(text).toContain("Naročilnica");
    expect(text).toContain("Boštjan Novak");
  }, 30000);

  it("renders Slovenian diacritics through the registered font", async () => {
    // The whole reason Inter is registered: the built-in Helvetica has no
    // č, š or ž, and a missing glyph is silent. A German umlaut check lands
    // with the translation pass; this is the same guarantee for sl.
    const text = await textOf(await renderToBuffer(<SmokeDocument />));
    expect(text).toContain("čšž");
    expect(text).toContain("ČŠŽ");
  }, 30000);
});
