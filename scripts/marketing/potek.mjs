/**
 * Builds the Slovenian workflow presentation ("potek dela") as ONE
 * self-contained HTML file.
 *
 * It walks an EPC through the whole of Belin, from the K2 plan PDF that becomes
 * a project to the signed Zapisnik o prevzemu and the invoice. Pictures first,
 * text last: one or two pictures, a headline and at most one sentence a slide.
 *
 * Same mechanics as scripts/marketing/salzburg.mjs: the source of truth is
 * assets/marketing/source/potek-sl.html with {{IMG:key}} and {{FONT}}
 * placeholders, this script inlines the Inter font and every picture as WebP,
 * and it refuses to write a file with an unfilled placeholder or an image key
 * the source does not use. Edit the source, re-run, never edit the built file.
 *
 *     npm run marketing:potek
 *
 * The output is written to assets/marketing/belin-potek-sl.html and is NOT
 * published under public/: the generated documents it shows carry the demo
 * EPC's name and the demo prices (DECISIONS.md 2026-09-16, internal documents
 * stay out of public/p/ by construction).
 *
 * The pictures in assets/marketing/potek/ are crops of real captures, nothing
 * is drawn by hand. Most were shot on production (getbelin.com) on 2026-10-06
 * through the Demo Door with the belin-shot cookie set, so no demo chrome
 * shows; the documents are pages rasterized from the PDF bytes that run
 * produced. Two come from the earlier marketing pipeline (assets/marketing/raw/):
 * the K2 upload pair, cropped so the plan's customer name and address are out
 * of frame, and the crew join screen.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(root, "assets", "marketing", "source", "potek-sl.html");
const OUT = path.join(root, "assets", "marketing", "belin-potek-sl.html");
const FONT = path.join(root, "public", "fonts", "InterVariable.ttf");

/**
 * key -> [file under assets/marketing/, width in pixels, keep alpha, quality]
 *
 * Widths are about twice the largest size the picture is rendered at on a
 * 1440 wide laptop, so they stay sharp on a retina screen without carrying
 * pixels nobody sees. Documents are flattened onto white.
 */
const IMAGES = {
  // Real AVESOL site photography (masters in assets/marketing/site/).
  "crew-arbeit": ["site/crew-arbeit.jpg", 2000, false, 72],
  "crew-montage": ["site/crew-montage.jpg", 2000, false, 72],
  "crew-panel": ["site/crew-panel.jpg", 1100, false, 76],

  // Real app screens.
  "k2-prompt": ["potek/k2-prompt.webp", 900, false, 80],
  "k2-result": ["potek/k2-result.webp", 1500, false, 80],
  "po-screen": ["potek/po-screen.webp", 1700, false, 80],
  "join": ["potek/join.webp", 760, false, 82],
  "material": ["potek/material.webp", 760, false, 82],
  "epc-material": ["potek/epc-material.webp", 1000, false, 82],
  "report": ["potek/report.webp", 700, false, 82],
  "dash": ["potek/dash.webp", 1600, false, 80],
  "incident": ["potek/incident.webp", 760, false, 82],
  "hours": ["potek/hours.webp", 1320, false, 80],
  "co": ["potek/co.webp", 1480, false, 80],
  "who-epc": ["potek/who-epc.webp", 1200, false, 80],
  "who-sub": ["potek/who-sub.webp", 1200, false, 80],
  "handover": ["potek/handover.webp", 2000, false, 80],
  "sign": ["potek/sign.webp", 1500, false, 80],
  "portfolio": ["potek/portfolio.webp", 1900, false, 80],

  // Pages rasterized from the real PDF bytes.
  "po-doc": ["potek/po-doc.webp", 900, false, 82],
  "hours-doc": ["potek/hours-doc.webp", 900, false, 82],
  "co-doc": ["potek/co-doc.webp", 900, false, 82],
  "report-cover": ["potek/report-cover.webp", 900, false, 82],
  "report-day": ["potek/report-day.webp", 900, false, 82],
  "sign-doc": ["potek/sign-doc.webp", 900, false, 82],
  "invoice-doc": ["potek/invoice-doc.webp", 1100, false, 82],
};

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function encode(file, width, alpha, quality) {
  const src = path.join(root, "assets", "marketing", file);
  const img = sharp(src).resize({ width, withoutEnlargement: true });
  const buf = await (alpha ? img : img.flatten({ background: "#ffffff" }))
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toBuffer();
  return { uri: "data:image/webp;base64," + buf.toString("base64"), bytes: buf.length };
}

async function main() {
  let html = await fs.readFile(SRC, "utf8");

  const font = await fs.readFile(FONT);
  html = html.replace("{{FONT}}", "data:font/ttf;base64," + font.toString("base64"));
  console.log(`  font   InterVariable.ttf        ${kb(font.length)}`);

  let total = font.length;
  for (const [key, [file, width, alpha, quality]] of Object.entries(IMAGES)) {
    const token = `{{IMG:${key}}}`;
    if (!html.includes(token)) throw new Error(`${token} is not used in the source. Remove it or use it.`);
    const { uri, bytes } = await encode(file, width, alpha, quality);
    html = html.split(token).join(uri);
    total += bytes;
    console.log(`  image  ${key.padEnd(24)} ${kb(bytes)}   ${file}`);
  }

  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) throw new Error(`Unfilled placeholders remain: ${[...new Set(left)].join(", ")}`);

  // The house rule: no em or en dashes in anything produced.
  const dash = html.match(new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]"));
  if (dash) throw new Error("An em or en dash is in the source. Use a comma, colon or period.");

  await fs.writeFile(OUT, html, "utf8");
  const out = await fs.stat(OUT);
  console.log(`\n  assets  ${kb(total)}`);
  console.log(`  written ${path.relative(root, OUT)}  ${kb(out.size)}\n`);
}

main().catch((err) => {
  console.error("\n  " + err.message + "\n");
  process.exit(1);
});
