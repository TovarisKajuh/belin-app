// Photos laid out in justified rows, the way a contact sheet is: every photo
// keeps its own shape, and each row is scaled so it exactly fills the width.
//
// Cropping is the thing this replaces. The old grid cut every photo to a fixed
// 150 point box, which turns a phone's portrait photo into a strip and can cut
// away the very defect the photo was taken to prove.
//
// Pure arithmetic, no @react-pdf import, so it is unit tested directly.

export interface PhotoBox {
  /** Index into the photos array the layout was computed for. */
  index: number;
  width: number;
  height: number;
}

export interface RowOptions {
  /** The width a full row fills, in points. */
  width: number;
  /** Space between photos in a row, in points. */
  gap: number;
  /** The height rows are packed toward; the last row never grows past it. */
  targetHeight: number;
  /** No row is ever taller than this, however few photos it holds. */
  maxHeight: number;
}

const floor1 = (n: number) => Math.floor(n * 10) / 10;

export function layoutPhotoRows(aspects: number[], options: RowOptions): PhotoBox[][] {
  const rows: PhotoBox[][] = [];
  let current: number[] = [];

  const flush = (isLast: boolean) => {
    if (current.length === 0) return;
    const aspectSum = current.reduce((sum, i) => sum + aspects[i], 0);
    const free = options.width - options.gap * (current.length - 1);
    let height = free / aspectSum;
    if (isLast) height = Math.min(height, options.targetHeight);
    height = Math.min(height, options.maxHeight);
    rows.push(current.map((i) => ({ index: i, width: floor1(aspects[i] * height), height: floor1(height) })));
    current = [];
  };

  aspects.forEach((_, i) => {
    current.push(i);
    const aspectSum = current.reduce((sum, j) => sum + aspects[j], 0);
    const naturalWidth = aspectSum * options.targetHeight + options.gap * (current.length - 1);
    if (naturalWidth >= options.width) flush(false);
  });
  flush(true);

  return rows;
}
