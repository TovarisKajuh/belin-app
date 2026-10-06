// The demo seed. It rewrites the demo world, and only the demo world, in the
// one database that local development, the demo and production all share.
//
//   npm run seed       writes: guard, purge, the story, then seed:documents
//   npm run seed:dry   reads only: runs the guard, prints what the purge would
//                      delete and the dates the story would carry
//
// It runs under tsx (package.json), so it imports the app's own demo ids and
// calendar rules instead of keeping copies that drift.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  DEMO_EPC_ORG as EPC_ORG,
  DEMO_SUB_ORG as SUB_ORG,
  DEMO_SUB_ORG_2 as SUB_ORG_2,
  DEMO_SUB_ORG_3 as SUB_ORG_3,
  DEMO_ORG_IDS,
  DEMO_PROJECT_TRENUTNO as PROJECT,
  DEMO_PROJECT_DAN1 as PROJECT_START,
  DEMO_PERSON,
  DEMO_TOKEN_IDS,
  DEMO_PO_CURRENT as PO_CURRENT,
  DEMO_PO_START as PO_START,
  DEMO_SHEET_APPROVED as SHEET_APPROVED,
  DEMO_SHEET_OPEN as SHEET_OPEN,
  DEMO_CO_APPROVED as CO_APPROVED,
} from "@/lib/demo/ids";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addWorkingDays,
  deadlineTimestamp,
  subtractWorkingDays,
  workingDaysLeft,
  DECISION_WORKING_DAYS,
} from "@/lib/hours-shared";
import { zonedInstant } from "@/lib/project-time";
import {
  isoPlusDays,
  isSiteDay,
  siteDaysBefore,
  nthSiteDayBefore,
  siteDayOnOrAfter,
  todayInLjubljana,
} from "@/lib/demo/calendar";
import { purgeDemo } from "./seed-purge.mjs";

const DRY = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed (or npm run seed:dry)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// The founder's own company. NOT demo: created once when missing, never
// rewritten, never purged. The demo companies keep their staged projects; the
// two never mix.
const FOUNDER_ORG = "12121212-1212-4121-8121-121212121212";
const PERSON_FOUNDER = "66666666-6666-4666-8666-666666666604";

const SCOPE_UK = "44444444-4444-4444-8444-444444444401";
const SCOPE_MODULES = "44444444-4444-4444-8444-444444444402";
const SCOPE_DC = "44444444-4444-4444-8444-444444444403";
const SCOPE_START_UK = "44444444-4444-4444-8444-444444444411";
const SCOPE_START_MODULES = "44444444-4444-4444-8444-444444444412";
const SCOPE_START_DC = "44444444-4444-4444-8444-444444444413";

const PERSON_EPC = DEMO_PERSON.bauleiter;
const PERSON_SUB = DEMO_PERSON.crew;
const PERSON_SUB_ADMIN = DEMO_PERSON.subOffice;
const PERSON_SUB_2 = DEMO_PERSON.guest;
const PERSON_EPC_ADMIN = DEMO_PERSON.epcAdmin;
const [TOKEN_EPC, TOKEN_SUB, TOKEN_START_EPC, TOKEN_START_SUB] = DEMO_TOKEN_IDS;

// ---------------------------------------------------------------------------
// THE GUARD
//
// The old tripwire refused to run once ANY organization it did not know
// existed, which is to say the evening the first customer signs up, and its
// only way out was a flag typed by habit. The rule is now the narrow true one:
// refuse only when one of the FIXED demo ids belongs to an organization the
// database does not mark as demo. Everything the seed deletes is scoped to
// those ids (scripts/seed-purge.mjs), so a real customer is out of reach by
// construction, not by a list of who exists.
// ---------------------------------------------------------------------------
const { data: demoOrgs, error: guardError } = await db
  .from("organizations")
  .select("id, name, is_demo")
  .in("id", DEMO_ORG_IDS);
if (guardError) {
  console.error(`Refusing to seed: could not read the demo flags (${guardError.message}).`);
  console.error("If the column is missing, apply supabase/migrations/20261006002100_organizations_is_demo.sql first.");
  process.exit(1);
}
const mislabelled = (demoOrgs ?? []).filter((org) => org.is_demo !== true);
if (mislabelled.length) {
  console.error("");
  console.error("REFUSING TO SEED. These fixed demo ids belong to organizations not flagged as demo:");
  for (const org of mislabelled) console.error(`  ${org.name}  (${org.id})`);
  console.error("");
  console.error("The seed deletes and rewrites everything under these ids. Nothing was changed.");
  console.error("");
  process.exit(1);
}

async function upsert(table, rows, onConflict = "id") {
  if (DRY) throw new Error(`dry run tried to write ${table}`);
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} row(s) upserted`);
}

async function insertRows(table, rows) {
  if (DRY) throw new Error(`dry run tried to write ${table}`);
  if (!rows.length) return;
  const { error } = await db.from(table).insert(rows);
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} row(s) inserted`);
}

// ---------------------------------------------------------------------------
// THE CLOCK. Every date in the story is computed here, once, before anything is
// written, from the site calendar (Europe/Ljubljana, Monday to Friday, Slovenian
// holidays: lib/demo/calendar.ts) and the hour-sheet rules the app itself
// applies (lib/hours-shared.ts). A demo whose dates contradict each other is a
// demo a site manager stops believing.
// ---------------------------------------------------------------------------
const NOW = new Date();
const TODAY = todayInLjubljana(NOW);
// New storage paths on every run: Supabase upsert keeps the old bytes on an
// existing path (docs/known-issues.md entry 2).
const RUN_ID = NOW.toISOString().replace(/\D/g, "").slice(0, 14);
const at = (dateIso, hhmm) => zonedInstant(dateIso, hhmm, "si");
const isoDaysAgo = (n) => isoPlusDays(TODAY, -n);

