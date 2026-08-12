import { describe, expect, it } from "vitest";
import { formatMoney, lineTotal, poTotals, round2 } from "@/lib/po-shared";

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(10)).toBe(10);
  });

  // Money arithmetic in binary floating point drifts: 0.1 + 0.2 is famously
  // 0.30000000000000004, and a naive Math.round(x * 100) / 100 rounds
  // 1.005 DOWN because the stored value is really 1.00499999999999989.
  it("rounds the values binary floating point gets wrong", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.555)).toBe(1.56);
    expect(round2(8.165)).toBe(8.17);
  });

  it("keeps negative values symmetrical", () => {
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(-2.344)).toBe(-2.34);
  });
});

describe("lineTotal", () => {
  it("multiplies quantity by unit price, rounded to cents", () => {
    expect(lineTotal(3, 2.005)).toBe(6.02);
    expect(lineTotal(8, 45)).toBe(360);
    expect(lineTotal(2.5, 19.99)).toBe(49.98);
  });

  // A line the EPC prices as a lump sum has no quantity and no unit price, and
  // its total is typed directly. Returning 0 here would quietly zero out real
  // money, so the absence of a computable total is expressed as null and the
  // caller keeps whatever was typed.
  it("returns null when either side is missing", () => {
    expect(lineTotal(null, 45)).toBeNull();
    expect(lineTotal(3, null)).toBeNull();
    expect(lineTotal(null, null)).toBeNull();
  });

  it("returns null for values that are not finite numbers", () => {
    expect(lineTotal(Number.NaN, 45)).toBeNull();
    expect(lineTotal(3, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("allows a zero quantity to produce a zero total", () => {
    expect(lineTotal(0, 45)).toBe(0);
  });
});

describe("poTotals", () => {
  it("sums line totals to two decimals", () => {
    expect(poTotals([{ total: 1000 }, { total: 320.5 }, { total: 0.25 }])).toBe(1320.75);
  });

  it("is zero for an empty order", () => {
    expect(poTotals([])).toBe(0);
  });

  // Summing cents that individually round cleanly can still drift once there
  // are enough of them; the sum is rounded once at the end.
  it("does not accumulate floating point drift", () => {
    expect(poTotals(Array.from({ length: 10 }, () => ({ total: 0.1 })))).toBe(1);
  });
});

describe("formatMoney", () => {
  it("formats Slovenian amounts with a comma decimal and a dot for thousands", () => {
    const formatted = formatMoney(12345.67, "sl");
    expect(formatted).toContain("12.345,67");
    expect(formatted).toContain("EUR");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(1000, "sl")).toContain("1.000,00");
    expect(formatMoney(0, "sl")).toContain("0,00");
  });

  it("formats German amounts the German way and English amounts the English way", () => {
    expect(formatMoney(12345.67, "de")).toContain("12.345,67");
    expect(formatMoney(12345.67, "en")).toContain("12,345.67");
  });
});
