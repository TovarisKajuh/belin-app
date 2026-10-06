import { describe, expect, it } from "vitest";
import { isPng } from "@/lib/acceptance-rules";

describe("isPng", () => {
  it("accepts the PNG signature bytes", () => {
    expect(isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe(true);
  });
  it("refuses anything else, including an empty buffer", () => {
    expect(isPng(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(isPng(new Uint8Array([]))).toBe(false);
  });
});