// Trenutno: the last nine site days, oldest first, ending on the last site day before today.
const dates = siteDaysBefore(TODAY, 9);
const plannedStart = dates[0];
// About 30 working days: an "ahead" buffer. Snapped to a site day (LF20): it is
// also the naročilnica's deadline, and a deadline on a Sunday reads as invented.
const plannedEnd = siteDayOnOrAfter(isoPlusDays(dates[0], 42));

// The paper trail comes before the work: order sent, order accepted, material
// list sent, delivery checked on the morning of day 1, then the first report.
const PO_CURRENT_SENT = at(nthSiteDayBefore(dates[0], 3), "09:12");
const PO_CURRENT_ACCEPTED = at(nthSiteDayBefore(dates[0], 2), "16:40");
const MATERIAL_LISTED = at(nthSiteDayBefore(dates[0], 1), "14:05");
const MATERIAL_CHECKED = at(dates[0], "07:20");
const entryCreated = (i) => at(dates[i], `15:${String(20 + i * 3).padStart(2, "0")}`);

// Hour sheet 1: hours worked on days 2 and 3, submitted that evening, approved
// the next morning by the Bauleiter.
const SHEET1_SUBMITTED = at(dates[2], "17:05");
const SHEET1_DEADLINE = deadlineTimestamp(addWorkingDays(dates[2], DECISION_WORKING_DAYS, "si"), "si");
const SHEET1_DECIDED = at(dates[3], "08:40");

// Hour sheet 2 is the live countdown. Its deadline is the end of the second
// working day from today, and it was submitted exactly six working days before
// that deadline, by the same rule the app counts with, so the card says what
// the clock says whatever hour the seed ran.
const SHEET2_DEADLINE_DAY = addWorkingDays(TODAY, 2, "si");
const SHEET2_DEADLINE = deadlineTimestamp(SHEET2_DEADLINE_DAY, "si");
const SHEET2_SUBMITTED_DAY = subtractWorkingDays(SHEET2_DEADLINE_DAY, DECISION_WORKING_DAYS, "si");
const SHEET2_SUBMITTED = at(SHEET2_SUBMITTED_DAY, "16:30");
// Its hours were worked on the last logged day up to the submission: the
// morning the roof access was blocked by another contractor's delivery.
const OBSTRUCTION_DAY = [...dates].reverse().find((d) => d <= SHEET2_SUBMITTED_DAY);
const RAIN_INDEX = 7; // days[7] below is the rain day

// Dan 1 starts today, or on the next site day. Its order went out on the last site day.
const startPlannedStart = siteDayOnOrAfter(TODAY);
const startPlannedEnd = siteDayOnOrAfter(isoPlusDays(startPlannedStart, 42));
const PO_START_SENT = at(nthSiteDayBefore(TODAY, 1), "10:30");

// The story checks itself before a single row is written.
if (addWorkingDays(SHEET2_SUBMITTED_DAY, DECISION_WORKING_DAYS, "si") !== SHEET2_DEADLINE_DAY) {
  throw new Error("clock: sheet 2 is not six working days before its deadline");
}
// What the hours card reads during the seed's own day. Probed at noon because
// workingDaysLeft counts from the UTC date of `now`: at 01:00 in Ljubljana it
// still sees yesterday and would say 3, which would make this check depend on
// the hour the seed ran.
const countdown = workingDaysLeft(SHEET2_DEADLINE, new Date(at(TODAY, "12:00")), "si");
if (countdown !== 2) throw new Error(`clock: the hours card would count ${countdown}, not 2`);
if (!OBSTRUCTION_DAY || OBSTRUCTION_DAY === dates[RAIN_INDEX]) {
  throw new Error("clock: no separate logged day for the blocked roof access");
}
if (!(PO_CURRENT_SENT < PO_CURRENT_ACCEPTED && PO_CURRENT_ACCEPTED < MATERIAL_LISTED && MATERIAL_LISTED < MATERIAL_CHECKED)) {
  throw new Error("clock: the paper trail is out of order");
}

// ---- identity and money ----
// The persona domain ends in -demo.si: lib/email.ts refuses every such
// address, so no demo mail ever leaves and the getbelin.com reputation is safe.
const EPC_MAIL = "svetlogradnja-demo.si";
// The founder's own (non-demo) account, created once if missing; see the guard.
const founderEmail = process.env.SEED_FOUNDER_EMAIL?.trim().toLowerCase();
const EPC_IDENTITY = epcIdentity();
const PO_AMOUNT = moneyEnv("DEMO_PO_AMOUNT", 100000);
const REGIE_RATE = moneyEnv("DEMO_REGIE_RATE", 40);
// Founder default (Task 0.6 r): an invented account that passes the IBAN
// check, never AVESOL's real one. DEMO_SUB_IBAN may replace it for one run.
const SUB_IBAN_INVENTED = "SI56 0201 0001 2345 641";
const SUB_IBAN = ibanEnv("DEMO_SUB_IBAN") ?? SUB_IBAN_INVENTED;

