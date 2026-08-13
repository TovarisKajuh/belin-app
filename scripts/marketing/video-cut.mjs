import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";

// The cut: raw takes in, one finished mp4 out.
//
// Captions are rendered as transparent PNGs by the browser rather than drawn by
// ffmpeg's drawtext, so the type is the app's own Inter with its real weights
// and letter spacing. drawtext would have needed a font file path, given no
// control over spacing, and produced a caption that looks like a subtitle
// burned onto a pirate DVD.
//
// Every segment is normalised to 1920x1080 at 30fps before anything is joined,
// because concat refuses streams that disagree and silently produces garbage
// when they nearly agree.

const TAKES = "assets/marketing/video/takes";
const WORK = "assets/marketing/video/.work";
const OUT = "assets/marketing/video";
const W = 1920;
const H = 1080;

const INTER = readFileSync("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");

const ff = (args, label) => {
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "pipe" });
  } catch (error) {
    console.error(`ffmpeg failed at ${label}`);
    console.error(error.stderr?.toString().slice(0, 1200) ?? error.message);
    process.exit(1);
  }
};

/** Duration in seconds, read back from the file rather than assumed. */
function durationOf(file) {
  const out = execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .concat(""); // ffmpeg prints the header to stderr; see the catch below
  return out;
}

const FONT_FACE = `@font-face {
  font-family: "Inter Variable";
  src: url(data:font/woff2;base64,${INTER.toString("base64")}) format("woff2");
  font-weight: 100 900; font-display: block;
}`;

const GROUND = `
  radial-gradient(1100px 620px at 8% -12%, rgba(255,210,26,.12) 0%, transparent 55%),
  radial-gradient(900px 640px at 106% 8%, rgba(43,120,180,.15) 0%, transparent 52%),
  linear-gradient(158deg, #0c1826 0%, #080f1a 55%, #05090f 100%)`;

const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

