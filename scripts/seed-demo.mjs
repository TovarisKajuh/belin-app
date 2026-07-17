import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const EPC_ORG = "11111111-1111-4111-8111-111111111111";
const SUB_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const SCOPE_UK = "44444444-4444-4444-8444-444444444401";
const SCOPE_MODULES = "44444444-4444-4444-8444-444444444402";
const SCOPE_DC = "44444444-4444-4444-8444-444444444403";
const PERSON_EPC = "66666666-6666-4666-8666-666666666601";
const PERSON_SUB = "66666666-6666-4666-8666-666666666602";
const ENTRY_1 = "55555555-5555-4555-8555-555555555501";
const TOKEN_EPC = "77777777-7777-4777-8777-777777777701";
const TOKEN_SUB = "77777777-7777-4777-8777-777777777702";

async function upsert(table, rows) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} row(s) upserted`);
}

await upsert("organizations", [
  { id: EPC_ORG, type: "epc", name: "Sonce Energija d.o.o.", country: "si" },
  { id: SUB_ORG, type: "sub", name: "AVESOL d.o.o.", country: "si" },
]);

await upsert("people", [
  { id: PERSON_EPC, org_id: EPC_ORG, full_name: "Matej Kovač", role: "bauleiter" },
  { id: PERSON_SUB, org_id: SUB_ORG, full_name: "Luka Zupan", role: "crew" },
]);

await upsert("projects", [
  {
    id: PROJECT,
    epc_org_id: EPC_ORG,
    sub_org_id: SUB_ORG,
    name: "PSE Trgovski center Kranj",
    status: "active",
    language: "sl",
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
  },
]);

await upsert("scope_items", [
  { id: SCOPE_UK, project_id: PROJECT, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_MODULES, project_id: PROJECT, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_DC, project_id: PROJECT, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
]);

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

await upsert("daily_entries", [
  {
    id: ENTRY_1,
    project_id: PROJECT,
    entry_date: yesterday,
    note: "Začetek montaže podkonstrukcije, južni del strehe.",
    headcount: 4,
    created_by_person: PERSON_SUB,
  },
]);

const { error: qErr } = await db
  .from("entry_quantities")
  .upsert(
    [{ entry_id: ENTRY_1, scope_item_id: SCOPE_UK, qty: 120 }],
    { onConflict: "entry_id,scope_item_id" }
  );
if (qErr) {
  console.error(`entry_quantities: ${qErr.message}`);
  process.exit(1);
}
console.log("entry_quantities: 1 row upserted");

await upsert("project_tokens", [
  { id: TOKEN_EPC, project_id: PROJECT, role: "epc", token: "demo-epc-k7m2x9q4", label: "Founder laptop" },
  { id: TOKEN_SUB, project_id: PROJECT, role: "sub", token: "demo-sub-r8p3n6w1", label: "Founder phone" },
]);

console.log("Seed complete.");
console.log("EPC link:  /sl/p/demo-epc-k7m2x9q4");
console.log("Crew link: /sl/p/demo-sub-r8p3n6w1");
