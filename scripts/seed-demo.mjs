import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const EPC_ORG = "11111111-1111-4111-8111-111111111111";
const SUB_ORG = "22222222-2222-4222-8222-222222222222";
// The founder's own company, deliberately separate from both demo companies.
const FOUNDER_ORG = "12121212-1212-4121-8121-121212121212";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const SCOPE_UK = "44444444-4444-4444-8444-444444444401";
const SCOPE_MODULES = "44444444-4444-4444-8444-444444444402";
const SCOPE_DC = "44444444-4444-4444-8444-444444444403";
const PERSON_EPC = "66666666-6666-4666-8666-666666666601";
const PERSON_SUB = "66666666-6666-4666-8666-666666666602";
const PERSON_SUB_ADMIN = "66666666-6666-4666-8666-666666666603";
const PERSON_FOUNDER = "66666666-6666-4666-8666-666666666604";
// The EPC office. A Bauleiter runs the site but does not sign orders, so the
// demo company needs the person who does: without an admin on the EPC side
// nobody can price a naročilnica, which is most of what an EPC buys Belin for.
const PERSON_EPC_ADMIN = "66666666-6666-4666-8666-666666666605";
const TOKEN_EPC = "77777777-7777-4777-8777-777777777701";
const TOKEN_SUB = "77777777-7777-4777-8777-777777777702";

// Second demo project: a job at day zero, nothing logged yet. It exists so the
// founder can show, and test, what the app looks like at the start of a project
// (empty log, no progress, material check still to do) and switch back to the
// half-built state without destroying either.
//
// It carries its OWN name and site. It used to be a copy of Kranj, on the
// theory that it would read as one project at two points in time. On the
// project list it did not: it read as the same row printed twice.
const PROJECT_START = "33333333-3333-4333-8333-333333333334";
const SCOPE_START_UK = "44444444-4444-4444-8444-444444444411";
const SCOPE_START_MODULES = "44444444-4444-4444-8444-444444444412";
const SCOPE_START_DC = "44444444-4444-4444-8444-444444444413";
const TOKEN_START_EPC = "77777777-7777-4777-8777-777777777703";
const TOKEN_START_SUB = "77777777-7777-4777-8777-777777777704";

