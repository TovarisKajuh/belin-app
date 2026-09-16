/**
 * Builds the Salzburg presentation as ONE self-contained HTML file.
 *
 * The founder sends this to a prospect. It has to open on a laptop with no
 * internet, on a phone in a car park, and out of an email attachment, so it
 * carries its own font and its own pictures and loads nothing from anywhere.
 *
 * Source of truth is assets/marketing/source/salzburg-de.html, which is plain
 * readable HTML with {{IMG:key}} and {{FONT}} placeholders. This script fills
 * them in. Edit the source, re-run, never edit the built file.
 *
 *     npm run marketing:salzburg
 *
 * Every screenshot is a real app screen shot by the marketing pipeline, and
 * every document picture is rasterized from real PDF bytes. Nothing here is
 * drawn by hand, which is the point: the picture cannot drift from the product.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(root, "assets", "marketing", "source", "salzburg-de.html");
const OUT = path.join(root, "assets", "marketing", "belin-salzburg-de.html");
const FONT = path.join(root, "public", "fonts", "InterVariable.ttf");

/**
 * key -> [file, rendered width in CSS pixels x 2 for retina, keep alpha, quality]
 *
 * Widths are twice the largest size the element is ever rendered at, so the
 * shots stay sharp on a retina laptop without carrying pixels nobody sees.
 * The framed app shots keep their alpha channel: they are composed on
 * transparency with a soft shadow and sit directly on the dark page.
 */
const IMAGES = {
  // Real AVESOL site photography. These are the masters, committed because they
  // exist nowhere else in this repo. Photographs of gravel, grass and module
  // grids are the most expensive thing in the file, so they carry their own
  // quality: the deck has to stay small enough to send as an attachment.
  "anlage-weit": ["site/anlage-weit.jpg", 1800, false, 74],
  "montage-module": ["site/montage-module.jpg", 900, false, 72],
  "unterkonstruktion": ["site/unterkonstruktion.jpg", 900, false, 72],
  "dach-weit": ["site/dach-weit.jpg", 640, false, 72],
  "dc-verkabelung": ["site/dc-verkabelung.jpg", 640, false, 72],
  "flug-1-unterkonstruktion": ["site/flug-1-unterkonstruktion.jpg", 900, false, 74],
  "flug-2-halbzeit": ["site/flug-2-halbzeit.jpg", 900, false, 74],
  "flug-3-fertig": ["site/flug-3-fertig.jpg", 900, false, 74],

  // Real app screens, from the German marketing pipeline. The framed ones keep
  // their alpha: they carry their own shadow and sit on the dark page.
  "s-dash": ["framed-de/epc-dashboard.png", 1700, true, 82],
  "s-hours": ["framed-de/hours-countdown.png", 1500, true, 82],
  "s-portfolio": ["framed-de/portfolio.png", 1700, true, 82],
  "s-phone": ["raw-de/crew-phone.png", 700, false, 82],
  "s-dash-crop": ["raw-de/epc-dashboard.png", 900, false, 82],
  "s-docs": ["docs-de/completion-cover.png", 800, false, 82],

  // Documents rasterized from the real PDF bytes, tilted and faded.
  "m-abnahme": ["mockups-de/doc-abnahme-de.png", 820, true, 82],
  "m-report": ["mockups-de/doc-report-de.png", 820, true, 82],
  "m-invoice": ["mockups-de/doc-invoice-de.png", 820, true, 82],
};

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function encode(file, width, alpha, quality) {
  const src = path.join(root, "assets", "marketing", file);
  const img = sharp(src).resize({ width, withoutEnlargement: true });
  // Documents are white paper and gain nothing from an alpha channel; flattening
  // them onto white lets the encoder spend its bits on the type instead.
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

  await fs.writeFile(OUT, html, "utf8");
  const out = await fs.stat(OUT);
  console.log(`\n  assets  ${kb(total)}`);
  console.log(`  written ${path.relative(root, OUT)}  ${kb(out.size)}\n`);
}

main().catch((err) => {
  console.error("\n  " + err.message + "\n");
  process.exit(1);
});
