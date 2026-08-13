/**
 * Turns a mockup exported on a BAKED CHECKERBOARD into a real transparent PNG.
 *
 * The device renders the founder brings back from a mockup tool arrive with the
 * transparency checkerboard painted into the pixels: the file has an alpha
 * channel, but every pixel in it is opaque. `removeBackground` in mockups.mjs
 * cannot help, because it seeds one colour and takes everything within a
 * tolerance of it, and a checkerboard is two colours 43 (laptop) to 112 (phone)
 * levels apart. A tolerance wide enough to span both would reach well into the
 * device body.
 *
 * So this reads the pattern instead of guessing at it:
 *
 *   1. Learn the two tones from the border strip, where nothing but background
 *      can be, and refuse to run if what it finds is not a two tone neutral
 *      pattern. A wrong guess here eats artwork, so it fails loudly instead.
 *   2. Flood fill inward from every edge pixel, accepting anything neutral that
 *      sits in the band the two tones span. Connected only, exactly like
 *      removeBackground: a grey panel INSIDE the screenshot survives, because
 *      the dark device body walls the fill out.
 *   3. Un-composite the fringe. The silhouette is antialiased, so the last one
 *      or two pixels are a blend of device and checkerboard. Left alone they
 *      keep a pale halo that is invisible on a light page and obvious on ours.
 *      For each fringe pixel we know the background B it was blended with (the
 *      cleared neighbours still carry their original colour) and the foreground
 *      F it belongs to (the nearest interior pixel), so C = aF + (1-a)B solves
 *      for a directly, per channel, using whichever channel separates F from B
 *      the most.
 *
 * Output: a transparent PNG master beside the source, plus the WebP the landing
 * page actually serves. Design law 4, fast on weak rural LTE: a 5 MB PNG hero
 * is not something a roofer on the edge of coverage should be asked to download.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const NEUTRAL_TOL = 16; // how far R, G and B may drift apart and still be grey
const BAND_TOL = 26; // how far outside the two tones a pixel may sit
const FRINGE_PASSES = 2;

/** Luminance, the cheap way. These are greys, so the weighting hardly matters. */
const lum = (r, g, b) => (r + g + b) / 3;

/**
 * Learns the checkerboard, ONE ROW AT A TIME.
 *
 * A global pair of tones is not enough: the phone export carries a soft
 * vertical gradient painted over the pattern, so its squares run 88/199 at the
 * top of the frame and 161/231 at the bottom. Take the tones from the top of
 * that image and the fill stops halfway down; take a band wide enough to cover
 * both ends and it spans 88 to 231, which is most of the greyscale.
 *
 * The device never touches the frame edge in either file, so the left and right
 * margins of every row are pure background and give that row its own two tones.
 * A median across neighbouring rows then absorbs any row where something did
 * intrude.
 *
 * Throws rather than returning something plausible: the caller is about to
 * delete pixels based on the answer.
 */
export function learnCheckerboard(raw, width, height, margin = 40) {
  const loRow = new Float64Array(height);
  const hiRow = new Float64Array(height);
  let worstSpread = 0;

  for (let y = 0; y < height; y++) {
    const samples = [];
    for (let x = 0; x < margin; x++) {
      for (const xx of [x, width - 1 - x]) {
        const i = (y * width + xx) * 4;
        const [r, g, b] = [raw[i], raw[i + 1], raw[i + 2]];
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (spread > worstSpread) worstSpread = spread;
        samples.push(lum(r, g, b));
      }
    }
    samples.sort((a, b) => a - b);
    // Percentiles rather than min and max: the square boundaries in a resized
    // export are blended, and those in-between pixels are not tones.
    loRow[y] = samples[Math.floor(samples.length * 0.1)];
    hiRow[y] = samples[Math.floor(samples.length * 0.9)];
  }

  if (worstSpread > NEUTRAL_TOL) {
    throw new Error(
      `margins are not neutral grey (channel spread ${worstSpread}); this does not look like a checkerboard export`,
    );
  }

  // Median over a window of rows, so one row that caught artwork cannot widen
  // the band for itself.
  const median = (series) => {
    const out = new Float64Array(height);
    const half = 12;
    for (let y = 0; y < height; y++) {
      const win = [];
      for (let d = -half; d <= half; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < height) win.push(series[yy]);
      }
      win.sort((a, b) => a - b);
      out[y] = win[win.length >> 1];
    }
    return out;
  };

  const lo = median(loRow);
  const hi = median(hiRow);

  for (let y = 0; y < height; y++) {
    const span = hi[y] - lo[y];
    if (span < 12 || span > 170 || lo[y] < 40) {
      throw new Error(
        `row ${y} does not look like background: tones ${lo[y].toFixed(0)}/${hi[y].toFixed(0)}`,
      );
    }
  }

  return { lo, hi, at: (y) => [lo[y], hi[y]] };
}

