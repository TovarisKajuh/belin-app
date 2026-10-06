// Task 6.4m: the naročilnica's order terms and the D9 wording of the deemed note.
import { readFileSync, writeFileSync } from "node:fs";
const ADD = {
  sl: {
    "po.termsTitle": "Pogoji naročila",
    "po.regieClause":
      "Režijske ure. Izvajalec režijska dela vpisuje na liste režijskih ur v aplikaciji Belin. Naročnik oddani list potrdi ali zavrne v šestih dneh po oddaji; štejejo se dnevi od ponedeljka do sobote razen {holidays}, dan oddaje se ne šteje. Če se naročnik v tem roku ne odzove, se list šteje za potrjenega. Potrjene ure se obračunajo po urni postavki iz te naročilnice.",
    "po.basis.si": "Za vprašanja, ki jih ta naročilnica ne ureja, se uporabljata Obligacijski zakonik in Posebne gradbene uzance 2020.",
    "po.basis.de": "Za vprašanja, ki jih ta naročilnica ne ureja, se uporablja VOB/B v različici, veljavni ob sklenitvi pogodbe.",
    "po.basis.at": "Za vprašanja, ki jih ta naročilnica ne ureja, se uporablja ÖNORM B 2110 v različici, veljavni ob sklenitvi pogodbe.",
    "holidays.si": "dela prostih dni v Republiki Sloveniji",
    "holidays.de": "zakonskih praznikov, ki veljajo v vsej Nemčiji",
    "holidays.at": "zakonskih praznikov v Avstriji",
    "ui.poTermsHint": "Pogoji naročila, tudi rok za potrjevanje režijskih ur, so zapisani na koncu naročilnice.",
  },
  de: {
    "po.termsTitle": "Bestellbedingungen",
    "po.regieClause":
      "Regiestunden. Der Auftragnehmer erfasst Stundenlohnarbeiten auf Regieberichten in Belin. Der Auftraggeber bestätigt oder beanstandet einen eingereichten Bericht innerhalb von sechs Werktagen nach Einreichung; gezählt werden Montag bis Samstag ohne {holidays}, der Tag der Einreichung zählt nicht. Äußert sich der Auftraggeber innerhalb dieser Frist nicht, gilt der Bericht als anerkannt. Anerkannte Stunden werden zum Stundensatz dieser Bestellung abgerechnet.",
    "po.basis.si": "Ergänzend gelten das slowenische Obligationengesetzbuch (Obligacijski zakonik) und die Besonderen Bauusancen 2020 (Posebne gradbene uzance 2020).",
    "po.basis.de": "Ergänzend gilt die VOB/B in der bei Vertragsschluss gültigen Fassung.",
    "po.basis.at": "Ergänzend gilt die ÖNORM B 2110 in der bei Vertragsschluss gültigen Fassung.",
    "holidays.si": "die gesetzlich arbeitsfreien Tage in Slowenien",
    "holidays.de": "die bundeseinheitlichen gesetzlichen Feiertage",
    "holidays.at": "die gesetzlichen Feiertage in Österreich",
    "ui.poTermsHint": "Die Bestellbedingungen, auch die Frist für Regieberichte, stehen am Ende der Bestellung.",
  },
  en: {
    "po.termsTitle": "Order terms",
    "po.regieClause":
      "Day-work hours. The contractor records day-work on hour sheets in Belin. The client approves or rejects a submitted sheet within six days of submission, counting Monday to Saturday excluding {holidays}; the day of submission does not count. If the client does not respond within that period, the sheet is deemed approved. Approved hours are charged at the hourly rate in this order.",
    "po.basis.si": "Matters not covered by this order are governed by the Slovenian Obligations Code (Obligacijski zakonik) and the Special Construction Usages 2020 (Posebne gradbene uzance 2020).",
    "po.basis.de": "Matters not covered by this order are governed by the VOB/B in the version in force when the contract is concluded.",
    "po.basis.at": "Matters not covered by this order are governed by ÖNORM B 2110 in the version in force when the contract is concluded.",
    "holidays.si": "public non-working days in Slovenia",
    "holidays.de": "public holidays observed throughout Germany",
    "holidays.at": "public holidays in Austria",
    "ui.poTermsHint": "The order terms, including the deadline for day-work sheets, are printed at the end of the purchase order.",
  },
};
// The deemed note defers the count to the order terms, so it is true whichever
// country's non-working days the naročilnica names.
const DEEMED = {
  sl: "Ta list je potrjen s potekom roka: naročnik se ni odzval v šestih dneh po oddaji, kot jih štejejo pogoji naročilnice (od ponedeljka do sobote razen dela prostih dni), zato se po teh pogojih šteje za potrjenega.",
  de: "Dieser Stundenzettel gilt nach Fristablauf als anerkannt: Der Auftraggeber hat sich nicht innerhalb von sechs Werktagen nach Einreichung geäußert, gezählt nach den Bestellbedingungen (Montag bis Samstag ohne gesetzliche Feiertage); nach diesen Bedingungen gilt er als anerkannt.",
  en: "This sheet is deemed approved because the period ended: the client did not respond within six days of submission, counted as the order terms define them (Monday to Saturday, excluding public holidays), so under those terms it counts as approved.",
};
function setPath(obj, path, value) {
  const parts = path.split(".");
  let node = obj;
  for (const part of parts.slice(0, -1)) node = node[part] ??= {};
  const leaf = parts.at(-1);
  if (node[leaf] !== undefined && node[leaf] !== value) throw new Error(`doc.${path} exists with other text; reconcile by hand`);
  node[leaf] = value;
}
for (const locale of ["sl", "de", "en"]) {
  const file = `messages/${locale}.json`;
  const raw = readFileSync(file, "utf8");
  const catalog = JSON.parse(raw);
  if (JSON.stringify(catalog, null, 2) + "\n" !== raw) throw new Error(`${file} does not round-trip; edit by hand`);
  if (!catalog.doc) throw new Error(`${file}: no doc namespace; Task 6.1m first`);
  for (const [path, value] of Object.entries(ADD[locale])) setPath(catalog.doc, path, value);
  catalog.hours.doc.deemedNote = DEEMED[locale];
  writeFileSync(file, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`${file}: order terms added, deemed note set`);
}
