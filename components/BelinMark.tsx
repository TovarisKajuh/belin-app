// The Belin mark: 3 wide, 4 tall, columns rising 1, 2, 3 gold cells from the
// bottom. One definition shared by the command bar, the crew header and the
// landing page, so the mark cannot drift between them. The same shape is drawn
// by the launch animation (components/BelinSplash.tsx) and the home screen
// icon (scripts/generate-icons.mjs), which redefine it because one renders SVG
// and the other runs in Node at build time.

export const GOLD_PER_COL = [1, 2, 3];
const COLS = GOLD_PER_COL.length;
const ROWS = 4;

/**
 * Renders the mark as cells for a CSS grid. The grid flows row by row, so the
 * cells are emitted in row-major order.
 */
export function BelinMark({ className = "e-mark" }: { className?: string }) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const fromBottom = ROWS - 1 - r;
      const isGold = fromBottom < GOLD_PER_COL[c];
      cells.push(<i key={`${r}-${c}`} className={isGold ? "g" : undefined} />);
    }
  }
  return (
    <span className={className} aria-hidden>
      {cells}
    </span>
  );
}
