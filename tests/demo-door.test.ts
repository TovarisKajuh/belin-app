import { describe, expect, it } from "vitest";
import {
  doorOpen,
  signDemoCookie,
  verifyDemoCookie,
  signGuestPayload,
  verifyGuestPayload,
  DEMO_SESSION_TTL_MS,
  GUEST_QR_TTL_MS,
  type GuestPayload,
} from "@/lib/demo/door";

const KEY = "k".repeat(43);
const ENV = { DEMO_DOOR_KEY: KEY, DEMO_DOOR_UNTIL: "2026-10-13" };
const CLOSED = { ...ENV, DEMO_DOOR_UNTIL: "2026-10-05" };
const NOW = new Date("2026-10-06T10:00:00Z");

describe("doorOpen", () => {
  it("opens for the configured key before its last day", () => {
    expect(doorOpen(KEY, ENV, NOW)).toBe(true);
  });
  it("is open all of the last day in Ljubljana and closed the minute after", () => {
    expect(doorOpen(KEY, ENV, new Date("2026-10-13T21:30:00Z"))).toBe(true); // 23:30 on 13.10
    expect(doorOpen(KEY, ENV, new Date("2026-10-13T22:30:00Z"))).toBe(false); // 00:30 on 14.10
  });
  it("refuses a wrong key of the same length and of any other length", () => {
    expect(doorOpen("x".repeat(43), ENV, NOW)).toBe(false);
    expect(doorOpen(KEY.slice(1), ENV, NOW)).toBe(false);
    expect(doorOpen(`${KEY}k`, ENV, NOW)).toBe(false);
  });
  it("refuses anything that is not a string", () => {
    for (const value of [undefined, null, 42, [KEY], {}]) expect(doorOpen(value, ENV, NOW)).toBe(false);
  });
  it("stays closed without a key, or with a key shorter than 32", () => {
    expect(doorOpen(KEY, { DEMO_DOOR_UNTIL: "2026-10-13" }, NOW)).toBe(false);
    const short = "s".repeat(31);
    expect(doorOpen(short, { DEMO_DOOR_KEY: short, DEMO_DOOR_UNTIL: "2026-10-13" }, NOW)).toBe(false);
  });
  it("stays closed without a well formed last day, and after it", () => {
    for (const until of [undefined, "", "13.10.2026", "2026-10-13T00:00", "soon"]) {
      expect(doorOpen(KEY, { DEMO_DOOR_KEY: KEY, DEMO_DOOR_UNTIL: until }, NOW)).toBe(false);
    }
    expect(doorOpen(KEY, CLOSED, NOW)).toBe(false);
  });
});

describe("presenter cookie", () => {
  const exp = NOW.getTime() + DEMO_SESSION_TTL_MS;
  it("verifies what it signed", () => {
    expect(verifyDemoCookie(signDemoCookie(exp, ENV), ENV, NOW)).toBe(true);
  });
  it("refuses a forged signature", () => {
    const [expText, mac] = signDemoCookie(exp, ENV)!.split(".");
    expect(verifyDemoCookie(`${expText}.${mac[0] === "A" ? "B" : "A"}${mac.slice(1)}`, ENV, NOW)).toBe(false);
  });
  it("refuses a cookie signed with another key", () => {
    expect(verifyDemoCookie(signDemoCookie(exp, { ...ENV, DEMO_DOOR_KEY: "z".repeat(43) }), ENV, NOW)).toBe(false);
  });
  it("refuses a moved expiry", () => {
    const [, mac] = signDemoCookie(exp, ENV)!.split(".");
    expect(verifyDemoCookie(`${exp + 3600000}.${mac}`, ENV, NOW)).toBe(false);
  });
  it("refuses an expired cookie and one that claims to live longer than a session", () => {
    expect(verifyDemoCookie(signDemoCookie(NOW.getTime() - 1000, ENV), ENV, NOW)).toBe(false);
    expect(verifyDemoCookie(signDemoCookie(NOW.getTime() + 7 * 86400000, ENV), ENV, NOW)).toBe(false);
  });
  it("refuses everything once the door has closed", () => {
    expect(verifyDemoCookie(signDemoCookie(exp, ENV), CLOSED, NOW)).toBe(false);
  });
  it("refuses malformed values", () => {
    for (const value of [undefined, null, "", "abc", "123.", ".abc", "12345678901234.x"]) {
      expect(verifyDemoCookie(value, ENV, NOW)).toBe(false);
    }
  });
});

describe("guest QR payload", () => {
  const payload: GuestPayload = { persona: "guest", project: "trenutno", exp: NOW.getTime() + GUEST_QR_TTL_MS };
  it("round trips, and carries no dot the locale middleware would skip", () => {
    const sig = signGuestPayload(payload, ENV)!;
    expect(sig).not.toContain(".");
    expect(verifyGuestPayload(sig, ENV, NOW)).toEqual(payload);
  });
  it("refuses an expired QR", () => {
    expect(verifyGuestPayload(signGuestPayload(payload, ENV)!, ENV, new Date(payload.exp + 1))).toBeNull();
  });
  it("refuses a QR that claims to live longer than one can", () => {
    expect(verifyGuestPayload(signGuestPayload({ ...payload, exp: NOW.getTime() + 86400000 }, ENV)!, ENV, NOW)).toBeNull();
  });
  it("refuses a tampered payload", () => {
    const [, mac] = signGuestPayload(payload, ENV)!.split("~");
    const other = Buffer.from(JSON.stringify({ ...payload, project: "dan1" })).toString("base64url");
    expect(verifyGuestPayload(`${other}~${mac}`, ENV, NOW)).toBeNull();
  });
  it("refuses any persona but the guest, even when correctly signed", () => {
    const sig = signGuestPayload({ ...payload, persona: "epcAdmin" } as unknown as GuestPayload, ENV)!;
    expect(verifyGuestPayload(sig, ENV, NOW)).toBeNull();
  });
  it("refuses an unknown project", () => {
    const sig = signGuestPayload({ ...payload, project: "portfelj" } as unknown as GuestPayload, ENV)!;
    expect(verifyGuestPayload(sig, ENV, NOW)).toBeNull();
  });
  it("is not interchangeable with the presenter cookie", () => {
    const [body, mac] = signGuestPayload(payload, ENV)!.split("~");
    expect(verifyDemoCookie(`${payload.exp}.${mac}`, ENV, NOW)).toBe(false);
    expect(body.length).toBeGreaterThan(0);
  });
  it("refuses everything once the door has closed, and refuses garbage", () => {
    expect(verifyGuestPayload(signGuestPayload(payload, ENV)!, CLOSED, NOW)).toBeNull();
    for (const sig of ["", "~", "abc", "abc~def", "%%%~%%%"]) expect(verifyGuestPayload(sig, ENV, NOW)).toBeNull();
  });
});
