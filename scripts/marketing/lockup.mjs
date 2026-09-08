import * as fontkit from "fontkit";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

// The full brand lockup as a standalone file: the mark, BELIN, SOFTWARE.
//
// It is the launch screen, lifted. Every number below is copied from
// components/BelinSplash.tsx rather than measured off a screenshot, so the file
// and the thing that animates on a phone are the same logo and stay that way.
//
// TWO DELIBERATE DEPARTURES from the splash, both because this is a file that
// leaves the building rather than pixels on our own screen:
//
// 1. THE LETTERS ARE OUTLINES, NOT TEXT. The splash names a font stack and
//    lets the device choose; on an iPhone that resolves to SF Pro Display. An
//    SVG that does the same renders in whatever the opening machine has, and a
//    printer, a sign maker or somebody's slide would silently substitute Arial
//    with nobody thinking to check. So the glyphs are converted to paths from
//    the font file this repo actually ships.
// 2. THE FONT IS INTER, NOT SF PRO. SF Pro is Apple licensed and cannot be
//    redistributed inside a logo file even if it were on this machine. Inter is
//    what the app, the landing page and every generated PDF already use, and it
//    is the same grotesque genre, so it is both the closest and the only honest
//    choice. The splash on an iPhone will stay very slightly different from
//    this file, and that is the correct trade.
//
// No glow either: the splash's gold halo is a property of the dark screen
// behind it. This has no background, so a baked halo would be a grey smear on
// anything that is not #0b1524.

const FONT = "public/fonts/InterVariable.ttf";
const OUT = "assets/brand";

// --- straight from components/BelinSplash.tsx ---
const CELL = 22;
const STEP = 28; // cell + gap
const CELL_RADIUS = 2.5;
const COLS = 3;
const ROWS = 4;
const GOLD_PER_COL = [1, 2, 3]; // columns rise, gold from the bottom

const GOLD = "#ffd21a"; // --e-gold
const CELL_DARK = "#2a3242"; // the unlit cells, as on the launch screen
const CELL_GREY = "#8f8a7e"; // --e-muted, for surfaces the dark blue dies on

const WORD = { text: "BELIN", size: 40, weight: 700, tracking: 2 };
const SUB = { text: "SOFTWARE", size: 10.5, weight: 500, tracking: 5 };

// The splash's vertical rhythm: mark at y 22, BELIN baseline 172, SOFTWARE 194.
const MARK_Y = 22;
const WORD_BASELINE = 172;
const SUB_BASELINE = 194;

const MARK_W = COLS * STEP - (STEP - CELL);
const MARK_H = ROWS * STEP - (STEP - CELL);

/**
 * One line of text as a single outlined path, plus the width it draws.
 *
 * fontkit instances the variable font at the right weight BEFORE laying out.
 * Reading the file at its default 400 and hoping would give a logo in the
 * wrong weight, which reads as a different brand.
 */
function line(font, { text, size, weight, tracking }) {
  const run = font.getVariation({ wght: weight }).layout(text);
  const scale = size / font.unitsPerEm;
  const track = tracking / scale; // absolute units, back into font units

  let x = 0;
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    // y is up in a font and down in an SVG, hence the negative vertical scale.
    d += glyph.path.translate(x, 0).scale(scale, -scale).toSVG();
    x += run.positions[i].xAdvance + track;
  });

  // The last letter still carries tracking; the drawn width does not.
  return { d, width: (x - track) * scale };
}

function markCells(offColor) {
  let out = "";
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const gold = ROWS - 1 - r < GOLD_PER_COL[c];
      out +=
        `\n    <rect x="${c * STEP}" y="${r * STEP}" width="${CELL}" height="${CELL}" ` +
        `rx="${CELL_RADIUS}" fill="${gold ? GOLD : offColor}"/>`;
    }
  }
  return out;
}

/**
 * @param wordColor  BELIN
 * @param subColor   SOFTWARE
 * @param subOpacity SOFTWARE is quieter than BELIN on the splash by being a
 *                   muted grey. That grey is tuned for one navy background, so
 *                   here the same hierarchy is made with transparency instead,
 *                   which lands correctly on any surface the logo is put on.
 * @param offColor   the unlit cells
 */
function lockup(font, { wordColor, subColor, subOpacity, offColor }) {
  const word = line(font, WORD);
  const sub = line(font, SUB);

  // Cropped tight to the ink, so whoever places it controls the margins.
  const width = Math.max(MARK_W, word.width, sub.width);
  const capTop = MARK_Y; // the mark is the topmost ink
  const height = SUB_BASELINE - capTop; // the subline's baseline is the lowest
  const mid = width / 2;

  const y = (v) => (v - capTop).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(2)}" height="${height.toFixed(2)}" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" role="img" aria-label="Belin Software">
  <title>Belin Software</title>
  <g transform="translate(${(mid - MARK_W / 2).toFixed(2)} 0)">${markCells(offColor)}
  </g>
  <path transform="translate(${(mid - word.width / 2).toFixed(2)} ${y(WORD_BASELINE)})" fill="${wordColor}" d="${word.d}"/>
  <path transform="translate(${(mid - sub.width / 2).toFixed(2)} ${y(SUB_BASELINE)})" fill="${subColor}"${subOpacity < 1 ? ` fill-opacity="${subOpacity}"` : ""} d="${sub.d}"/>
</svg>
`;
}

const font = fontkit.openSync(FONT);
mkdirSync(OUT, { recursive: true });

const editions = [
  // What was asked for: white type, no background, for a forest green surface.
  { file: "belin-logo-white", wordColor: "#ffffff", subColor: "#ffffff", subOpacity: 0.72, offColor: CELL_DARK },
  // The same with the unlit cells in the brand's grey rather than its dark
  // blue. #2a3242 reads as "unlit" on the app's own navy, which is the point;
  // on a mid-dark surface like forest green it reads as a hole instead of a
  // cell. One colour apart, otherwise identical.
  { file: "belin-logo-white-grey", wordColor: "#ffffff", subColor: "#ffffff", subOpacity: 0.72, offColor: CELL_GREY },
  // For a light surface, where the type cannot be white.
  { file: "belin-logo-dark", wordColor: "#0b1524", subColor: "#0b1524", subOpacity: 0.6, offColor: CELL_DARK },
];

for (const e of editions) {
  const svg = lockup(font, e);
  writeFileSync(`${OUT}/${e.file}.svg`, svg);
  console.log(`wrote ${OUT}/${e.file}.svg`);

  // 2048 wide and transparent: enough for print at a sane size and for any
  // slide. Anything larger than that should be using the vector.
  await sharp(Buffer.from(svg), { density: 900 })
    .resize({ width: 2048 })
    .png()
    .toFile(`${OUT}/${e.file}.png`);
  console.log(`wrote ${OUT}/${e.file}.png`);
}
