// A sample compliance document for the demo vault. Seed only: the app never
// renders this. Every page says VZOREC across it and in its footer, and it
// names no issuing authority, so nobody can mistake it for a real certificate.
// Its few Slovenian strings live here, not in lib/pdf/strings.ts: they are
// seed data, like the notes in scripts/seed-demo.mjs, not product copy.
//
// Render ONLY through renderDocument (lib/pdf/theme.tsx), never the raw
// react-pdf buffer call (tests/pdf-render-guard.test.ts refuses that name).

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { C, styles } from "@/lib/pdf/theme";

export function SampleVaultDocument({
  heading,
  rows,
}: {
  heading: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Document title={`${heading} (vzorec)`} author="Belin" creator="Belin" producer="Belin">
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={{ position: "absolute", top: 330, left: 70, fontSize: 110, fontWeight: 700, color: "#eef0f4", transform: "rotate(-28deg)" }}
        >
          VZOREC
        </Text>
        <Text style={{ fontSize: 9, letterSpacing: 1.2, color: C.muted, marginBottom: 6 }}>VZOREC ZA PREDSTAVITEV</Text>
        <Text style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 18 }}>{heading}</Text>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{ flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line }}
          >
            <Text style={{ width: 150, color: C.inkSoft }}>{row.label}</Text>
            <Text style={{ flex: 1, color: C.ink }}>{row.value}</Text>
          </View>
        ))}
        <Text fixed style={{ position: "absolute", bottom: 28, left: 36, right: 36, fontSize: 8, color: C.muted }}>
          Vzorčni dokument za predstavitev Belin. Ni veljaven dokument in ga ni izdal noben organ.
        </Text>
      </Page>
    </Document>
  );
}
