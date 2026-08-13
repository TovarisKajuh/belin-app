import { describe, expect, it } from "vitest";
import { normalizeCrewName, matchRosterName } from "@/lib/crew-shared";

// The claim screen takes free text from a phone keyboard on a roof. These rules
// are small, but they are the difference between one Luka and three of him.
describe("normalizeCrewName", () => {
  it("trims and collapses whitespace, keeping the letters as typed", () => {
    expect(normalizeCrewName("  Luka   Zupan ")).toBe("Luka Zupan");
  });

  it("refuses empty input and a single stray character", () => {
    expect(normalizeCrewName("   ")).toBeNull();
    expect(normalizeCrewName("L")).toBeNull();
  });

  it("caps the length so a paste cannot become a name", () => {
    expect(normalizeCrewName("x".repeat(81))).toBeNull();
    expect(normalizeCrewName("x".repeat(80))).not.toBeNull();
  });

  it("keeps Slovenian letters intact", () => {
    expect(normalizeCrewName("Boštjan Čeh")).toBe("Boštjan Čeh");
  });
});

describe("matchRosterName", () => {
  const roster = [
    { id: "a", fullName: "Luka Zupan" },
    { id: "b", fullName: "Miha Oblak" },
  ];

  it("finds the man already on the list however he types his name", () => {
    expect(matchRosterName(roster, " luka  ZUPAN ")).toBe("a");
  });

  it("returns null for a genuinely new name", () => {
    expect(matchRosterName(roster, "Jan Kranjc")).toBeNull();
  });

  it("returns null rather than a match for unusable input", () => {
    expect(matchRosterName(roster, " ")).toBeNull();
  });
});
