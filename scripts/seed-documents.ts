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
import { renderPoPdf } from "@/lib/pdf/render-po";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const { data: orders, error } = await db
    .from("purchase_orders")
    .select("id, project_id, number, status, accepted_by_name, accepted_at")
    .in("status", ["sent", "accepted"]);

  if (error) throw new Error(`Could not read purchase orders: ${error.message}`);
  if (!orders || orders.length === 0) {
    console.log("seed-documents: no sent or accepted naročilnice to render");
    return;
  }

  for (const order of orders) {
    // The acceptance copy names who accepted and when; the version sent for
    // review carries neither, exactly as the live flow produces them.
    const acceptance =
      order.status === "accepted" && order.accepted_by_name && order.accepted_at
        ? {
            name: order.accepted_by_name,
            at: new Date(order.accepted_at).toLocaleDateString("sl-SI"),
          }
        : null;

    const { buffer, sha256 } = await renderPoPdf(db, order.project_id, order.id, acceptance);

    const path = `${order.project_id}/po/${order.id}.pdf`;

    // Removed before uploading, AND the removal is waited for. Supabase's
    // upsert reports success on an existing path while keeping the old bytes,
    // and the delete is eventually consistent, so uploading straight after it
    // races and silently keeps the previous file. Re-seeding then bound a hash
    // matching nothing, which is exactly the failure this script exists to
    // prevent. See docs/known-issues.md entry 2.
    await db.storage.from("reports").remove([path]);
    for (let attempt = 0; attempt < 10; attempt++) {
      const probe = await db.storage.from("reports").download(path);
      if (probe.error || !probe.data) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const { error: uploadError } = await db.storage
      .from("reports")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
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
