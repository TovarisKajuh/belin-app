import { describe, expect, it } from "vitest";
import { isPlausibleToken } from "@/lib/actor-shared";

describe("isPlausibleToken", () => {
  it("accepts url-safe tokens between 8 and 64 chars", () => {
    expect(isPlausibleToken("demo-sub-r8p3n6w1")).toBe(true);
    expect(isPlausibleToken("A1_b2-C3d4E5f6G7")).toBe(true);
  });

  it("rejects too short, too long and unsafe characters", () => {
    expect(isPlausibleToken("short")).toBe(false);
    expect(isPlausibleToken("x".repeat(65))).toBe(false);
    expect(isPlausibleToken("has space")).toBe(false);
    expect(isPlausibleToken("semi;colon")).toBe(false);
    expect(isPlausibleToken("")).toBe(false);
  });
});
