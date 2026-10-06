import { describe, expect, it } from "vitest";
import {
  applyLikeLast,
  bumpQty,
  parseWholeNumber,
  previousDay,
  remainingQty,
  summarizeLastReport,
} from "@/lib/reports-shared";

describe("summarizeLastReport", () => {
  it("takes the latest day, the largest headcount and the summed quantities", () => {
    const last = summarizeLastReport(
      [
        { id: "a", entry_date: "2026-10-05", headcount: 5 },
        { id: "b", entry_date: "2026-10-05", headcount: 6 },
        { id: "c", entry_date: "2026-10-02", headcount: 4 },
      ],
      [
        { entry_id: "a", scope_item_id: "mod", qty: 40 },
        { entry_id: "b", scope_item_id: "mod", qty: 30 },
        { entry_id: "b", scope_item_id: "dc", qty: 100 },
        { entry_id: "c", scope_item_id: "mod", qty: 99 },
      ],
    );
    expect(last).toEqual({ date: "2026-10-05", headcount: 6, quantities: { mod: 70, dc: 100 } });
  });
  it("is null without history", () => {
    expect(summarizeLastReport([], [])).toBeNull();
  });
});

describe("quantity helpers", () => {
  it("caps at what is left and never goes below zero", () => {
    expect(remainingQty(546, 500)).toBe(46);
    expect(remainingQty(546, 600)).toBe(0);
    expect(bumpQty(40, 50, 46)).toBe(46);
    expect(bumpQty(5, -10, 46)).toBe(0);
  });
  it("applies the last day capped to what is left, dropping zeros", () => {
    const scope = [
      { id: "mod", targetQty: 546, installedQty: 500 },
      { id: "dc", targetQty: 1200, installedQty: 300 },
      { id: "uk", targetQty: 546, installedQty: 546 },
    ];
    expect(applyLikeLast({ date: "2026-10-05", headcount: 6, quantities: { mod: 70, dc: 100, uk: 10 } }, scope)).toEqual({
      mod: 46,
      dc: 100,
    });
  });
  it("reads only whole numbers", () => {
    expect(parseWholeNumber("36")).toBe(36);
    expect(parseWholeNumber(" 1 200 ")).toBe(1200);
    expect(parseWholeNumber("")).toBeNull();
    expect(parseWholeNumber("3,5")).toBeNull();
  });
  it("finds the calendar day before", () => {
    expect(previousDay("2026-10-06")).toBe("2026-10-05");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });
});
