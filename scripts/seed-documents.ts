// The second half of the demo seed: the DOCUMENTS.
//
// scripts/seed-demo.mjs writes the naročilnica rows. This renders them through
// the SAME code the application uses, stores the PDFs where the app stores
// them, and writes back the real path and the real sha256 of those exact bytes.
//
// That is not tidiness. A purchase order with status sent and no stored file
// cannot be opened, and acceptance re-hashes the stored PDF before binding, so
// a staged acceptance with a null hash would refuse on stage, in front of the
// prospect, at the exact moment the demo is making its point. Staging rows the
// app could not have produced is how a demo breaks; this makes them rows it
// could.
//
// Run through `npm run seed`, which fails loudly if this step fails.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderPoPdf } from "@/lib/pdf/render-po";
import { DEMO_PO_CURRENT, DEMO_PO_START, DEMO_SUB_ORG } from "@/lib/demo/ids";
import { SampleVaultDocument } from "@/lib/pdf/sample-vault";
import { renderDocument } from "@/lib/pdf/theme";

const DRY = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const slDate = (iso: string) =>
  new Intl.DateTimeFormat("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00Z`),
  );

// The three sample certificates of the demo subcontractor, keyed by vault type.
const VAULT_COPY: Record<string, { heading: string; rows: (until: string) => { label: string; value: string }[] }> = {
  a1: {
    heading: "Potrdilo A1",
    rows: (until) => [
      { label: "Imetnik", value: "Luka Zupan" },
      { label: "Delodajalec", value: "AVESOL d.o.o." },
      { label: "Namen", value: "Potrdilo o zakonodaji socialne varnosti, ki velja za imetnika" },
      { label: "Velja do", value: until },
    ],
  },
  // The amber one (LF19): a certificate a Slovenian EPC asks for, not a German tax exemption.
  qualification: {
    heading: "Potrdilo o usposobljenosti za varno delo na višini",
    rows: (until) => [
      { label: "Imetnik", value: "Luka Zupan" },
      { label: "Delodajalec", value: "AVESOL d.o.o." },
      { label: "Namen", value: "Usposabljanje za varno delo na višini in na strehi" },
      { label: "Velja do", value: until },
    ],
  },
  insurance: {
    heading: "Zavarovanje poklicne odgovornosti",
    rows: (until) => [
      { label: "Zavarovanec", value: "AVESOL d.o.o." },
      { label: "Zavarovalna vsota", value: "1.000.000,00 EUR" },
      { label: "Velja do", value: until },
    ],
  },
};

async function renderVault(dry: boolean): Promise<void> {
  if (dry) {
    const dir = path.join(os.tmpdir(), "belin-seed-dry");
    mkdirSync(dir, { recursive: true });
    for (const [type, copy] of Object.entries(VAULT_COPY)) {
      const buffer = await renderDocument(SampleVaultDocument({ heading: copy.heading, rows: copy.rows(slDate(new Date().toISOString())) }));
      writeFileSync(path.join(dir, `vault-${type}.pdf`), buffer);
    }
    console.log(`seed-documents: dry vault PDFs written to ${dir}`);
    return;
  }
  const { data: docs, error } = await db
    .from("documents")
    .select("type, valid_until, storage_path")
    .eq("org_id", DEMO_SUB_ORG)
    .like("storage_path", `${DEMO_SUB_ORG}/vault/seed-%`);
  if (error) throw new Error(`Could not read the vault rows: ${error.message}`);
  for (const doc of docs ?? []) {
    const copy = VAULT_COPY[doc.type];
    if (!copy) throw new Error(`No sample copy for vault type ${doc.type}`);
    const buffer = await renderDocument(
      SampleVaultDocument({ heading: copy.heading, rows: copy.rows(doc.valid_until ? slDate(doc.valid_until) : "brez roka") }),
    );
    // A fresh path every run (seed-demo wrote it), so upsert stays off.
    const { error: uploadError } = await db.storage
      .from("docs")
      .upload(doc.storage_path, buffer, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`Could not store ${doc.storage_path}: ${uploadError.message}`);
    console.log(`seed-documents: vault ${doc.type} stored, ${buffer.length} bytes`);
  }
}

