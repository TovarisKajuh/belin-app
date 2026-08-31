// Every word in the brochure, per language.
//
// Separated from the layout so a new edition is a translation and nothing else.
// The German version is NOT a translation of the Slovenian one: the market
// panel on the problem page carries German figures, and the money page cites
// the German paragraph by number, because a German EPC checks that.
//
// PRICING IS DELIBERATELY ABSENT (founder decision, 2026-08-31). The brochure
// carries the pilot offer instead: the first project is free. A price list in a
// cold email invites a price objection before any value has been established,
// and the numbers have not been tested on a single real prospect yet.

export interface BrochureCopy {
  meta: { title: string; subject: string };
  cover: {
    eyebrow: string;
    titleTop: string;
    titleBottom: string;
    sub: string;
    footLeft: string;
  };
  problem: {
    num: string;
    h2: string;
    lead: string;
    blocks: { t: string; b: string }[];
    panelLabel: string;
    panelBody: string;
  };
  daily: {
    num: string;
    h2: string;
    lead: string;
    steps: { t: string; b: string }[];
    panelLabel: string;
    panelBody: string;
  };
  control: {
    num: string;
    h2: string;
    lead: string;
    panels: { label: string; body: string }[];
  };
  money: { num: string; h2: string; lead: string; panelLabel: string; panelBody: string };
  paper: { num: string; h2: string; lead: string; gold: string; closing: string };
  pilot: {
    num: string;
    h2: string;
    lead: string;
    includedLabel: string;
    included: string[];
    askLabel: string;
    ask: string;
    nextTitle: string;
    nextBody: string;
  };
}

