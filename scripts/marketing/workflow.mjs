/**
 * Builds the workflow document as ONE self-contained HTML file.
 *
 *     npm run marketing:workflow
 *
 * Source of truth is assets/marketing/source/workflow-sl.html, plain readable
 * HTML with {{IMG:key}} and {{FONT}} placeholders. This script fills them in.
 * Edit the source, re-run, never edit the built file.
 *
 * It has to open on a laptop with no internet and out of an email attachment,
 * so it carries its own font and its own pictures and loads nothing from
 * anywhere. That also means the pictures have to earn their bytes.
 *
 * THIS ONE DOES NOT GO TO public/p/, unlike the Salzburg deck. Everything in
 * public/p/ is served from the Vercel project the moment main moves, and this
 * file says "interni dokument za razvoj in ekipo" on its own first screen. It
 * also carries a real EPC's name and AVESOL's demo pricing on the documents it
 * photographs. It is an attachment, not a page. Move it only on purpose.
 *
 * WHAT IS REAL IN HERE, because the document is read by people who will build
 * from it and the distinction matters:
 *
 *   app       a screenshot of the running product
 *   teren     an AVESOL site photograph
 *   dokument  a page rasterized from real PDF bytes, including the grid
 *             operator's own vloga za soglasje, filled by scripts/marketing/vloga.mjs
 *   predlog   a document or screen DRAWN for this page. The module does not
 *             exist yet. Drawn in the app's own paper measurements so the shape
 *             is right, but nothing behind it is built.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(root, "assets", "marketing", "source", "workflow-sl.html");
const OUT = path.join(root, "assets", "marketing", "belin-workflow-sl.html");
const FONT = path.join(root, "public", "fonts", "InterVariable.ttf");

/**
 * key -> [file, rendered width in CSS pixels x 2 for retina, keep alpha, quality]
 *
 * Paths are relative to assets/marketing. The two plan import screens were
 * the founder's own captures in the gitignored screenshots/ folder; they are
 * copied to raw/ so this builder runs from a fresh clone.
 */
const IMAGES = {
  // --- real app screens ---
  "k2-upload": ["raw/k2-upload-prompt.png", 900, false, 80],
  "k2-result": ["raw/k2-upload-result.png", 900, false, 80],
  roster: ["raw/settings-roster.png", 1400, false, 80],
  "crew-phone": ["raw/crew-phone.png", 560, false, 80],
  hours: ["raw/hours-countdown.png", 1000, false, 80],

  // --- real documents, rasterized from real PDF bytes ---
  "doc-completion": ["docs/completion-cover.png", 760, false, 80],
  "doc-day": ["docs/completion-day.png", 700, false, 80],
  "doc-abnahme": ["docs/abnahme.png", 900, false, 82],
  // The grid operator's own form, filled with this project's data.
  "vloga-1": ["forms/vloga-soglasje-1.png", 900, false, 82],
  "vloga-2": ["forms/vloga-soglasje-2.png", 900, false, 82],

  // --- real AVESOL site photography ---
  "p-dach": ["site/dach-weit.jpg", 700, false, 72],
  "p-flug3": ["site/flug-3-fertig.jpg", 700, false, 72],
  "p-unterkonstruktion": ["site/unterkonstruktion.jpg", 700, false, 72],
  "p-dc": ["site/dc-verkabelung.jpg", 700, false, 72],
  "p-anlage": ["site/anlage-weit.jpg", 700, false, 72],
  "p-crew": ["site/crew-arbeit.jpg", 700, false, 72],
  "p-montage": ["site/crew-montage.jpg", 700, false, 72],
};

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function encode(file, width, alpha, quality) {
  const src = path.join(root, "assets", "marketing", file);
  // .rotate() applies the EXIF orientation. sharp does NOT do it on its own, and
  // half the site photographs are portrait-tagged, so leaving it out silently
  // turns them on their side.
  const img = sharp(src).rotate().resize({ width, withoutEnlargement: true });
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
    console.log(`  image  ${key.padEnd(22)} ${kb(bytes).padStart(8)}   ${file}`);
  }

  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) throw new Error(`Unfilled placeholders remain: ${[...new Set(left)].join(", ")}`);

  await fs.writeFile(OUT, html, "utf8");
  const out = await fs.stat(OUT);
  console.log(`\n  assets  ${kb(total)}`);
  console.log(`  written ${path.relative(root, OUT)}  ${kb(out.size)}\n`);
}

main().catch((err) => {
  console.error("\n  " + err.message + "\n");
  process.exit(1);
});
