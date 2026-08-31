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
    updated: "Zadnja sprememba: avgust 2026",
    sections: [
      {
        h: "Kdo obdeluje vaše podatke",
        p: [
          "Upravljavec podatkov, ki jih zbiramo prek te spletne strani in aplikacije, je podjetje, navedeno v impresumu.",
          "Kadar aplikacijo uporabljate kot uporabnik naročnika (izvajalca ali podizvajalca), je upravljavec podatkov o projektu vaše podjetje oziroma podjetje, ki vas je povabilo. Belin v tem primeru nastopa kot obdelovalec in podatke obdeluje po njihovih navodilih, na podlagi pogodbe o obdelavi osebnih podatkov.",
        ],
      },
      {
        h: "Katere podatke obdelujemo",
        p: [
          "Podatki o računu: ime in priimek, e-poštni naslov, podjetje in vloga v njem.",
          "Podatki o delu: dnevna poročila, količine, fotografije z gradbišča, število delavcev, zapleti, režijske ure, dodatna dela in podpisi na zapisniku o prevzemu.",
          "Dokumenti o skladnosti, ki jih naložite: potrdila A1, Freistellungsbescheinigung, dokazila o usposobljenosti in podobno, skupaj z datumi veljavnosti.",
          "Tehnični podatki: zapisi strežnika, potrebni za delovanje in varnost storitve.",
        ],
      },
      {
        h: "Zakaj jih obdelujemo in na kateri pravni podlagi",
        p: [
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
          "Z vsemi imamo sklenjene pogodbe o obdelavi osebnih podatkov. Podatki se hranijo v Evropski uniji.",
        ],
      },
      {
        h: "Kako dolgo jih hranimo",
        p: [
          "Podatke o projektu hranimo, dokler traja pogodbeno razmerje z naročnikom, in nato toliko časa, kolikor zahtevajo zakonski roki hrambe za poslovno dokumentacijo.",
          "Dokumentacija projekta ostane naročniku na voljo za izvoz tudi ob prenehanju uporabe storitve.",
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
          "Verantwortlich für die Verarbeitung der über diese Website und Anwendung erhobenen Daten ist das im Impressum genannte Unternehmen.",
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
};

export const LEGAL: Record<string, LegalCopy> = { sl: LEGAL_SL, de: LEGAL_DE, en: LEGAL_EN };
