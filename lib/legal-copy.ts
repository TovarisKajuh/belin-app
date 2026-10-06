// The legal pages, per language.
//
// Long form documents rather than UI strings, so they live here beside the
// brochure copy instead of in messages/*.json: three paragraphs of GDPR text in
// a message catalog would swamp the interface strings and make the parity test
// police prose it cannot judge.
//
// The privacy text describes WHAT THE APP ACTUALLY DOES, verified against the
// code rather than adapted from a template:
//   - one session cookie (belin_session) and next-intl's locale cookie, both
//     strictly necessary, which is why there is no consent banner and no
//     paragraph pretending there is one
//   - no analytics, no tracking pixels, no advertising: none are installed
//   - processors are Supabase (Frankfurt), Vercel and Resend
//   - the compliance vault rests on a legal obligation the EPC already has,
//     which is the strongest basis available and worth naming

import { OPERATOR } from "./legal";

// The operator named in full where the GDPR and the terms need a named party,
// not only "the company in the Impressum" (final production check 06.10). The
// pages are 404 until OPERATOR is complete, so the empty fallbacks never show.
const OPERATOR_LINE = [
  [OPERATOR.legalName, OPERATOR.legalForm].filter(Boolean).join(" "),
  [OPERATOR.street, [OPERATOR.zip, OPERATOR.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  OPERATOR.registerNumber ? `matična številka ${OPERATOR.registerNumber}` : null,
  OPERATOR.vatId ? `ID za DDV ${OPERATOR.vatId}` : null,
]
  .filter(Boolean)
  .join(", ");

export interface LegalSection {
  h: string;
  p: string[];
}

export interface LegalCopy {
  impressum: {
    title: string;
    intro: string;
    labels: {
      operator: string;
      address: string;
      representative: string;
      contact: string;
      register: string;
      vat: string;
    };
    sections: LegalSection[];
  };
  privacy: {
    title: string;
    updated: string;
    sections: LegalSection[];
  };
  terms: {
    title: string;
    updated: string;
    sections: LegalSection[];
  };
}

const PROCESSORS_SL = [
  "Supabase (baza podatkov in shramba datotek), strežniki v Evropski uniji, Frankfurt.",
  "Vercel (gostovanje aplikacije).",
  "Resend (pošiljanje e-pošte, na primer prijavnih povezav in obvestil).",
];
const PROCESSORS_DE = [
  "Supabase (Datenbank und Dateispeicher), Server in der Europäischen Union, Frankfurt.",
  "Vercel (Hosting der Anwendung).",
  "Resend (E-Mail-Versand, etwa Anmeldelinks und Benachrichtigungen).",
];
const PROCESSORS_EN = [
  "Supabase (database and file storage), servers in the European Union, Frankfurt.",
  "Vercel (application hosting).",
  "Resend (email delivery, such as sign-in links and notifications).",
];

// DRAFT pilot terms, written 2026-10-06 for the founder's approval. Slovenian
// first; de and en reuse it until the founder approves the wording (debt).
const TERMS_SL: LegalCopy["terms"] = {
  title: "Pogoji uporabe",
  updated: "Različica 2026-10-06, za pilotno obdobje. Veljajo od 6. oktobra 2026.",
  sections: [
    {
      h: "1. Ponudnik in uporabniki",
      p: [
        `Storitev Belin ponuja ${OPERATOR_LINE} (v nadaljevanju: ponudnik).`,
        "Pogoji veljajo med ponudnikom in podjetjem, ki se v Belin registrira kot naročnik (v nadaljevanju: naročnik). Naročnik je praviloma izvajalec gradnje sončnih elektrarn, ki v Belin povabi svoje podizvajalce in sodelavce.",
        "Osebe, ki jih naročnik ali njegovi podizvajalci povabijo v Belin, storitev uporabljajo v imenu svojega podjetja. Za njihovo ravnanje v Belinu odgovarja podjetje, ki jim je omogočilo dostop.",
      ],
    },
    {
      h: "2. Kaj je Belin",
      p: [
        "Belin je spletna aplikacija za sodelovanje med izvajalcem in podizvajalci na gradbišču: projekti in udeleženci, dnevna poročila s fotografijami in izračunanim napredkom, režijske ure, dodatna dela, naročilnice, zapisnik o prevzemu, računi in dokumenti o skladnosti.",
        "Belin pripravlja dokumente iz podatkov, ki jih vnesejo uporabniki. Za pravilnost vnesenih podatkov in za vsebino dokumentov, ki jih uporabniki potrdijo ali podpišejo, odgovarjajo uporabniki oziroma njihova podjetja.",
      ],
    },
    {
      h: "3. Pilotno obdobje in cena",
      p: [
        "Pilotno obdobje traja do podpisa zapisnika o prevzemu prvega projekta naročnika v Belinu, najdlje 90 dni od registracije, razen če se stranki pisno dogovorita drugače.",
        "Med pilotnim obdobjem je uporaba za naročnika brezplačna, brez plačilne kartice in brez obveznosti nadaljevanja.",
        "Podizvajalci in njihove ekipe Belin uporabljajo brezplačno.",
        "Morebitno plačljivo naročnino po pilotu ponudnik in naročnik dogovorita pisno in vnaprej. Brez izrecnega soglasja naročnika plačljiva naročnina ne začne teči.",
      ],
    },
    {
      h: "4. Uporabniški račun in dostop",
      p: [
        "Naročnik ob registraciji navede resnične podatke o podjetju in o osebi, ki uporabniški račun upravlja.",
        "Prijava poteka s povezavo, ki jo pošljemo na e-poštni naslov uporabnika. Uporabnik varuje dostop do svojega e-poštnega predala in ponudnika nemudoma obvesti, če sumi zlorabo.",
        "Naročnik sam odloča, koga povabi v svoje projekte, in lahko dostop kadar koli odvzame.",
      ],
    },
    {
      h: "5. Podatki o projektih in varstvo osebnih podatkov",
      p: [
        "Podatki o projektih, ki jih vnesejo naročnik, njegovi podizvajalci in njihove ekipe, pripadajo naročniku oziroma podjetju, ki jih je vneslo. Ponudnik jih uporablja samo za izvajanje storitve.",
        "Za osebne podatke v projektih, na primer imena delavcev, fotografije z gradbišča, ure in podpise, je upravljavec naročnik. Ponudnik jih kot obdelovalec obdeluje po njegovih navodilih in v skladu s členom 28 Splošne uredbe o varstvu podatkov (GDPR).",
        "Ponudnik osebne podatke v projektih obdeluje samo po dokumentiranih navodilih naročnika, ki so ti pogoji in nastavitve aplikacije. Zagotovi, da so osebe z dostopom zavezane k zaupnosti, in izvaja ustrezne tehnične in organizacijske ukrepe varnosti. Uporablja samo podobdelovalce, navedene v obvestilu o varstvu osebnih podatkov. Naročniku pomaga pri uresničevanju pravic posameznikov in ga brez nepotrebnega odlašanja obvesti o kršitvi varstva osebnih podatkov. Ob prenehanju podatke vrne ali izbriše po izbiri naročnika in mu da na voljo informacije, potrebne za dokazovanje skladnosti s členom 28 GDPR. Na zahtevo naročnika ponudnik podpiše tudi ločeno pogodbo o obdelavi osebnih podatkov.",
        "Za podatke o uporabniškem računu, torej ime, e-pošto, telefon in podatke o podjetju, je upravljavec ponudnik. Podrobnosti so v obvestilu o varstvu osebnih podatkov.",
      ],
    },
    {
      h: "6. Gostovanje in zunanji ponudniki",
      p: [
        "Baza podatkov in datoteke so shranjene v Evropski uniji, v podatkovnem centru v Frankfurtu v Nemčiji. Tudi strežniški del aplikacije teče v Frankfurtu.",
        "Za delovanje storitve ponudnik uporablja zunanje ponudnike gostovanja in pošiljanja e-pošte. Njihov seznam je v obvestilu o varstvu osebnih podatkov. O zamenjavi ali dodajanju takega ponudnika naročnika obvestimo vnaprej.",
      ],
    },
    {
      h: "7. Izvoz in izbris podatkov",
      p: [
        "Naročnik lahko kadar koli zahteva izvoz podatkov svojega podjetja. Ustvarjeni dokumenti so na voljo v obliki PDF, ostali podatki v strojno berljivi obliki. Izvoz pripravimo v 14 dneh od zahteve.",
        "Naročnik lahko kadar koli zahteva izbris podatkov svojega podjetja. Izbris izvedemo v 30 dneh od zahteve, razen podatkov, ki jih moramo hraniti po zakonu.",
        "Zahtevo pošljite na e-poštni naslov iz impresuma.",
      ],
    },
    {
      h: "8. Razpoložljivost in odgovornost",
      p: [
        "Ponudnik storitev med pilotom zagotavlja z razumno skrbnostjo, vendar ne jamči neprekinjenega ali brezhibnega delovanja ali določene ravni razpoložljivosti. Napake odpravljamo čim hitreje in o daljših izpadih obvestimo naročnika.",
        "Belin ne nadomešča strokovne presoje uporabnikov. Ponudnik ne odgovarja za odločitve, sprejete na podlagi podatkov v Belinu, niti za vsebino dokumentov, ki jih uporabniki pripravijo, potrdijo ali podpišejo.",
        "Ker je uporaba med pilotom brezplačna, ponudnik v največjem obsegu, ki ga dopušča zakon, odgovarja le za škodo, povzročeno namenoma ali iz hude malomarnosti.",
      ],
    },
    {
      h: "9. Prenehanje",
      p: [
        "Naročnik lahko uporabo kadar koli preneha s sporočilom na e-poštni naslov iz impresuma.",
        "Ponudnik lahko pilot konča z obvestilom po e-pošti najmanj 30 dni vnaprej, ob zlorabi storitve ali hujši kršitvi teh pogojev pa takoj.",
        "Ob prenehanju naročniku na zahtevo pripravimo izvoz podatkov, nato podatke izbrišemo v skladu s točko 7.",
      ],
    },
    {
      h: "10. Spremembe pogojev",
      p: [
        "O spremembah pogojev ponudnik naročnika obvesti po e-pošti najmanj 14 dni pred začetkom njihove veljavnosti. Če se naročnik s spremembo ne strinja, lahko uporabo preneha. Nadaljnja uporaba po začetku veljavnosti pomeni strinjanje.",
        "Pri registraciji zabeležimo čas strinjanja in različico pogojev, s katero se je naročnik strinjal.",
      ],
    },
    {
      h: "11. Pravo in reševanje sporov",
      p: [
        "Za te pogoje velja pravo Republike Slovenije.",
        "Spore skušamo rešiti sporazumno. Če to ni mogoče, spor rešuje stvarno pristojno sodišče v kraju sedeža ponudnika.",
      ],
    },
    {
      h: "12. Kontakt",
      p: ["Vprašanja o teh pogojih pošljite na e-poštni naslov iz impresuma."],
    },
  ],
};

export const LEGAL_SL: LegalCopy = {
  impressum: {
    title: "Impresum",
    intro: "Podatki o ponudniku storitve informacijske družbe.",
    labels: {
      operator: "Naziv",
      address: "Naslov",
      representative: "Zastopnik",
      contact: "Kontakt",
      register: "Matična številka",
      vat: "Identifikacijska številka za DDV",
    },
    sections: [
      {
        h: "Odgovornost za vsebino",
        p: [
          "Vsebino teh strani pripravljamo z vso skrbnostjo. Za točnost, popolnost in aktualnost vsebine ne prevzemamo jamstva.",
        ],
      },
      {
        h: "Odgovornost za povezave",
        p: [
          "Naše strani vsebujejo povezave na zunanja spletna mesta, na katerih vsebino nimamo vpliva. Za vsebino povezanih strani je odgovoren njihov ponudnik.",
        ],
      },
      {
        h: "Avtorske pravice",
        p: [
          "Vsebina in oblika teh strani sta zaščiteni z avtorsko pravico. Razmnoževanje, obdelava ali distribucija zunaj okvirov, ki jih dovoljuje zakon, zahtevata pisno soglasje.",
        ],
      },
    ],
  },
  privacy: {
    title: "Varstvo osebnih podatkov",
    updated: "Zadnja sprememba: 6. oktober 2026",
    sections: [
      {
        h: "Kdo obdeluje vaše podatke",
        p: [
          `Upravljavec podatkov, ki jih zbiramo prek te spletne strani in aplikacije, je ${OPERATOR_LINE}, e-pošta ${OPERATOR.email ?? ""}.`,
          "Kadar aplikacijo uporabljate kot uporabnik naročnika (izvajalca ali podizvajalca), je upravljavec podatkov o projektu vaše podjetje oziroma podjetje, ki vas je povabilo. Belin v tem primeru nastopa kot obdelovalec in podatke obdeluje po njihovih navodilih, na podlagi pogodbe o obdelavi osebnih podatkov.",
        ],
      },
      {
        h: "Katere podatke obdelujemo",
        p: [
          "Podatki o računu: ime in priimek, e-poštni naslov, podjetje in vloga v njem.",
          "Podatki ob registraciji podjetja: naziv, naslov in davčna številka podjetja, ime in priimek, e-poštni naslov in telefon skrbnika uporabniškega računa, čas strinjanja s pogoji uporabe in njihova različica ter zgoščena, nepovratno spremenjena oblika IP naslova, ki jo uporabljamo samo za omejevanje zlorab obrazca.",
          "Podatki o delu: dnevna poročila, količine, fotografije z gradbišča, število delavcev, zapleti, režijske ure, dodatna dela in podpisi na zapisniku o prevzemu.",
          "Dokumenti o skladnosti, ki jih naložite: potrdila A1, Freistellungsbescheinigung, dokazila o usposobljenosti in podobno, skupaj z datumi veljavnosti.",
          "Tehnični podatki: zapisi strežnika, potrebni za delovanje in varnost storitve.",
        ],
      },
      {
        h: "Zakaj jih obdelujemo in na kateri pravni podlagi",
        p: [
          "Za sklenitev pogodbe ob registraciji (člen 6(1)(b) GDPR): brez teh podatkov uporabniškega računa za podjetje ne moremo ustvariti.",
          "Za izvajanje pogodbe (člen 6(1)(b) GDPR): brez teh podatkov aplikacija ne more opravljati svoje naloge, torej voditi evidence gradbišča in pripraviti dokumentacije.",
          "Za izpolnitev zakonske obveznosti (člen 6(1)(c) GDPR): naročnik del je dolžan preveriti določena dokazila svojih podizvajalcev, zato vodenje teh dokumentov temelji na njegovi zakonski obveznosti.",
          "Za zakonite interese (člen 6(1)(f) GDPR): varnost sistema, preprečevanje zlorab in ohranjanje dokazne vrednosti zapisov.",
        ],
      },
      {
        h: "Piškotki",
        p: [
          "Uporabljamo samo nujno potrebne piškotke: piškotek seje, ki vas ohrani prijavljene, in piškotek, ki si zapomni izbrani jezik.",
          "Ne uporabljamo analitike, sledilnih pikslov ali oglaševalskih piškotkov. Zato tudi ni pasice za privolitev: zanjo ni pravne podlage, ker ne obdelujemo ničesar, za kar bi bila potrebna.",
        ],
      },
      {
        h: "Komu podatke posredujemo",
        p: [
          "Podatke posredujemo le obdelovalcem, ki so nujni za delovanje storitve:",
          ...PROCESSORS_SL,
          // Only the public services the code really calls (2026-10-06): VIES at
          // signup (lib/vies.ts) and Open-Meteo for the weather (lib/weather.ts).
          // Nominatim joins this sentence when the wizard geocodes (Task 4.5c).
          "Za posamezne funkcije uporabljamo tudi javne storitve, ki prejmejo samo nujne podatke. Sistem VIES Evropske komisije prejme davčno številko, ki jo vnesete ob registraciji. Storitev Open-Meteo prejme približne koordinate gradbišča in vrne vreme. Vremenski podatki: Open-Meteo, licenca CC BY 4.0.",
          // Both safeguards stay named until each provider's DPA has been read
          // (not checked on 2026-10-06).
          "Supabase, Vercel in Resend so podjetja s sedežem v ZDA. Podatke hranijo v EU; kadar bi bil za delovanje ali podporo potreben dostop iz tretje države, prenos temelji na standardnih pogodbenih določilih Evropske komisije ali na okviru EU-ZDA za zasebnost podatkov, kot ju navajajo pogodbe o obdelavi teh ponudnikov.",
          // Signed DPAs are not confirmed by the founder (0.6 w): the softer,
          // true sentence until he does.
          "Pogodbe o obdelavi osebnih podatkov s temi ponudniki so del njihovih pogojev uporabe. Baza podatkov in datoteke se hranijo v Evropski uniji.",
        ],
      },
      {
        h: "Kako dolgo jih hranimo",
        p: [
          "Podatke o projektu hranimo, dokler traja pogodbeno razmerje z naročnikom, in nato toliko časa, kolikor zahtevajo zakonski roki hrambe za poslovno dokumentacijo.",
          "Dokumentacija projekta ostane naročniku na voljo za izvoz tudi ob prenehanju uporabe storitve.",
          "Nepotrjene registracije izbrišemo v desetih dneh.",
        ],
      },
      {
        h: "Vaše pravice",
        p: [
          "Imate pravico do dostopa do svojih podatkov, do popravka, izbrisa, omejitve obdelave, do prenosljivosti in do ugovora obdelavi.",
          "Zahtevo pošljite na naslov iz impresuma. Prav tako imate pravico do pritožbe pri Informacijskem pooblaščencu Republike Slovenije.",
        ],
      },
    ],
  },
  terms: TERMS_SL,
};

export const LEGAL_DE: LegalCopy = {
  impressum: {
    title: "Impressum",
    intro: "Angaben gemäß § 5 DDG.",
    labels: {
      operator: "Anbieter",
      address: "Anschrift",
      representative: "Vertreten durch",
      contact: "Kontakt",
      register: "Registernummer",
      vat: "Umsatzsteuer-Identifikationsnummer",
    },
    sections: [
      {
        h: "Haftung für Inhalte",
        p: [
          "Die Inhalte dieser Seiten werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann keine Gewähr übernommen werden.",
        ],
      },
      {
        h: "Haftung für Links",
        p: [
          "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.",
        ],
      },
      {
        h: "Urheberrecht",
        p: [
          "Die durch den Betreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem Urheberrecht. Vervielfältigung, Bearbeitung und Verbreitung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung.",
        ],
      },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    updated: "Stand: August 2026",
    sections: [
      {
        h: "Verantwortlicher",
        p: [
          `Verantwortlich für die Verarbeitung der über diese Website und Anwendung erhobenen Daten ist ${OPERATOR_LINE}, E-Mail ${OPERATOR.email ?? ""}.`,
          "Nutzen Sie die Anwendung als Mitarbeiter eines Kunden (Auftraggeber oder Nachunternehmer), ist für die Projektdaten Ihr Unternehmen beziehungsweise das einladende Unternehmen verantwortlich. Belin handelt insoweit als Auftragsverarbeiter und verarbeitet die Daten weisungsgebunden auf Grundlage eines Auftragsverarbeitungsvertrags.",
        ],
      },
      {
        h: "Welche Daten wir verarbeiten",
        p: [
          "Kontodaten: Vor- und Nachname, E-Mail-Adresse, Unternehmen und Rolle.",
          "Projektdaten: Tagesberichte, Mengen, Baustellenfotos, Anzahl der Mitarbeiter, Vorkommnisse, Regiestunden, Nachträge und Unterschriften auf dem Abnahmeprotokoll.",
          "Von Ihnen hochgeladene Nachweise: A1-Bescheinigung, Freistellungsbescheinigung, Qualifikationsnachweise und Ähnliches, jeweils mit Gültigkeitsdatum.",
          "Technische Daten: Serverprotokolle, die für Betrieb und Sicherheit erforderlich sind.",
        ],
      },
      {
        h: "Zwecke und Rechtsgrundlagen",
        p: [
          "Zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO): ohne diese Daten kann die Anwendung ihre Aufgabe nicht erfüllen, nämlich die Baustelle zu dokumentieren und die Abschlussunterlagen zu erzeugen.",
          "Zur Erfüllung einer rechtlichen Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO): der Auftraggeber ist verpflichtet, bestimmte Nachweise seiner Nachunternehmer zu prüfen, etwa im Rahmen von Bauabzugsteuer und Mindestlohnrecht. Die Verwaltung dieser Dokumente stützt sich auf diese Pflicht.",
          "Zur Wahrung berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO): Sicherheit des Systems, Missbrauchsvermeidung und Erhalt der Beweiskraft der Aufzeichnungen.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "Wir setzen ausschließlich notwendige Cookies: ein Sitzungs-Cookie, das Sie angemeldet hält, und ein Cookie, das die gewählte Sprache speichert.",
          "Wir verwenden keine Analyse-, Tracking- oder Werbe-Cookies. Deshalb gibt es auch kein Einwilligungsbanner: es gäbe nichts, wofür eine Einwilligung einzuholen wäre.",
        ],
      },
      {
        h: "Empfänger der Daten",
        p: [
          "Wir geben Daten ausschließlich an Auftragsverarbeiter weiter, die für den Betrieb erforderlich sind:",
          ...PROCESSORS_DE,
          "Mit allen bestehen Auftragsverarbeitungsverträge. Die Daten werden in der Europäischen Union gespeichert.",
        ],
      },
      {
        h: "Speicherdauer",
        p: [
          "Projektdaten werden für die Dauer des Vertragsverhältnisses gespeichert und danach so lange, wie es die gesetzlichen Aufbewahrungsfristen für geschäftliche Unterlagen verlangen.",
          "Die Projektdokumentation bleibt dem Kunden auch bei Beendigung der Nutzung zum Export verfügbar.",
        ],
      },
      {
        h: "Ihre Rechte",
        p: [
          "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.",
          "Richten Sie Ihr Anliegen an die im Impressum genannte Adresse. Außerdem steht Ihnen ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde zu.",
        ],
      },
    ],
  },
  terms: TERMS_SL,
};

export const LEGAL_EN: LegalCopy = {
  impressum: {
    title: "Legal notice",
    intro: "Information about the provider of this service.",
    labels: {
      operator: "Provider",
      address: "Address",
      representative: "Represented by",
      contact: "Contact",
      register: "Registration number",
      vat: "VAT identification number",
    },
    sections: [
      {
        h: "Liability for content",
        p: [
          "The content of these pages is prepared with care. No guarantee is given for its accuracy, completeness or timeliness.",
        ],
      },
      {
        h: "Liability for links",
        p: [
          "These pages contain links to external websites whose content we do not control. Responsibility for the content of linked pages rests with their respective providers.",
        ],
      },
      {
        h: "Copyright",
        p: [
          "The content and design of these pages are protected by copyright. Reproduction, adaptation or distribution beyond what the law permits requires written consent.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: "Last updated: August 2026",
    sections: [
      {
        h: "Who processes your data",
        p: [
          "The controller for data collected through this website and application is the company named in the legal notice.",
          "If you use the application as a member of a customer organisation (a contractor or a subcontractor), your own company, or the company that invited you, is the controller of the project data. Belin acts as a processor and handles that data on their instructions, under a data processing agreement.",
        ],
      },
      {
        h: "What data we process",
        p: [
          "Account data: name, email address, company and role.",
          "Project data: daily reports, quantities, site photos, headcount, incidents, extra hours, change orders and the signatures on the acceptance protocol.",
          "Compliance documents you upload: A1 certificates, exemption certificates, qualification records and similar, together with their expiry dates.",
          "Technical data: server logs required to operate and secure the service.",
        ],
      },
      {
        h: "Purposes and legal bases",
        p: [
          "Performance of a contract (Article 6(1)(b) GDPR): without this data the application cannot do its job, which is to document the site and produce the closing paperwork.",
          "Compliance with a legal obligation (Article 6(1)(c) GDPR): the contracting party is obliged to verify certain records of its subcontractors, so holding those documents rests on that obligation.",
          "Legitimate interests (Article 6(1)(f) GDPR): system security, prevention of misuse, and preserving the evidential value of the records.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "We set strictly necessary cookies only: a session cookie that keeps you signed in, and a cookie that remembers your chosen language.",
          "We use no analytics, tracking or advertising cookies. That is also why there is no consent banner: there would be nothing to ask consent for.",
        ],
      },
      {
        h: "Who receives the data",
        p: [
          "Data is shared only with processors required to run the service:",
          ...PROCESSORS_EN,
          "Data processing agreements are in place with all of them. Data is stored in the European Union.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Project data is kept for the duration of the customer relationship, and afterwards for as long as statutory retention periods for business records require.",
          "Project documentation remains available to the customer for export even if they stop using the service.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You have the right of access, rectification, erasure, restriction of processing, data portability and objection.",
          "Send your request to the address in the legal notice. You also have the right to lodge a complaint with a data protection supervisory authority.",
        ],
      },
    ],
  },
  terms: TERMS_SL,
};

export const LEGAL: Record<string, LegalCopy> = { sl: LEGAL_SL, de: LEGAL_DE, en: LEGAL_EN };
