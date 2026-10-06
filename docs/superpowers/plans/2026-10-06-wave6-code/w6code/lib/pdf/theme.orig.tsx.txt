// The PDF engine's foundation: palette, font registration and the handful of
// primitives every Belin document is built from. Ported from the AVE-DC weekly
// dnevnik (C:\DevEnv\AVE-DC\dashboard\lib\pdf\weekly-document.tsx), which is
// read-only reference material.
//
// Three rules learned there, all load bearing:
//
// 1. The font is registered ONCE, at module level, from a path built with
//    process.cwd(). Every document imports this file, so importing it is what
//    registers the font; there is no init function to forget to call.
// 2. Hyphenation is disabled. @react-pdf hyphenates by default and breaks
//    Slovenian and German compounds in places no reader would.
// 3. Images are passed as Buffers, never as filesystem path strings. A path
//    string fails silently on Windows and leaves a blank box in the document.
//
// Deliberately NOT "server-only": like lib/k2, this is pure rendering logic
// that the test suite imports under plain Node, where that import throws. It
// holds no secrets and reads no environment beyond the working directory.
//
// Documents render on WHITE PAPER with the ink palette below, not in the app's
// dark system. A dark PDF is unreadable when printed, and these documents get
// printed, signed and filed.

import path from "node:path";
import { Font, Image, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
// The Style type lives in @react-pdf/types, which the renderer re-exports only
// as an internal namespace. Importing it here keeps the table cell helper
// typed instead of widening its width and textAlign to plain strings.
import type { Style } from "@react-pdf/types";

const interPath = path.join(process.cwd(), "public", "fonts", "InterVariable.ttf");

/**
 * Registers the document font, replacing any previous registration.
 *
 * THIS MUST RUN BEFORE EVERY renderToBuffer, through renderDocument below.
 *
 * @react-pdf keeps one parsed font per registered family and builds the PDF's
 * glyph subset against it. That state is shared across renders in the same
 * process, and once a later document introduces glyphs the first one did not
 * use, the ToUnicode map it writes stops matching the glyphs it draws. The
 * page still LOOKS perfect, and the text layer underneath is wrong: our own
 * nine day completion report extracted as "Kraj" for "Kranj", with every "n"
 * missing and full stops turned into control characters.
 *
 * That is not cosmetic here. These documents are evidence. Somebody searches
 * them, copies a sentence into an email, or feeds them to a system that reads
 * text, and a document that copies as something other than what it displays is
 * worse than one that fails loudly.
 *
 * Deleting the family before re-registering forces a fresh font object, and
 * therefore a fresh subset, for each document. Font.clear() cannot be used: it
 * also wipes the built-in Helvetica the renderer needs internally, and
 * Font.reset() nulls the font data without reloading it, which crashes the
 * layout engine. Deleting our own key is the narrow version that works.
 */
export function registerDocumentFonts(): void {
  const families = Font.getRegisteredFonts() as Record<string, unknown>;
  delete families["Inter"];

  Font.register({
    family: "Inter",
    fonts: [
      { src: interPath, fontWeight: 400 },
      { src: interPath, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}

registerDocumentFonts();

/** The paper palette. Print safe, deliberately not the app's dark tokens. */
export const C = {
  ink: "#0a1628",
  inkSoft: "#3c4a5e",
  muted: "#8a95a6",
  line: "#e6e9ef",
  bg: "#f5f6f8",
  accent: "#2b7de9",
  paper: "#ffffff",
} as const;

export const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: C.paper,
    paddingTop: 36,
    paddingBottom: 56, // room for the fixed footer
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Inter",
    color: C.ink,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: C.ink,
  },
  headerProject: {
    fontSize: 9,
    color: C.inkSoft,
    marginTop: 3,
  },
  headerRight: {
    textAlign: "right",
    fontSize: 8,
    color: C.muted,
    lineHeight: 1.5,
  },
  brand: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: C.ink,
  },
  // The cover's figure band: four numbers across, each in its own quiet box.
  statBand: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 4,
  },
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 7.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 19,
    fontWeight: 700,
    color: C.ink,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: C.ink,
    marginTop: 14,
    marginBottom: 6,
  },
  labelValue: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: "32%",
    color: C.muted,
  },
  value: {
    width: "68%",
    color: C.ink,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeadCell: {
    fontSize: 8,
    fontWeight: 700,
    color: C.inkSoft,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
    color: C.ink,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
    fontSize: 7,
    color: C.muted,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "46%",
  },
  signatureImage: {
    height: 44,
    objectFit: "contain",
  },
  signatureLine: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
  },
  signatureName: {
    fontSize: 8,
    color: C.inkSoft,
    marginTop: 4,
  },
});

