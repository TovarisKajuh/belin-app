// Clears what demos and rehearsals leave behind, before the seed writes the
// story again. Every statement is scoped by construction:
//
//   - a project is touched only when its EPC is a demo organization. A real
//     EPC that hired a demo subcontractor is reported and never touched;
//   - inside the fixed demo projects every volatile row goes, and the seed
//     re-inserts the ones the story needs;
//   - organization rows and people are touched only inside the four demo
//     organizations, and only people outside the fixed persona set are removed;
//   - a plan import is touched only through a demo project (step 1), or when a
//     demo person started it and it never became a project (step 4a).
//
// Storage objects go before the rows that point at them, the order the plan
// sweep uses (lib/data/plan-imports.ts): a row without its file is harmless, a
// file without its row is litter nobody will ever find again.

import {
  DEMO_ORG_IDS,
  DEMO_FIXED_PROJECT_IDS,
  DEMO_PERSON_IDS,
  DEMO_TOKEN_IDS,
} from "@/lib/demo/ids";

const PROJECT_BUCKETS = ["photos", "signatures", "reports"];
const inList = (ids) => `(${ids.join(",")})`;

export async function purgeDemo(db, { dry }) {
  const counts = {};
  const tally = (label, n) => {
    counts[label] = (counts[label] ?? 0) + n;
  };

  // One delete, or in a dry run the count it would delete. `filter` receives a
  // builder and applies the same .in/.not to either.
  async function del(label, table, filter) {
    const builder = dry
      ? db.from(table).select("*", { count: "exact", head: true })
      : db.from(table).delete({ count: "exact" });
    const { count, error } = await filter(builder);
    if (error) throw new Error(`purge ${label}: ${error.message}`);
    tally(label, count ?? 0);
  }

  // Storage list() is one level deep; folders come back with a null id.
  async function listAll(bucket, prefix) {
    const out = [];
    const stack = [prefix];
    while (stack.length) {
      const dir = stack.pop();
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.storage.from(bucket).list(dir, { limit: 1000, offset });
        if (error) throw new Error(`purge list ${bucket}/${dir}: ${error.message}`);
        for (const item of data ?? []) {
          const full = `${dir}/${item.name}`;
          if (item.id === null) stack.push(full);
          else out.push(full);
        }
        if (!data || data.length < 1000) break;
      }
    }
    return out;
  }

  async function removeFiles(label, bucket, paths) {
    const unique = [...new Set(paths.filter(Boolean))];
    tally(label, unique.length);
    if (dry || unique.length === 0) return;
    for (let i = 0; i < unique.length; i += 100) {
      const { error } = await db.storage.from(bucket).remove(unique.slice(i, i + 100));
      if (error) throw new Error(`purge ${label}: ${error.message}`);
    }
  }

  async function sweep(label, buckets, prefixes) {
    for (const bucket of buckets) {
      for (const prefix of prefixes) await removeFiles(label, bucket, await listAll(bucket, prefix));
    }
  }

  // 1. Projects the app created inside the demo EPC (the wizard in a rehearsal).
  const { data: extra, error: extraError } = await db
    .from("projects")
    .select("id, name, plan_pdf_path")
    .in("epc_org_id", DEMO_ORG_IDS)
    .not("id", "in", inList(DEMO_FIXED_PROJECT_IDS));
  if (extraError) throw new Error(`purge find projects: ${extraError.message}`);

  const { data: foreign, error: foreignError } = await db
    .from("projects")
    .select("id, name")
    .in("sub_org_id", DEMO_ORG_IDS)
    .not("epc_org_id", "in", inList(DEMO_ORG_IDS));
  if (foreignError) throw new Error(`purge find foreign projects: ${foreignError.message}`);
  for (const p of foreign ?? []) {
    console.warn(`purge: "${p.name}" (${p.id}) belongs to a real EPC and has a demo subcontractor. Left untouched.`);
  }

  const extraIds = (extra ?? []).map((p) => p.id);
  if (extraIds.length) {
    for (const p of extra) console.log(`purge: ${dry ? "would remove" : "removing"} project "${p.name}" (${p.id})`);
    const { data: imports, error } = await db.from("plan_imports").select("storage_path").in("project_id", extraIds);
    if (error) throw new Error(`purge find plan imports: ${error.message}`);
    await removeFiles("plan files", "plans", [
      ...extra.map((p) => p.plan_pdf_path),
      ...(imports ?? []).map((row) => row.storage_path),
    ]);
    await sweep("project files", PROJECT_BUCKETS, extraIds);
    // invoices.project_id is ON DELETE RESTRICT and email_log.project_id is NO
    // ACTION; every other child of a project cascades.
    await del("invoices", "invoices", (q) => q.in("project_id", extraIds));
    await del("email_log", "email_log", (q) => q.in("project_id", extraIds));
    await del("projects", "projects", (q) => q.in("id", extraIds));
  }

  // 2. Every volatile row inside the fixed demo projects. The seed re-inserts
  // exactly what the story needs, with its own dates.
  const fixed = DEMO_FIXED_PROJECT_IDS;
  for (const table of [
    "invoices",
    "acceptances",
    "generated_documents",
    "activity",
    "notifications",
    "incidents",
    "requests",
    "change_orders",
    "hour_sheets",
    "purchase_orders",
    "material_checks",
    "material_items",
    "daily_entries",
    "scope_items",
    "invites",
    "project_roofs",
  ]) {
    await del(table, table, (q) => q.in("project_id", fixed));
  }
  await del("project_tokens", "project_tokens", (q) =>
    q.in("project_id", fixed).not("id", "in", inList(DEMO_TOKEN_IDS)),
  );
  await sweep("project files", PROJECT_BUCKETS, fixed);

  // 3. Organization rows of the demo companies.
  const { data: docs, error: docsError } = await db.from("documents").select("storage_path").in("org_id", DEMO_ORG_IDS);
  if (docsError) throw new Error(`purge find documents: ${docsError.message}`);
  await removeFiles("vault files", "docs", (docs ?? []).map((d) => d.storage_path));
  await sweep("vault files", ["docs"], DEMO_ORG_IDS);
  await del("documents", "documents", (q) => q.in("org_id", DEMO_ORG_IDS));
  await del("invites", "invites", (q) => q.in("org_id", DEMO_ORG_IDS));

  // 4. People. Every demo session ends here: after a reseed each device enters
  // through the Demo Door again.
  const { data: people, error: peopleError } = await db
    .from("people")
    .select("id, full_name")
    .in("org_id", DEMO_ORG_IDS);
  if (peopleError) throw new Error(`purge find people: ${peopleError.message}`);
  const everyone = (people ?? []).map((p) => p.id);

  // 4a. Wizard starts by demo people that never became a project (an upload
  // left on the review screen, or a tap on "Brez načrta?"). Committed imports
  // went with their project in step 1. Files first, then rows. This runs
  // before any person is removed: plan_imports.created_by_person is ON DELETE
  // SET NULL, so an import whose creator is gone could no longer be proven
  // demo. A manual start has storage_path '' and removeFiles skips it.
  if (everyone.length) {
    const { data: abandoned, error: abandonedError } = await db
      .from("plan_imports")
      .select("id, storage_path")
      .in("created_by_person", everyone)
      .is("project_id", null);
    if (abandonedError) throw new Error(`purge find abandoned plan imports: ${abandonedError.message}`);
    const ids = (abandoned ?? []).map((row) => row.id);
    if (ids.length) {
      await removeFiles("plan files", "plans", (abandoned ?? []).map((row) => row.storage_path));
      await del("plan_imports", "plan_imports", (q) => q.in("id", ids));
    }
  }

  if (everyone.length) {
    await del("sessions", "sessions", (q) => q.in("person_id", everyone));
    await del("login_tokens", "login_tokens", (q) => q.in("person_id", everyone));
    await del("notifications", "notifications", (q) => q.in("recipient_person", everyone));
  }
  for (const person of (people ?? []).filter((p) => !DEMO_PERSON_IDS.includes(p.id))) {
    if (dry) {
      tally("people", 1);
      console.log(`purge: would remove person "${person.full_name}" (${person.id})`);
      continue;
    }
    const { error } = await db.from("people").delete().eq("id", person.id);
    if (!error) {
      tally("people", 1);
      continue;
    }
    // Still referenced from a project this seed does not own (a real EPC's job
    // with a demo subcontractor). Disabled rather than failing the reset.
    const { error: disableError } = await db
      .from("people")
      .update({ disabled_at: new Date().toISOString() })
      .eq("id", person.id);
    if (disableError) throw new Error(`purge people: ${disableError.message}`);
    tally("people disabled", 1);
    console.warn(`purge: "${person.full_name}" is still referenced (${error.message}); disabled instead of removed.`);
  }

  return counts;
}