async function upsert(table, rows, onConflict = "id") {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} row(s) upserted`);
}

// ---- date helpers (site-local Slovenia; weekdays only) ----
function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
function isoPlusDays(iso, n) {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
}
function isWeekday(iso) {
  const g = new Date(iso + "T00:00:00Z").getUTCDay();
  return g >= 1 && g <= 5;
}

// The last 9 working days, oldest first, ending at the most recent weekday.
const dates = [];
for (let n = 1; dates.length < 9; n++) {
  const iso = isoDaysAgo(n);
  if (isWeekday(iso)) dates.push(iso);
}
dates.reverse();
const plannedStart = dates[0];
const plannedEnd = isoPlusDays(dates[0], 42); // ~30 working days: gives an "ahead" buffer

// ---- static rows ----
// Both orgs carry the money fields from the start: an invoice cannot be
// generated without a VAT id and an IBAN, so a demo project missing them would
// fail at the last step of the acceptance script rather than at the first.
await upsert("organizations", [
  {
    id: EPC_ORG,
    type: "epc",
    name: "Sonce Energija d.o.o.",
    country: "si",
    vat_id: "SI10000001",
    iban: "SI56 1910 0000 0123 438",
  },
  {
    id: SUB_ORG,
    type: "sub",
    name: "AVESOL d.o.o.",
    country: "si",
    vat_id: "SI10000002",
    iban: "SI56 0201 0001 2345 685",
    accountant_email: "racunovodstvo@avesol-demo.si",
  },
]);

// Every demo address on a *-demo.si domain is fake and would hard bounce, so
// lib/email.ts refuses to send to them. The only deliverable address in the
// seed is the founder's, taken from SEED_FOUNDER_EMAIL; without it the founder
// person is skipped and login is demonstrated locally through the dev log.
const founderEmail = process.env.SEED_FOUNDER_EMAIL?.trim().toLowerCase();

// The founder gets their OWN company, not a seat inside the demo EPC.
//
// This matters: signed in with a real address, you are a real customer, and a
// real customer's first login shows an empty project list, not somebody else's
// staged data. The demo companies keep their staged projects and stay reachable
// through the demo links for showing prospects; the two never mix.
if (founderEmail) {
  await upsert("organizations", [
    {
      id: FOUNDER_ORG,
      type: "epc",
      name: process.env.SEED_FOUNDER_ORG?.trim() || "Moje podjetje d.o.o.",
      country: "si",
    },
  ]);
}

const people = [
  { id: PERSON_EPC, org_id: EPC_ORG, full_name: "Matej Kovač", role: "bauleiter", email: "matej@sonce-demo.si" },
  { id: PERSON_EPC_ADMIN, org_id: EPC_ORG, full_name: "Nina Hribar", role: "admin", email: "nina@sonce-demo.si" },
  { id: PERSON_SUB, org_id: SUB_ORG, full_name: "Luka Zupan", role: "crew", email: "luka@avesol-demo.si" },
  { id: PERSON_SUB_ADMIN, org_id: SUB_ORG, full_name: "Ana Novak", role: "admin", email: "ana@avesol-demo.si" },
];
if (founderEmail) {
  people.push({ id: PERSON_FOUNDER, org_id: FOUNDER_ORG, full_name: "Jan", role: "admin", email: founderEmail });
} else {
  console.log("people: SEED_FOUNDER_EMAIL not set, founder person skipped");
}
await upsert("people", people);

await upsert("projects", [
  {
    id: PROJECT,
    epc_org_id: EPC_ORG,
    sub_org_id: SUB_ORG,
    name: "PSE Trgovski center Kranj",
    status: "active",
    language: "sl",
    // domestic Slovenian construction services: reverse charge under 76.a ZDDV-1
    vat_mode: "reverse_charge",
    country: "si",
    address_street: "Cesta Staneta Žagarja 69",
    address_zip: "4000",
    address_city: "Kranj",
    lat: 46.2455,
    lng: 14.3555,
    kwp: 245.7,
    module_count: 546,
    module_type: "Trina Vertex S+ 450 W",
    mounting_system: "K2 Dome 6.10",
    roof_type: "Ravna streha",
    hourly_work_approved: true,
    planned_start: plannedStart,
    planned_end: plannedEnd,
  },
]);

await upsert("scope_items", [
  { id: SCOPE_UK, project_id: PROJECT, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_MODULES, project_id: PROJECT, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_DC, project_id: PROJECT, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
]);

// ---- multi-day history (rebuilt each run for a deterministic demo) ----
const days = [
  { headcount: 4, note: "Začetek montaže podkonstrukcije, južni del strehe.", weather: { code: 0, tempC: 24 }, adds: [[SCOPE_UK, 120]] },
  { headcount: 5, note: "Podkonstrukcija, nadaljevanje proti sredini.", weather: { code: 2, tempC: 22 }, adds: [[SCOPE_UK, 130]] },
  { headcount: 5, note: "Podkonstrukcija, zahodni niz.", weather: { code: 0, tempC: 26 }, adds: [[SCOPE_UK, 150]] },
  { headcount: 6, note: "Podkonstrukcija zaključena.", weather: { code: 0, tempC: 28 }, adds: [[SCOPE_UK, 146]] },
  { headcount: 6, note: "Začetek montaže modulov, prvi niz.", weather: { code: 2, tempC: 25 }, adds: [[SCOPE_MODULES, 50]] },
  { headcount: 6, note: "Moduli, drugi niz.", weather: { code: 0, tempC: 30 }, adds: [[SCOPE_MODULES, 60]] },
  { headcount: 6, note: "Moduli in začetek DC kabliranja.", weather: { code: 0, tempC: 31 }, adds: [[SCOPE_MODULES, 70], [SCOPE_DC, 100]] },
  { headcount: 5, note: "Popoldne prekinitev zaradi dežja.", weather: { code: 61, tempC: 20 }, adds: [[SCOPE_MODULES, 40], [SCOPE_DC, 80]] },
  { headcount: 6, note: "Moduli in DC, dober tempo.", weather: { code: 2, tempC: 23 }, adds: [[SCOPE_MODULES, 30], [SCOPE_DC, 120]] },
];

// Clean the project's prior entries (and their children) so re-runs are deterministic.
const { data: existing } = await db.from("daily_entries").select("id").eq("project_id", PROJECT);
const oldIds = (existing ?? []).map((r) => r.id);
if (oldIds.length) {
  await db.from("entry_photos").delete().in("entry_id", oldIds);
  await db.from("entry_quantities").delete().in("entry_id", oldIds);
  await db.from("daily_entries").delete().in("id", oldIds);
}

const entryRows = [];
const quantityRows = [];
days.forEach((d, i) => {
  const entryId = `55555555-5555-4555-8555-5555555555${String(i).padStart(2, "0")}`;
  entryRows.push({
    id: entryId,
    project_id: PROJECT,
    entry_date: dates[i],
    note: d.note,
    headcount: d.headcount,
    created_by_person: PERSON_SUB,
    weather: { code: d.weather.code, tempC: d.weather.tempC, capturedAt: dates[i] + "T15:00:00Z" },
  });
  for (const [scope, qty] of d.adds) {
    quantityRows.push({ entry_id: entryId, scope_item_id: scope, qty });
  }
});
await upsert("daily_entries", entryRows);
await upsert("entry_quantities", quantityRows, "entry_id,scope_item_id");

// ---- placeholder photos (generated, uploaded, referenced) ----
// A photo failure must not break the core seed, so this is best-effort.
try {
  const photoPlan = [
    { entry: 3, shade: 18 },
    { entry: 6, shade: 26 },
    { entry: 6, shade: 22 },
    { entry: 8, shade: 30 },
    { entry: 8, shade: 20 },
    { entry: 8, shade: 24 },
  ];
  const photoRows = [];
  for (let i = 0; i < photoPlan.length; i++) {
    const { entry, shade } = photoPlan[i];
    const buf = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: shade, g: shade + 12, b: shade + 26 } },
    })
      .jpeg({ quality: 68 })
      .toBuffer();
    const path = `${PROJECT}/seed/photo-${i}.jpg`;
    const { error: upErr } = await db.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(upErr.message);
    photoRows.push({
      id: `88888888-8888-4888-8888-8888888888${String(i).padStart(2, "0")}`,
      entry_id: `55555555-5555-4555-8555-5555555555${String(entry).padStart(2, "0")}`,
      storage_path: path,
      sort_order: i,
      width: 800,
      height: 600,
    });
  }
  await upsert("entry_photos", photoRows);
} catch (e) {
  console.warn(`photos: skipped (${e.message})`);
}

// ---- Stückliste: the material list the EPC sends, per project ----
// Real hardware for a 245.7 kWp flat-roof job, so the check screen reads like
// a real delivery rather than lorem ipsum.
const MATERIAL = [
  { name: "Modul Trina Vertex S+ 450 W", qty: 546, unit: "kos" },
  { name: "Nosilna konstrukcija K2 Dome 6.10", qty: 546, unit: "kpl" },
  { name: "Razsmernik Huawei SUN2000-100KTL", qty: 2, unit: "kos" },
  { name: "DC kabel 6 mm2", qty: 1200, unit: "m" },
  { name: "Konektorji MC4", qty: 120, unit: "par" },
  { name: "AC kabel 4x120 mm2", qty: 250, unit: "m" },
  { name: "Prenapetostna zaščita tip 2", qty: 4, unit: "kos" },
];

function materialRows(projectId, idPrefix) {
  return MATERIAL.map((m, i) => ({
    // Last UUID group is exactly 12 hex chars: an 8 char prefix plus 4 digits.
    id: `99999999-9999-4999-8999-${idPrefix}${String(i).padStart(4, "0")}`,
    project_id: projectId,
    name: m.name,
    qty: m.qty,
    unit: m.unit,
    sort_order: i + 1,
  }));
}

// ---- ground zero project: same job, nothing logged yet ----
function nextWeekday(iso) {
  let d = iso;
  while (!isWeekday(d)) d = isoPlusDays(d, 1);
  return d;
}
const startPlannedStart = nextWeekday(new Date().toISOString().slice(0, 10));
const startPlannedEnd = isoPlusDays(startPlannedStart, 42);

await upsert("projects", [
  {
    id: PROJECT_START,
    epc_org_id: EPC_ORG,
    sub_org_id: SUB_ORG,
    // Its OWN site, not a second copy of Kranj. The two demo projects are two
    // states of the same STORY, day one and mid job, but on the portfolio
    // screen two identical rows read as a duplicate rather than as a scenario,
    // which is exactly how the founder read them.
    name: "Poslovni park Ljubljana Vzhod",
    status: "active",
    language: "sl",
    // domestic Slovenian construction services: reverse charge under 76.a ZDDV-1
    vat_mode: "reverse_charge",
    country: "si",
    address_street: "Letališka cesta 27",
    address_zip: "1000",
    address_city: "Ljubljana",
    lat: 46.0621,
    lng: 14.5390,
    kwp: 245.7,
    module_count: 546,
    module_type: "Trina Vertex S+ 450 W",
    mounting_system: "K2 Dome 6.10",
    roof_type: "Ravna streha",
    hourly_work_approved: true,
    planned_start: startPlannedStart,
    planned_end: startPlannedEnd,
  },
]);

await upsert("scope_items", [
  { id: SCOPE_START_UK, project_id: PROJECT_START, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_START_MODULES, project_id: PROJECT_START, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_START_DC, project_id: PROJECT_START, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
]);

// Ground zero means zero: clear anything the founder logged while testing, so
// re-running the seed always returns this project to a true day one.
const { data: startExisting } = await db
  .from("daily_entries")
  .select("id")
  .eq("project_id", PROJECT_START);
const startOldIds = (startExisting ?? []).map((r) => r.id);
if (startOldIds.length) {
  await db.from("entry_photos").delete().in("entry_id", startOldIds);
  await db.from("entry_quantities").delete().in("entry_id", startOldIds);
  await db.from("daily_entries").delete().in("id", startOldIds);
  console.log(`daily_entries: ${startOldIds.length} ground-zero row(s) cleared`);
}

await upsert("material_items", [
  ...materialRows(PROJECT, "aaaaaaaa"),
  ...materialRows(PROJECT_START, "bbbbbbbb"),
]);

// The current project is mid-build: seed one completed check so that side shows
// the settled state. Ground zero keeps no check at all, which is the point of
// it. The check is created AFTER the material_items upsert above and its
// checked_at is left to the DB default (now()), NOT a client timestamp: the
// items' updated_at comes from the DB clock via the moddatetime trigger, and
// the client clock can lag it by seconds, which would make checked_at predate
// the items and boot the settled demo with a false re-check banner. Both
// timestamps on the DB clock, check inserted after the items, guarantees
// checked_at postdates every item's updated_at. The prior checks are deleted
// just above, so this is always a fresh insert and the default applies.
const { data: priorChecks } = await db
  .from("material_checks")
  .select("id")
  .in("project_id", [PROJECT, PROJECT_START]);
const priorIds = (priorChecks ?? []).map((r) => r.id);
if (priorIds.length) {
  await db.from("material_check_docs").delete().in("check_id", priorIds);
  await db.from("material_check_items").delete().in("check_id", priorIds);
  await db.from("material_checks").delete().in("id", priorIds);
}

const CHECK_CURRENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
await upsert("material_checks", [
  {
    id: CHECK_CURRENT,
    project_id: PROJECT,
    is_complete: true,
    note: "Vse prevzeto, dobavnica priložena.",
    checked_by_person: PERSON_SUB,
    // checked_at intentionally omitted: DB default now() on this fresh insert.
  },
]);
await upsert(
  "material_check_items",
  materialRows(PROJECT, "aaaaaaaa").map((m) => ({
    check_id: CHECK_CURRENT,
    material_item_id: m.id,
    status: "present",
  })),
  "check_id,material_item_id"
);

await upsert("project_tokens", [
  { id: TOKEN_EPC, project_id: PROJECT, role: "epc", token: "demo-epc-k7m2x9q4", label: "Founder laptop" },
  { id: TOKEN_SUB, project_id: PROJECT, role: "sub", token: "demo-sub-r8p3n6w1", label: "Founder phone" },
  { id: TOKEN_START_EPC, project_id: PROJECT_START, role: "epc", token: "demo-epc-start-h3k9m2", label: "EPC, day one" },
  { id: TOKEN_START_SUB, project_id: PROJECT_START, role: "sub", token: "demo-sub-start-q7w4z8", label: "Crew, day one" },
]);


// ============================================================
// The commercial state of the demo.
//
// The founder's ruling (2026-08-12): the seed stages a SENT naročilnica on the
// day-one project and a sent-then-ACCEPTED one on the running project, so the
// demo needs no preparation clicks.
//
// The objection that produced the earlier draft still stands on the facts: a
// purchase order with status sent and no stored PDF cannot be opened, and
// acceptance re-hashes the stored file, so a null hash would refuse acceptance
// live on stage. That is answered by construction rather than by avoidance:
// scripts/seed-documents.ts renders these documents through the SAME code the
// app uses and writes back the real path and the real sha256. Rows here are
// therefore rows the app itself could have produced.
//
// If that step is skipped or fails, the seed says so loudly rather than leaving
// a demo that breaks on the first click.
// ============================================================

const PO_CURRENT = "88888888-8888-4888-8888-888888888801";
const PO_START = "88888888-8888-4888-8888-888888888802";
const SHEET_APPROVED = "99999999-9999-4999-8999-999999999901";
const SHEET_OPEN = "99999999-9999-4999-8999-999999999902";
const CO_APPROVED = "aaaaaaaa-9999-4999-8999-999999999903";

const daysAgoIso = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Both naročilnice carry a régie rate: without one, approved hours cannot be
// billed and the invoice would warn instead of showing the number the demo is
// about.
await upsert("purchase_orders", [
  {
    id: PO_CURRENT,
    project_id: PROJECT,
    number: 1,
    status: "accepted",
    total_net: 118500,
    regie_hourly_rate: 48,
    payment_terms: "30 dni od izdaje računa",
    deadline: plannedEnd,
    sent_at: daysAgoIso(12),
    accepted_at: daysAgoIso(11),
    accepted_by_person: PERSON_SUB_ADMIN,
    accepted_by_name: "Ana Novak",
    created_by_person: PERSON_EPC_ADMIN,
  },
  {
    id: PO_START,
    project_id: PROJECT_START,
    number: 1,
    status: "sent",
    total_net: 118500,
    regie_hourly_rate: 48,
    payment_terms: "30 dni od izdaje računa",
    deadline: startPlannedEnd,
    sent_at: daysAgoIso(1),
    created_by_person: PERSON_EPC_ADMIN,
  },
]);

await upsert(
  "purchase_order_lines",
  [
    {
      id: "88888888-8888-4888-8888-888888888811",
      purchase_order_id: PO_CURRENT,
      description: "Montaža FV sistema 245.7 kWp, Kranj",
      qty: 1,
      unit: "kos",
      unit_price: 118500,
      total: 118500,
      sort_order: 0,
    },
    {
      id: "88888888-8888-4888-8888-888888888812",
      purchase_order_id: PO_START,
      description: "Montaža FV sistema 245.7 kWp, Kranj",
      qty: 1,
      unit: "kos",
      unit_price: 118500,
      total: 118500,
      sort_order: 0,
    },
  ],
);

// One sheet already approved, and one still running with two working days left
// on the clock, so the countdown badge is live during the demo rather than a
// screenshot of a state nobody can reach.
await upsert("hour_sheets", [
  {
    id: SHEET_APPROVED,
    project_id: PROJECT,
    sub_org_id: SUB_ORG,
    number: 1,
    status: "approved",
    submitted_at: daysAgoIso(8),
    deadline_at: daysAgoIso(2),
    decided_at: daysAgoIso(7),
    decided_by_person: PERSON_EPC,
  },
  {
    id: SHEET_OPEN,
    project_id: PROJECT,
    sub_org_id: SUB_ORG,
    number: 2,
    status: "submitted",
    submitted_at: daysAgoIso(2),
    deadline_at: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
]);

await upsert("hour_sheet_lines", [
  {
    id: "99999999-9999-4999-8999-999999999911",
    sheet_id: SHEET_APPROVED,
    work_date: isoDaysAgo(9),
    hours: 8,
    description: "Dodatno pritrjevanje zaradi drugačne kritine",
    person_id: PERSON_SUB,
  },
  {
    id: "99999999-9999-4999-8999-999999999912",
    sheet_id: SHEET_APPROVED,
    work_date: isoDaysAgo(8),
    hours: 6,
    description: "Nadaljevanje pritrjevanja, južni del",
    person_id: PERSON_SUB,
  },
  {
    id: "99999999-9999-4999-8999-999999999913",
    sheet_id: SHEET_OPEN,
    work_date: isoDaysAgo(3),
    hours: 5,
    description: "Čiščenje po neurju",
    person_id: PERSON_SUB,
  },
]);

await upsert("change_orders", [
  {
    id: CO_APPROVED,
    project_id: PROJECT,
    number: 1,
    title: "Zamenjava dotrajanih letev pod kritino",
    description: "Letve pod modulnimi vrstami 3 do 5 so bile trhle.",
    amount: 1200,
    status: "approved",
    decided_at: daysAgoIso(6),
    decided_by_person: PERSON_EPC,
    created_by_person: PERSON_SUB,
  },
]);

// Two incidents and one answered request: the running project should look like
// a job that has actually been worked on, not a clean room.
await db.from("incidents").delete().eq("project_id", PROJECT);
const { data: seededIncidents } = await db
  .from("incidents")
  .insert([
    {
      project_id: PROJECT,
      kind: "rain_stop",
      note: "",
      occurred_on: isoDaysAgo(4),
      created_by_person: PERSON_SUB,
    },
    {
      project_id: PROJECT,
      kind: "obstruction",
      note: "Dostop do strehe zaprt zaradi dostave drugega izvajalca.",
      occurred_on: isoDaysAgo(2),
      created_by_person: PERSON_SUB,
    },
  ])
  .select("id");
console.log(`incidents: ${(seededIncidents ?? []).length} row(s) inserted`);

await db.from("requests").delete().eq("project_id", PROJECT);
await db.from("requests").insert([
  {
    project_id: PROJECT,
    type: "material",
    text: "Zmanjkalo je 12 vijakov M10 za zaključne vrste.",
    status: "resolved",
    response_note: "Vijaki gredo jutri zjutraj s prvo dostavo.",
    resolved_at: daysAgoIso(1),
    created_by_person: PERSON_SUB,
  },
  {
    project_id: PROJECT,
    type: "plan",
    text: "Potrebujemo shemo priklopa za razdelilnik R2.",
    status: "open",
    created_by_person: PERSON_SUB,
  },
]);
console.log("requests: 2 row(s) inserted");

// The subcontractor's compliance documents, including one expiring soon, so
// the traffic light on the EPC dashboard is showing something real.
await db.from("documents").delete().eq("org_id", SUB_ORG);
await db.from("documents").insert([
  {
    org_id: SUB_ORG,
    type: "a1",
    title: "Potrdilo A1, Luka Zupan",
    valid_until: isoPlusDays(isoDaysAgo(0), 120),
    storage_path: "demo/a1.pdf",
  },
  {
    org_id: SUB_ORG,
    type: "freistellungsbescheinigung",
    title: "Freistellungsbescheinigung 2026",
    valid_until: isoPlusDays(isoDaysAgo(0), 18),
    storage_path: "demo/freistellung.pdf",
  },
  {
    org_id: SUB_ORG,
    type: "insurance",
    title: "Zavarovanje odgovornosti",
    valid_until: isoPlusDays(isoDaysAgo(0), 200),
    storage_path: "demo/insurance.pdf",
  },
]);
console.log("documents: 3 row(s) inserted");

// ---- the rest of the book ----
//
// An EPC does not have two projects, and a screen showing two proves nothing
// about whether this holds up against a real portfolio. These are the jobs
// behind and ahead of the two live ones: four delivered, one not started.
//
// They are built the way a real project is, from scope items and daily entries,
// rather than by writing a percentage into a column. A finished project reads
// 100 percent because its quantities reach its targets, and its sparkline has
// the shape its own history gave it. Nothing here tells the screen what to say.
const PAST = [
  { n: 1, name: "Logistični center Naklo", city: "Naklo", street: "Cesta na Okroglo 7", zip: "4202",
    kwp: 96.6, modules: 214, endedDaysAgo: 24, days: 6, roof: "Trapezna pločevina" },
  { n: 2, name: "Poslovna cona Komenda", city: "Komenda", street: "Pod hribom 41", zip: "1218",
    kwp: 180.4, modules: 401, endedDaysAgo: 58, days: 9, roof: "Ravna streha" },
  { n: 3, name: "Hala Trimo Trebnje", city: "Trebnje", street: "Prijateljeva cesta 12", zip: "8210",
    kwp: 320.0, modules: 711, endedDaysAgo: 96, days: 14, roof: "Ravna streha" },
  { n: 4, name: "Streha Gorenje Velenje", city: "Velenje", street: "Partizanska cesta 12", zip: "3320",
    kwp: 412.8, modules: 917, endedDaysAgo: 151, days: 16, roof: "Trapezna pločevina" },
];

const NOT_STARTED = { n: 5, name: "PSE Lidl Domžale", city: "Domžale",
  street: "Ljubljanska cesta 84", zip: "1230", kwp: 265.2, modules: 589, roof: "Ravna streha" };

const pid = (n) => `3333333a-0000-4000-8000-00000000000${n}`;
const sid = (n, j) => `4444444a-000${n}-4000-8000-00000000000${j}`;
const eid = (n, i) => `5555555a-000${n}-4000-8000-0000000000${String(i).padStart(2, "0")}`;

/** Working days ending `endedDaysAgo` days ago, oldest first. */
function workingDaysEnding(endedDaysAgo, count) {
  const out = [];
  for (let n = endedDaysAgo; out.length < count; n++) {
    const iso = isoDaysAgo(n);
    if (isWeekday(iso)) out.push(iso);
  }
  return out.reverse();
}

/**
 * Splits a target across days so the LAST day lands exactly on it. A delivered
 * project reading 99.7 percent because of rounding is one nobody believes.
 */
function split(target, days) {
  const step = Math.floor(target / days);
  const parts = Array(days).fill(step);
  parts[days - 1] = target - step * (days - 1);
  return parts;
}

const bookProjects = [];
const bookScope = [];
const bookEntries = [];
const bookQuantities = [];

for (const p of PAST) {
  const dayList = workingDaysEnding(p.endedDaysAgo, p.days);
  bookProjects.push({
    id: pid(p.n), epc_org_id: EPC_ORG, sub_org_id: SUB_ORG,
    name: p.name, status: "finished", language: "sl", vat_mode: "reverse_charge", country: "si",
    address_street: p.street, address_zip: p.zip, address_city: p.city,
    kwp: p.kwp, module_count: p.modules, module_type: "Trina Vertex S+ 450 W",
    mounting_system: "K2 Dome 6.10", roof_type: p.roof, hourly_work_approved: true,
    planned_start: dayList[0], planned_end: dayList[dayList.length - 1],
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

  dayList.forEach((date, i) => bookEntries.push({
    id: eid(p.n, i), project_id: pid(p.n), entry_date: date,
    note: "Montaža po planu.", headcount: 4 + (i % 3), created_by_person: PERSON_SUB,
    weather: { code: i % 4 === 3 ? 2 : 0, tempC: 18 + (i % 9), capturedAt: date + "T15:00:00Z" },
  }));

  // The trades overlap the way they do on a roof: substructure leads, modules
  // follow it, cabling trails both. That overlap is what gives the sparkline a
  // shape instead of a straight line.
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

// Not started: a real project with a real scope list and not one day logged.
// Zero percent has to be a state the screen handles, not an absence.
bookProjects.push({
  id: pid(NOT_STARTED.n), epc_org_id: EPC_ORG, sub_org_id: SUB_ORG,
  name: NOT_STARTED.name, status: "draft", language: "sl", vat_mode: "reverse_charge", country: "si",
  address_street: NOT_STARTED.street, address_zip: NOT_STARTED.zip, address_city: NOT_STARTED.city,
  kwp: NOT_STARTED.kwp, module_count: NOT_STARTED.modules, module_type: "Trina Vertex S+ 450 W",
  mounting_system: "K2 Dome 6.10", roof_type: NOT_STARTED.roof, hourly_work_approved: false,
  planned_start: isoPlusDays(isoDaysAgo(0), 12), planned_end: isoPlusDays(isoDaysAgo(0), 54),
});
[["Podkonstrukcija", "kos", NOT_STARTED.modules, 2],
 ["Moduli", "kos", NOT_STARTED.modules, 4],
 ["DC kabliranje", "m", NOT_STARTED.modules * 2, 1]].forEach((row, j) => bookScope.push({
  id: sid(NOT_STARTED.n, j + 1), project_id: pid(NOT_STARTED.n),
  name: row[0], unit: row[1], target_qty: row[2], weight: row[3], sort_order: j + 1,
}));

// Rebuilt each run, like the live project's history, so re-running the seed
// cannot leave a delivered project sitting at 140 percent.
const bookIds = bookProjects.map((row) => row.id);
const { data: priorBook } = await db.from("daily_entries").select("id").in("project_id", bookIds);
const priorBookIds = (priorBook ?? []).map((row) => row.id);
if (priorBookIds.length) {
  await db.from("entry_photos").delete().in("entry_id", priorBookIds);
  await db.from("entry_quantities").delete().in("entry_id", priorBookIds);
  await db.from("daily_entries").delete().in("id", priorBookIds);
}

await upsert("projects", bookProjects);
await upsert("scope_items", bookScope);
await upsert("daily_entries", bookEntries);
await upsert("entry_quantities", bookQuantities, "entry_id,scope_item_id");

// Documents that no longer describe anything: a leftover invoice or protocol
// from a previous seed would contradict the freshly staged state.
await db.from("invoices").delete().in("project_id", [PROJECT, PROJECT_START]);
await db.from("acceptances").delete().in("project_id", [PROJECT, PROJECT_START]);
await db.from("notifications").delete().in("project_id", [PROJECT, PROJECT_START]);

// And the two records that made the reset a lie.
//
// The upsert above puts status back to "active", but the final page does not
// read status to decide whether the handover was requested: it reads the
// ACTIVITY TRAIL, deliberately, so that fact has one home. A leftover
// finalization_requested row therefore left a freshly seeded, active project
// insisting it had already been handed over, with the acceptance step open
// underneath it. Likewise a completion report from a previous run reappeared on
// the card, dated and downloadable, describing days this seed had just deleted.
//
// Found on 2026-08-12 by walking the whole finalization chain on production and
// then re-seeding, which is the exact sequence the runbook's prep ritual asks
// the founder to perform before every demo.
//
// Only the closing events are cleared, never the trail the demo is made of:
// entry_submitted and material_check_completed are the live feed on the
// dashboard, and deleting those would empty the screen the demo opens on.
const CLOSING_EVENTS = [
  "finalization_requested",
  "acceptance_signed",
  "invoice_generated",
  "invoice_sent",
];
await db
  .from("activity")
  .delete()
  .in("project_id", [PROJECT, PROJECT_START])
  .in("kind", CLOSING_EVENTS);

const { data: staleDocs } = await db
  .from("generated_documents")
  .select("id, storage_path")
  .in("project_id", [PROJECT, PROJECT_START]);

if (staleDocs?.length) {
  const paths = staleDocs.map((row) => row.storage_path).filter((p) => p && p !== "pending");
  if (paths.length) await db.storage.from("reports").remove(paths);
  await db
    .from("generated_documents")
    .delete()
    .in("id", staleDocs.map((row) => row.id));
  console.log(`reset: ${staleDocs.length} generated document(s) removed`);
}

console.log("Seed complete.");
console.log(`Current project: ${plannedStart} .. ${plannedEnd}, ${dates.length} working days logged.`);
console.log(`Day one project: ${startPlannedStart} .. ${startPlannedEnd}, nothing logged.`);
console.log("EPC link:  /sl/p/demo-epc-k7m2x9q4   (day one: /sl/p/demo-epc-start-h3k9m2)");
console.log("Crew link: /sl/p/demo-sub-r8p3n6w1   (day one: /sl/p/demo-sub-start-q7w4z8)");
