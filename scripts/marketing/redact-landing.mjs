// Interim redaction for the public landing (Task 7.1, 2026-10-06).
//
// The landing published a private customer's name and home address (the K2
// review screenshot) and a real company plus AVESOL's rate (the three document
// pictures). This cuts those regions out until the fictional demo is reshot
// (Task 7.2a), and writes NEW file names so no cached copy of the old pictures
// can be served from the old URLs.
//
// Boxes were measured from the committed files on 2026-10-05 by scanning ink
// rows (luminance under 150 on the paper). Each box carries 5 to 6 px of
// padding. The text is 11 to 12 px tall and the mosaic cell is 8 px, so no
// glyph survives.
//
//   node scripts/marketing/redact-landing.mjs
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const DIR = "public/landing/";
const BLOCK = 8;

const DOCS = {
  "doc-invoice": [
    { left: 434, top: 206, width: 140, height: 33 }, // Prejemnik: company name and ID za DDV
    { left: 572, top: 341, width: 196, height: 82 }, // Cena na enoto and Skupaj, rows 1 to 3
    { left: 672, top: 450, width: 104, height: 22 }, // Za plačilo total
  ],
  "doc-abnahme": [{ left: 314, top: 184, width: 126, height: 19 }], // Naročnik
  "doc-report": [{ left: 323, top: 206, width: 126, height: 19 }], // Naročnik
};

async function mosaic(src, box) {
  const region = await sharp(src).extract(box).toBuffer();
  const w = Math.max(1, Math.round(box.width / BLOCK));
  const h = Math.max(1, Math.round(box.height / BLOCK));
  const small = await sharp(region).resize(w, h, { fit: "fill" }).toBuffer();
  return sharp(small).resize(box.width, box.height, { fit: "fill", kernel: "nearest" }).toBuffer();
}

for (const [name, boxes] of Object.entries(DOCS)) {
  const src = readFileSync(`${DIR}${name}.webp`);
  const layers = [];
  for (const box of boxes) layers.push({ input: await mosaic(src, box), left: box.left, top: box.top });
  const out = await sharp(src).composite(layers).webp({ quality: 84, alphaQuality: 92 }).toBuffer();
  writeFileSync(`${DIR}${name}-r1.webp`, out);
  console.log(`redacted ${name}-r1.webp (${boxes.length} boxes)`);
}

// The K2 review: rows y 231 to 420 hold Naziv projekta, Ulica, Poštna
// številka, Kraj, and Država "SI" for a Vienna address (the bug fixed on
// 2026-08-13). Remove those rows and join the header band (y 0 to 221) to the
// rest (y 430 on). Both seams sit on flat navy, so the join is invisible.
{
  const src = readFileSync(`${DIR}wizard-review.webp`);
  const top = await sharp(src).extract({ left: 0, top: 0, width: 1500, height: 222 }).toBuffer();
  const rest = await sharp(src).extract({ left: 0, top: 430, width: 1500, height: 924 }).toBuffer();
  const out = await sharp({ create: { width: 1500, height: 1146, channels: 3, background: "#0b1524" } })
    .composite([
      { input: top, left: 0, top: 0 },
      { input: rest, left: 0, top: 222 },
    ])
    .webp({ quality: 84 })
    .toBuffer();
  writeFileSync(`${DIR}wizard-review-r1.webp`, out);
  console.log("cut wizard-review-r1.webp to 1500x1146");
}
