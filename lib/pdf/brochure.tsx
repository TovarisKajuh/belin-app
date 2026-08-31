// The sales brochure: six A4 pages, attached to a cold email.
//
// Built on the same @react-pdf engine as the app's real documents, for one
// reason that matters later: a German edition is a locale switch and a
// translation pass, not a redesign.
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
  panel: "rgba(255,255,255,0.045)",
  ok: "#4ad07a",
  warn: "#e0913a",
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
  // cover
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
  eyebrow: {
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 2.6,
    color: D.gold,
    marginBottom: 14,
  },
  coverTitle: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: -0.7,
    lineHeight: 1.22,
    color: D.ink,
    maxWidth: 400,
  },
  coverTitle2: { color: D.ink2 },
  coverSub: {
    fontSize: 12,
    lineHeight: 1.55,
    color: D.ink2,
    marginTop: 16,
    maxWidth: 380,
  },
  coverFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  url: { fontSize: 10, fontWeight: 700, color: D.gold, letterSpacing: 0.4 },
  // inner pages
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
    maxWidth: 430,
  },
  lead: { fontSize: 12, lineHeight: 1.6, color: D.ink2, maxWidth: 450, marginBottom: 26 },
  // pain and feature blocks
  block: {
    borderLeftWidth: 2,
    borderLeftColor: D.gold,
    paddingLeft: 15,
    marginBottom: 26,
  },
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
  panelLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: D.muted,
    marginBottom: 7,
  },
  // step row
  steps: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 18 },
  step: { flex: 1 },
  stepNum: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2, color: D.gold, marginBottom: 5 },
  stepTitle: { fontSize: 12, fontWeight: 700, color: D.ink, marginBottom: 3 },
  stepBody: { fontSize: 10.5, lineHeight: 1.55, color: D.ink2 },
  // price table
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: D.line,
  },
  priceLabel: { fontSize: 11, color: D.ink2 },
  priceValue: { fontSize: 11.5, fontWeight: 700, color: D.ink },
  bigNumber: { fontSize: 34, fontWeight: 700, color: D.gold, letterSpacing: -1 },
  bigNumberUnit: { fontSize: 12, fontWeight: 700, color: D.goldSoft },
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
  phone: Buffer;
  dashboard: Buffer;
  crewPhone: Buffer;
  hours: Buffer;
  documents: Buffer;
}

/**
 * The Slovenian edition.
 *
 * Copy rules, from docs/gtm/knowledge/market-icp-si.md: the market contracted
 * in 2025, so this sells PROTECTION OF MONEY, not efficiency. "Digitalizacija"
 * is a luxury word in a shrinking market; "you will not lose the argument about
 * those 19 hours" is not. Trade register throughout, no product language.
 */
