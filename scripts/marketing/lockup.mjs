import * as fontkit from "fontkit";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

// The brand lockup as standalone files, in two arrangements:
//
//   horizontal  mark on the left, BELIN beside it. The one for a header, a
//               letterhead, an email signature, a stand, a shirt.
//   stacked     mark over BELIN over SOFTWARE. The launch screen, exactly.
//
// The stacked one's numbers are copied from components/BelinSplash.tsx rather
// than measured off a screenshot, so the file and the thing that animates on a
// phone are the same logo and stay that way.
//
// TWO DELIBERATE DEPARTURES from the splash, both because these are files that
// leave the building rather than pixels on our own screen:
//
// 1. THE LETTERS ARE OUTLINES, NOT TEXT. The splash names a font stack and
//    lets the device choose; on an iPhone that resolves to SF Pro Display. An
//    SVG that did the same would render in whatever the opening machine has,
//    and a printer or a sign maker would silently substitute Arial with nobody
//    thinking to check. So the glyphs are converted to paths from the font file
//    this repo actually ships, and the result depends on nothing.
// 2. THE FONT IS INTER, NOT SF PRO. SF Pro is Apple licensed and cannot be
//    redistributed inside a logo file even if it were on this machine. Inter is
//    what the app, the landing page and every generated PDF already use, and it
//    is the same grotesque genre, so it is both the closest and the only honest
//    choice. The splash on an iPhone stays very slightly different from these
//    files, and that is the correct trade.
//
// No glow either: the splash's gold halo is a property of the dark screen
// behind it. These have no background, so a baked halo would be a grey smear
// on anything that is not #0b1524.

const FONT = "public/fonts/InterVariable.ttf";
const OUT = "assets/brand";

// --- the mark, straight from components/BelinSplash.tsx ---
const CELL = 22;
const STEP = 28; // cell + gap
const CELL_RADIUS = 2.5;
const COLS = 3;
const ROWS = 4;
const GOLD_PER_COL = [1, 2, 3]; // columns rise, gold from the bottom

const GOLD = "#ffd21a"; // --e-gold
const CELL_DARK = "#2a3242"; // the unlit cells, as on the launch screen
const CELL_GREY = "#8f8a7e"; // --e-muted, for surfaces the dark blue dies on

const MARK_W = COLS * STEP - (STEP - CELL);
const MARK_H = ROWS * STEP - (STEP - CELL);

// --- the type, also from the splash: weight 700, tracking 2 at 40px ---
const WEIGHT = 700;
const TRACKING = 0.05; // em
const SUB_WEIGHT = 500;
const SUB_TRACKING = 0.476; // em, the splash's 5 at 10.5px

/**
 * THE HORIZONTAL PROPORTION IS A JUDGEMENT, and the only thing here not copied
 * from something that already exists. The splash is stacked and says nothing
 * about standing the word beside the mark.
 *
 * So THE MARK IS SIZED OFF THE TYPE, not the other way round: its height is a
 * multiple of the cap height, which is how a lockup stays balanced at any size
 * and in any future wording. Rendered at 1.35, 1.20 and 1.10 and looked at all
 * three on the intended surface. At 1.35 the mark still dominates a word set on
 * its own; at 1.10 the cells go cramped and the rising grid stops reading as a
 * rising grid. 1.20 is the avesol relationship: a bit taller than the letters,
 * and no more.
 */
const H_MARK_TO_CAP = 1.2;
const H_GAP_TO_CAP = 0.45;
const H_SIZE = 80; // BELIN. Only sets the working resolution; every other
                   // number scales off it, so the shape is size independent.

// --- the stacked arrangement's rhythm, from the splash ---
const S_SIZE = 40;
const S_SUB_SIZE = 10.5;
const S_MARK_Y = 22;
const S_WORD_BASELINE = 172;
const S_SUB_BASELINE = 194;

/**
 * One line of text as a single outlined path, plus the width it draws.
 *
 * fontkit instances the variable font at the right weight BEFORE laying out.
 * Reading the file at its default 400 and hoping would give a logo in the
 * wrong weight, which reads as a different brand.
 */
function line(font, text, size, weight, trackingEm) {
  const run = font.getVariation({ wght: weight }).layout(text);
  const scale = size / font.unitsPerEm;
  const track = (trackingEm * size) / scale; // back into font units

  let x = 0;
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    // y is up in a font and down in an SVG, hence the negative vertical scale.
    d += glyph.path.translate(x, 0).scale(scale, -scale).toSVG();
    x += run.positions[i].xAdvance + track;
  });

  // The last letter still carries tracking; the drawn width does not.
  return {
    d,
    width: (x - track) * scale,
    cap: (font.capHeight / font.unitsPerEm) * size,
  };
}