export type Column = {
  label: string;
  /** Percentage of the table width. The columns of one table must sum to 100. */
  widthPct: number;
  align?: "left" | "right" | "center";
};

/**
 * The document header. `docNo` is the human document number ("N-3",
 * "2026-001"), printed right of the title where a filing clerk looks for it.
 */
export function Header({
  title,
  docNo,
  projectName,
}: {
  title: string;
  docNo?: string | null;
  projectName?: string | null;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {projectName ? <Text style={styles.headerProject}>{projectName}</Text> : null}
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.brand}>BELIN</Text>
        {docNo ? <Text>{docNo}</Text> : null}
      </View>
    </View>
  );
}

/**
 * The fixed page footer. `fixed` repeats it on every page of the document,
 * which is what makes multi page documents (the completion report) legible
 * once printed and separated.
 */
export function Footer({
  generatedLabel,
  pageLabel,
}: {
  generatedLabel: string;
  /** Optional "Stran {n}" style label; @react-pdf supplies the numbers. */
  pageLabel?: (info: { pageNumber: number; totalPages: number }) => string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{generatedLabel}</Text>
      {pageLabel ? (
        <Text
          render={({ pageNumber, totalPages }) => pageLabel({ pageNumber, totalPages })}
        />
      ) : (
        <Text>getbelin.com</Text>
      )}
    </View>
  );
}

/** One labelled fact. The building block of every parties and metadata block. */
export function LabelValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={styles.labelValue}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === null || value === undefined ? "" : String(value)}</Text>
    </View>
  );
}

/**
 * A table built from flex rows with percentage widths. @react-pdf has no real
 * table element, and hand rolled rows are what the AVE-DC documents proved
 * survive page breaks: `wrap` false on a row keeps it whole, and the header
 * repeats with `fixed`.
 */
/** One figure on the completion report cover. */
export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function FlexTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: Column[];
  rows: (string | number | null)[][];
  /** Printed instead of an empty body, so a register never looks truncated. */
  emptyLabel?: string;
}) {
  const cellStyle = (col: Column): Style => ({
    width: `${col.widthPct}%`,
    textAlign: col.align ?? "left",
    paddingRight: 4,
  });

  return (
    <View>
      <View style={styles.tableHead} fixed>
        {columns.map((col, i) => (
          <Text key={i} style={[styles.tableHeadCell, cellStyle(col)]}>
            {col.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 && emptyLabel ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { color: C.muted }]}>{emptyLabel}</Text>
        </View>
      ) : null}
      {rows.map((row, r) => (
        <View key={r} style={styles.tableRow} wrap={false}>
          {columns.map((col, c) => (
            <Text key={c} style={[styles.tableCell, cellStyle(col)]}>
              {row[c] === null || row[c] === undefined ? "" : String(row[c])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * A signature slot. With `image` (a PNG Buffer read from the signatures
 * bucket) it prints the drawn signature; without one it prints a ruled line to
 * sign by hand. The name is always printed underneath, because a signature
 * nobody can read is not evidence of who signed.
 */
export function SignatureBox({
  name,
  image,
  caption,
}: {
  name: string;
  image?: Buffer | null;
  caption?: string | null;
}) {
  return (
    <View style={styles.signatureBox}>
      {image ? (
        <Image style={styles.signatureImage} src={image} />
      ) : (
        <View style={styles.signatureLine} />
      )}
      <Text style={styles.signatureName}>{name}</Text>
      {caption ? <Text style={[styles.signatureName, { color: C.muted }]}>{caption}</Text> : null}
    </View>
  );
}

/** Two signature slots side by side: the acceptance protocol's closing block. */
export function SignatureRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.signatureRow} wrap={false}>
      {left}
      {right}
    </View>
  );
}

/**
 * Render a document to a PDF buffer.
 *
 * EVERY caller must use this rather than renderToBuffer directly: the font
 * re-registration above only protects documents that go through here, and a
 * document rendered around it gets the corrupted text layer described there.
 */
export async function renderDocument(
  document: Parameters<typeof renderToBuffer>[0],
): Promise<Buffer> {
  registerDocumentFonts();
  return renderToBuffer(document);
}