/** An invented client by default; the buyer's own company for the meeting (D2). */
function epcIdentity() {
  const name = process.env.DEMO_EPC_NAME?.trim();
  if (!name) {
    return { name: "Svetlogradnja d.o.o.", address: "Dunajska cesta 151, 1000 Ljubljana", vat_id: "SI53814266",
      iban: "SI56 1910 0000 0123 438" };
  }
  const address = process.env.DEMO_EPC_ADDRESS?.trim();
  const vat = process.env.DEMO_EPC_VAT?.trim().toUpperCase().replace(/\s+/g, "");
  if (!address || !vat || !/^[A-Z]{2}[0-9A-Z]{8,12}$/.test(vat)) {
    console.error("DEMO_EPC_NAME needs DEMO_EPC_ADDRESS and DEMO_EPC_VAT as well. A real company name must");
    console.error("never print beside an invented address or tax number. Nothing was changed.");
    process.exit(1);
  }
  // A real company never gets an invented bank account (the settings page shows it).
  return { name, address, vat_id: vat, iban: null };
}

/** A positive EUR amount from the environment, or the default. Illustrative, never AVESOL's real price (D3). */
function moneyEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 10000000) {
    console.error(`${name}="${raw}" is not a positive amount in EUR. Nothing was changed.`);
    process.exit(1);
  }
  return Math.round(value * 100) / 100;
}

/**
 * An IBAN from the environment, checked, or null. Used for AVESOL's demo
 * account: the founder ruled (Task 0.6 r) that the demo invoice carries an
 * invented account that passes the checksum and never AVESOL's real one, so
 * the default above stands unless DEMO_SUB_IBAN names another invented one.
 */
function ibanEnv(name) {
  const raw = process.env[name]?.replace(/\s+/g, "").toUpperCase();
  if (!raw) return null;
  const digits = (raw.slice(4) + raw.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw) || rest !== 1) {
    console.error(`${name} is not a valid IBAN (format or mod-97 check). Nothing was changed.`);
    process.exit(1);
  }
  return raw;
}

