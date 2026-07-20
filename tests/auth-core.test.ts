import { describe, it, expect } from "vitest";
import {
  hashToken,
  newRawToken,
  loginTokenValid,
  LOGIN_TOKEN_TTL_MIN,
  SESSION_TTL_DAYS,
  LOGIN_RATE_MAX,
} from "@/lib/auth-core";

describe("hashToken", () => {
  it("is deterministic and returns 64 hex characters", () => {
    const a = hashToken("some-raw-token");
    const b = hashToken("some-raw-token");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives different hashes to different tokens", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  // The point of hashing: what the database holds must not be replayable as a
  // login even if the whole table leaks.
  it("never returns the raw token", () => {
    const raw = newRawToken();
    expect(hashToken(raw)).not.toBe(raw);
  });
});

describe("newRawToken", () => {
  it("is url safe and long enough to survive being pasted into a link", () => {
    for (let i = 0; i < 20; i++) {
      const raw = newRawToken();
      expect(raw.length).toBeGreaterThanOrEqual(40);
      expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("does not repeat", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(newRawToken());
    expect(seen.size).toBe(200);
  });
});

describe("loginTokenValid", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("accepts an unused token that has not expired", () => {
    expect(
      loginTokenValid({ expires_at: "2026-07-20T12:10:00.000Z", used_at: null }, now),
    ).toBe(true);
  });

  it("refuses an expired token", () => {
    expect(
      loginTokenValid({ expires_at: "2026-07-20T11:59:59.000Z", used_at: null }, now),
    ).toBe(false);
  });

  it("refuses a token that was already used", () => {
    expect(
      loginTokenValid(
        { expires_at: "2026-07-20T12:10:00.000Z", used_at: "2026-07-20T12:01:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("treats the exact expiry instant as expired", () => {
    expect(
      loginTokenValid({ expires_at: "2026-07-20T12:00:00.000Z", used_at: null }, now),
    ).toBe(false);
  });
});

describe("lifetime constants", () => {
  it("holds the decided values", () => {
    expect(LOGIN_TOKEN_TTL_MIN).toBe(15);
    expect(SESSION_TTL_DAYS).toBe(30);
    expect(LOGIN_RATE_MAX).toBe(3);
  });
});
