import { describe, expect, it } from "vitest";
import { summarizeExtras, summarizeHours } from "@/lib/completion-shared";

const now = new Date("2026-10-06T10:00:00Z");

describe("summarizeHours", () => {
  it("separates approved (explicit and deemed) from open and rejected hours", () => {
    const result = summarizeHours(
      [
        { status: "approved", deadline_at: null, hours: 14 },
        { status: "deemed_approved", deadline_at: "2026-09-30T21:59:59Z", hours: 5 },
        { status: "submitted", deadline_at: "2026-10-08T21:59:59Z", hours: 6.5 },
        { status: "rejected", deadline_at: null, hours: 3 },
        { status: "draft", deadline_at: null, hours: 2 },
      ],
      now,
    );
    expect(result).toEqual({ approved: 19, pending: 6.5, rejected: 3 });
  });

  it("counts a sheet whose deadline passed in silence as approved, exactly as the invoice does", () => {
    const result = summarizeHours([{ status: "submitted", deadline_at: "2026-10-05T21:59:59Z", hours: 4 }], now);
    expect(result).toEqual({ approved: 4, pending: 0, rejected: 0 });
  });
});

describe("summarizeExtras", () => {
  it("sums only approved amounts and counts the unpriced ones apart", () => {
    expect(
      summarizeExtras([
        { status: "approved", amount: 1200 },
        { status: "approved", amount: null },
        { status: "submitted", amount: 800 },
        { status: "rejected", amount: 300 },
      ]),
    ).toEqual({ approvedCount: 2, approvedSum: 1200, approvedUnpriced: 1, pendingCount: 1, rejectedCount: 1 });
  });
});
