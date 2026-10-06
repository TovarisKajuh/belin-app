import { describe, expect, it } from "vitest";
import { addWorkingDays } from "@/lib/hours-shared";

// The naročilnica's clause and the clock must count the same days (D9): Monday
// to Saturday, except the Slovenian dela prosti dnevi, the submission day not
// counted. 23. 11. (dan Rudolfa Maistra) is a praznik but NOT a dela prost dan,
// so it counts; 25. and 26. 12. and 1. and 2. 1. do not.
describe("deemed-approval clock and the printed clause", () => {
  it("counts a praznik that is a working day", () => {
    expect(addWorkingDays("2026-11-18", 6, "si")).toBe("2026-11-25");
  });
  it("skips the dela prosti dnevi over the new year", () => {
    expect(addWorkingDays("2026-12-23", 6, "si")).toBe("2027-01-04");
  });
});
