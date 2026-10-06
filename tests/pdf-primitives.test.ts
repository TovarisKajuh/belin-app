import { describe, expect, it } from "vitest";
import { fitBox, imageSize } from "@/lib/pdf/image-size";
import { layoutPhotoRows } from "@/lib/pdf/photo-layout";
import { contentDisposition, documentFilename } from "@/lib/pdf/filename";

// The pure helpers under the document layer: image size from header bytes,
// the never-crop photo rows, and the download file names.

function jpegHeader(width: number, height: number): Uint8Array {
  // SOI, an APP0 segment of length 16, then SOF0 with height and width.
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)];
  const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0]);
}

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

describe("imageSize", () => {
  it("reads a JPEG start-of-frame after other segments", () => {
    expect(imageSize(jpegHeader(2000, 2667))).toEqual({ width: 2000, height: 2667 });
  });
  it("reads a PNG header", () => {
    expect(imageSize(pngHeader(1170, 832))).toEqual({ width: 1170, height: 832 });
  });
  it("refuses anything @react-pdf cannot draw", () => {
    expect(imageSize(new TextEncoder().encode("RIFF....WEBPVP8 "))).toBeNull();
    expect(imageSize(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
  it("fits a box without changing the shape", () => {
    expect(fitBox({ width: 400, height: 100 }, 120, 28)).toEqual({ width: 112, height: 28 });
  });
});

describe("layoutPhotoRows", () => {
  const options = { width: 523.28, gap: 8, targetHeight: 160, maxHeight: 240 };

  it("fills every full row exactly to the width, never wider", () => {
    const rows = layoutPhotoRows([1.5, 0.75, 0.75, 1.33, 2.2, 0.56, 1.5], options);
    for (const row of rows.slice(0, -1)) {
      const used = row.reduce((sum, box) => sum + box.width, 0) + options.gap * (row.length - 1);
      expect(used).toBeLessThanOrEqual(options.width);
      expect(used).toBeGreaterThan(options.width - 2);
    }
  });

  it("keeps every photo's own shape (no cropping)", () => {
    const aspects = [1.5, 0.75, 2.2, 0.56];
    for (const row of layoutPhotoRows(aspects, options)) {
      for (const box of row) expect(box.width / box.height).toBeCloseTo(aspects[box.index], 1);
    }
  });

  it("never stretches a lone portrait photo past the target height", () => {
    const [[box]] = layoutPhotoRows([0.75], options);
    expect(box.height).toBe(160);
    expect(box.width).toBe(120);
  });
});

describe("download file names", () => {
  it("folds Slovenian and German letters for the ASCII name and keeps them in the UTF-8 one", () => {
    expect(documentFilename(["Naročilnica", 1, "PSE Trgovski center Kranj"])).toEqual({
      ascii: "Narocilnica-1-PSE-Trgovski-center-Kranj.pdf",
      utf8: "Naročilnica-1-PSE-Trgovski-center-Kranj.pdf",
    });
    expect(documentFilename(["Übernahmeprotokoll", "Straße / Süd", "Đorđe"]).ascii).toBe(
      "Ubernahmeprotokoll-Strasse-Sud-Dorde.pdf",
    );
  });

  it("never returns an empty name", () => {
    expect(documentFilename(["", null, undefined]).ascii).toBe("dokument.pdf");
  });

  it("writes both spellings into one RFC 5987 header", () => {
    expect(contentDisposition(["Račun", "2026-014"])).toBe(
      "inline; filename=\"Racun-2026-014.pdf\"; filename*=UTF-8''Ra%C4%8Dun-2026-014.pdf",
    );
  });
});
