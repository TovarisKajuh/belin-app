import { createHash, randomBytes } from "node:crypto";

// The pure core of magic-link login. Two rules shape everything here:
//
// 1. The database never sees a raw token, only its sha256. A leaked
//    login_tokens or sessions table is then useless: the hash cannot be
//    replayed as a login, and there is no reversible secret to steal.
// 2. Validity is decided by data, not by trust. loginTokenValid exists so the
//    rule can be tested in isolation, but the live consumption path applies
//    the same guard inside a single conditional UPDATE, so two clicks on the
//    same link can never both win.

export const LOGIN_TOKEN_TTL_MIN = 15;
export const SESSION_TTL_DAYS = 30;

// How many unexpired, unused login tokens one person may hold at once. Past
// this, requestMagicLink returns its usual generic success without sending, so
// a stranger cannot use the login form to flood somebody's inbox.
export const LOGIN_RATE_MAX = 3;

// How many login links one person may be sent per rolling 24 hours (Task 4.3
// Step 7a). The Resend account sends at most 100 mails per UTC day for every
// purpose together; without this a script against the login form could spend
// the day's budget on one known address.
export const LOGIN_DAILY_MAX = 10;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

// 32 bytes of CSPRNG entropy, base64url so it survives a URL, an email client
// and a copy paste unharmed. Also used for invite tokens.
export function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * A post-login destination is only ever a path on this site. Anything else,
 * including a protocol-relative "//evil.example" (which a browser reads as an
 * absolute URL), is dropped rather than repaired, so a crafted login link
 * cannot bounce a freshly signed-in person onto somebody else's site.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return null;
  return value;
}

export function loginTokenValid(
  row: { expires_at: string; used_at: string | null },
  now: Date,
): boolean {
  if (row.used_at !== null) return false;
  return new Date(row.expires_at).getTime() > now.getTime();
}

/**
 * Whether a person session should be rolled forward.
 *
 * Only a session issued at the standard lifetime rolls. A deliberately short
 * one (a Demo Door presenter or guest session) must end when it said it would:
 * the old rule, "less than half of thirty days left", is true of every short
 * session from its first second and would have turned a two hour guest pass
 * into a thirty day one on its first page view.
 */
export function shouldRenewSession(row: { createdAt: string; expiresAt: string }, now: Date): boolean {
  const created = Date.parse(row.createdAt);
  const expires = Date.parse(row.expiresAt);
  if (Number.isNaN(created) || Number.isNaN(expires)) return false;
  const standardMs = SESSION_TTL_DAYS * 86400000;
  // An hour of slack: expires_at is computed in Node, created_at by the database clock.
  const issuedStandard = expires - created >= standardMs - 3600000;
  return issuedStandard && expires - now.getTime() < standardMs / 2;
}
