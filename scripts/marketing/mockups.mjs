import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

// Angled device mockups, and background removal, without a design tool.
//
// TWO tricks, both using what is already here:
//
// 1. PERSPECTIVE. Sharp cannot warp an image in perspective, but a browser can:
//    CSS `transform: perspective() rotateY() rotateX()` on an <img>, screenshot
//    with `omitBackground`, and out comes a genuinely angled device on
//    transparency. Same engine that renders the app, so the pixels are sharp
//    rather than resampled twice.
//
// 2. BACKGROUND REMOVAL. Anything that arrives on a flat neutral background,
//    a mockup exported without alpha, a stock render, a screenshot with white
//    margins, gets that background turned to alpha by flood filling from the
//    edges. Flood fill rather than "delete every light pixel", because the app
//    itself has white text and pale panels: a global threshold would eat the
//    artwork. Only background CONNECTED to the border goes.

import { dir, named } from "./locale.mjs";

const OUT = dir("mockups");

/** Devices, each a viewport shape and a frame treatment. */
const DEVICES = {
  laptop: { screenW: 1600, screenH: 1000, bezel: 18, radius: 12, chin: 58, body: "#1b1e24" },
  phone: { screenW: 390, screenH: 844, bezel: 12, radius: 46, chin: 0, body: "#15171c" },
};

/**
 * Builds the HTML for one angled device.
 *
 * The device is a rounded body with the screenshot inset, then the whole thing
 * is rotated in 3D and given a ground shadow. All of it is one element tree, so
 * the shadow follows the rotation instead of sitting flat behind it.
 */
function deviceHtml(dataUri, device, { rotateY, rotateX, rotateZ, scale }) {
  const d = DEVICES[device];
  const bodyW = d.screenW + d.bezel * 2;
  const bodyH = d.screenH + d.bezel * 2 + d.chin;

  return `<!doctype html>
<style>
  html, body { margin: 0; background: transparent; }
  .stage {
    width: ${Math.round(bodyW * 1.55)}px;
    height: ${Math.round(bodyH * 1.55)}px;
    display: flex; align-items: center; justify-content: center;
    perspective: ${Math.round(bodyW * 2.6)}px;
  }
  .device {
    width: ${bodyW}px; height: ${bodyH}px;
    background: ${d.body};
    border-radius: ${d.radius + d.bezel}px;
    padding: ${d.bezel}px;
    box-sizing: border-box;
    transform: rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale});
    transform-style: preserve-3d;
    box-shadow:
      0 2px 0 rgba(255,255,255,.06) inset,
      60px 70px 90px rgba(0,0,0,.45),
      10px 14px 28px rgba(0,0,0,.35);
  }
  .screen {
    width: ${d.screenW}px; height: ${d.screenH}px;
    border-radius: ${d.radius}px;
    overflow: hidden; display: block;
    background: #0d1420;
  }
  .screen img { width: 100%; height: 100%; display: block; object-fit: cover; }
</style>
<div class="stage"><div class="device"><div class="screen"><img src="${dataUri}"></div></div></div>`;
}

/** How much of an A4 page survives the crop. Measured, not chosen by eye: the
 *  acceptance protocol's signatures sit at 58 percent of page height and the
 *  invoice's reverse-charge clause at 48 percent, so 65 percent keeps the proof
 *  in every one of the three while cutting the empty half no document fills. */
const PAPER_KEEP = 0.65;

/**
 * Builds the HTML for one angled SHEET OF PAPER.
 *
 * Same trick as the devices, three differences. The sheet is white rather than a
 * dark body, so it needs no bezel. It fades out at the bottom instead of ending
 * on a hard edge, because a cropped page with a straight cut reads as a mistake
 * while a fade reads as a page continuing past the frame. And the shadow is a
 * `drop-shadow` FILTER on the wrapper rather than a `box-shadow` on the sheet,
 * because box-shadow draws the box, ignoring the fade, and would print a hard
 * rectangle under the very edge the fade exists to soften.
 */
function paperHtml(dataUri, width, height, { rotateY, rotateZ, rotateX = 3, scale = 1 }) {
  return `<!doctype html>
<style>
  html, body { margin: 0; background: transparent; }
  .stage {
    width: ${Math.round(width * 1.9)}px;
    height: ${Math.round(height * 1.5)}px;
    display: flex; align-items: center; justify-content: center;
  }
  .shade { filter: drop-shadow(26px 34px 44px rgba(0,0,0,.55)) drop-shadow(4px 8px 12px rgba(0,0,0,.35)); }
  .tilt {
    transform: perspective(1600px)
      rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale});
  }
  .sheet {
    width: ${width}px; height: ${height}px; background: #fff;
    border-radius: 3px; overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 0 80%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0 80%, transparent 100%);
  }
  .sheet img { width: 100%; height: auto; display: block; }
</style>
<div class="stage"><div class="shade"><div class="tilt"><div class="sheet">
  <img src="${dataUri}">
</div></div></div></div>`;
}

