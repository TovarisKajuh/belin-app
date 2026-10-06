import { describe, expect, it } from "vitest";
import { shouldRenewSession } from "@/lib/auth-core";

const DAY = 86400000;
const now = new Date("2026-10-06T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("shouldRenewSession", () => {
  it("leaves a fresh standard session alone", () => {
    expect(shouldRenewSession({ createdAt: iso(now.getTime()), expiresAt: iso(now.getTime() + 30 * DAY) }, now)).toBe(false);
  });
  it("rolls a standard session forward in its second half", () => {
    const created = now.getTime() - 16 * DAY;
    expect(shouldRenewSession({ createdAt: iso(created), expiresAt: iso(created + 30 * DAY) }, now)).toBe(true);
  });
  it("keeps rolling a session that was already renewed", () => {
    expect(shouldRenewSession({ createdAt: iso(now.getTime() - 40 * DAY), expiresAt: iso(now.getTime() + 10 * DAY) }, now)).toBe(true);
  });
  it("never extends a 12 hour presenter session or a 2 hour guest pass", () => {
    expect(shouldRenewSession({ createdAt: iso(now.getTime() - 3600000), expiresAt: iso(now.getTime() + 11 * 3600000) }, now)).toBe(false);
    expect(shouldRenewSession({ createdAt: iso(now.getTime() - 60000), expiresAt: iso(now.getTime() + 2 * 3600000) }, now)).toBe(false);
  });
  it("refuses unreadable dates", () => {
    expect(shouldRenewSession({ createdAt: "x", expiresAt: "y" }, now)).toBe(false);
  });
});
