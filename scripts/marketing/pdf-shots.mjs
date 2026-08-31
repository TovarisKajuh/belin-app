import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

// Photographs of the documents Belin actually produces.
//
// The landing page and the brochure show the completion report, the acceptance
// protocol, the invoice and the naročilnica. Those pictures are rendered from
// the real PDF bytes in storage rather than rebuilt as HTML, so what a prospect
// sees on the page is provably the document they will receive. It also means
// these images cannot drift from the product: change the template and re-run.

import { dir } from "./locale.mjs";

const OUT = dir("docs");
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROJECT = "33333333-3333-4333-8333-333333333333";

/** Every stored document worth photographing, with the page that carries its story. */
async function targets() {
  const found = [];

  const { data: po } = await db
    .from("purchase_orders")
    .select("pdf_path")
    .eq("project_id", PROJECT)
    .not("pdf_path", "is", null)
    .maybeSingle();
  if (po) found.push({ name: "narocilnica", path: po.pdf_path, page: 1 });

  const { data: report } = await db
    .from("generated_documents")
    .select("storage_path")
    .eq("project_id", PROJECT)
    .eq("kind", "completion_report")
    .neq("storage_path", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (report) {
    found.push({ name: "completion-cover", path: report.storage_path, page: 1 });
    // A day page is the proof of the daily loop: weather, quantities, photos.
    found.push({ name: "completion-day", path: report.storage_path, page: 3 });
  }

  const { data: acceptance } = await db
    .from("acceptances")
    .select("report_pdf_path")
    .eq("project_id", PROJECT)
    .not("report_pdf_path", "is", null)
    .maybeSingle();
  if (acceptance) found.push({ name: "abnahme", path: acceptance.report_pdf_path, page: 1 });

  const { data: invoice } = await db
    .from("invoices")
    .select("pdf_path")
    .eq("project_id", PROJECT)
    .not("pdf_path", "is", null)
    .maybeSingle();
  if (invoice) found.push({ name: "invoice", path: invoice.pdf_path, page: 1 });

  return found;
}

async function bytesOf(storagePath) {
  const { data: signed } = await db.storage.from("reports").createSignedUrl(storagePath, 120);
  // Cache-busted: Supabase's download path serves a cached copy that has bitten
  // this project before, returning the previous file for a freshly written one.
  const response = await fetch(`${signed.signedUrl}&cb=${Date.now()}`, { cache: "no-store" });
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  const shots = await targets();
  if (shots.length === 0) {
    console.error("No stored documents. Run the demo flow first.");
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1980 } });

  // pdfjs is served off disk so the viewer page can import it as a module.
  await context.route("**/pdfjs/**", (route) => {
    const file = route.request().url().split("/pdfjs/")[1];
    const onDisk = resolve("node_modules/pdfjs-dist/build", file);
    try {
      route.fulfill({ body: readFileSync(onDisk), contentType: "text/javascript" });
    } catch {
      route.abort();
    }
  });

  const page = await context.newPage();
  await page.goto(`file://${resolve("scripts/marketing/pdf-view.html")}`);

  for (const shot of shots) {
    const bytes = await bytesOf(shot.path);
    const info = await page.evaluate(
      ([data, pageNumber]) => window.renderPdfPage(data, pageNumber, 3),
      [Array.from(bytes), shot.page],
    );
    const canvas = page.locator("#page");
    writeFileSync(`${OUT}/${shot.name}.png`, await canvas.screenshot({ type: "png" }));
    console.log(`doc ${shot.name.padEnd(20)} page ${shot.page}/${info.pages}  ${info.width}x${info.height}`);
  }

  await browser.close();
  console.log(`\n${shots.length} document pages in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