async function main(): Promise<void> {
  await renderVault(DRY);
  if (DRY) return;
  // ONLY the two demo naročilnice. This used to select every sent or accepted
  // order in the database, which in a shared database would one day re-render
  // and re-hash a real customer's accepted, legally bound document.
  const { data: orders, error } = await db
    .from("purchase_orders")
    .select("id, project_id, number, status, accepted_by_name, accepted_at")
    .in("id", [DEMO_PO_CURRENT, DEMO_PO_START])
    .in("status", ["sent", "accepted"]);

  if (error) throw new Error(`Could not read purchase orders: ${error.message}`);
  if (!orders || orders.length === 0) {
    console.log("seed-documents: no sent or accepted naročilnice to render");
    return;
  }

  for (const order of orders) {
    // The acceptance copy names who accepted and when; the version sent for
    // review carries neither, exactly as the live flow produces them.
    const { data: project } = await db.from("projects").select("language").eq("id", order.project_id).maybeSingle();
    const language = project?.language === "de" || project?.language === "en" ? project.language : "sl";
    const acceptance =
      order.status === "accepted" && order.accepted_by_name && order.accepted_at
        ? {
            name: order.accepted_by_name,
            // Same shape as render-po's issue date (2-digit day and month, the
            // project's language). Task 3.7 may move both onto one shared helper.
            at: new Intl.DateTimeFormat(language === "en" ? "en-GB" : language, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "Europe/Ljubljana",
            }).format(new Date(order.accepted_at)),
          }
        : null;

    const { buffer, sha256 } = await renderPoPdf(db, order.project_id, order.id, acceptance);

    // A NEW path on every run: the purge removed the old file, and Storage upsert
    // on an existing path keeps the old bytes (docs/known-issues.md entry 2).
    const path = `${order.project_id}/po/${order.id}-seed-${Date.now().toString(36)}.pdf`;

    const { error: uploadError } = await db.storage
      .from("reports")
      .upload(path, buffer, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`Could not store ${path}: ${uploadError.message}`);

    // The hash is taken over the bytes that were actually stored, which is the
    // only hash worth having: it is what acceptPo re-computes and compares.
    //
    // READ THROUGH A CACHE-BUSTED SIGNED URL, never through the SDK's
    // download(). That helper serves a CACHED copy: verified directly, a
    // download() right after replacing an object returned the previous file
    // while a signed URL returned the new one. Verifying through the cache
    // meant this script kept failing on a document that had in fact been
    // written correctly.
    const { data: signed, error: signError } = await db.storage
      .from("reports")
      .createSignedUrl(path, 60);
    if (signError || !signed) throw new Error(`Could not read back ${path}`);

    const response = await fetch(`${signed.signedUrl}&cb=${randomUUID()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Could not read back ${path}`);
    const readBack = Buffer.from(await response.arrayBuffer());
    const storedHash = createHash("sha256").update(readBack).digest("hex");

    if (storedHash !== sha256) {
      throw new Error(`Stored bytes for ${path} do not match the rendered bytes`);
    }

    const { error: updateError } = await db
      .from("purchase_orders")
      .update({ pdf_path: path, pdf_sha256: storedHash })
      .eq("id", order.id);
    if (updateError) throw new Error(`Could not bind the document: ${updateError.message}`);

    console.log(
      `seed-documents: naročilnica ${order.number} (${order.status}) rendered, ${readBack.length} bytes, hash ${storedHash.slice(0, 12)}`,
    );
  }
}

main().catch((err) => {
  console.error(`seed-documents FAILED: ${err instanceof Error ? err.message : String(err)}`);
  console.error("The demo would break on the first click. Fix this before showing it.");
  process.exit(1);
});
