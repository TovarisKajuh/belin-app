import { describe, it, expect } from "vitest";
import {
  expiryState,
  extensionForMime,
  isVaultType,
  VAULT_TYPES,
  EXPIRY_WARN_DAYS,
} from "@/lib/vault-shared";

const now = new Date("2026-07-20T14:30:00.000Z");

describe("expiryState", () => {
  it("is green when there is plenty of time", () => {
    expect(expiryState("2026-12-31", now)).toBe("valid");
    expect(expiryState("2026-08-20", now)).toBe("valid"); // 31 days
  });

  it("turns amber inside the warning window", () => {
    expect(expiryState("2026-08-19", now)).toBe("expiringSoon"); // 30 days
    expect(expiryState("2026-07-21", now)).toBe("expiringSoon");
  });

  // A certificate valid until the 20th covers the whole of the 20th. Turning it
  // red at midday would tell an EPC their crew is unposted while it still is.
  it("counts the last day as still valid", () => {
    expect(expiryState("2026-07-20", now)).toBe("expiringSoon");
  });

  it("is red the day after", () => {
    expect(expiryState("2026-07-19", now)).toBe("expired");
    expect(expiryState("2020-01-01", now)).toBe("expired");
  });

  it("says nothing when no expiry was recorded", () => {
    expect(expiryState(null, now)).toBe("none");
    expect(expiryState(undefined, now)).toBe("none");
    expect(expiryState("", now)).toBe("none");
    expect(expiryState("not a date", now)).toBe("none");
  });

  // The database hands back dates; a full timestamp must not change the verdict.
  it("ignores any time part on the stored value", () => {
    expect(expiryState("2026-07-20T00:00:00+00:00", now)).toBe("expiringSoon");
    expect(expiryState("2026-07-19T23:00:00+00:00", now)).toBe("expired");
  });

  it("gives the same answer regardless of the hour of the day", () => {
    for (const hour of ["00:00:01", "12:00:00", "23:59:59"]) {
      expect(expiryState("2026-07-20", new Date(`2026-07-20T${hour}.000Z`))).toBe("expiringSoon");
      expect(expiryState("2026-07-19", new Date(`2026-07-20T${hour}.000Z`))).toBe("expired");
    }
  });

  it("holds the decided warning window", () => {
    expect(EXPIRY_WARN_DAYS).toBe(30);
  });
});

describe("vault types", () => {
  // These two stop a German site, so they are the two an EPC chases.
  it("offers A1 and the Freistellungsbescheinigung first", () => {
    expect(VAULT_TYPES[0]).toBe("a1");
    expect(VAULT_TYPES[1]).toBe("freistellungsbescheinigung");
  });

  it("recognizes its own types and nothing else", () => {
    expect(isVaultType("a1")).toBe(true);
    expect(isVaultType("other")).toBe(true);
    expect(isVaultType("passport")).toBe(false);
    expect(isVaultType("")).toBe(false);
  });
});

describe("extensionForMime", () => {
  it("maps the three accepted types", () => {
    expect(extensionForMime("application/pdf")).toBe("pdf");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
  });

  // The extension never comes from the uploaded filename, so anything not on
  // the list has no extension to offer and the upload is refused.
  it("refuses anything else", () => {
    expect(extensionForMime("application/x-msdownload")).toBeNull();
    expect(extensionForMime("text/html")).toBeNull();
    expect(extensionForMime("")).toBeNull();
  });
});