export async function cutOutCheckerboard(inputPath, outputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { width, height } = await image.metadata();
  const raw = await image.raw().toBuffer();

  const { lo, hi } = learnCheckerboard(raw, width, height);

  const isBackground = (i) => {
    const [r, g, b] = [raw[i], raw[i + 1], raw[i + 2]];
    if (Math.max(r, g, b) - Math.min(r, g, b) > NEUTRAL_TOL) return false;
    const y = Math.floor(i / 4 / width);
    const l = lum(r, g, b);
    return l >= lo[y] - BAND_TOL && l <= hi[y] + BAND_TOL;
  };

  // --- 2. flood fill inward from the edges -------------------------------
  const cleared = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, 0, x, height - 1);
  for (let y = 0; y < height; y++) stack.push(0, y, width - 1, y);

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const key = y * width + x;
    if (cleared[key]) continue;
    const i = key * 4;
    if (!isBackground(i)) continue;
    cleared[key] = 1;
    raw[i + 3] = 0; // RGB is deliberately KEPT: the fringe pass reads it back
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // --- 3. un-composite the antialiased fringe ----------------------------
  let fringe = 0;
  for (let pass = 0; pass < FRINGE_PASSES; pass++) {
    const edits = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const key = y * width + x;
        if (cleared[key]) continue;
        const i = key * 4;
        if (raw[i + 3] !== 255) continue; // already softened by an earlier pass

        // The background this pixel was blended with, and the artwork it
        // belongs to, both read from the neighbours we are certain about.
        const bg = [0, 0, 0];
        const fg = [0, 0, 0];
        let nb = 0;
        let nf = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const k = (y + dy) * width + (x + dx);
            const j = k * 4;
            if (cleared[k]) {
              bg[0] += raw[j], bg[1] += raw[j + 1], bg[2] += raw[j + 2];
              nb++;
            } else if (raw[j + 3] === 255 && !isBackground(j)) {
              fg[0] += raw[j], fg[1] += raw[j + 1], fg[2] += raw[j + 2];
              nf++;
            }
          }
        }
        if (!nb || !nf) continue; // not on the boundary, or nothing to trust

        for (let c = 0; c < 3; c++) (bg[c] /= nb), (fg[c] /= nf);

        // Solve on whichever channel separates artwork from background most:
        // the others divide by something close to zero and amplify noise.
        let channel = 0;
        let separation = 0;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(fg[c] - bg[c]);
          if (d > separation) (separation = d), (channel = c);
        }
        if (separation < 24) continue; // artwork indistinguishable from ground

        const alpha = (raw[i + channel] - bg[channel]) / (fg[channel] - bg[channel]);
        if (alpha >= 0.985) continue; // genuinely opaque, leave it alone

        edits.push([i, Math.max(0, Math.min(1, alpha)), fg]);
      }
    }
    for (const [i, alpha, fg] of edits) {
      raw[i] = Math.round(fg[0]);
      raw[i + 1] = Math.round(fg[1]);
      raw[i + 2] = Math.round(fg[2]);
      raw[i + 3] = Math.round(alpha * 255);
      if (alpha === 0) cleared[i / 4] = 1;
    }
    fringe += edits.length;
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  const out = sharp(raw, { raw: { width, height, channels: 4 } });
  await out.clone().png({ compressionLevel: 9 }).toFile(outputPath);

  const clearedCount = cleared.reduce((sum, v) => sum + v, 0);
  // resolveWithObject, not metadata(): metadata() on a pipeline reports the
  // dimensions going IN, so it would print the untrimmed frame every time.
  const trimmed = await sharp(await out.clone().png().toBuffer())
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  return {
    width,
    height,
    tones: [`${lo[0].toFixed(0)}/${hi[0].toFixed(0)}`, `${lo[height - 1].toFixed(0)}/${hi[height - 1].toFixed(0)}`],
    cleared: clearedCount,
    total: width * height,
    fringe,
    content: `${trimmed.info.width}x${trimmed.info.height}`,
  };
}

/** The serving copy: trimmed to its own bounds, capped in width, WebP. */
export async function serveable(pngPath, webpPath, maxWidth) {
  mkdirSync(path.dirname(webpPath), { recursive: true });
  const info = await sharp(pngPath)
    .trim({ threshold: 1 })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 92, effort: 6 })
    .toFile(webpPath);
  return info;
}

// Sources are the founder's own exports from his mockup tool, kept in the repo
// so this is reproducible: the cutout is derived work and must be re-runnable
// from something committed, not from a folder on one laptop.
const JOBS = [
  ["assets/marketing/source/laptop.png", "assets/marketing/hero/laptop.png", "public/landing/hero-laptop.webp", 1800],
  ["assets/marketing/source/phone.png", "assets/marketing/hero/phone.png", "public/landing/hero-phone.webp", 1100],
];

async function main() {
  for (const [src, png, webp, maxWidth] of JOBS) {
    const r = await cutOutCheckerboard(src, png);
    const w = await serveable(png, webp, maxWidth);
    console.log(
      `${path.basename(src).padEnd(12)} ${r.width}x${r.height} tones ${r.tones.join(" -> ")} ` +
        `cleared ${((r.cleared / r.total) * 100).toFixed(1)}% fringe ${r.fringe}px ` +
        `content ${r.content} -> ${w.width}x${w.height} ${(w.size / 1024).toFixed(0)} KB`,
    );
  }
}

if (process.argv[1]?.endsWith("cutout.mjs")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