export const COPY_SL: BrochureCopy = {
  meta: { title: "Belin, predstavitev", subject: "Sodelovanje med EPC izvajalci in podizvajalci montaže" },
  cover: {
    eyebrow: "SOLARNA GRADBIŠČA",
    titleTop: "Vaš projekt na enem mestu:",
    titleBottom: "od predaje do izvedbe in zaključka.",
    sub: "Belin povezuje EPC izvajalce in njihove podizvajalce montaže. Ekipa na strehi poroča v 30 sekundah. Vi vidite napredek v živo. Zaključna dokumentacija nastane sama, iz tega, kar se je res zgodilo na gradbišču.",
    footLeft: "Podatki v EU (Frankfurt)\nSlovensko, nemško, angleško",
  },
  problem: {
    num: "01 / PROBLEM",
    h2: "Delo je narejeno. Denar se zatakne pri papirju.",
    lead: "Vsak izvajalec, ki montažo odda podizvajalcu, pozna te tri trenutke. Vsi trije stanejo denar, in vsi trije se zgodijo zato, ker dokazila nastanejo prepozno ali pa sploh ne.",
    blocks: [
      {
        t: "Režijske ure, o katerih se pogovarjate čez dva meseca",
        b: "Podizvajalec pošlje list z urami. Nihče ga ne potrdi, ker ni jasno, kdo bi ga moral. Ob obračunu se pogovarjate o 19 urah, ki jih ni mogoče ne dokazati ne ovreči. Nekdo jih plača, ne da bi vedel, ali bi jih moral.",
      },
      {
        t: "Prevzem, ki nastane teden dni po prevzemu",
        b: "Zapisnik se napiše po spominu, brez podpisa obeh strani, brez seznama pomanjkljivosti in brez datuma za odpravo. Ko se čez pol leta pojavi reklamacija, ni dokumenta, ki bi povedal, v kakšnem stanju je bil objekt ob predaji.",
      },
      {
        t: "Dnevna evidenca v WhatsAppu in Excelu",
        b: "Štiristo fotografij v treh skupinah in preglednica, ki jo nekdo izpolnjuje zvečer, po spominu. Ko potrebujete dokazilo za konkreten dan, ga iščete uro in pol. Ko potrebujete napredek, nekdo pokliče na gradbišče in ugiba.",
      },
    ],
    panelLabel: "KAJ SE JE SPREMENILO V 2025",
    panelBody:
      "Slovenski trg je padel s 298,8 MW na 146,5 MW. Toda padec je skoraj v celoti stanovanjski: komercialni in industrijski segment je padel le za 8 odstotkov, z 100,8 na 92,6 MW. Delo, ki je ostalo, so večje strehe, daljši projekti in montaža, ki jo izvaja podizvajalec. Prav tam, kjer papir stane največ.",
  },
  daily: {
    num: "02 / VSAK DAN",
    h2: "30 sekund na strehi. Pri vas v živo.",
    lead: "Ekipa ne piše poročil. Vpiše količine, doda fotografijo in odda. Z eno roko, na telefonu, tudi na slabi povezavi. Vreme se pripne samo.",
    steps: [
      { t: "Ekipa odda", b: "Količine, fotografije, število delavcev. Brez usposabljanja, brez računa." },
      { t: "Napredek se izračuna", b: "Odstotek je seštevek dejanskih količin, ne ocena po telefonu." },
      { t: "Vi vidite takoj", b: "Nadzorna plošča se osveži sama. Brez klicev, brez preglednic." },
    ],
    panelLabel: "ZAKAJ TO DELUJE",
    panelBody:
      "Podizvajalec in njegova ekipa ne plačata nič in nikoli ne bosta. Orodje, ki ga mora ekipa plačati ali se ga učiti, se ne uporablja, in takrat nimate podatkov. Belin je zastonj za vse, ki delajo na strehi, plača ga samo naročnik del.",
  },
  control: {
    num: "03 / NADZOR",
    h2: "Kaj se dogaja na vseh gradbiščih, brez enega klica.",
    lead: "Napredek, tempo, predviden zaključek in rezerva do roka. Vse izračunano iz poročil, ki jih je oddala ekipa, ne iz ocen.",
    panels: [
      {
        label: "ZAPLETI",
        body: "Dež, ovira, poškodba. Ena tipka na strehi, fotografija, vi obveščeni takoj, ne čez tri dni.",
      },
      {
        label: "MANJKAJOČ MATERIAL",
        body: "Prevzem materiala prvi dan pokaže, česa ni. Takrat, ko je to še poceni in ne ustavi ekipe.",
      },
    ],
  },
  money: {
    num: "04 / DENAR",
    h2: "Ure in dodatna dela, dogovorjena sproti, ne ob obračunu.",
    lead: "Vsak list režijskih ur ima svoj rok. Odštevanje šestih delovnih dni teče vidno na obeh straneh. Brez odziva se list šteje za potrjenega, in obe strani to vesta vnaprej. To je pravilo, ki konča razpravo, preden se začne.",
    panelLabel: "ZA NEMŠKA IN AVSTRIJSKA GRADBIŠČA",
    panelBody:
      "Rok šestih delovnih dni sledi § 15 odst. 3 VOB/B. Potrdila A1 in Freistellungsbescheinigung so na enem mestu, z opozorilom pred potekom. Na računu obrnjena davčna obveznost, brez ročnega popravljanja.",
  },
  paper: {
    num: "05 / ZAKLJUČEK",
    h2: "Papirologija? Narejena.",
    lead: "Ob zaključku projekta ne pišete ničesar. Zaključno poročilo z vsemi dnevi, fotografijami in pregledi, zapisnik o prevzemu z obema podpisoma in račun, ki se sestavi iz naročilnice, potrjenih ur in dodatnih del.",
    gold: "Vse v jeziku projekta, pripravljeno za računovodstvo.",
    closing:
      "To niso vzorci. To so dokumenti, ki jih Belin ustvari iz poročil vaše ekipe. Dokumenti ostanejo vaši, tudi če Belin nekoč nehate uporabljati.",
  },
  pilot: {
    num: "06 / PILOTNI PROJEKT",
    h2: "Prvi projekt je brezplačen.",
    lead: "Iščemo nekaj izvajalcev, ki bodo Belin uporabili na resničnem projektu. En projekt, od predaje do zaključka, brez stroškov in brez obveznosti.",
    includedLabel: "KAJ JE VKLJUČENO",
    included: [
      "Vseh pet modulov, brez omejitev",
      "Neomejeno podizvajalcev, ekip in uporabnikov",
      "Zaključno poročilo, zapisnik o prevzemu in račun",
      "Podatki v EU, Frankfurt",
      "Neposredna linija do ustanovitelja, ne do podpore",
    ],
    askLabel: "KAJ PROSIMO V ZAMENO",
    ask: "Odkrito mnenje, tudi kadar je neprijetno. In če vam projekt prihrani čas, referenco, ki jo lahko pokažemo naprej.",
    nextTitle: "Naslednji korak",
    nextBody:
      "25 minut, vaš projekt na zaslonu, brez prosojnic. Pokažemo na resničnih podatkih, kako bi izgledal vaš zadnji projekt v Belinu.",
  },
};