async function renderPaper(browser, sourcePng, angle, name, width = 900) {
  const meta = await sharp(sourcePng).metadata();
  // Cropped BEFORE the capture, so the fade is applied to the sheet that will
  // actually be shown rather than to a full page scaled down inside it.
  const cropped = await sharp(sourcePng)
    .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * PAPER_KEEP) })
    .png()
    .toBuffer();

  const height = Math.round((width * Math.round(meta.height * PAPER_KEEP)) / meta.width);
  const dataUri = `data:image/png;base64,${cropped.toString("base64")}`;

  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(paperHtml(dataUri, width, height, angle));
  const buffer = await page.locator(".stage").screenshot({ type: "png", omitBackground: true });
  const trimmed = await sharp(buffer).trim({ threshold: 1 }).png().toBuffer();
  writeFileSync(`${OUT}/${name}.png`, trimmed);

  // The serving copy, straight away rather than in a second script: a master
  // with no WebP beside it is an asset the page cannot use, and the two drifting
  // apart is how a landing page ends up showing last week's document.
  mkdirSync("public/landing", { recursive: true });
  const web = await sharp(trimmed)
    .resize({ width: 920, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 92, effort: 6 })
    .toFile(`public/landing/${name}.webp`);

  const out = await sharp(trimmed).metadata();
  console.log(
    `paper  ${name.padEnd(24)} ${out.width}x${out.height} -> ${web.width}x${web.height} ${(web.size / 1024).toFixed(0)} KB`,
  );
  await page.close();
}

async function renderMockup(browser, sourcePng, device, angle, name) {
  const dataUri = `data:image/png;base64,${readFileSync(sourcePng).toString("base64")}`;
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(deviceHtml(dataUri, device, angle));
  const stage = page.locator(".stage");
  // omitBackground is what keeps the transparency: the founder's own mockups
  // arrive that way and drop onto any ground, so ours must too.
  const buffer = await stage.screenshot({ type: "png", omitBackground: true });
  const trimmed = await sharp(buffer).trim({ threshold: 1 }).png().toBuffer();
  writeFileSync(`${OUT}/${name}.png`, trimmed);
  const meta = await sharp(trimmed).metadata();
  console.log(`mockup ${name.padEnd(24)} ${meta.width}x${meta.height}`);
  await page.close();
}

/**
 * Turns a flat neutral background into transparency.
 *
 * Flood fills inward from every edge pixel, taking anything within `tolerance`
 * of the corner colour. Connected only: a white card in the MIDDLE of the
 * artwork survives, which a naive threshold would delete.
 */
export async function removeBackground(inputPath, outputPath, { tolerance = 26 } = {}) {
  const image = sharp(inputPath).ensureAlpha();
  const { width, height } = await image.metadata();
  const raw = await image.raw().toBuffer();

  const at = (x, y) => (y * width + x) * 4;
  const seed = [raw[0], raw[1], raw[2]];
  const near = (i) =>
    Math.abs(raw[i] - seed[0]) <= tolerance &&
    Math.abs(raw[i + 1] - seed[1]) <= tolerance &&
    Math.abs(raw[i + 2] - seed[2]) <= tolerance;

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    stack.push([0, y], [width - 1, y]);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const key = y * width + x;
    if (seen[key]) continue;
    const i = at(x, y);
    if (!near(i)) continue;
    seen[key] = 1;
    raw[i + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  await sharp(raw, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
  const cleared = seen.reduce((sum, v) => sum + v, 0);
  return { cleared, total: width * height };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const jobs = [
    [`${dir("raw")}/epc-dashboard.png`, "laptop", { rotateY: -22, rotateX: 6, rotateZ: -1, scale: 0.62 }, "laptop-dashboard-left"],
    [`${dir("raw")}/portfolio.png`, "laptop", { rotateY: 18, rotateX: 5, rotateZ: 1, scale: 0.62 }, "laptop-portfolio-right"],
    [`${dir("raw")}/crew-phone.png`, "phone", { rotateY: -20, rotateX: 4, rotateZ: -2, scale: 0.78 }, "phone-crew-left"],
    [`${dir("raw")}/crew-join.png`, "phone", { rotateY: 16, rotateX: 4, rotateZ: 2, scale: 0.78 }, "phone-join-right"],
    [`${dir("raw")}/crew-phone.png`, "phone", { rotateY: 0, rotateX: 0, rotateZ: 0, scale: 0.9 }, "phone-crew-flat"],
  ];

  for (const [src, device, angle, name] of jobs) {
    if (!existsSync(src)) {
      console.log(`skip ${name}: ${src} not shot yet`);
      continue;
    }
    await renderMockup(browser, src, device, angle, name);
  }

  // The three closing documents, as sheets on a desk. Order is chronological
  // and the middle position is the one the eye lands on first, which is why the
  // acceptance protocol is in it: it is the only one of the three carrying
  // signatures, and signed paper is the strongest single image this product has.
  // The outer two mirror each other exactly so the row reads as one object.
  const papers = [
    // Signs matter and were got wrong first time: a positive rotateY brings the
    // sheet's RIGHT edge toward the viewer, so the left sheet takes the positive
    // value to face the middle. With them reversed the three splayed outward and
    // read as three separate objects instead of one fanned set.
    [`${dir("docs")}/completion-cover.png`, { rotateY: 9, rotateZ: -1.2 }, named("doc-report")],
    [`${dir("docs")}/abnahme.png`, { rotateY: 0, rotateZ: 0, rotateX: 4, scale: 1.06 }, named("doc-abnahme")],
    [`${dir("docs")}/invoice.png`, { rotateY: -9, rotateZ: 1.2 }, named("doc-invoice")],
  ];

  for (const [src, angle, name] of papers) {
    if (!existsSync(src)) {
      console.log(`skip ${name}: ${src} not rendered yet`);
      continue;
    }
    await renderPaper(browser, src, angle, name);
  }

  await browser.close();
  console.log(`\nmockups in ${OUT}`);
}

if (process.argv[1]?.endsWith("mockups.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
