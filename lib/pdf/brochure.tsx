// The sales brochure: seven A4 pages, attached to a cold email.
//
// Built on the same @react-pdf engine as the app's real documents, so a new
// language edition is a copy pass and nothing else. The words live in
// brochure-copy.ts; this file is only layout.
//
// TWO DELIBERATE BREAKS with lib/pdf/theme.tsx, which serves legal documents:
//
// 1. IT IS DARK. theme.tsx renders on white paper because completion reports
//    and acceptance protocols get printed, signed and filed. This is not that.
//    It is opened in a mail client, usually on a phone, next to a dozen beige
//    technical PDFs, and it has one second to look like a serious modern
//    product. It also has to match the site the reader lands on if it works.
// 2. IT CARRIES ITS OWN PALETTE AND STYLES rather than importing the paper
//    ones, so nothing here can drift into a document that is evidence.
//
// What it does share: the font registration path, because that is the machinery
// that keeps the text layer honest, and the rule that images are passed as
// Buffers and never as path strings, which fails silently on Windows.

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { registerDocumentFonts } from "./theme";
import type { BrochureCopy } from "./brochure-copy";

registerDocumentFonts();

/** The app's dark tokens, carried into print. */
const D = {
  bg: "#0a121e",
  bgSoft: "#101b2b",
  ink: "#f4f1ea",
  ink2: "#cfcabf",
  muted: "#8a8578",
  gold: "#ffd21a",
  goldSoft: "#ffe488",
  line: "rgba(255,255,255,0.12)",
  ok: "#4ad07a",
} as const;

const s = StyleSheet.create({
  page: {
    backgroundColor: D.bg,
    color: D.ink,
    fontFamily: "Inter",
    flexDirection: "column",
    fontSize: 10,
    paddingTop: 46,
    paddingBottom: 52,
    paddingHorizontal: 46,
  },
  coverPage: {
    backgroundColor: D.bg,
    color: D.ink,
    fontFamily: "Inter",
    flexDirection: "column",
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 46,
  },
  /** Pushes whatever follows it to the foot of the page. */
  grow: { flexGrow: 1 },
  markRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  markGrid: { width: 27, flexDirection: "row", flexWrap: "wrap", gap: 2.5 },
  cell: { width: 7, height: 7, borderRadius: 1.5, backgroundColor: "#2c2a25" },
  cellOn: { width: 7, height: 7, borderRadius: 1.5, backgroundColor: D.gold },
  wordmark: { fontSize: 17, fontWeight: 700, letterSpacing: 2.6, color: D.ink },
  eyebrow: { fontSize: 8.5, fontWeight: 700, letterSpacing: 2.6, color: D.gold, marginBottom: 14 },
  coverTitle: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: -0.7,
    lineHeight: 1.22,
    color: D.ink,
    maxWidth: 420,
  },
  coverTitle2: { color: D.ink2 },
  coverSub: { fontSize: 12, lineHeight: 1.55, color: D.ink2, marginTop: 16, maxWidth: 400 },
  coverFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  url: { fontSize: 10, fontWeight: 700, color: D.gold, letterSpacing: 0.4 },
  pageHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  pageNum: { fontSize: 8, letterSpacing: 1.6, color: D.muted },
  h2: {
    fontSize: 23,
    fontWeight: 700,
    letterSpacing: -0.5,
    lineHeight: 1.25,
    color: D.ink,
    marginBottom: 10,
    maxWidth: 440,
  },
  lead: { fontSize: 12, lineHeight: 1.6, color: D.ink2, maxWidth: 450, marginBottom: 26 },
  block: { borderLeftWidth: 2, borderLeftColor: D.gold, paddingLeft: 15, marginBottom: 26 },
  blockTitle: { fontSize: 13, fontWeight: 700, color: D.ink, marginBottom: 4 },
  blockBody: { fontSize: 11, lineHeight: 1.6, color: D.ink2, maxWidth: 450 },
  panel: {
    backgroundColor: D.bgSoft,
    borderWidth: 1,
    borderColor: D.line,
    borderRadius: 8,
    padding: 18,
    marginTop: 6,
  },
  panelLabel: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color: D.muted, marginBottom: 9 },
  steps: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 18 },
  step: { flex: 1 },
  stepNum: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2, color: D.gold, marginBottom: 5 },
  stepTitle: { fontSize: 12, fontWeight: 700, color: D.ink, marginBottom: 3 },
  stepBody: { fontSize: 10.5, lineHeight: 1.55, color: D.ink2 },
  bullet: { flexDirection: "row", gap: 9, marginBottom: 8 },
  bulletDot: { width: 5, height: 5, marginTop: 5, borderRadius: 1.5, backgroundColor: D.gold },
  bulletText: { fontSize: 11, lineHeight: 1.5, color: D.ink2, flex: 1 },
  freeLine: { fontSize: 26, fontWeight: 700, color: D.gold, letterSpacing: -0.6, marginBottom: 12 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: D.muted,
  },
  imgFull: { width: "100%", objectFit: "contain" },
});

