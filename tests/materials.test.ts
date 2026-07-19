import { describe, it, expect } from "vitest";
import {
  buildMaterialState,
  buildCheckItemsPayload,
  shortfallCount,
  parseQty,
  type MaterialItemRow,
  type LatestCheck,
} from "@/lib/materials-shared";
import { hhmm } from "@/lib/project-time";

function item(id: string, updatedAt: string, qty = 100): MaterialItemRow {
  return { id, name: id, qty, unit: "kos", sortOrder: 1, updatedAt };
}

function check(over: Partial<LatestCheck>): LatestCheck {
  return {
    id: "c1",
    isComplete: false,
    note: null,
    checkedAt: "2026-07-10T12:00:00Z",
    items: [],
    docs: [],
    ...over,
  };
}

describe("buildMaterialState", () => {
  it("no check means the gate and every item outstanding", () => {
    const s = buildMaterialState([item("a", "2026-07-01T00:00:00Z"), item("b", "2026-07-01T00:00:00Z")], null);
    expect(s.needsFirstCheck).toBe(true);
    expect(s.uncoveredOrChanged).toBe(2);
  });

  it("a check covering all items with no later updates is settled", () => {
    const items = [item("a", "2026-07-01T00:00:00Z"), item("b", "2026-07-01T00:00:00Z")];
    const latest = check({
      items: [
        { materialItemId: "a", status: "present", missingQty: null },
        { materialItemId: "b", status: "present", missingQty: null },
      ],
    });
    const s = buildMaterialState(items, latest);
    expect(s.needsFirstCheck).toBe(false);
    expect(s.uncoveredOrChanged).toBe(0);
  });

  it("an item with NO row in the latest check counts, even when its updatedAt predates checkedAt", () => {
    // The mid-flight add: item b was added while the crew's form was open, so
    // the submitted check has no row for it. Its updatedAt is old, but it must
    // still count.
    const items = [item("a", "2026-07-01T00:00:00Z"), item("b", "2026-07-01T00:00:00Z")];
    const latest = check({
      checkedAt: "2026-07-10T12:00:00Z",
      items: [{ materialItemId: "a", status: "present", missingQty: null }],
    });
    expect(buildMaterialState(items, latest).uncoveredOrChanged).toBe(1);
  });

  it("an item updated after checkedAt counts, using instant comparison across offsets", () => {
    // updatedAt written with a +02:00 offset, checkedAt in Z; string comparison
    // would misorder these, Date.parse does not.
    const items = [item("a", "2026-07-10T15:00:00+02:00")]; // 13:00Z, after 12:00Z
    const latest = check({
      checkedAt: "2026-07-10T12:00:00Z",
      items: [{ materialItemId: "a", status: "present", missingQty: null }],
    });
    expect(buildMaterialState(items, latest).uncoveredOrChanged).toBe(1);
  });

  it("the escape state (a check with no items) counts every item", () => {
    const items = [item("a", "2026-07-01T00:00:00Z"), item("b", "2026-07-01T00:00:00Z")];
    const latest = check({ items: [] });
    expect(buildMaterialState(items, latest).uncoveredOrChanged).toBe(2);
  });
});

describe("buildCheckItemsPayload", () => {
  const items = [item("a", "x", 100), item("b", "x", 50)];

  it("all present is ok and optimistically complete", () => {
    const r = buildCheckItemsPayload(items, {
      a: { status: "present", missingQty: null },
      b: { status: "present", missingQty: null },
    });
    expect(r.ok && r.isComplete).toBe(true);
  });

  it("a valid partial is ok and not complete", () => {
    const r = buildCheckItemsPayload(items, {
      a: { status: "partial", missingQty: 40 },
      b: { status: "present", missingQty: null },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.isComplete).toBe(false);
      expect(r.items[0].missing_qty).toBe(40);
    }
  });

  it("an unresolved row is rejected", () => {
    const r = buildCheckItemsPayload(items, {
      a: { status: null, missingQty: null },
      b: { status: "present", missingQty: null },
    });
    expect(r).toEqual({ ok: false, error: "unresolved" });
  });

  it("partial with a bad missing quantity is rejected", () => {
    for (const q of [null, 0, -5, 100, 150]) {
      const r = buildCheckItemsPayload(items, {
        a: { status: "partial", missingQty: q },
        b: { status: "present", missingQty: null },
      });
      expect(r).toEqual({ ok: false, error: "badQty" });
    }
  });

  it("missing defaults its quantity to the full qty", () => {
    const r = buildCheckItemsPayload(items, {
      a: { status: "missing", missingQty: null },
      b: { status: "present", missingQty: null },
    });
    expect(r.ok && r.items[0].missing_qty).toBe(100);
  });

  it("a qty<=0 item cannot be partial", () => {
    const zero = [item("z", "x", 0)];
    const r = buildCheckItemsPayload(zero, { z: { status: "partial", missingQty: 1 } });
    expect(r).toEqual({ ok: false, error: "badQty" });
  });
});

describe("parseQty", () => {
  it("accepts a comma decimal", () => {
    expect(parseQty("3,5")).toBe(3.5);
  });
  it("accepts a period decimal", () => {
    expect(parseQty("3.5")).toBe(3.5);
  });
  it("rounds to two decimals", () => {
    expect(parseQty("3,555")).toBe(3.56);
  });
  it("rejects non-numeric and empty input", () => {
    expect(Number.isNaN(parseQty("abc"))).toBe(true);
    expect(Number.isNaN(parseQty(""))).toBe(true);
  });
});

describe("shortfallCount", () => {
  it("counts partial and missing, not present", () => {
    expect(
      shortfallCount([
        { materialItemId: "a", status: "present", missingQty: null },
        { materialItemId: "b", status: "partial", missingQty: 5 },
        { materialItemId: "c", status: "missing", missingQty: 10 },
      ])
    ).toBe(2);
  });
});

describe("hhmm", () => {
  it("renders a UTC timestamp in the site zone", () => {
    // 06:40Z in July in Ljubljana (CEST, +02:00) is 08:40.
    expect(hhmm("2026-07-10T06:40:00Z", "si")).toBe("08:40");
  });
});