/**
 * The mark, at any size.
 *
 * `cell` defaults to the splash's own 22, which reproduces it exactly. The
 * horizontal lockup passes a smaller one; gap and corner radius follow as
 * proportions of the cell rather than as constants, so a resized mark is the
 * same shape and not a differently spaced one.
 */
function markCells(offColor, cell = CELL) {
  const step = cell * (STEP / CELL);
  const radius = cell * (CELL_RADIUS / CELL);
  let out = "";
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const gold = ROWS - 1 - r < GOLD_PER_COL[c];
      out +=
        `\n    <rect x="${n(c * step)}" y="${n(r * step)}" width="${n(cell)}" height="${n(cell)}" ` +
        `rx="${n(radius)}" fill="${gold ? GOLD : offColor}"/>`;
    }
  }
  return out;
}

/** Cell edge that makes the whole mark exactly `height` tall. */
function cellForHeight(height) {
  return height / (ROWS + (ROWS - 1) * ((STEP - CELL) / CELL));
}

function markWidth(cell) {
  const step = cell * (STEP / CELL);
  return COLS * step - (step - cell);
}

const n = (v) => Number(v.toFixed(2));

function svg(width, height, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${label}">
  <title>${label}</title>
${body}
</svg>
`;
}

/** Mark left, word right. Cropped tight to the ink. */
function horizontal(font, { wordColor, offColor }) {
  const word = line(font, "BELIN", H_SIZE, WEIGHT, TRACKING);

  const markH = word.cap * H_MARK_TO_CAP;
  const cell = cellForHeight(markH);
  const wordX = markWidth(cell) + word.cap * H_GAP_TO_CAP;

  // Aligned on CAP HEIGHT, not on the line box. A line box carries ascender and
  // descender space that no capital letter uses, so aligning on it sits the
  // word visibly low next to a solid mark.
  const baseline = (markH + word.cap) / 2;

  return svg(
    wordX + word.width,
    markH, // the mark is the taller of the two, by construction
    "Belin",
    `  <g>${markCells(offColor, cell)}
  </g>
  <path transform="translate(${n(wordX)} ${n(baseline)})" fill="${wordColor}" d="${word.d}"/>`
  );
}

/**
 * Mark over BELIN over SOFTWARE: the launch screen.
 *
 * SOFTWARE is quieter than BELIN on the splash by being a muted grey. That grey
 * is tuned for one navy background, so here the same hierarchy is made with
 * transparency instead, which lands correctly on any surface.
 */
function stacked(font, { wordColor, subColor, subOpacity, offColor }) {
  const word = line(font, "BELIN", S_SIZE, WEIGHT, TRACKING);
  const sub = line(font, "SOFTWARE", S_SUB_SIZE, SUB_WEIGHT, SUB_TRACKING);

  const width = Math.max(MARK_W, word.width, sub.width);
  const height = S_SUB_BASELINE - S_MARK_Y; // mark top to the subline's baseline
  const mid = width / 2;
  const y = (v) => n(v - S_MARK_Y);

  return svg(
    width,
    height,
    "Belin Software",
    `  <g transform="translate(${n(mid - MARK_W / 2)} 0)">${markCells(offColor)}
  </g>
  <path transform="translate(${n(mid - word.width / 2)} ${y(S_WORD_BASELINE)})" fill="${wordColor}" d="${word.d}"/>
  <path transform="translate(${n(mid - sub.width / 2)} ${y(S_SUB_BASELINE)})" fill="${subColor}" fill-opacity="${subOpacity}" d="${sub.d}"/>`
  );
}

// White for a dark surface, white with the unlit cells in the brand's grey
// (#2a3242 reads as "unlit" on the app's own navy, which is the point of it; on
// a mid-dark surface it reads as a hole rather than a cell), and dark type for
// a light surface.
const SKINS = [
  { name: "white", wordColor: "#ffffff", subColor: "#ffffff", subOpacity: 0.72, offColor: CELL_DARK },
  { name: "white-grey", wordColor: "#ffffff", subColor: "#ffffff", subOpacity: 0.72, offColor: CELL_GREY },
  { name: "dark", wordColor: "#0b1524", subColor: "#0b1524", subOpacity: 0.6, offColor: CELL_DARK },
];

const font = fontkit.openSync(FONT);
mkdirSync(OUT, { recursive: true });

for (const skin of SKINS) {
  for (const [shape, build] of [
    ["h", horizontal],
    ["stacked", stacked],
  ]) {
    const file = `belin-${shape}-${skin.name}`;
    const out = build(font, skin);
    writeFileSync(`${OUT}/${file}.svg`, out);

    // 2048 wide and transparent: enough for print at a sane size and for any
    // slide. Anything larger than that should be using the vector.
    await sharp(Buffer.from(out), { density: 900 })
      .resize({ width: 2048 })
      .png()
      .toFile(`${OUT}/${file}.png`);
    console.log(`wrote ${OUT}/${file}.svg and .png`);
  }
}
