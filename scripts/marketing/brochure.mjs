import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import React from "react";
import { BrochureDocument } from "../../lib/pdf/brochure.tsx";
import { renderDocument } from "../../lib/pdf/theme.tsx";
import { COPY } from "../../lib/pdf/brochure-copy.ts";
import { LOCALE, dir, named } from "./locale.mjs";

// Renders the sales brochure, then photographs every page so it can be LOOKED
// AT rather than assumed correct.
//
// The image compositions live here rather than in the document because they are
// picture work, not layout work: sharp knows how to overlap a phone onto a
// laptop, @react-pdf does not. Each one is flattened onto the brochure's exact
// page colour instead of being left transparent, which sidesteps every question
// about how a PDF viewer handles alpha in an embedded PNG. The colour matches,
// so the seam is invisible.

const OUT = "assets/marketing";
const SHOTS = `assets/marketing/brochure-pages${LOCALE === "sl" ? "" : `-${LOCALE}`}`;
const BG = { r: 10, g: 18, b: 30 }; // D.bg, #0a121e

// JPEG, not PNG. These are photographic compositions with no transparency left
// after flattening, and the brochure is an email attachment: the PNG version of
// this document came out at 4.9 MB, which is the kind of attachment people do
// not open. Quality 82 at print resolution lands the whole thing near 1 MB.
const flat = (pipeline) => pipeline.flatten({ background: BG }).jpeg({ quality: 82, mozjpeg: true });

/**
 * The cover: the laptop with the phone standing in front of its left corner.
 *
 * Slovenian uses the founder's own photoreal device renders in assets/marketing
 * /hero, which are the best pictures this project has. They cannot be reused for
 * another language, because the app screenshot is baked into the render: a
 * German cover built from them would show a Slovenian dashboard, which is the
 * exact failure this whole locale-aware pipeline exists to prevent. So every
 * other language composes its cover from that language's generated device
 * mockups instead. Slightly less photoreal, entirely correct.
 */
