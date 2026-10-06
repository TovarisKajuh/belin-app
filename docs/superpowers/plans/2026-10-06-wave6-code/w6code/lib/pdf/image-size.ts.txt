// Pixel size of an image, read from its own header bytes.
//
// The database columns for photo size are not a source of truth: the crew
// submit path never writes them, and the seed writes a fixed 800 x 600 for
// photos of any shape. The bytes are what @react-pdf will actually draw, so the
// layout reads the bytes. Only JPEG and PNG are recognised, because those are
// the only formats @react-pdf can embed; anything else returns null and the
// caller skips that image rather than drawing an empty box.

export interface PixelSize {
  width: number;
  height: number;
}

export function imageSize(bytes: Uint8Array): PixelSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG: an 8 byte signature, then the IHDR chunk with width and height.
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  // JPEG: walk the segments until a start-of-frame marker carries the size.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2; // standalone markers carry no length
      continue;
    }
    const length = view.getUint16(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      const height = view.getUint16(offset + 5);
      const width = view.getUint16(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}

/** The largest box of the image's own shape that fits inside maxWidth x maxHeight. */
export function fitBox(size: PixelSize, maxWidth: number, maxHeight: number): PixelSize {
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height);
  return {
    width: Math.floor(size.width * scale * 10) / 10,
    height: Math.floor(size.height * scale * 10) / 10,
  };
}