/** Renders one 1920x1080 PNG from HTML, transparent unless the body paints. */
async function card(browser, name, body, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>${FONT_FACE}
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: "Inter Variable", sans-serif;
      color: #f4f1ea; ${transparent ? "background: transparent;" : `background: ${GROUND};`} }
  </style>${body}`);
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(120);
  const buffer = await page.screenshot({ type: "png", omitBackground: transparent });
  writeFileSync(`${WORK}/${name}.png`, buffer);
  await page.close();
}

/**
 * A caption: one line of the script.
 *
 * Two layouts, because the footage has two shapes. Landscape footage fills the
 * frame, so its caption goes on a plate along the bottom. PORTRAIT footage is a
 * tall strip with two thirds of a 16:9 frame left empty beside it, and putting
 * a plate under the phone covered the submit button and the tab bar, which are
 * the two things that scene exists to show. So the phone moves right and the
 * caption becomes a headline in the space that was going to waste anyway.
 */
const captionHtml = (text, side = false) =>
  side
    ? `
  <style>
    .wrap { position: absolute; left: 132px; top: 0; bottom: 0; width: 700px;
            display: flex; flex-direction: column; justify-content: center; gap: 30px; }
    .rule { width: 74px; height: 6px; border-radius: 3px; background: #ffd21a;
            box-shadow: 0 0 24px rgba(255,210,26,.45); }
    .cap { font-size: 62px; font-weight: 800; letter-spacing: -.028em; line-height: 1.12;
           text-shadow: 0 2px 22px rgba(0,0,0,.6); }
  </style>
  <div class="wrap"><span class="rule"></span><div class="cap">${text}</div></div>`
    : `
  <style>
    .wrap { position: absolute; left: 0; right: 0; bottom: 92px; display: flex; justify-content: center; }
    .cap {
      padding: 22px 40px; border-radius: 18px;
      background: rgba(6,11,18,.72); border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(8px);
      font-size: 46px; font-weight: 700; letter-spacing: -.015em; line-height: 1.2;
      text-shadow: 0 2px 18px rgba(0,0,0,.55);
    }
  </style>
  <div class="wrap"><div class="cap">${text}</div></div>`;

const endHtml = `
  <style>
    .c { width: 100%; height: 100%; display: flex; flex-direction: column;
         align-items: center; justify-content: center; gap: 34px; }
    .brand { display: flex; align-items: center; gap: 20px; }
    .mark { display: grid; grid-template-columns: repeat(3, 16px); grid-auto-rows: 16px; gap: 5px; }
    .mark i { background: #2c2a25; border-radius: 3px; }
    .mark i.g { background: #ffd21a; box-shadow: 0 0 22px rgba(255,210,26,.5); }
    .wm { font-size: 46px; font-weight: 800; letter-spacing: .09em; }
    h1 { font-size: 58px; line-height: 1.18; font-weight: 800; letter-spacing: -.026em; text-align: center; max-width: 1300px; }
    .u { font-size: 30px; color: #8f8a7e; font-weight: 600; letter-spacing: .02em; }
  </style>
  <div class="c">
    <div class="brand">
      <span class="mark">${MARK.map((v) => `<i class="${v ? "g" : ""}"></i>`).join("")}</span>
      <span class="wm">BELIN</span>
    </div>
    <h1>Vaš projekt na enem mestu:<br>od predaje do izvedbe in zaključka.</h1>
    <p class="u">getbelin.com</p>
  </div>`;

/** The paperwork frame: the three fanned sheets on the ground, for the pan. */
async function paperPlate(browser) {
  const img = (name) =>
    `data:image/webp;base64,${readFileSync(`public/landing/${name}.webp`).toString("base64")}`;
  await card(
    browser,
    "papers",
    `<style>
      .row { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
      .row img { width: 30%; height: auto; }
      .row img:nth-child(2) { width: 34%; margin: 0 -5%; z-index: 2; transform: translateY(-4%); }
      .row img:nth-child(1), .row img:nth-child(3) { z-index: 1; }
    </style>
    <div class="row">
      <img src="${img("doc-report")}"><img src="${img("doc-abnahme")}"><img src="${img("doc-invoice")}">
    </div>`,
  );
}

/**
 * One finished segment.
 *
 * `source` is either a take (trimmed, sped up, fitted onto the ground) or a
 * still (held, with a slow push in). Captions are overlaid with their own fade
 * so text never pops.
 */
function segment({ name, take, still, start = 0, duration, speed = 1, captions }) {
  const inputs = [];
  const filters = [];

  inputs.push("-loop", "1", "-t", String(duration), "-i", `${WORK}/ground.png`);

  if (take) {
    inputs.push("-ss", String(start), "-t", String(duration * speed), "-i", `${TAKES}/${take}.webm`);
    const portrait = take === "crew";
    // Portrait footage is fitted by height and sits right of centre, leaving
    // the left third for the caption. Landscape is fitted by width and centred.
    filters.push(
      portrait
        ? `[1:v]setpts=PTS/${speed},scale=-2:1010,fps=30[shot]`
        : `[1:v]setpts=PTS/${speed},scale=1610:-2,fps=30[shot]`,
      `[0:v]fps=30,scale=${W}:${H}[bg]`,
      portrait
        ? `[bg][shot]overlay=W-w-190:(H-h)/2:shortest=1[base]`
        : `[bg][shot]overlay=(W-w)/2:(H-h)/2:shortest=1[base]`,
    );
  } else {
    // A still, with a slow push in so the frame is never dead.
    filters.push(
      `[0:v]fps=30,scale=${W}:${H}[bg]`,
      `[1:v]fps=30,scale=${Math.round(W * 1.14)}:-2,zoompan=z='min(1.001+0.00055*on,1.09)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=30[shot]`,
      `[bg][shot]overlay=0:0:shortest=1[base]`,
    );
    inputs.push("-loop", "1", "-t", String(duration), "-i", `${WORK}/${still}.png`);
  }

  let last = "base";
  captions.forEach((caption, index) => {
    const label = `cap${index}`;
    const out = `v${index}`;
    inputs.push("-loop", "1", "-t", String(duration), "-i", `${WORK}/${caption.file}.png`);
    const inputIndex = 2 + index;
    const fadeOut = Math.max(caption.at + 0.2, caption.until - 0.45);
    filters.push(
      `[${inputIndex}:v]fps=30,format=rgba,fade=in:st=${caption.at}:d=0.35:alpha=1,fade=out:st=${fadeOut}:d=0.45:alpha=1[${label}]`,
      `[${last}][${label}]overlay=0:0:shortest=1[${out}]`,
    );
    last = out;
  });

  ff(
    [
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      `[${last}]`,
      "-t",
      String(duration),
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      `${WORK}/${name}.mp4`,
    ],
    name,
  );
  console.log(`segment ${name.padEnd(10)} ${duration}s`);
}

const SCRIPT = [
  {
    name: "01-crew",
    take: "crew",
    start: 2.6,
    duration: 12,
    speed: 1.25,
    captions: [
      { file: "cap-1a", text: "Toliko traja dnevno poročilo.", at: 0.3, until: 4.4, side: true },
      { file: "cap-1b", text: "30 sekund, z eno roko, na strehi.", at: 5.0, until: 12, side: true },
    ],
  },
  {
    name: "02-dashboard",
    take: "dashboard",
    start: 0.8,
    duration: 9.5,
    speed: 1.1,
    captions: [{ file: "cap-2", text: "Naročnik vidi v živo. Brez klica.", at: 0.4, until: 9.5 }],
  },
  {
    name: "03-hours",
    take: "hours",
    start: 2.2,
    duration: 7,
    speed: 1,
    captions: [{ file: "cap-3", text: "Ure in dodatna dela, dogovorjena sproti.", at: 0.4, until: 7 }],
  },
  {
    name: "04-papers",
    still: "papers",
    duration: 7,
    captions: [{ file: "cap-4", text: "Papirologija? Narejena.", at: 0.4, until: 7 }],
  },
  { name: "05-end", still: "end", duration: 5, captions: [] },
];

async function main() {
  if (!existsSync(`${TAKES}/crew.webm`)) {
    console.error(`No takes in ${TAKES}. Run: npm run marketing:video:takes`);
    process.exit(1);
  }
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  await card(browser, "ground", "");
  await card(browser, "end", endHtml);
  await paperPlate(browser);
  for (const scene of SCRIPT) {
    for (const caption of scene.captions) {
      await card(browser, caption.file, captionHtml(caption.text, caption.side), { transparent: true });
    }
  }
  await browser.close();

  for (const scene of SCRIPT) segment(scene);

  const list = SCRIPT.map((s) => `file '${s.name}.mp4'`).join("\n");
  writeFileSync(`${WORK}/concat.txt`, `${list}\n`);

  // Silent stereo audio is added at the join, not per segment: some players and
  // at least one social uploader treat a video with no audio stream at all as a
  // broken file, and adding it once is cheaper than keeping five in step.
  ff(
    [
      "-f", "concat", "-safe", "0", "-i", `${WORK}/concat.txt`,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-c:v", "copy", "-c:a", "aac", "-shortest",
      "-movflags", "+faststart",
      `${OUT}/belin-demo.mp4`,
    ],
    "concat",
  );

  // The vertical cut, for WhatsApp status and stories: the crew scene only,
  // which is the one that was shot on a phone in the first place.
  ff(
    [
      "-i", `${WORK}/01-crew.mp4`,
      "-vf", "crop=608:1080:(iw-608)/2:0,scale=1080:1920",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      `${OUT}/belin-demo-9x16.mp4`,
    ],
    "vertical",
  );

  for (const file of ["belin-demo.mp4", "belin-demo-9x16.mp4"]) {
    const bytes = readFileSync(`${OUT}/${file}`).length;
    console.log(`\n${file}  ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  }
}

if (process.argv[1]?.endsWith("video-cut.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