export const COPY_DE: BrochureCopy = {
  meta: { title: "Belin, Vorstellung", subject: "Zusammenarbeit zwischen EPC-Unternehmen und Montagepartnern" },
  cover: {
    eyebrow: "SOLARBAUSTELLEN",
    titleTop: "Ihr Projekt an einem Ort:",
    titleBottom: "von der Übergabe über die Ausführung bis zum Abschluss.",
    sub: "Belin verbindet EPC-Unternehmen und ihre Montagepartner. Das Team auf dem Dach meldet in 30 Sekunden. Sie sehen den Fortschritt in Echtzeit. Die Abschlussdokumentation entsteht von selbst, aus dem, was auf der Baustelle tatsächlich passiert ist.",
    footLeft: "Daten in der EU (Frankfurt)\nDeutsch, Slowenisch, Englisch",
  },
  problem: {
    num: "01 / PROBLEM",
    h2: "Die Arbeit ist erledigt. Das Geld hängt am Papier.",
    lead: "Jedes Unternehmen, das die Montage vergibt, kennt diese drei Momente. Alle drei kosten Geld, und alle drei entstehen, weil Nachweise zu spät oder gar nicht entstehen.",
    blocks: [
      {
        t: "Regiestunden, über die Sie zwei Monate später diskutieren",
        b: "Der Nachunternehmer reicht einen Stundenzettel ein. Niemand zeichnet ihn gegen, weil unklar ist, wer zuständig wäre. Bei der Abrechnung diskutieren Sie über 19 Stunden, die sich weder belegen noch widerlegen lassen. Jemand bezahlt sie, ohne zu wissen, ob er müsste.",
      },
      {
        t: "Eine Abnahme, die eine Woche nach der Abnahme entsteht",
        b: "Das Protokoll wird aus dem Gedächtnis geschrieben, ohne beide Unterschriften, ohne Mängelliste und ohne Frist zur Beseitigung. Kommt ein halbes Jahr später eine Reklamation, fehlt das Dokument, das den Zustand bei der Übergabe belegt.",
      },
      {
        t: "Tagesdokumentation in WhatsApp und Excel",
        b: "Vierhundert Fotos in drei Gruppen und eine Tabelle, die abends jemand aus dem Gedächtnis ausfüllt. Brauchen Sie den Nachweis für einen bestimmten Tag, suchen Sie eineinhalb Stunden. Brauchen Sie den Fortschritt, ruft jemand auf der Baustelle an und schätzt.",
      },
    ],
    panelLabel: "WAS SICH 2025 GEÄNDERT HAT",
    panelBody:
      "Der Zubau lag 2025 bei 16,6 GW, etwa auf Vorjahresniveau. Gleichzeitig sank der Anteil der E-Handwerksbetriebe, die überhaupt Photovoltaik installieren, von 57,1 auf 52,1 Prozent, und die Zahl der installierten Anlagen von 395.000 auf 355.000. Die Arbeit verteilt sich auf weniger und größere Betriebe, und die arbeiten mit Nachunternehmern. Genau dort kostet Papier am meisten.",
  },
  daily: {
    num: "02 / JEDEN TAG",
    h2: "30 Sekunden auf dem Dach. Bei Ihnen in Echtzeit.",
    lead: "Das Team schreibt keine Berichte. Es trägt Mengen ein, fügt ein Foto hinzu und sendet. Mit einer Hand, am Telefon, auch bei schlechter Verbindung. Das Wetter hängt sich selbst an.",
    steps: [
      { t: "Das Team meldet", b: "Mengen, Fotos, Anzahl der Mitarbeiter. Ohne Schulung, ohne Rechnung." },
      { t: "Fortschritt wird berechnet", b: "Der Prozentsatz ist die Summe echter Mengen, keine Schätzung am Telefon." },
      { t: "Sie sehen es sofort", b: "Das Dashboard aktualisiert sich selbst. Ohne Anrufe, ohne Tabellen." },
    ],
    panelLabel: "WARUM DAS FUNKTIONIERT",
    panelBody:
      "Der Nachunternehmer und sein Team zahlen nichts und werden nie etwas zahlen. Ein Werkzeug, das das Team bezahlen oder erlernen muss, wird nicht benutzt, und dann haben Sie keine Daten. Belin ist kostenlos für alle, die auf dem Dach arbeiten. Bezahlt wird nur vom Auftraggeber.",
  },
  control: {
    num: "03 / ÜBERBLICK",
    h2: "Was auf allen Baustellen passiert, ohne einen einzigen Anruf.",
    lead: "Fortschritt, Tempo, voraussichtlicher Abschluss und Puffer bis zum Termin. Alles berechnet aus den Berichten des Teams, nicht aus Schätzungen.",
    panels: [
      {
        label: "STÖRUNGEN",
        body: "Regen, Hindernis, Beschädigung. Eine Taste auf dem Dach, ein Foto, Sie sind sofort informiert, nicht in drei Tagen.",
      },
      {
        label: "FEHLENDES MATERIAL",
        body: "Die Materialübernahme am ersten Tag zeigt, was fehlt. Zu dem Zeitpunkt, an dem es noch günstig ist und das Team nicht stillsteht.",
      },
    ],
  },
  money: {
    num: "04 / GELD",
    h2: "Stunden und Nachträge, laufend geklärt, nicht bei der Abrechnung.",
    lead: "Jeder Stundenzettel hat seine Frist. Der Countdown von sechs Werktagen läuft für beide Seiten sichtbar. Ohne Rückmeldung gilt der Zettel als anerkannt, und beide Seiten wissen das vorher. Das ist die Regel, die die Diskussion beendet, bevor sie beginnt.",
    panelLabel: "FÜR DEUTSCHE UND ÖSTERREICHISCHE BAUSTELLEN",
    panelBody:
      "Die Frist von sechs Werktagen folgt § 15 Abs. 3 VOB/B. A1-Bescheinigung und Freistellungsbescheinigung liegen an einem Ort, mit Warnung vor Ablauf. Auf der Rechnung Reverse Charge, ohne manuelles Nachbessern.",
  },
  paper: {
    num: "05 / ABSCHLUSS",
    h2: "Papierkram? Erledigt.",
    lead: "Zum Projektabschluss schreiben Sie nichts. Abschlussbericht mit allen Tagen, Fotos und Prüfungen, Abnahmeprotokoll mit beiden Unterschriften und eine Rechnung, die sich aus Bestellung, anerkannten Stunden und Nachträgen zusammensetzt.",
    gold: "Alles in der Projektsprache, fertig für die Buchhaltung.",
    closing:
      "Das sind keine Muster. Das sind Dokumente, die Belin aus den Berichten Ihres Teams erzeugt. Die Dokumente bleiben Ihnen, auch wenn Sie Belin eines Tages nicht mehr nutzen.",
  },
  pilot: {
    num: "06 / PILOTPROJEKT",
    h2: "Das erste Projekt ist kostenlos.",
    lead: "Wir suchen eine kleine Zahl von Unternehmen, die Belin auf einem echten Projekt einsetzen. Ein Projekt, von der Übergabe bis zum Abschluss, ohne Kosten und ohne Verpflichtung.",
    includedLabel: "WAS ENTHALTEN IST",
    included: [
      "Alle fünf Module, ohne Einschränkung",
      "Beliebig viele Nachunternehmer, Teams und Nutzer",
      "Abschlussbericht, Abnahmeprotokoll und Rechnung",
      "Daten in der EU, Frankfurt",
      "Direkter Draht zum Gründer, nicht zu einer Hotline",
    ],
    askLabel: "WAS WIR UNS DAFÜR WÜNSCHEN",
    ask: "Ehrliches Feedback, auch wenn es unangenehm ist. Und wenn das Projekt Ihnen Zeit spart, eine Referenz, die wir weitergeben dürfen.",
    nextTitle: "Der nächste Schritt",
    nextBody:
      "25 Minuten, Ihr Projekt auf dem Bildschirm, keine Folien. Wir zeigen an echten Daten, wie Ihr letztes Projekt in Belin ausgesehen hätte.",
  },
};

export const COPY: Record<string, BrochureCopy> = { sl: COPY_SL, de: COPY_DE };
