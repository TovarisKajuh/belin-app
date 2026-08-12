import { describe, expect, it } from "vitest";
import { INCIDENT_KINDS, MAX_INCIDENT_PHOTOS, validateIncident } from "@/lib/incidents-shared";

describe("validateIncident", () => {
  it("accepts all three kinds", () => {
    for (const kind of INCIDENT_KINDS) {
      const result = validateIncident({ kind, note: "nekaj se je zgodilo", photoCount: 0 });
      expect(result.ok).toBe(true);
    }
  });

  it("refuses a kind outside the three", () => {
    const result = validateIncident({ kind: "flood", note: "voda", photoCount: 0 });
    expect(result).toEqual({ ok: false, error: "kind" });
  });

  // Design law 1: typing a sentence in the rain is not mandatory. For a rain
  // stop or an obstruction the KIND is the message, and the renderers show the
  // kind label when the note is empty. Only a general "zaplet" needs words,
  // because without them nobody knows what happened.
  it("allows an empty note for a rain stop and an obstruction", () => {
    expect(validateIncident({ kind: "rain_stop", note: "", photoCount: 0 }).ok).toBe(true);
    expect(validateIncident({ kind: "obstruction", note: "   ", photoCount: 0 }).ok).toBe(true);
  });

  it("requires a note for a general incident", () => {
    expect(validateIncident({ kind: "incident", note: "", photoCount: 0 })).toEqual({
      ok: false,
      error: "note",
    });
    expect(validateIncident({ kind: "incident", note: "   ", photoCount: 0 })).toEqual({
      ok: false,
      error: "note",
    });
  });

  it("trims the note it returns", () => {
    const result = validateIncident({ kind: "incident", note: "  padec plošče  ", photoCount: 0 });
    expect(result).toEqual({ ok: true, kind: "incident", note: "padec plošče" });
  });

  it("returns an empty note rather than inventing one", () => {
    const result = validateIncident({ kind: "rain_stop", note: "  ", photoCount: 2 });
    expect(result).toEqual({ ok: true, kind: "rain_stop", note: "" });
  });

  it("accepts no photos and refuses more than the cap", () => {
    expect(validateIncident({ kind: "rain_stop", note: "", photoCount: 0 }).ok).toBe(true);
    expect(validateIncident({ kind: "rain_stop", note: "", photoCount: MAX_INCIDENT_PHOTOS }).ok).toBe(
      true,
    );
    expect(
      validateIncident({ kind: "rain_stop", note: "", photoCount: MAX_INCIDENT_PHOTOS + 1 }),
    ).toEqual({ ok: false, error: "photos" });
  });

  it("refuses a negative photo count", () => {
    expect(validateIncident({ kind: "rain_stop", note: "", photoCount: -1 })).toEqual({
      ok: false,
      error: "photos",
    });
  });
});
