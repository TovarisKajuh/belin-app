import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Fills the REAL Slovenian grid-connection application and photographs it.
//
//     npm run marketing:vloga
//
// Phase 2 of the workflow document claims Belin fills the vloga za soglasje out
// of data it already holds. A drawn lookalike would prove nothing, so this
// takes the operator's own published PDF, writes this project's values onto its
// own blank lines, signs it, and saves the two pages as pictures.
//
// Source: "VLOGA ZA IZDAJO SOGLASJA ZA PRIKLJUČITEV", Elektro Gorenjska d.d.,
// downloaded 16.09.2026 and committed at assets/marketing/forms/, so this build
// needs no network. It is a genuine AcroForm with 54 named fields; the names
// below are the operator's, verbatim, including their typos and truncations.
//
// EVERY NUMBER IS THE SEED'S. 546 Trina Vertex S+ 450 W is 245,7 kWp, two
// Huawei SUN2000-100KTL is 200 kVA on the AC side, and 245,7 kWp at Kranj's
// roughly 1050 kWh/kWp is the 258.000 kWh on the form. An electrician can check
// it, which is the only reason to print numbers at all.

const SRC = "assets/marketing/forms/vloga-soglasje-blank.pdf";
const OUT = "assets/marketing/forms";
const SCALE = 3;

// The building owner holds the metering point. Invented, and deliberately not
// any real company: this picture travels.
const OWNER = "PSE Nepremičnine d.o.o.";
// Under the pooblastilo signed in phase 1.4, the EPC files on the owner's behalf.
const AGENT = "AVESOL d.o.o.";

const PAGE_1 = {
  "Naziv  Priimek in ime": OWNER,
  "Ulica Kraj in hišna številka": "Cesta Staneta Žagarja 69",
  "Poštna številka in kraj": "4000 Kranj",
  "Davčna številka": "SI 10000001",
  "Kontaktna oseba": "Marko Golob",
  Tel: "041 555 120",
  Email: "marko.golob@pse-demo.si",

  "Številka predhodno izdanega dokumenta": "1042/2026",
  "Informacija o možnosti priključitve": "izdana 14. 04. 2026",
  "Naziv elektrarneproizvodne naprave": "SE PSE Trgovski center Kranj",
  Lokacija: "Kranj",
  "Parcelna številka": "1043/7",
  "Katastrska občina": "2100 Kranj",
  "Predvideno leto priključitve": "2026",

  obstoječa: "160",
  nova: "200",
  "Celotna instalirana moč proizvodne naprave (kVA": "200",
  "Vrsta proizvodne naprave": "sončna",
  "Proizvodni vir energije": "sonce",
  "Moč fotonapetostnih modulov": "245,7",
  "Število generatorjevrazsmernikov": "2",
  "Moč generatorja/razsmernika": "100",
  "kVA Nazivna napetost generatorjevrazsmernikov": "400",
  "Vrsta generatorja obkroži asinhronskisinhronskifotonapetostni Vrsta razsmernika obkroži  enofaznitrifazni Nazivna frekvenca": "50",

  "Predvidena letna proizvodnja": "258.000",
  "kWh od tega za lastne potrebe": "180.600",
  "kWh in za oddajo v omrežje": "77.400",
  "Številka merilnega mesta": "2-104377",
  "GSRN MM": "705700000104377",
};

// Ring the printed option rather than pretending it is a field: the form says
// "obkroži", and a circle is what the operator asked for.
// "DA" and "NE" stand alone as their own text items, so they are matched whole.
// As substrings they would hit PODATKI and PROIZVODNE first. The two slashed
// options are matched with their slash, which is what makes them unique: plain
// "fotonapetostni" is also the start of "fotonapetostnih modulov" two lines up.
const PAGE_1_CIRCLES = [
  { text: "PROIZVODNE NAPRAVE EE", exact: true }, // vrsta vloge
  { text: "/fotonapetostni", dx: 8 }, // vrsta generatorja
  { text: "/trifazni", dx: 5 }, // vrsta razsmernika
  { text: "NE", exact: true, nth: 0, dx: 1 }, // neposredni proračunski porabnik: ne
  { text: "DA", exact: true, nth: 1, dx: 1 }, // davčni zavezanec: da
];

// These are search needles matched against the PDF's own text layer, so they
// are the operator's wording character for character. That is why "M – mešani"
// carries an en dash: the house rule against them covers text we write, and
// changing this one would simply stop it matching.
const PAGE_1_TICKS = [
  { text: "PS.2" },
  { text: "Paralelno z DS" },
  { text: "M – mešani" },
];

// The three address widgets on this page sit one row below their own printed
// labels in the operator's file, so they are lifted back onto the lines. The
// Opomba box is placed correctly and is left alone.
const PAGE_2 = {
  "Naziv  Priimek in ime_2": { v: AGENT, lift: 11 },
  "Ulica Kraj in hišna števila_2": { v: "Ulica Mirka Vadnova 3a", lift: 11 },
  "Poštna številka in pošta_2": { v: "4000 Kranj", lift: 11 },
  "Opomba 1":
    "Vloga in priloge so izpolnjene in oddane iz sistema Belin, na podlagi pooblastila z dne 02. 06. 2026.",
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const bytes = Array.from(new Uint8Array(readFileSync(SRC)));

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1800, height: 2400 } });
  await context.route("**/pdfjs/**", (route) => {
    const file = route.request().url().split("/pdfjs/")[1];
    try {
      route.fulfill({
        body: readFileSync(resolve("node_modules/pdfjs-dist/build", file)),
        contentType: "text/javascript",
      });
    } catch {
      route.abort();
    }
  });

  const page = await context.newPage();
  await page.goto(`file://${resolve("scripts/marketing/vloga-view.html")}`);

  const pages = [
    { n: 1, name: "vloga-soglasje-1", values: PAGE_1, circles: PAGE_1_CIRCLES, ticks: PAGE_1_TICKS },
    { n: 2, name: "vloga-soglasje-2", values: PAGE_2, circles: [], ticks: [] },
  ];

  for (const p of pages) {
    const info = await page.evaluate(
      ([data, n, scale, values, circles, ticks]) =>
        window.fillForm(data, n, scale, values, circles, ticks),
      [bytes, p.n, SCALE, p.values, p.circles, p.ticks],
    );
    // The signature belongs on page 2, under the operator's own signature line.
    if (p.n === 2) await page.evaluate(() => window.signPage());
    writeFileSync(`${OUT}/${p.name}.png`, await page.locator("#page").screenshot({ type: "png" }));
    const miss = info.missing.length ? `  MISSING: ${info.missing.join(", ")}` : "";
    console.log(`  page ${p.n}  ${info.width}x${info.height}  ${p.name}.png${miss}`);
  }

  await browser.close();
  console.log(`\n  written to ${OUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
