import { describe, expect, it } from "vitest";
import { projectToday, projectZone } from "@/lib/project-time";

describe("projectZone", () => {
  it("maps country to its IANA zone and defaults to Ljubljana", () => {
    expect(projectZone("si")).toBe("Europe/Ljubljana");
    expect(projectZone("de")).toBe("Europe/Berlin");
    expect(projectZone("at")).toBe("Europe/Vienna");
    expect(projectZone(null)).toBe("Europe/Ljubljana");
    expect(projectZone("xx")).toBe("Europe/Ljubljana");
  });
});

describe("projectToday", () => {
  it("returns the site-local calendar day, not the UTC day", () => {
    // 2026-07-17 23:30 UTC is already 2026-07-18 in CEST (UTC+2).
    const instant = new Date("2026-07-17T23:30:00Z");
    expect(projectToday("si", instant)).toBe("2026-07-18");
    expect(projectToday("de", instant)).toBe("2026-07-18");
  });

  it("formats as yyyy-mm-dd", () => {
    expect(projectToday("si", new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});
