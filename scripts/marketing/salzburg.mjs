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
 * key -> [file, rendered width in CSS pixels x 2 for retina, keep alpha]
 *
 * Widths are twice the largest size the element is ever rendered at, so the
 * shots stay sharp on a retina laptop without carrying pixels nobody sees.
 * The framed app shots keep their alpha channel: they are composed on
 * transparency with a soft shadow and sit directly on the dark page.
 */
const IMAGES = {
  "dash": ["framed-de/epc-dashboard.png", 1700, true],
  "hours": ["framed-de/hours-countdown.png", 1700, true],
  "portfolio": ["framed-de/portfolio.png", 1700, true],
  "phone": ["framed-de/crew-phone.png", 640, true],
  "phone-angle": ["mockups-de/phone-crew-left.png", 720, true],
  "doc-day": ["docs-de/completion-day.png", 1000, false],
  "doc-cover": ["docs-de/completion-cover.png", 1000, false],
  "m-abnahme": ["mockups-de/doc-abnahme-de.png", 820, true],
  "m-report": ["mockups-de/doc-report-de.png", 820, true],
  "m-invoice": ["mockups-de/doc-invoice-de.png", 820, true],
};

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function encode(file, width, alpha) {
  const src = path.join(root, "assets", "marketing", file);
  const img = sharp(src).resize({ width, withoutEnlargement: true });
  // Documents are white paper and gain nothing from an alpha channel; flattening
  // them onto white lets the encoder spend its bits on the type instead.
  const buf = await (alpha ? img : img.flatten({ background: "#ffffff" }))
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toBuffer();
  return { uri: "data:image/webp;base64," + buf.toString("base64"), bytes: buf.length };
}

async function main() {
  let html = await fs.readFile(SRC, "utf8");

  const font = await fs.readFile(FONT);
  html = html.replace("{{FONT}}", "data:font/ttf;base64," + font.toString("base64"));
  console.log(`  font   InterVariable.ttf        ${kb(font.length)}`);

  let total = font.length;
  for (const [key, [file, width, alpha]] of Object.entries(IMAGES)) {
    const token = `{{IMG:${key}}}`;
    if (!html.includes(token)) throw new Error(`${token} is not used in the source. Remove it or use it.`);
    const { uri, bytes } = await encode(file, width, alpha);
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
