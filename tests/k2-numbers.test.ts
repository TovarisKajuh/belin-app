import { expect, it } from "vitest";
import { parseGermanNumber } from "@/lib/k2/k2-shared";

// Every case is pinned to a value that appears in a real fixture, except the
// two null cases and the stray-space quirk. See the plan's number section:
// a single universal parser is impossible because K2 quotes weights with a
// comma decimal and dimensions with a period as thousands separator.
const cases: [string, number | null][] = [
  ["292,9", 292.9], // forum1 total Summe
  ["58,5", 58.5], // forum2 Summe
  ["19,1", 19.1], // row weight
  ["0,85", 0.85], // Bodenschneelast
  ["26,02", 26.02], // Summe kWp, comma mode
  ["17", 17],
  ["188", 188],
  ["1.234,5", 1234.5], // thousands dot plus comma decimal
  ["1 234,56", 1234.56], // stray space
  ["2.700", 2700], // period with 3 trailing digits: thousands
  ["2.9", 2.9], // period with 1 to 2 trailing digits: decimal
  ["4.40", 4.4],
  ["", null],
  ["-", null],
  ["kg", null],
];

it.each(cases)("parseGermanNumber(%j) -> %j", (raw, want) => {
  expect(parseGermanNumber(raw)).toBe(want);
});

it("never throws on hostile input", () => {
  const junk = ["  ", ",", ".", ",,,", "1,2,3", "NaN", "Infinity", "1e5", "--7"];
  for (const raw of junk) {
    expect(() => parseGermanNumber(raw)).not.toThrow();
  }
  expect(parseGermanNumber("Infinity")).toBe(null);
  expect(parseGermanNumber(",")).toBe(null);
});
