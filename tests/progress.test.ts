import { describe, expect, it } from "vitest";
import { projectProgress, type ScopeProgressInput } from "@/lib/progress";

function item(overrides: Partial<ScopeProgressInput> = {}): ScopeProgressInput {
  return { targetQty: 100, weight: 1, installedQty: 0, ...overrides };
}

describe("projectProgress", () => {
  it("returns 0 for no scope items", () => {
    expect(projectProgress([])).toBe(0);
  });

  it("returns 0 when nothing is installed", () => {
    expect(projectProgress([item(), item()])).toBe(0);
  });

  it("computes a single item's percentage", () => {
    expect(projectProgress([item({ installedQty: 25 })])).toBe(25);
  });

  it("weights items by their weight share", () => {
    // Modules weight 4 at 50%, cabling weight 1 at 0%: (4*50 + 1*0) / 5 = 40
    expect(
      projectProgress([
        item({ weight: 4, installedQty: 50 }),
        item({ weight: 1, installedQty: 0 }),
      ])
    ).toBe(40);
  });

  it("clamps overdelivery at 100 percent per item", () => {
    expect(projectProgress([item({ installedQty: 150 })])).toBe(100);
  });

  it("ignores items with zero target and zero weight contribution", () => {
    // A zero-target item cannot express progress; it must not poison the sum.
    expect(
      projectProgress([
        item({ targetQty: 0, weight: 1, installedQty: 0 }),
        item({ installedQty: 50 }),
      ])
    ).toBe(50);
  });

  it("returns 0 when all weights are zero", () => {
    expect(projectProgress([item({ weight: 0, installedQty: 50 })])).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(projectProgress([item({ targetQty: 3, installedQty: 1 })])).toBe(33.3);
  });
});
