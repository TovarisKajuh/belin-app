import { describe, expect, it } from "vitest";
import { asAppLocale, fmtDate, fmtDateTime, fmtKwp, fmtNumber, fmtPct } from "@/lib/format";

// Captured from Intl on Node 22.15.0 (ICU 76.1, CLDR 46.0) for sl-SI, de-DE,
// en-GB. If a Node upgrade changes CLDR, these fail loudly, which is the point:
// a changed date format on an invoice should be a decision, not a surprise.

describe("fmtNumber", () => {
  it.each([
    ["sl", 245.7, "245,7"], ["de", 245.7, "245,7"], ["en", 245.7, "245.7"],
    ["sl", 1234.5, "1.234,5"], ["de", 1234.5, "1.234,5"], ["en", 1234.5, "1,234.5"],
    ["sl", 1234567.891, "1.234.567,89"], ["de", 1234567.891, "1.234.567,89"], ["en", 1234567.891, "1,234,567.89"],
    ["sl", -1234.5, "\u22121.234,5"], ["de", -1234.5, "-1.234,5"], ["en", -1234.5, "-1,234.5"],
    ["sl", 0, "0"],
  ])("%s %d", (locale, value, expected) => {
    expect(fmtNumber(value as number, locale as string)).toBe(expected);
  });

  it("fixes the decimals when asked, so a tempo of 6 reads 6,0 next to 6,5", () => {
    expect(fmtNumber(6.5, "sl", { decimals: 1 })).toBe("6,5");
    expect(fmtNumber(6, "sl", { decimals: 1 })).toBe("6,0");
    expect(fmtNumber(6, "de", { decimals: 1 })).toBe("6,0");
    expect(fmtNumber(6, "en", { decimals: 1 })).toBe("6.0");
  });

  it("returns nothing rather than NaN", () => {
    expect(fmtNumber(Number.NaN, "sl")).toBe("");
    expect(fmtNumber(Number.POSITIVE_INFINITY, "sl")).toBe("");
  });
});

describe("fmtKwp", () => {
  it.each([
    ["sl", 245.7, "245,7\u00a0kWp"], ["de", 245.7, "245,7\u00a0kWp"], ["en", 245.7, "245.7\u00a0kWp"],
    ["sl", 14.85, "14,85\u00a0kWp"], ["en", 14.85, "14.85\u00a0kWp"],
    ["sl", 1250, "1.250\u00a0kWp"], ["de", 1250, "1.250\u00a0kWp"], ["en", 1250, "1,250\u00a0kWp"],
  ])("%s %d", (locale, value, expected) => {
    expect(fmtKwp(value as number, locale as string)).toBe(expected);
  });
});

describe("fmtPct", () => {
  it("takes a 0 to 100 value, the way progressPercent is stored", () => {
    expect(fmtPct(58.3, "sl")).toBe("58\u00a0%");
    expect(fmtPct(58.3, "de")).toBe("58\u00a0%");
    expect(fmtPct(58.3, "en")).toBe("58%");
    expect(fmtPct(58.3, "sl", 1)).toBe("58,3\u00a0%");
    expect(fmtPct(58.3, "en", 1)).toBe("58.3%");
    expect(fmtPct(100, "sl")).toBe("100\u00a0%");
  });
});

describe("fmtDate", () => {
  it("short dates per locale", () => {
    expect(fmtDate("2026-10-06", "sl")).toBe("6. 10. 2026");
    expect(fmtDate("2026-10-06", "de")).toBe("06.10.2026");
    expect(fmtDate("2026-10-06", "en")).toBe("06/10/2026");
    expect(fmtDate("2026-01-15", "sl")).toBe("15. 1. 2026");
    expect(fmtDate("2026-01-15", "de")).toBe("15.01.2026");
    expect(fmtDate("2026-01-15", "en")).toBe("15/01/2026");
  });

  it("long dates per locale", () => {
    expect(fmtDate("2026-10-06", "sl", { style: "long" })).toBe("6. oktober 2026");
    expect(fmtDate("2026-10-06", "de", { style: "long" })).toBe("6. Oktober 2026");
    expect(fmtDate("2026-10-06", "en", { style: "long" })).toBe("6 October 2026");
  });

  it("day and month without the year, for dashboards and day lists", () => {
    expect(fmtDate("2026-10-05", "sl", { style: "dayMonth" })).toBe("5. 10.");
    expect(fmtDate("2026-10-05", "de", { style: "dayMonth" })).toBe("05.10.");
    expect(fmtDate("2026-10-05", "en", { style: "dayMonth" })).toBe("05/10");
    expect(fmtDate("2026-10-05T22:30:00Z", "sl", { style: "dayMonth", timeZone: "Europe/Ljubljana" })).toBe("6. 10.");
  });

  it("a timestamp at 00:30 site time is that day, not the UTC day before", () => {
    expect(fmtDate("2026-10-05T22:30:00Z", "sl")).toBe("6. 10. 2026");
    expect(fmtDate("2026-10-05T22:30:00Z", "de")).toBe("06.10.2026");
    expect(fmtDate("2026-10-05T22:30:00Z", "sl", { timeZone: "UTC" })).toBe("5. 10. 2026");
  });

  it("a calendar date never shifts, whatever zone is passed", () => {
    expect(fmtDate("2026-10-06", "sl", { timeZone: "America/New_York" })).toBe("6. 10. 2026");
  });

  it("falls back to Slovenian for an unknown locale, and to empty for garbage", () => {
    expect(fmtDate("2026-10-06", "fr")).toBe("6. 10. 2026");
    expect(fmtDate("not a date", "sl")).toBe("");
    expect(asAppLocale("de")).toBe("de");
    expect(asAppLocale(null)).toBe("sl");
  });
});

describe("fmtDateTime", () => {
  it("24 hour clock in the site zone", () => {
    expect(fmtDateTime("2026-10-06T12:05:00Z", "sl")).toBe("6. 10. 2026, 14:05");
    expect(fmtDateTime("2026-10-06T12:05:00Z", "de")).toBe("06.10.2026, 14:05");
    expect(fmtDateTime("2026-10-06T12:05:00Z", "en")).toBe("06/10/2026, 14:05");
    expect(fmtDateTime("2026-10-05T22:30:00Z", "sl")).toBe("6. 10. 2026, 00:30");
    expect(fmtDateTime("2026-03-02T07:04:00Z", "sl")).toBe("2. 3. 2026, 08:04");
    expect(fmtDateTime("2026-03-02T07:04:00Z", "de")).toBe("02.03.2026, 08:04");
  });
});
