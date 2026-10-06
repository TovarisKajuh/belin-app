// Removes ONE throwaway organization and everything that hangs off it.
//
// Written for Gate 4 (demo-day plan 2026-10-06): every signup test creates a
// real organization in the one database that serves local, demo and
// production, and something has to take it out again without a hand-written
// DELETE on production. Dry run by default; --confirm deletes.
//
// It refuses, loudly, anything that could be somebody's real data:
//   - a demo organization (is_demo must be exactly false; a missing column
//     fails the read and therefore refuses too)
//   - anything older than 24 hours
//   - an organization whose people are not all plus-aliases of
//     FOUNDER_NOTIFY_EMAIL, unless --not-a-founder-alias is given. The age rule
//     alone does not protect a customer who signed up today.
//   - a subcontractor attached to another organization's project
//
// Usage: node --env-file=.env.local scripts/admin/delete-org.mjs <orgId> [--confirm] [--not-a-founder-alias]
import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGE_HOURS = 24;
const PROJECT_BUCKETS = ["photos", "signatures", "reports"];

const orgId = process.argv[2];
const confirm = process.argv.includes("--confirm");
const allowNonAlias = process.argv.includes("--not-a-founder-alias");

function refuse(message) {
  console.error(`REFUSING: ${message}`);
  process.exit(1);
}

if (!orgId || !UUID.test(orgId)) {
  refuse("usage: delete-org.mjs <orgId> [--confirm] [--not-a-founder-alias]");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) refuse("Supabase env vars missing. Run with node --env-file=.env.local");

const db = createClient(url, key, { auth: { persistSession: false } });

async function must(label, query) {
  const { data, error } = await query;
  if (error) refuse(`${label}: ${error.message}`);
  return data;
}

function isFounderAlias(email, founder) {
  if (!email || !founder) return false;
  const [fLocal, fDomain] = founder.toLowerCase().split("@");
  const [local, domain] = email.toLowerCase().split("@");
  if (!fLocal || !fDomain || !local || domain !== fDomain) return false;
  return local === fLocal || local.startsWith(`${fLocal}+`);
}

async function listAll(bucket, prefix) {
  const files = [];
  const folders = [prefix];
  while (folders.length) {
    const dir = folders.pop();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error) refuse(`list ${bucket}/${dir}: ${error.message}`);
      for (const entry of data ?? []) {
        const path = `${dir}/${entry.name}`;
        // Folders come back with a null id.
        if (entry.id === null) folders.push(path);
        else files.push(path);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return files;
}

const org = await must(
  "read organization",
  db.from("organizations").select("id, name, type, is_demo, created_at").eq("id", orgId).maybeSingle(),
);
if (!org) {
  console.log(`Nothing to do: organization ${orgId} does not exist.`);
  process.exit(0);
}
if (org.is_demo !== false) refuse(`"${org.name}" is a demo organization (is_demo = ${org.is_demo}).`);

const ageHours = (Date.now() - new Date(org.created_at).getTime()) / 3_600_000;
if (!(ageHours >= 0 && ageHours <= MAX_AGE_HOURS)) {
  refuse(`"${org.name}" was created ${ageHours.toFixed(1)} h ago; only organizations younger than ${MAX_AGE_HOURS} h are removed.`);
}

const people = await must("people", db.from("people").select("id, email").eq("org_id", orgId));
const founder = process.env.FOUNDER_NOTIFY_EMAIL?.trim() ?? "";
const strangers = people.filter((p) => !isFounderAlias(p.email, founder));
if (strangers.length && !allowNonAlias) {
  refuse(`"${org.name}" has people who are not aliases of FOUNDER_NOTIFY_EMAIL (${strangers.map((p) => p.email ?? "no email").join(", ")}). If you are certain this is not a customer, add --not-a-founder-alias.`);
}

const foreignProjects = await must(
  "projects as subcontractor",
  db.from("projects").select("name").eq("sub_org_id", orgId).neq("epc_org_id", orgId),
);
if (foreignProjects.length) {
  refuse(`"${org.name}" is the subcontractor on another organization's project: ${foreignProjects.map((p) => p.name).join(", ")}.`);
}

const personIds = people.map((p) => p.id);
const emails = people.map((p) => p.email).filter(Boolean).map((e) => e.toLowerCase());

if (personIds.length) {
  const foreignDocs = await must(
    "documents of people",
    db.from("documents").select("id").in("person_id", personIds).neq("org_id", orgId),
  );
  if (foreignDocs.length) refuse(`${foreignDocs.length} document(s) of these people belong to another organization.`);
}

const projects = await must("projects", db.from("projects").select("id, name, plan_pdf_path").eq("epc_org_id", orgId));
const projectIds = projects.map((p) => p.id);
const imports = projectIds.length
  ? await must("plan imports", db.from("plan_imports").select("storage_path").in("project_id", projectIds))
  : [];
// Uploads a test person abandoned on the review screen have no project. Once
// the person is deleted, created_by_person becomes null and nothing can tie
// the row or its PDF in plans/pending to this organization any more, so they
// go now, not at the 24 h sweep.
const abandoned = personIds.length
  ? await must("abandoned plan imports", db.from("plan_imports").select("id, storage_path").in("created_by_person", personIds).is("project_id", null))
  : [];

const objects = {
  plans: [...new Set([...projects.map((p) => p.plan_pdf_path), ...imports.map((i) => i.storage_path), ...abandoned.map((i) => i.storage_path)].filter(Boolean))],
  docs: await listAll("docs", orgId),
};
for (const bucket of PROJECT_BUCKETS) {
  objects[bucket] = (await Promise.all(projectIds.map((id) => listAll(bucket, id)))).flat();
}

console.log(`Organization: ${org.name} (${org.type}), created ${ageHours.toFixed(1)} h ago`);
console.log(`People: ${people.length} (${emails.join(", ") || "none"})`);
console.log(`Projects: ${projects.length} (${projects.map((p) => p.name).join(", ") || "none"})`);
for (const [bucket, paths] of Object.entries(objects)) console.log(`Storage ${bucket}: ${paths.length} object(s)`);

if (!confirm) {
  console.log("Dry run. Nothing was deleted. Re-run with --confirm.");
  process.exit(0);
}

// Files first: deleting the rows first would drop the only pointer to them.
for (const [bucket, paths] of Object.entries(objects)) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) refuse(`remove from ${bucket}: ${error.message}`);
  }
}

if (projectIds.length) {
  // invoices -> projects is ON DELETE RESTRICT; everything else cascades.
  await must("invoices", db.from("invoices").delete().in("project_id", projectIds));
  await must("projects", db.from("projects").delete().in("id", projectIds));
}
if (abandoned.length) {
  await must("abandoned plan imports", db.from("plan_imports").delete().in("id", abandoned.map((i) => i.id)));
}
await must("documents", db.from("documents").delete().eq("org_id", orgId));
await must("signups of the org", db.from("signups").delete().eq("org_id", orgId));
if (emails.length) {
  await must("signups by email", db.from("signups").delete().in("email", emails));
  await must("email log", db.from("email_log").delete().in("to_email", emails));
}
await must("people", db.from("people").delete().eq("org_id", orgId));
await must("organization", db.from("organizations").delete().eq("id", orgId));

const left = await must("check", db.from("organizations").select("id").eq("id", orgId));
if (left.length) refuse("the organization row is still there.");
console.log(`Deleted "${org.name}" and everything attached to it.`);
