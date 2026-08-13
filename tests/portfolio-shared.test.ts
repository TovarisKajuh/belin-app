import { describe, expect, it } from "vitest";
import { formatCapacity } from "@/lib/portfolio-shared";

// The lifetime figure is the number an EPC quotes about itself, so it has to
// read the way they would say it. The crossover and the rounding are the whole
// rule, so they are pinned.
describe("formatCapacity", () => {
  it("stays in kWp below a megawatt, where a single roof still matters", () => {
    expect(formatCapacity(96.6)).toEqual({ value: 97, unit: "kWp" });
    expect(formatCapacity(999)).toEqual({ value: 999, unit: "kWp" });
  });

  it("switches at exactly one megawatt", () => {
    expect(formatCapacity(1000)).toEqual({ value: 1, unit: "MWp" });
  });

  it("carries one decimal in MWp, so a 1.4 MW year does not look like a 1.9 MW one", () => {
    expect(formatCapacity(1009.8)).toEqual({ value: 1, unit: "MWp" });
    expect(formatCapacity(1450)).toEqual({ value: 1.5, unit: "MWp" });
    expect(formatCapacity(11_240)).toEqual({ value: 11.2, unit: "MWp" });
  });

  it("handles an empty book without inventing a unit change", () => {
    expect(formatCapacity(0)).toEqual({ value: 0, unit: "kWp" });
  });
});
