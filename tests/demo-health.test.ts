import { describe, expect, it } from "vitest";
import { dbLight, regionLight, freshLight, sheetLight, poLight } from "@/lib/demo/health-shared";

const hash = "a".repeat(64);

describe("demo health lights", () => {
  it("database: green under 400 ms, amber to 1.5 s, red beyond or unflagged or down", () => {
    expect(dbLight({ ok: true, flagged: true, ms: 120 })).toBe("ok");
    expect(dbLight({ ok: true, flagged: true, ms: 900 })).toBe("warn");
    expect(dbLight({ ok: true, flagged: true, ms: 2400 })).toBe("bad");
    expect(dbLight({ ok: true, flagged: false, ms: 120 })).toBe("bad");
    expect(dbLight({ ok: false, flagged: false, ms: null })).toBe("bad");
  });
  it("region: Frankfurt is green, anything else is amber", () => {
    expect(regionLight("fra1")).toBe("ok");
    expect(regionLight("iad1")).toBe("warn");
    expect(regionLight(null)).toBe("warn");
  });
  it("freshness: the last report must be on the last site day or later", () => {
    expect(freshLight("2026-10-05", "2026-10-06")).toBe("ok");
    expect(freshLight("2026-10-06", "2026-10-06")).toBe("ok");
    expect(freshLight("2026-10-02", "2026-10-06")).toBe("bad");
    expect(freshLight("2026-10-02", "2026-10-05")).toBe("ok"); // Monday: Friday was the last site day
    expect(freshLight(null, "2026-10-06")).toBe("bad");
  });
  it("hour sheet: submitted with a deadline still ahead", () => {
    const now = new Date("2026-10-06T10:00:00Z");
    expect(sheetLight({ status: "submitted", deadline_at: "2026-10-08T21:59:59Z" }, now)).toBe("ok");
    expect(sheetLight({ status: "submitted", deadline_at: "2026-10-05T21:59:59Z" }, now)).toBe("bad");
    expect(sheetLight({ status: "deemed_approved", deadline_at: "2026-10-08T21:59:59Z" }, now)).toBe("bad");
    expect(sheetLight(null, now)).toBe("bad");
  });
  it("naročilnice: both have a stored PDF and a sha256", () => {
    expect(poLight([{ pdf_path: "a.pdf", pdf_sha256: hash }, { pdf_path: "b.pdf", pdf_sha256: hash }])).toBe("ok");
    expect(poLight([{ pdf_path: "a.pdf", pdf_sha256: hash }, { pdf_path: null, pdf_sha256: null }])).toBe("bad");
    expect(poLight([{ pdf_path: "a.pdf", pdf_sha256: hash }])).toBe("bad");
  });
});
