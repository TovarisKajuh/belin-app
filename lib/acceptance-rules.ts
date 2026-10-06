// Rules of the acceptance protocol, pure so they are tested and shared by the
// server (which enforces them) and the screen (which explains them).

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A signature is stored only if it is what the pad produces: a PNG. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= PNG_MAGIC.length && PNG_MAGIC.every((value, i) => bytes[i] === value);
}