/** The rising cell mark, same twelve cells as the app and the landing page. */
const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

function Brand() {
  return (
    <View style={s.markRow}>
      <View style={s.markGrid}>
        {MARK.map((on, i) => (
          <View key={i} style={on ? s.cellOn : s.cell} />
        ))}
      </View>
      <Text style={s.wordmark}>BELIN</Text>
    </View>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Belin, getbelin.com</Text>
      <Text>{page}</Text>
    </View>
  );
}

export interface BrochureImages {
  hero: Buffer;
  dashboard: Buffer;
  crewPhone: Buffer;
  hours: Buffer;
  documents: Buffer;
}

/**
 * One edition, in whichever language the copy carries.
 *
 * Copy rules, from docs/gtm/knowledge/: all three markets contracted in 2025,
 * so this sells PROTECTION OF MONEY, not efficiency. "Digitalisierung" is a
 * luxury word in a shrinking market; "you will not lose the argument about
 * those 19 hours" is not. Trade register throughout, no product language.
 */
export function BrochureDocument({ img, copy }: { img: BrochureImages; copy: BrochureCopy }) {
  return (
    <Document title={copy.meta.title} author="Belin" subject={copy.meta.subject}>
      {/* 1. COVER */}
      <Page size="A4" style={s.coverPage}>
        <Brand />

        <View style={{ marginTop: 74 }}>
          <Text style={s.eyebrow}>{copy.cover.eyebrow}</Text>
          <Text style={s.coverTitle}>
            {copy.cover.titleTop}
            {"\n"}
            <Text style={s.coverTitle2}>{copy.cover.titleBottom}</Text>
          </Text>
          <Text style={s.coverSub}>{copy.cover.sub}</Text>
        </View>

        <View style={s.grow} />

        <View style={{ marginHorizontal: -26 }}>
          <Image src={img.hero} style={s.imgFull} />
        </View>

        <View style={s.grow} />

        <View style={s.coverFoot}>
          <Text style={{ fontSize: 9, color: D.muted }}>{copy.cover.footLeft}</Text>
          <Text style={s.url}>getbelin.com</Text>
        </View>
      </Page>

      {/* 2. THE PROBLEM */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.problem.num}</Text>
        </View>

        <Text style={s.h2}>{copy.problem.h2}</Text>
        <Text style={s.lead}>{copy.problem.lead}</Text>

        {copy.problem.blocks.map((block) => (
          <View key={block.t} style={s.block}>
            <Text style={s.blockTitle}>{block.t}</Text>
            <Text style={s.blockBody}>{block.b}</Text>
          </View>
        ))}

        <View style={s.grow} />

        <View style={s.panel}>
          <Text style={s.panelLabel}>{copy.problem.panelLabel}</Text>
          <Text style={[s.blockBody, { maxWidth: 450 }]}>{copy.problem.panelBody}</Text>
        </View>

        <Footer page="01" />
      </Page>

      {/* 3. THE DAILY LOOP */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.daily.num}</Text>
        </View>

        <Text style={s.h2}>{copy.daily.h2}</Text>
        <Text style={s.lead}>{copy.daily.lead}</Text>

        <View style={s.steps}>
          {copy.daily.steps.map((step, i) => (
            <View key={step.t} style={s.step}>
              <Text style={s.stepNum}>{`0${i + 1}`}</Text>
              <Text style={s.stepTitle}>{step.t}</Text>
              <Text style={s.stepBody}>{step.b}</Text>
            </View>
          ))}
        </View>

        <Image src={img.crewPhone} style={[s.imgFull, { marginTop: 4 }]} />

        <View style={s.grow} />

        <View style={s.panel}>
          <Text style={s.panelLabel}>{copy.daily.panelLabel}</Text>
          <Text style={s.blockBody}>{copy.daily.panelBody}</Text>
        </View>

        <Footer page="02" />
      </Page>

      {/* 4. THE DASHBOARD */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.control.num}</Text>
        </View>

        <Text style={s.h2}>{copy.control.h2}</Text>
        <Text style={s.lead}>{copy.control.lead}</Text>

        <Image src={img.dashboard} style={s.imgFull} />

        <View style={s.grow} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          {copy.control.panels.map((panel) => (
            <View key={panel.label} style={[s.panel, { flex: 1, marginTop: 0 }]}>
              <Text style={s.panelLabel}>{panel.label}</Text>
              <Text style={s.blockBody}>{panel.body}</Text>
            </View>
          ))}
        </View>

        <Footer page="03" />
      </Page>

      {/* 5. THE MONEY */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.money.num}</Text>
        </View>

        <Text style={s.h2}>{copy.money.h2}</Text>
        <Text style={s.lead}>{copy.money.lead}</Text>

        <Image src={img.hours} style={s.imgFull} />

        <View style={s.grow} />

        <View style={s.panel}>
          <Text style={s.panelLabel}>{copy.money.panelLabel}</Text>
          <Text style={s.blockBody}>{copy.money.panelBody}</Text>
        </View>

        <Footer page="04" />
      </Page>

      {/* 6. THE PAPERWORK */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.paper.num}</Text>
        </View>

        <Text style={s.h2}>{copy.paper.h2}</Text>
        <Text style={s.lead}>{copy.paper.lead}</Text>

        <View style={s.grow} />

        <Image src={img.documents} style={s.imgFull} />

        <View style={s.grow} />

        <Text style={[s.blockBody, { color: D.gold, fontWeight: 700, fontSize: 12.5 }]}>
          {copy.paper.gold}
        </Text>
        <Text style={[s.blockBody, { marginTop: 8 }]}>{copy.paper.closing}</Text>

        <Footer page="05" />
      </Page>

      {/* 7. THE PILOT. No prices anywhere: the offer IS the first project. */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>{copy.pilot.num}</Text>
        </View>

        <Text style={s.freeLine}>{copy.pilot.h2}</Text>
        <Text style={s.lead}>{copy.pilot.lead}</Text>

        <View style={s.panel}>
          <Text style={s.panelLabel}>{copy.pilot.includedLabel}</Text>
          {copy.pilot.included.map((line) => (
            <View key={line} style={s.bullet}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={[s.panel, { borderColor: D.gold, marginTop: 16 }]}>
          <Text style={[s.panelLabel, { color: D.gold }]}>{copy.pilot.askLabel}</Text>
          <Text style={s.blockBody}>{copy.pilot.ask}</Text>
        </View>

        <View style={s.grow} />

        <View style={{ borderTopWidth: 1, borderTopColor: D.line, paddingTop: 18 }}>
          <Text style={{ fontSize: 13, fontWeight: 700, color: D.ink, marginBottom: 6 }}>
            {copy.pilot.nextTitle}
          </Text>
          <Text style={[s.blockBody, { marginBottom: 14 }]}>{copy.pilot.nextBody}</Text>
          <Text style={s.url}>getbelin.com</Text>
          <Text style={{ fontSize: 11, color: D.ink2, marginTop: 4 }}>info@getbelin.com</Text>
        </View>

        <Footer page="06" />
      </Page>
    </Document>
  );
}