export function BrochureDocument({ img }: { img: BrochureImages }) {
  return (
    <Document
      title="Belin, predstavitev"
      author="Belin"
      subject="Sodelovanje med EPC izvajalci in podizvajalci montaže"
    >
      {/* 1. COVER */}
      <Page size="A4" style={s.coverPage}>
        <Brand />

        <View style={{ marginTop: 74 }}>
          <Text style={s.eyebrow}>SOLARNA GRADBIŠČA</Text>
          <Text style={s.coverTitle}>
            Vaš projekt na enem mestu:{"\n"}
            <Text style={s.coverTitle2}>od predaje do izvedbe in zaključka.</Text>
          </Text>
          <Text style={s.coverSub}>
            Belin povezuje EPC izvajalce in njihove podizvajalce montaže. Ekipa na strehi
            poroča v 30 sekundah. Vi vidite napredek v živo. Zaključna dokumentacija
            nastane sama, iz tega, kar se je res zgodilo na gradbišču.
          </Text>
        </View>

        <View style={s.grow} />

        <View style={{ marginHorizontal: -26 }}>
          <Image src={img.hero} style={s.imgFull} />
        </View>

        <View style={s.grow} />

        <View style={s.coverFoot}>
          <Text style={{ fontSize: 9, color: D.muted }}>
            Podatki v EU (Frankfurt){"\n"}Slovensko, nemško, angleško
          </Text>
          <Text style={s.url}>getbelin.com</Text>
        </View>
      </Page>

      {/* 2. THE PROBLEM */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>01 / PROBLEM</Text>
        </View>

        <Text style={s.h2}>Delo je narejeno. Denar se zatakne pri papirju.</Text>
        <Text style={s.lead}>
          Vsak izvajalec, ki montažo odda podizvajalcu, pozna te tri trenutke. Vsi trije
          stanejo denar, in vsi trije se zgodijo zato, ker dokazila nastanejo prepozno ali
          pa sploh ne.
        </Text>

        <View style={s.block}>
          <Text style={s.blockTitle}>Režijske ure, o katerih se pogovarjate čez dva meseca</Text>
          <Text style={s.blockBody}>
            Podizvajalec pošlje list z urami. Nihče ga ne potrdi, ker ni jasno, kdo bi ga
            moral. Ob obračunu se pogovarjate o 19 urah, ki jih ni mogoče ne dokazati ne
            ovreči. Nekdo jih plača, ne da bi vedel, ali bi jih moral.
          </Text>
        </View>

        <View style={s.block}>
          <Text style={s.blockTitle}>Prevzem, ki nastane teden dni po prevzemu</Text>
          <Text style={s.blockBody}>
            Zapisnik se napiše po spominu, brez podpisa obeh strani, brez seznama
            pomanjkljivosti in brez datuma za odpravo. Ko se čez pol leta pojavi reklamacija,
            ni dokumenta, ki bi povedal, v kakšnem stanju je bil objekt ob predaji.
          </Text>
        </View>

        <View style={s.block}>
          <Text style={s.blockTitle}>Dnevna evidenca v WhatsAppu in Excelu</Text>
          <Text style={s.blockBody}>
            Štiristo fotografij v treh skupinah in preglednica, ki jo nekdo izpolnjuje zvečer,
            po spominu. Ko potrebujete dokazilo za konkreten dan, ga iščete uro in pol. Ko
            potrebujete napredek, nekdo pokliče na gradbišče in ugiba.
          </Text>
        </View>

        <View style={s.panel}>
          <Text style={s.panelLabel}>KAJ SE JE SPREMENILO V 2025</Text>
          <Text style={[s.blockBody, { maxWidth: 450 }]}>
            Slovenski trg je padel s 298,8 MW na 146,5 MW. Toda padec je skoraj v celoti
            stanovanjski: komercialni in industrijski segment je padel le za 8 odstotkov,
            z 100,8 na 92,6 MW. Delo, ki je ostalo, so večje strehe, daljši projekti in
            montaža, ki jo izvaja podizvajalec. Prav tam, kjer papir stane največ.
          </Text>
        </View>

        <Footer page="01" />
      </Page>

      {/* 3. THE DAILY LOOP */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>02 / VSAK DAN</Text>
        </View>

        <Text style={s.h2}>30 sekund na strehi. Pri vas v živo.</Text>
        <Text style={s.lead}>
          Ekipa ne piše poročil. Vpiše količine, doda fotografijo in odda. Z eno roko, na
          telefonu, tudi na slabi povezavi. Vreme se pripne samo.
        </Text>

        <View style={s.steps}>
          <View style={s.step}>
            <Text style={s.stepNum}>01</Text>
            <Text style={s.stepTitle}>Ekipa odda</Text>
            <Text style={s.stepBody}>
              Količine, fotografije, število delavcev. Brez usposabljanja, brez računa.
            </Text>
          </View>
          <View style={s.step}>
            <Text style={s.stepNum}>02</Text>
            <Text style={s.stepTitle}>Napredek se izračuna</Text>
            <Text style={s.stepBody}>
              Odstotek je seštevek dejanskih količin, ne ocena po telefonu.
            </Text>
          </View>
          <View style={s.step}>
            <Text style={s.stepNum}>03</Text>
            <Text style={s.stepTitle}>Vi vidite takoj</Text>
            <Text style={s.stepBody}>
              Nadzorna plošča se osveži sama. Brez klicev, brez preglednic.
            </Text>
          </View>
        </View>

        <Image src={img.crewPhone} style={[s.imgFull, { marginTop: 4 }]} />

        <View style={[s.panel, { marginTop: 16 }]}>
          <Text style={s.panelLabel}>ZAKAJ TO DELUJE</Text>
          <Text style={s.blockBody}>
            Podizvajalec in njegova ekipa ne plačata nič in nikoli ne bosta. Orodje, ki ga
            mora ekipa plačati ali se ga učiti, se ne uporablja, in takrat nimate podatkov.
            Belin je zastonj za vse, ki delajo na strehi, plača ga samo naročnik del.
          </Text>
        </View>

        <Footer page="02" />
      </Page>

      {/* 4. THE DASHBOARD */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>03 / NADZOR</Text>
        </View>

        <Text style={s.h2}>Kaj se dogaja na vseh gradbiščih, brez enega klica.</Text>
        <Text style={s.lead}>
          Napredek, tempo, predviden zaključek in rezerva do roka. Vse izračunano iz
          poročil, ki jih je oddala ekipa, ne iz ocen.
        </Text>

        <Image src={img.dashboard} style={s.imgFull} />

        <View style={s.grow} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[s.panel, { flex: 1, marginTop: 0 }]}>
            <Text style={s.panelLabel}>ZAPLETI</Text>
            <Text style={s.blockBody}>
              Dež, ovira, poškodba. Ena tipka na strehi, fotografija, vi obveščeni takoj,
              ne čez tri dni.
            </Text>
          </View>
          <View style={[s.panel, { flex: 1, marginTop: 0 }]}>
            <Text style={s.panelLabel}>MANJKAJOČ MATERIAL</Text>
            <Text style={s.blockBody}>
              Prevzem materiala prvi dan pokaže, česa ni. Takrat, ko je to še poceni in ne
              ustavi ekipe.
            </Text>
          </View>
        </View>

        <Footer page="03" />
      </Page>

      {/* 5. THE MONEY */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>04 / DENAR</Text>
        </View>

        <Text style={s.h2}>Ure in dodatna dela, dogovorjena sproti, ne ob obračunu.</Text>
        <Text style={s.lead}>
          Vsak list režijskih ur ima svoj rok. Odštevanje šestih delovnih dni teče vidno na
          obeh straneh. Brez odziva se list šteje za potrjenega, in obe strani to vesta
          vnaprej. To je pravilo, ki konča razpravo, preden se začne.
        </Text>

        <Image src={img.hours} style={s.imgFull} />

        <View style={s.grow} />

        <View style={s.panel}>
          <Text style={s.panelLabel}>ZA NEMŠKA IN AVSTRIJSKA GRADBIŠČA</Text>
          <Text style={s.blockBody}>
            Rok šestih delovnih dni sledi § 15 VOB/B. Potrdila A1 in Freistellungsbescheinigung
            so na enem mestu, z opozorilom pred potekom. Na računu obrnjena davčna obveznost,
            brez ročnega popravljanja.
          </Text>
        </View>

        <Footer page="04" />
      </Page>

      {/* 6. THE PAPERWORK */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>05 / ZAKLJUČEK</Text>
        </View>

        <Text style={s.h2}>Papirologija? Narejena.</Text>
        <Text style={s.lead}>
          Ob zaključku projekta ne pišete ničesar. Zaključno poročilo z vsemi dnevi,
          fotografijami in pregledi, zapisnik o prevzemu z obema podpisoma in račun, ki se
          sestavi iz naročilnice, potrjenih ur in dodatnih del.
        </Text>

        <View style={s.grow} />

        <Image src={img.documents} style={s.imgFull} />

        <View style={s.grow} />

        <Text style={[s.blockBody, { color: D.gold, fontWeight: 700, fontSize: 12.5 }]}>
          Vse v jeziku projekta, pripravljeno za računovodstvo.
        </Text>
        <Text style={[s.blockBody, { marginTop: 8 }]}>
          To niso vzorci. To so dokumenti, ki jih Belin ustvari iz poročil vaše ekipe.
          Dokumenti ostanejo vaši, tudi če Belin nekoč nehate uporabljati.
        </Text>

        <Footer page="05" />
      </Page>

      {/* 7. PRICE AND NEXT STEP */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHead}>
          <Brand />
          <Text style={s.pageNum}>06 / CENA</Text>
        </View>

        <Text style={s.h2}>Plačate takrat, ko gradite.</Text>
        <Text style={s.lead}>
          Brez naročnine na uporabnika, brez plačila za podizvajalce, brez plačila za mesece,
          v katerih ni novega projekta.
        </Text>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 }}>
          <Text style={s.bigNumber}>5 EUR</Text>
          <Text style={[s.bigNumberUnit, { marginBottom: 7 }]}>na kWp, na projekt</Text>
        </View>

        <View style={{ marginTop: 12, marginBottom: 20 }}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Najmanj na projekt</Text>
            <Text style={s.priceValue}>49 EUR</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Največ na projekt, ne glede na velikost</Text>
            <Text style={s.priceValue}>995 EUR</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Največ na mesec, ne glede na število projektov</Text>
            <Text style={s.priceValue}>2.495 EUR</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Podizvajalci, ekipe, uporabniki, arhiv</Text>
            <Text style={[s.priceValue, { color: D.ok }]}>0 EUR</Text>
          </View>
        </View>

        <View style={s.panel}>
          <Text style={s.panelLabel}>ZA PRIMERJAVO</Text>
          <Text style={s.blockBody}>
            Streha 245 kWp stane 995 EUR, enkratno, za celotno dokumentacijo projekta. To je
            manj kot en dan zastoja ekipe in bistveno manj od ene sporne postavke pri
            obračunu. Cene so brez DDV.
          </Text>
        </View>

        <View style={[s.panel, { borderColor: D.gold, marginTop: 14 }]}>
          <Text style={[s.panelLabel, { color: D.gold }]}>PRVIH PET IZVAJALCEV</Text>
          <Text style={s.blockBody}>
            Iščemo pet slovenskih izvajalcev za pilotni projekt. Cena 3 EUR na kWp, zaklenjena
            za 12 mesecev, z istimi omejitvami. En projekt, dogovorjena merila uspeha, jasen
            datum konca. V zameno za odkrito mnenje in referenco.
          </Text>
        </View>

        <View style={{ marginTop: 26, borderTopWidth: 1, borderTopColor: D.line, paddingTop: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: D.ink, marginBottom: 6 }}>
            Naslednji korak
          </Text>
          <Text style={[s.blockBody, { marginBottom: 12 }]}>
            25 minut, vaš projekt na zaslonu, brez predstavitve v obliki prosojnic. Pokažemo
            na resničnih podatkih, kako bi izgledal vaš zadnji projekt v Belinu.
          </Text>
          <Text style={s.url}>getbelin.com</Text>
          <Text style={{ fontSize: 10, color: D.ink2, marginTop: 4 }}>info@getbelin.com</Text>
        </View>

        <Footer page="06" />
      </Page>
    </Document>
  );
}