/** kWp in the project's own language: 245,7 kWp in Slovenian, never 245.7. */
function kwpText(kwp, language) {
  const locale = language === "de" ? "de-DE" : language === "en" ? "en-GB" : "sl-SI";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(kwp)} kWp`;
}

// ---- the two live projects ----
const TRENUTNO_ROW = {
  id: PROJECT, epc_org_id: EPC_ORG, sub_org_id: SUB_ORG,
  name: "PSE Trgovski center Kranj", status: "active", language: "sl",
  // domestic Slovenian construction services: reverse charge under 76.a ZDDV-1
  vat_mode: "reverse_charge", country: "si",
  // Not number 69: that is a real shopping centre's address.
  address_street: "Cesta Staneta Žagarja 53", address_zip: "4000", address_city: "Kranj",
  lat: 46.2455, lng: 14.3555, kwp: 245.7, module_count: 546,
  module_type: "Trina Vertex S+ 450 W", mounting_system: "K2 Dome 6.10", roof_type: "Ravna streha",
  hourly_work_approved: true, planned_start: plannedStart, planned_end: plannedEnd, plan_pdf_path: null,
};
// Its OWN name and site: two identical rows on the portfolio read as a duplicate, not as two states of one story.
const DAN1_ROW = {
  ...TRENUTNO_ROW, id: PROJECT_START, name: "Poslovni park Ljubljana Vzhod",
  address_street: "Letališka cesta 27", address_zip: "1000", address_city: "Ljubljana",
  lat: 46.0621, lng: 14.539, planned_start: startPlannedStart, planned_end: startPlannedEnd,
};

// ---- Trenutno's nine days ----
// Afternoon temperature in central Slovenia by month, so a log dated October
// does not read like August.
const MONTH_TEMP = [3, 6, 11, 15, 20, 24, 27, 26, 19, 15, 9, 4];
const tempFor = (iso, offset) => MONTH_TEMP[Number(iso.slice(5, 7)) - 1] + offset;
const days = [
  { headcount: 4, note: "Začetek montaže podkonstrukcije, južni del strehe.", code: 0, dt: 1, adds: [[SCOPE_UK, 120]] },
  { headcount: 5, note: "Podkonstrukcija, nadaljevanje proti sredini.", code: 2, dt: -1, adds: [[SCOPE_UK, 130]] },
  { headcount: 5, note: "Podkonstrukcija, zahodni niz.", code: 0, dt: 2, adds: [[SCOPE_UK, 150]] },
  { headcount: 6, note: "Podkonstrukcija zaključena.", code: 0, dt: 1, adds: [[SCOPE_UK, 146]] },
  { headcount: 6, note: "Začetek montaže modulov, prvi niz.", code: 2, dt: 0, adds: [[SCOPE_MODULES, 50]] },
  { headcount: 6, note: "Moduli, drugi niz.", code: 0, dt: 3, adds: [[SCOPE_MODULES, 60]] },
  { headcount: 6, note: "Moduli in začetek DC kabliranja.", code: 0, dt: 2, adds: [[SCOPE_MODULES, 70], [SCOPE_DC, 100]] },
  { headcount: 5, note: "Popoldne prekinitev zaradi dežja.", code: 61, dt: -4, adds: [[SCOPE_MODULES, 40], [SCOPE_DC, 80]] },
  { headcount: 6, note: "Moduli in DC, dober tempo.", code: 2, dt: 0, adds: [[SCOPE_MODULES, 30], [SCOPE_DC, 120]] },
];
const entryId = (i) => `55555555-5555-4555-8555-5555555555${String(i).padStart(2, "0")}`;

// Real AVESOL site photographs (assets/marketing/site/), each matched to what
// its day's note says. All flat roofs: the ground-mount drone shots (flug-*)
// would contradict "Ravna streha". crew-module.jpg is a re-encode of
// crew-arbeit.jpg and is not used.
const PHOTO_PLAN = [
  { entry: 3, file: "unterkonstruktion.jpg" }, // substructure rails laid, no modules yet
  { entry: 4, file: "crew-montage.jpg" }, // crew placing the first modules on the rails
  { entry: 5, file: "crew-arbeit.jpg" }, // second row, modules already down behind them
  { entry: 6, file: "dc-verkabelung.jpg" }, // portrait: rows with the DC cable tray between them
  { entry: 8, file: "crew-panel.jpg" }, // two fitters carrying a module
  { entry: 8, file: "dach-weit.jpg" }, // a finished stretch of the roof
];

// ---- the book: four delivered, one not started (no real brands, no real HQ addresses) ----
const PAST = [
  { n: 1, name: "Logistični center Naklo", city: "Naklo", street: "Cesta na Okroglo 7", zip: "4202",
    kwp: 96.6, modules: 214, endedDaysAgo: 24, days: 6, roof: "Trapezna pločevina", slip: 2, sub: SUB_ORG_3 },
  { n: 2, name: "Poslovna cona Komenda", city: "Komenda", street: "Pod hribom 41", zip: "1218",
    kwp: 180.4, modules: 401, endedDaysAgo: 58, days: 9, roof: "Ravna streha", slip: -4, sub: SUB_ORG },
  { n: 3, name: "Proizvodna hala Trebnje", city: "Trebnje", street: "Rimska cesta 9", zip: "8210",
    kwp: 320.0, modules: 711, endedDaysAgo: 96, days: 14, roof: "Ravna streha", slip: 7, sub: SUB_ORG_2 },
  { n: 4, name: "Industrijska streha Velenje", city: "Velenje", street: "Koroška cesta 61", zip: "3320",
    kwp: 412.8, modules: 917, endedDaysAgo: 151, days: 16, roof: "Trapezna pločevina", slip: -1, sub: SUB_ORG_2 },
];
// Its planned dates snap to site days below (LF20): both print on the portfolio.
const NOT_STARTED = { n: 5, name: "Trgovski center Domžale", city: "Domžale",
  street: "Ljubljanska cesta 102", zip: "1230", kwp: 265.2, modules: 589, roof: "Ravna streha" };

const SITE_PHOTOS = path.join(process.cwd(), "assets", "marketing", "site");
/**
 * One site photo exactly as a phone would upload it: EXIF orientation applied,
 * at most 1600 px on the long side, JPEG quality 80 (components/crew/PhotoCapture.tsx
 * MAX_DIM and QUALITY). sharp drops all metadata unless asked, so no camera GPS
 * position leaves with the file.
 */
async function sitePhoto(file) {
  return sharp(readFileSync(path.join(SITE_PHOTOS, file)))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
}

// ---- purge, then (dry run) report and stop ----
const purged = await purgeDemo(db, { dry: DRY });
console.log(`purge${DRY ? " (dry run, nothing deleted)" : ""}:`, purged);
if (DRY) {
  console.log(`today ${TODAY}, run ${RUN_ID}`);
  console.log(`client: ${EPC_IDENTITY.name}, ${EPC_IDENTITY.address}, ${EPC_IDENTITY.vat_id}`);
  console.log(`money: naročilnica ${PO_AMOUNT} EUR, režijska ura ${REGIE_RATE} EUR`);
  console.log(`AVESOL IBAN: ${SUB_IBAN === SUB_IBAN_INVENTED ? "invented demo account" : "from DEMO_SUB_IBAN"}, ${SUB_IBAN}`);
  console.log(`Trenutno log ${dates[0]} .. ${dates[8]}; order sent ${PO_CURRENT_SENT}, accepted ${PO_CURRENT_ACCEPTED}`);
  console.log(`material listed ${MATERIAL_LISTED}, checked ${MATERIAL_CHECKED}`);
  console.log(`sheet 1 submitted ${SHEET1_SUBMITTED}, deadline ${SHEET1_DEADLINE}, approved ${SHEET1_DECIDED}`);
  console.log(`sheet 2 submitted ${SHEET2_SUBMITTED}, deadline ${SHEET2_DEADLINE}, countdown ${countdown}`);
  console.log(`blocked access ${OBSTRUCTION_DAY}, rain ${dates[RAIN_INDEX]}`);
  console.log(`Dan 1 starts ${startPlannedStart}, its order sent ${PO_START_SENT}`);
  const dryDir = path.join(os.tmpdir(), "belin-seed-dry");
  mkdirSync(dryDir, { recursive: true });
  for (const [i, p] of PHOTO_PLAN.entries()) {
    const { data, info } = await sitePhoto(p.file);
    writeFileSync(path.join(dryDir, `photo-${i}-day${p.entry}.jpg`), data);
    console.log(`photo ${i}: ${p.file} -> day ${p.entry} (${dates[p.entry]}), ${info.width}x${info.height}, ${Math.round(data.length / 1024)} KB`);
  }
  console.log(`dry photos written to ${dryDir}`);
  console.log("Dry run complete. Nothing was written to the database or to Storage.");
  process.exit(0);
}

// ---- organizations ----
// Every org carries an address and a VAT id: a reverse-charge invoice cannot be
// generated without both (lib/data/invoices.ts), and a demo missing them fails
// at its last step. The IBAN is optional and printed only when present. The
// invented companies keep invented accounts that pass the IBAN check. AVESOL's
// name, address and VAT id are its public register entry, but its account is
// invented (founder, Task 0.6 r), and the buyer's company during the meeting
// carries none (see epcIdentity).
await upsert("organizations", [
  { id: EPC_ORG, is_demo: true, type: "epc", name: EPC_IDENTITY.name, address: EPC_IDENTITY.address,
    country: "si", vat_id: EPC_IDENTITY.vat_id, iban: EPC_IDENTITY.iban },
  { id: SUB_ORG, is_demo: true, type: "sub", name: "AVESOL d.o.o.", address: "Poštna ulica 1, 2000 Maribor",
    country: "si", vat_id: "SI26459973", iban: SUB_IBAN,
    accountant_email: "racunovodstvo@avesol-demo.si" },
  { id: SUB_ORG_2, is_demo: true, type: "sub", name: "Montaža Kos d.o.o.", address: "Tovarniška cesta 26, 1370 Logatec",
    country: "si", vat_id: "SI67281451", iban: "SI56 0203 0001 7654 344" },
  { id: SUB_ORG_3, is_demo: true, type: "sub", name: "Elektro Vrhnika d.o.o.", address: "Tržaška cesta 32, 1360 Vrhnika",
    country: "si", vat_id: "SI84063157", iban: "SI56 0204 0009 8765 448" },
]);

// The founder's own company: inserted once when missing, never rewritten, never purged.
if (founderEmail) {
  const { error } = await db.from("organizations").upsert(
    [{ id: FOUNDER_ORG, type: "epc", name: process.env.SEED_FOUNDER_ORG?.trim() || "Moje podjetje d.o.o.", country: "si" }],
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`founder org: ${error.message}`);
}

// ---- people ----
// disabled_at is reset: a rehearsal may have used the boss's "remove crew member" button.
await upsert("people", [
  { id: PERSON_EPC, org_id: EPC_ORG, full_name: "Matej Kovač", role: "bauleiter", email: `matej@${EPC_MAIL}`, disabled_at: null },
  { id: PERSON_EPC_ADMIN, org_id: EPC_ORG, full_name: "Marko Golob", role: "admin", email: `marko@${EPC_MAIL}`, disabled_at: null },
  { id: PERSON_SUB, org_id: SUB_ORG, full_name: "Luka Zupan", role: "crew", email: "luka@avesol-demo.si", disabled_at: null },
  // Crew without an email: the Demo Door's guest persona.
  { id: PERSON_SUB_2, org_id: SUB_ORG, full_name: "Miha Oblak", role: "crew", email: null, disabled_at: null },
  { id: PERSON_SUB_ADMIN, org_id: SUB_ORG, full_name: "Boštjan Novak", role: "admin", email: "bostjan@avesol-demo.si", disabled_at: null },
]);

if (founderEmail) {
  const { error } = await db.from("people").upsert(
    [{ id: PERSON_FOUNDER, org_id: FOUNDER_ORG, full_name: "Jan", role: "admin", email: founderEmail }],
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`founder person: ${error.message}`);
} else {
  console.log("people: SEED_FOUNDER_EMAIL not set, founder person skipped");
}

// ---- the two live projects and their scope ----
await upsert("projects", [TRENUTNO_ROW, DAN1_ROW]);
await upsert("scope_items", [
  { id: SCOPE_UK, project_id: PROJECT, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_MODULES, project_id: PROJECT, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_DC, project_id: PROJECT, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
  { id: SCOPE_START_UK, project_id: PROJECT_START, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_START_MODULES, project_id: PROJECT_START, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_START_DC, project_id: PROJECT_START, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
]);

// ---- Trenutno's log, filed each afternoon on its own day ----
const entryRows = days.map((d, i) => {
  const created = entryCreated(i);
  const note = dates[i] === OBSTRUCTION_DAY
    ? `${d.note} Dopoldne dostop do strehe zaprt zaradi dostave drugega izvajalca.`
    : d.note;
  return {
    id: entryId(i), project_id: PROJECT, entry_date: dates[i], note, headcount: d.headcount,
    created_by_person: PERSON_SUB, created_at: created, updated_at: created,
    weather: { code: d.code, tempC: tempFor(dates[i], d.dt), capturedAt: created },
  };
});
await upsert("daily_entries", entryRows);
await upsert(
  "entry_quantities",
  days.flatMap((d, i) => d.adds.map(([scope, qty]) => ({ entry_id: entryId(i), scope_item_id: scope, qty }))),
  "entry_id,scope_item_id",
);

const photoRows = [];
for (const [i, p] of PHOTO_PLAN.entries()) {
  const { data, info } = await sitePhoto(p.file);
  const storagePath = `${PROJECT}/seed/${RUN_ID}/photo-${i}.jpg`;
  const { error } = await db.storage.from("photos").upload(storagePath, data, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`photos: ${p.file}: ${error.message}`);
  photoRows.push({
    id: `88888888-8888-4888-8888-8888888888${String(i).padStart(2, "0")}`,
    entry_id: entryId(p.entry), storage_path: storagePath, sort_order: i,
    width: info.width, height: info.height, taken_at: at(dates[p.entry], `${String(9 + i).padStart(2, "0")}:30`),
  });
}
await insertRows("entry_photos", photoRows);

// ---- Stückliste and the delivery check ----
// Real hardware for a 245,7 kWp flat-roof job, so the check reads like a real delivery.
const MATERIAL = [
  { name: "Modul Trina Vertex S+ 450 W", qty: 546, unit: "kos" },
  { name: "Nosilna konstrukcija K2 Dome 6.10", qty: 546, unit: "kpl" },
  { name: "Razsmernik Huawei SUN2000-100KTL", qty: 2, unit: "kos" },
  { name: "DC kabel 6 mm2", qty: 1200, unit: "m" },
  { name: "Konektorji MC4", qty: 120, unit: "par" },
  { name: "AC kabel 4x120 mm2", qty: 250, unit: "m" },
  { name: "Prenapetostna zaščita tip 2", qty: 4, unit: "kos" },
];
// INSERTED, never upserted, with explicit timestamps. moddatetime rewrites
// updated_at on every UPDATE, so an upsert onto an existing row would stamp the
// list with the seed's own clock and put it AFTER the check below, which boots
// the demo with a false "list changed, check again" banner. The purge deleted
// the rows, so these are fresh inserts and the timestamps hold.
function materialRows(projectId, idPrefix, listedAt) {
  return MATERIAL.map((m, i) => ({
    // Last UUID group is exactly 12 hex chars: an 8 char prefix plus 4 digits.
    id: `99999999-9999-4999-8999-${idPrefix}${String(i).padStart(4, "0")}`,
    project_id: projectId, name: m.name, qty: m.qty, unit: m.unit, sort_order: i + 1,
    created_at: listedAt, updated_at: listedAt,
  }));
}
await insertRows("material_items", [
  ...materialRows(PROJECT, "aaaaaaaa", MATERIAL_LISTED),
  ...materialRows(PROJECT_START, "bbbbbbbb", PO_START_SENT),
]);
// Trenutno's delivery was checked on the morning of day 1, before any work. Dan 1 has no check: that is its point.
const CHECK_CURRENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
await insertRows("material_checks", [
  { id: CHECK_CURRENT, project_id: PROJECT, is_complete: true, note: "Vse prevzeto po dobavnici.",
    checked_by_person: PERSON_SUB, checked_at: MATERIAL_CHECKED },
]);
await insertRows(
  "material_check_items",
  materialRows(PROJECT, "aaaaaaaa", MATERIAL_LISTED).map((m) => ({ check_id: CHECK_CURRENT, material_item_id: m.id, status: "present" })),
);

await upsert("project_tokens", [
  { id: TOKEN_EPC, project_id: PROJECT, role: "epc", token: "demo-epc-k7m2x9q4", label: "Founder laptop" },
  { id: TOKEN_SUB, project_id: PROJECT, role: "sub", token: "demo-sub-r8p3n6w1", label: "Founder phone" },
  { id: TOKEN_START_EPC, project_id: PROJECT_START, role: "epc", token: "demo-epc-start-h3k9m2", label: "EPC, day one" },
  { id: TOKEN_START_SUB, project_id: PROJECT_START, role: "sub", token: "demo-sub-start-q7w4z8", label: "Crew, day one" },
]);

// ---- the commercial state ----
// The founder's ruling (2026-08-12): a SENT naročilnica on Dan 1 and an
// ACCEPTED one on Trenutno, so the demo needs no preparation clicks. Their PDFs
// and hashes are written by scripts/seed-documents.ts through the app's own
// renderer. created_at equals sent_at: the PDF prints created_at as the issue
// date, and an order accepted before it was issued is the bug DOC-B2 found.
await insertRows("purchase_orders", [
  { id: PO_CURRENT, project_id: PROJECT, number: 1, status: "accepted", total_net: PO_AMOUNT,
    regie_hourly_rate: REGIE_RATE, payment_terms: "30 dni od izdaje računa", deadline: plannedEnd,
    created_at: PO_CURRENT_SENT, sent_at: PO_CURRENT_SENT, accepted_at: PO_CURRENT_ACCEPTED,
    accepted_by_person: PERSON_SUB_ADMIN, accepted_by_name: "Boštjan Novak", created_by_person: PERSON_EPC_ADMIN,
    pdf_path: null, pdf_sha256: null },
  { id: PO_START, project_id: PROJECT_START, number: 1, status: "sent", total_net: PO_AMOUNT,
    regie_hourly_rate: REGIE_RATE, payment_terms: "30 dni od izdaje računa", deadline: startPlannedEnd,
    created_at: PO_START_SENT, sent_at: PO_START_SENT, created_by_person: PERSON_EPC_ADMIN,
    pdf_path: null, pdf_sha256: null },
]);
// Each line names its OWN project's city and prints kWp in the project's language.
await insertRows("purchase_order_lines", [
  { id: "88888888-8888-4888-8888-888888888811", purchase_order_id: PO_CURRENT,
    description: `Montaža FV sistema ${kwpText(TRENUTNO_ROW.kwp, TRENUTNO_ROW.language)}, ${TRENUTNO_ROW.address_city}`,
    qty: 1, unit: "kpl", unit_price: PO_AMOUNT, total: PO_AMOUNT, sort_order: 0 },
  { id: "88888888-8888-4888-8888-888888888812", purchase_order_id: PO_START,
    description: `Montaža FV sistema ${kwpText(DAN1_ROW.kwp, DAN1_ROW.language)}, ${DAN1_ROW.address_city}`,
    qty: 1, unit: "kpl", unit_price: PO_AMOUNT, total: PO_AMOUNT, sort_order: 0 },
]);

// One sheet approved; one open with the live two-day countdown.
await insertRows("hour_sheets", [
  { id: SHEET_APPROVED, project_id: PROJECT, sub_org_id: SUB_ORG, number: 1, status: "approved",
    created_at: SHEET1_SUBMITTED, submitted_at: SHEET1_SUBMITTED, deadline_at: SHEET1_DEADLINE,
    decided_at: SHEET1_DECIDED, decided_by_person: PERSON_EPC },
  { id: SHEET_OPEN, project_id: PROJECT, sub_org_id: SUB_ORG, number: 2, status: "submitted",
    created_at: SHEET2_SUBMITTED, submitted_at: SHEET2_SUBMITTED, deadline_at: SHEET2_DEADLINE },
]);
// A flat roof has no battens: the extra work is the membrane under the rails.
await insertRows("hour_sheet_lines", [
  { id: "99999999-9999-4999-8999-999999999911", sheet_id: SHEET_APPROVED, work_date: dates[1], hours: 8,
    description: "Dodatna zaščitna podloga pod nosilci, južni del", person_id: PERSON_SUB },
  { id: "99999999-9999-4999-8999-999999999912", sheet_id: SHEET_APPROVED, work_date: dates[2], hours: 6,
    description: "Dodatna zaščitna podloga pod nosilci, nadaljevanje", person_id: PERSON_SUB },
  { id: "99999999-9999-4999-8999-999999999913", sheet_id: SHEET_OPEN, work_date: OBSTRUCTION_DAY, hours: 5,
    description: "Čakanje in prenos materiala zaradi zaprtega dostopa do strehe", person_id: PERSON_SUB },
]);

await insertRows("change_orders", [
  { id: CO_APPROVED, project_id: PROJECT, number: 1, title: "Popravilo poškodovane hidroizolacije",
    description: "Pod vrstami 3 do 5 so bile tri poškodbe hidroizolacije. Popravljeno pred polaganjem modulov.",
    amount: 1200, status: "approved", created_at: at(dates[2], "11:30"),
    decided_at: at(dates[3], "10:15"), decided_by_person: PERSON_EPC, created_by_person: PERSON_SUB },
]);

// ---- what the site reported ----
await insertRows("incidents", [
  { project_id: PROJECT, kind: "rain_stop", note: "", occurred_on: dates[RAIN_INDEX],
    created_by_person: PERSON_SUB, created_at: at(dates[RAIN_INDEX], "13:40") },
  { project_id: PROJECT, kind: "obstruction", note: "Dostop do strehe zaprt zaradi dostave drugega izvajalca.",
    occurred_on: OBSTRUCTION_DAY, created_by_person: PERSON_SUB, created_at: at(OBSTRUCTION_DAY, "09:10") },
]);
await insertRows("requests", [
  { project_id: PROJECT, type: "material", text: "Zmanjkalo je 12 vijakov M10 za zaključne vrste.",
    status: "resolved", response_note: "Vijaki gredo jutri zjutraj s prvo dostavo.",
    created_at: at(dates[RAIN_INDEX], "11:20"), resolved_at: at(dates[RAIN_INDEX], "13:05"), created_by_person: PERSON_SUB },
  { project_id: PROJECT, type: "plan", text: "Potrebujemo shemo priklopa za razdelilnik R2.",
    status: "open", created_at: at(dates[8], "14:10"), created_by_person: PERSON_SUB },
]);

// ---- the subcontractor's compliance documents ----
// Real sample PDFs (VZOREC) are rendered and uploaded to these exact paths by
// scripts/seed-documents.ts. One expires within 30 days, so the traffic light shows something real.
// The amber one is a document a Slovenian EPC actually asks for on a roof (LF19):
// a German Freistellungsbescheinigung (§ 48b EStG) would read as a product built for Germany.
await insertRows("documents", [
  { org_id: SUB_ORG, type: "a1", title: "Potrdilo A1, Luka Zupan", valid_until: isoPlusDays(TODAY, 120),
    storage_path: `${SUB_ORG}/vault/seed-${RUN_ID}-a1.pdf` },
  { org_id: SUB_ORG, type: "qualification", title: "Usposobljenost za varno delo na višini, Luka Zupan",
    valid_until: isoPlusDays(TODAY, 18), storage_path: `${SUB_ORG}/vault/seed-${RUN_ID}-visina.pdf` },
  { org_id: SUB_ORG, type: "insurance", title: "Zavarovanje odgovornosti", valid_until: isoPlusDays(TODAY, 200),
    storage_path: `${SUB_ORG}/vault/seed-${RUN_ID}-zavarovanje.pdf` },
]);

// ---- the rest of the book ----
// Built the way a real project is, from scope and daily entries, so a
// delivered project reads 100 percent because its quantities reach the targets.
const pid = (n) => `3333333a-0000-4000-8000-00000000000${n}`;
const sid = (n, j) => `4444444a-000${n}-4000-8000-00000000000${j}`;
const eid = (n, i) => `5555555a-000${n}-4000-8000-0000000000${String(i).padStart(2, "0")}`;

/** Site days ending `endedDaysAgo` days before today, oldest first. */
function workingDaysEnding(endedDaysAgo, count) {
  const out = [];
  for (let n = endedDaysAgo; out.length < count; n++) {
    const iso = isoDaysAgo(n);
    if (isSiteDay(iso)) out.push(iso);
  }
  return out.reverse();
}
function addSiteDays(iso, n) {
  const step = n >= 0 ? 1 : -1;
  let left = Math.abs(n);
  let cur = iso;
  while (left > 0) {
    cur = isoPlusDays(cur, step);
    if (isSiteDay(cur)) left--;
  }
  return cur;
}
/** Splits a target so the LAST day lands exactly on it: nobody believes 99,7 percent delivered. */
function split(target, count) {
  const step = Math.floor(target / count);
  const parts = Array(count).fill(step);
  parts[count - 1] = target - step * (count - 1);
  return parts;
}

const bookProjects = [];
const bookScope = [];
const bookEntries = [];
const bookQuantities = [];
for (const p of PAST) {
  const dayList = workingDaysEnding(p.endedDaysAgo, p.days);
  bookProjects.push({
    id: pid(p.n), epc_org_id: EPC_ORG, sub_org_id: p.sub, name: p.name, status: "finished", language: "sl",
    vat_mode: "reverse_charge", country: "si", address_street: p.street, address_zip: p.zip, address_city: p.city,
    kwp: p.kwp, module_count: p.modules, module_type: "Trina Vertex S+ 450 W", mounting_system: "K2 Dome 6.10",
    roof_type: p.roof, hourly_work_approved: true, planned_start: dayList[0],
    planned_end: addSiteDays(dayList[dayList.length - 1], p.slip), plan_pdf_path: null,
  });
  const items = [
    { id: sid(p.n, 1), name: "Podkonstrukcija", unit: "kos", target: p.modules, weight: 2 },
    { id: sid(p.n, 2), name: "Moduli", unit: "kos", target: p.modules, weight: 4 },
    { id: sid(p.n, 3), name: "DC kabliranje", unit: "m", target: p.modules * 2, weight: 1 },
  ];
  items.forEach((item, j) => bookScope.push({
    id: item.id, project_id: pid(p.n), name: item.name, unit: item.unit,
    target_qty: item.target, weight: item.weight, sort_order: j + 1,
  }));
  dayList.forEach((date, i) => {
    const created = at(date, "15:30");
    bookEntries.push({
      id: eid(p.n, i), project_id: pid(p.n), entry_date: date, note: "Montaža po planu.", headcount: 4 + (i % 3),
      created_by_person: PERSON_SUB, created_at: created, updated_at: created,
      weather: { code: i % 4 === 3 ? 2 : 0, tempC: tempFor(date, (i % 5) - 2), capturedAt: created },
    });
  });
  // The trades overlap the way they do on a roof: substructure leads, modules follow, cabling trails both.
  const phases = [
    { item: items[0], from: 0, to: Math.ceil(p.days * 0.45) },
    { item: items[1], from: Math.floor(p.days * 0.3), to: Math.ceil(p.days * 0.9) },
    { item: items[2], from: Math.floor(p.days * 0.5), to: p.days },
  ];
  for (const phase of phases) {
    const span = Math.max(1, Math.min(phase.to, dayList.length) - phase.from);
    split(phase.item.target, span).forEach((qty, k) => {
      bookQuantities.push({ entry_id: eid(p.n, phase.from + k), scope_item_id: phase.item.id, qty });
    });
  }
}
bookProjects.push({
  id: pid(NOT_STARTED.n), epc_org_id: EPC_ORG, sub_org_id: null, name: NOT_STARTED.name, status: "draft",
  language: "sl", vat_mode: "reverse_charge", country: "si", address_street: NOT_STARTED.street,
  address_zip: NOT_STARTED.zip, address_city: NOT_STARTED.city, kwp: NOT_STARTED.kwp,
  module_count: NOT_STARTED.modules, module_type: "Trina Vertex S+ 450 W", mounting_system: "K2 Dome 6.10",
  roof_type: NOT_STARTED.roof, hourly_work_approved: false,
  planned_start: siteDayOnOrAfter(isoPlusDays(TODAY, 12)), planned_end: siteDayOnOrAfter(isoPlusDays(TODAY, 54)), plan_pdf_path: null,
});
[["Podkonstrukcija", "kos", NOT_STARTED.modules, 2], ["Moduli", "kos", NOT_STARTED.modules, 4],
 ["DC kabliranje", "m", NOT_STARTED.modules * 2, 1]].forEach((row, j) => bookScope.push({
  id: sid(NOT_STARTED.n, j + 1), project_id: pid(NOT_STARTED.n), name: row[0], unit: row[1],
  target_qty: row[2], weight: row[3], sort_order: j + 1,
}));
await upsert("projects", bookProjects);
await upsert("scope_items", bookScope);
await upsert("daily_entries", bookEntries);
await upsert("entry_quantities", bookQuantities, "entry_id,scope_item_id");

// ---- the activity trail ----
// The same rows submit_daily_report and submit_material_check write (no
// actor_person, the RPCs leave it null), stamped when each thing happened. The
// portfolio sorts by the newest of these, and a July row on a project reset
// yesterday was a feed contradicting its own cards.
await insertRows("activity", [
  { project_id: PROJECT, kind: "material_check_completed", created_at: MATERIAL_CHECKED,
    payload: { complete: true, shortfall: 0, photos: 0, notes: 0 } },
  ...entryRows.map((e, i) => ({
    project_id: PROJECT, kind: "entry_submitted", created_at: e.created_at,
    payload: { headcount: e.headcount, photos: PHOTO_PLAN.filter((p) => p.entry === i).length },
  })),
  ...bookEntries.map((e) => ({
    project_id: e.project_id, kind: "entry_submitted", created_at: e.created_at,
    payload: { headcount: e.headcount, photos: 0 },
  })),
]);

console.log("Seed complete.");
console.log(`Client: ${EPC_IDENTITY.name}. Naročilnica ${PO_AMOUNT} EUR, režijska ura ${REGIE_RATE} EUR.`);
console.log(`Trenutno: ${dates[0]} .. ${dates[8]}, 9 days logged. Hours deadline ${SHEET2_DEADLINE_DAY}, countdown ${countdown}.`);
console.log(`Dan 1: starts ${startPlannedStart}, nothing logged.`);
console.log("Every demo session was ended: enter each device through the Demo Door again.");