async function heroImage() {
  const W = 1500;
  const hasOwnRenders = existsSync(`${dir("hero")}/laptop.png`);
  const laptopSrc = hasOwnRenders ? `${dir("hero")}/laptop.png` : `${dir("mockups")}/laptop-dashboard-left.png`;
  const phoneSrc = hasOwnRenders ? `${dir("hero")}/phone.png` : `${dir("mockups")}/phone-crew-left.png`;
  const laptop = await sharp(laptopSrc)
    .trim({ threshold: 1 })
    .resize({ width: Math.round(W * 0.78) })
    .toBuffer();
  const phone = await sharp(phoneSrc)
    .trim({ threshold: 1 })
    .resize({ width: Math.round(W * (hasOwnRenders ? 0.3 : 0.26)) })
    .toBuffer();
  const lm = await sharp(laptop).metadata();
  const pm = await sharp(phone).metadata();
  const H = Math.round(lm.height * 1.06);

  return sharp({
    create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } },
  })
    .composite([
      { input: laptop, left: W - lm.width, top: 0 },
      { input: phone, left: 0, top: H - pm.height },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** One framed screenshot, sized and set on the page colour. */
async function framed(name, width = 1400) {
  return flat(
    sharp(`${dir("framed")}/${name}.png`).trim({ threshold: 1 }).resize({ width }),
  ).toBuffer();
}

/**
 * Two angled phones: the reporting screen and the join screen.
 *
 * The first version put the framed join SCREENSHOT beside the phone MOCKUP, and
 * it read as a flat rectangle floating next to a real device. Two devices of the
 * same family is the version that looks composed rather than assembled.
 */
async function crewImage() {
  const W = 1400;
  const phone = await sharp(`${dir("mockups")}/phone-crew-left.png`)
    .trim({ threshold: 1 })
    .resize({ height: 900 })
    .toBuffer();
  const join = await sharp(`${dir("mockups")}/phone-join-right.png`)
    .trim({ threshold: 1 })
    .resize({ height: 820 })
    .toBuffer();
  const pm = await sharp(phone).metadata();
  const jm = await sharp(join).metadata();
  const H = 940;

  return sharp({
    create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } },
  })
    .composite([
      { input: phone, left: 80, top: H - pm.height },
      { input: join, left: W - jm.width - 60, top: H - jm.height },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** The three closing documents, fanned, on the page colour. */
async function documentsImage() {
  const W = 1400;
  const RAISE = 44; // how high the middle sheet rides
  const parts = [];
  const names = [named("doc-report"), named("doc-abnahme"), named("doc-invoice")];
  for (const [i, name] of names.entries()) {
    const width = i === 1 ? Math.round(W * 0.44) : Math.round(W * 0.4);
    parts.push(await sharp(`${dir("mockups")}/${name}.png`).resize({ width }).toBuffer());
  }
  const meta = await Promise.all(parts.map((b) => sharp(b).metadata()));
  // Height computed from the sheets rather than fixed. A fixed canvas left a
  // third of the picture as empty sky, which the page then had to carry.
  const H = Math.max(...meta.map((m) => m.height)) + RAISE;
  // Same overlap arithmetic as the landing page: the three widths minus two
  // overlaps total the canvas, and the middle sheet sits on top and rides high.
  const overlap = Math.round(W * 0.09);
  let x = 0;
  const layers = [];
  for (const [i, buffer] of parts.entries()) {
    const top = i === 1 ? H - meta[i].height - RAISE : H - meta[i].height;
    layers.push({ input: buffer, left: x, top: Math.max(0, top) });
    x += meta[i].width - overlap;
  }
  // Middle sheet last so it lands on top of its neighbours.
  const ordered = [layers[0], layers[2], layers[1]];

  return sharp({
    create: { width: x + overlap, height: H, channels: 4, background: { ...BG, alpha: 1 } },
  })
    .composite(ordered)
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });

  console.log("composing images ...");
  const img = {
    hero: await heroImage(),
    dashboard: await framed("epc-dashboard"),
    crewPhone: await crewImage(),
    hours: await framed("hours-countdown"),
    documents: await documentsImage(),
  };
  for (const [key, buffer] of Object.entries(img)) {
    const m = await sharp(buffer).metadata();
    console.log(`  ${key.padEnd(11)} ${m.width}x${m.height}  ${(buffer.length / 1024).toFixed(0)} KB`);
  }

  console.log("rendering pdf ...");
  const copy = COPY[LOCALE];
  if (!copy) {
    console.error(`No brochure copy for locale "${LOCALE}". Add it to lib/pdf/brochure-copy.ts.`);
    process.exit(1);
  }
  const pdf = await renderDocument(React.createElement(BrochureDocument, { img, copy }));
  const file = `${OUT}/${LOCALE === "de" ? "belin-vorstellung-de" : `belin-predstavitev-${LOCALE}`}.pdf`;
  writeFileSync(file, pdf);
  console.log(`  ${file}  ${(pdf.length / 1024 / 1024).toFixed(2)} MB`);

  // Photograph every page. A brochure that has not been looked at is a brochure
  // that is wrong, and the only way to look at a PDF here is to rasterize it.
  console.log("photographing pages ...");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1900 } });
  // pdfjs is served off disk so the viewer page can import it as a module,
  // exactly as pdf-shots.mjs does. Without this the file:// page cannot resolve
  // /pdfjs/ and every render fails.
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
  const data = [...pdf];
  const first = await page.evaluate(
    ([bytes]) => window.renderPdfPage(bytes, 1, 2),
    [data],
  );

  // The brochure is SEVEN pages. Any other number means a page overflowed, which
  // is how the German cover silently became two pages: the longer title pushed
  // the hero and the footer onto a sheet of their own, and nothing complained.
  // A page count is the cheapest possible assertion about a PDF, so it is made
  // before anything is looked at.
  const EXPECTED = 7;
  if (first.pages !== EXPECTED) {
    console.error(
      `
LAYOUT OVERFLOW: the brochure rendered ${first.pages} pages, expected ${EXPECTED}.`,
    );
    console.error("Some page's content is taller than A4. Photographing anyway so it can be seen.");
  }

  for (let n = 1; n <= first.pages; n++) {
    await page.evaluate(
      ([bytes, pageNumber]) => window.renderPdfPage(bytes, pageNumber, 2),
      [data, n],
    );
    writeFileSync(`${SHOTS}/page-${n}.png`, await page.locator("#page").screenshot({ type: "png" }));
    console.log(`  page ${n}`);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
