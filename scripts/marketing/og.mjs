import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

// The share card, one per language.
//
// This is the first thing most people will ever see of Belin, because the way
// this product spreads is one EPC pasting a link into WhatsApp. Without it a
// share is a bare blue URL; with it, it is the headline, the mark and the
// product on a device. That is a big difference in the only channel that
// matters here, for one 1200x630 image.
//
// Composed as HTML and captured, like the device mockups, so the type is the
// app's real Inter and the gradient is the app's real background rather than
// something hand-drawn in sharp that drifts from the page it is advertising.

const OUT = "public/og";
const SIZE = { width: 1200, height: 630 };

/** The variable font, embedded so the capture cannot race a network fetch. */
const INTER = readFileSync("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");

// The same claim the hero makes, word for word. A share card that promises one
// thing and a page that opens with another is the cheapest way to look sloppy.
const COPY = {
  sl: {
    eyebrow: "SOLARNA GRADBIŠČA",
    title: "Vaš projekt na enem mestu: od predaje do izvedbe in zaključka.",
  },
  de: {
    eyebrow: "SOLARBAUSTELLEN",
    title: "Ihr Projekt an einem Ort: von der Übergabe über die Ausführung bis zum Abschluss.",
  },
  en: {
    eyebrow: "SOLAR SITES",
    title: "Your project in one place: from handover through execution to closing.",
  },
};

function cardHtml({ eyebrow, title }, laptop, phone) {
  return `<!doctype html>
<style>
  @font-face {
    font-family: "Inter Variable";
    src: url(data:font/woff2;base64,${INTER.toString("base64")}) format("woff2");
    font-weight: 100 900; font-display: block;
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden;
    font-family: "Inter Variable", sans-serif; color: #f4f1ea;
    background:
      radial-gradient(900px 480px at 10% -10%, rgba(255,210,26,.13) 0%, transparent 55%),
      radial-gradient(760px 540px at 108% 10%, rgba(43,120,180,.16) 0%, transparent 52%),
      linear-gradient(158deg, #0c1826 0%, #080f1a 55%, #05090f 100%);
  }
  .card { position: relative; width: 100%; height: 100%; padding: 62px 64px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .mark { display: grid; grid-template-columns: repeat(3, 11px); grid-auto-rows: 11px; gap: 4px; }
  .mark i { background: #2c2a25; border-radius: 2px; }
  .mark i.g { background: #ffd21a; box-shadow: 0 0 16px rgba(255,210,26,.5); }
  .wm { font-size: 27px; font-weight: 800; letter-spacing: .08em; }
  .eyebrow {
    margin-top: 76px; font-size: 17px; font-weight: 700; letter-spacing: .2em;
    color: #ffd21a;
  }
  h1 {
    margin-top: 22px; max-width: 15ch;
    font-size: 52px; line-height: 1.1; font-weight: 800; letter-spacing: -.024em;
    text-wrap: balance;
  }
  .url { position: absolute; left: 64px; bottom: 58px; font-size: 20px; color: #8f8a7e; font-weight: 600; }
  /* The devices sit off the right edge on purpose: cropped hardware reads as a
     window onto something bigger, and a whole laptop shrunk to fit reads as a
     picture of a laptop. */
  .devices { position: absolute; right: -120px; top: 96px; width: 720px; }
  .devices img.l { width: 100%; display: block; filter: drop-shadow(0 30px 50px rgba(0,0,0,.6)); }
  .devices img.p { position: absolute; left: -46px; bottom: -74px; width: 31%; filter: drop-shadow(0 22px 34px rgba(0,0,0,.65)); }
</style>
<div class="card">
  <div class="brand">
    <span class="mark">${[0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1]
      .map((v) => `<i class="${v ? "g" : ""}"></i>`)
      .join("")}</span>
    <span class="wm">BELIN</span>
  </div>
  <p class="eyebrow">${eyebrow}</p>
  <h1>${title}</h1>
  <p class="url">getbelin.com</p>
  <div class="devices">
    <img class="l" src="${laptop}">
    <img class="p" src="${phone}">
  </div>
</div>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const laptop = `data:image/webp;base64,${readFileSync("public/landing/hero-laptop.webp").toString("base64")}`;
  const phone = `data:image/webp;base64,${readFileSync("public/landing/hero-phone.webp").toString("base64")}`;

  const browser = await chromium.launch();
  for (const [locale, copy] of Object.entries(COPY)) {
    const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
    await page.setContent(cardHtml(copy, laptop, phone));
    await page.waitForFunction(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))).then(() => document.fonts.ready).then(() => true),
    );
    const buffer = await page.screenshot({ type: "png" });
    // JPEG, not PNG and not WebP. WebP is still refused by some crawlers,
    // including older WhatsApp clients, and this file exists precisely for
    // them; PNG of a photographic card came out at 378 KB, which some previews
    // give up on. Quality 92 keeps the white type crisp at a third of that.
    const out = await sharp(buffer)
      .jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true })
      .toFile(`${OUT}/belin-${locale}.jpg`);
    console.log(`og ${locale}  ${out.width}x${out.height}  ${(out.size / 1024).toFixed(0)} KB`);
    await page.close();
  }
  await browser.close();
}

if (process.argv[1]?.endsWith("og.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
