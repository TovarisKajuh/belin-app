import sharp from "sharp";
import { mkdirSync } from "node:fs";

// The Belin mark: a 3 wide by 4 tall cell grid whose columns rise 1, 2, 3,
// gold from the bottom. Identical shape to the launch animation
// (components/BelinSplash.tsx) and the command bar mark, so the home screen
// icon, the launch and the header are one logo. No wordmark on the icon.

const NAVY = "#0b1524"; // same as the splash background and the manifest
const GOLD = "#ffd21a"; // the --e-gold design token
const DARK_CELL = "#2a3242";

const GOLD_PER_COL = [1, 2, 3];
const COLS = GOLD_PER_COL.length;
const ROWS = 4;
const GAP_RATIO = 0.22; // gap as a fraction of the cell

/**
 * @param size    icon edge in px
 * @param radius  corner radius of the icon plate (0 for full-bleed)
 * @param markH   mark height as a fraction of the icon edge
 */
function svg({ size, radius, markH }) {
  // 4 cells + 3 gaps tall, 3 cells + 2 gaps wide.
  const cell = (size * markH) / (ROWS + (ROWS - 1) * GAP_RATIO);
  const step = cell * (1 + GAP_RATIO);
  const w = COLS * cell + (COLS - 1) * cell * GAP_RATIO;
  const h = ROWS * cell + (ROWS - 1) * cell * GAP_RATIO;
  const x0 = (size - w) / 2;
  const y0 = (size - h) / 2;
  const r = cell * 0.12;

  let cells = "";
  for (let c = 0; c < COLS; c++) {
    for (let row = 0; row < ROWS; row++) {
      const fromBottom = ROWS - 1 - row;
      const isGold = fromBottom < GOLD_PER_COL[c];
      const x = x0 + c * step;
      const y = y0 + row * step;
      cells +=
        `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cell.toFixed(2)}" ` +
        `height="${cell.toFixed(2)}" rx="${r.toFixed(2)}" fill="${isGold ? GOLD : DARK_CELL}"/>`;
    }
  }

  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>
      ${cells}
    </svg>`
  );
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "icon-192.png", size: 192, radius: 36, markH: 0.58 },
  { file: "icon-512.png", size: 512, radius: 96, markH: 0.58 },
  // Maskable: full-bleed plate, mark pulled well inside the safe zone because
  // Android crops this to a circle on many launchers.
  { file: "icon-maskable-512.png", size: 512, radius: 0, markH: 0.42 },
  // iOS applies its own rounded mask, so this one is full-bleed too.
  { file: "apple-touch-icon.png", size: 180, radius: 0, markH: 0.58 },
];

for (const job of jobs) {
  await sharp(svg(job)).png().toFile(`public/icons/${job.file}`);
  console.log(`wrote public/icons/${job.file}`);
}
