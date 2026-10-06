// The Demo Door: a secret, expiring way in for the presenter.
//
// Pure (no server-only), so every refusal path is unit tested. Three rules:
//   1. Fail closed. No key, a key under 32 characters, no last day, a
//      malformed last day, or a last day that has passed: the door is shut.
//   2. Compare secrets in constant time, never with ===.
//   3. Each signature names its purpose ("belin-demo-cookie:" or
//      "belin-demo-guest:"), so a value signed for one can never pass as the other.
//
// The key is the only secret. Everything the door hands out (the presenter
// cookie, the guest QR) is an HMAC under that key with an expiry inside it,
// so rotating the key or passing the last day closes the door, the presenter
// cookie and every guest QR at once. Persona sessions already issued are
// ordinary sessions rows and live until their own expiry (12 h, guest 2 h)
// unless deleted.

import { createHmac, timingSafeEqual } from "node:crypto";
import { projectToday } from "@/lib/project-time";
import type { DemoProjectKey } from "@/lib/demo/personas";

// The index signature lets process.env (which names neither key) be the
// default without a cast; TypeScript's weak-type check refuses it otherwise.
export type DoorEnv = { DEMO_DOOR_KEY?: string; DEMO_DOOR_UNTIL?: string; [name: string]: string | undefined };

export const DOOR_KEY_MIN_LENGTH = 32;
/** A presenter session: rehearsal plus meeting, dead the same night. */
export const DEMO_SESSION_TTL_MS = 12 * 3600000;
/** How long a guest QR can be scanned after the panel drew it. */
export const GUEST_QR_TTL_MS = 15 * 60000;
/** How long a guest phone stays signed in once it has scanned. */
export const GUEST_SESSION_TTL_MS = 2 * 3600000;

const SLACK_MS = 60000;
const GUEST_SEPARATOR = "~";

function configuredKey(env: DoorEnv): string | null {
  const key = env.DEMO_DOOR_KEY ?? "";
  return key.length >= DOOR_KEY_MIN_LENGTH ? key : null;
}

/** Configured, and today in Ljubljana is not past the last open day. */
export function doorConfigured(env: DoorEnv = process.env, now: Date = new Date()): boolean {
  if (!configuredKey(env)) return false;
  const until = (env.DEMO_DOOR_UNTIL ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return false;
  return projectToday("si", now) <= until;
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The key from a URL or a form, checked against the configured one. */
export function doorOpen(key: unknown, env: DoorEnv = process.env, now: Date = new Date()): boolean {
  if (typeof key !== "string") return false;
  const expected = configuredKey(env);
  if (!expected || !doorConfigured(env, now)) return false;
  return sameText(key, expected);
}

function mac(env: DoorEnv, purpose: "cookie" | "guest", message: string): string | null {
  const key = configuredKey(env);
  if (!key) return null;
  return createHmac("sha256", key).update(`belin-demo-${purpose}:${message}`).digest("base64url");
}

/** "<expiry ms>.<hmac>", the value of the httpOnly belin-demo cookie. */
export function signDemoCookie(expMs: number, env: DoorEnv = process.env): string | null {
  const m = mac(env, "cookie", String(expMs));
  return m ? `${expMs}.${m}` : null;
}

export function verifyDemoCookie(
  value: string | null | undefined,
  env: DoorEnv = process.env,
  now: Date = new Date(),
): boolean {
  if (!value || !doorConfigured(env, now)) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expText = value.slice(0, dot);
  if (!/^\d{13}$/.test(expText)) return false;
  const exp = Number(expText);
  if (exp <= now.getTime() || exp > now.getTime() + DEMO_SESSION_TTL_MS + SLACK_MS) return false;
  const expected = mac(env, "cookie", expText);
  return expected !== null && sameText(value.slice(dot + 1), expected);
}

export type GuestPayload = { persona: "guest"; project: DemoProjectKey; exp: number };

function isGuestPayload(value: unknown): value is GuestPayload {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    o.persona === "guest" &&
    (o.project === "trenutno" || o.project === "dan1") &&
    typeof o.exp === "number" &&
    Number.isFinite(o.exp)
  );
}

/** The path segment a guest QR carries: "<base64url json>~<hmac>". */
export function signGuestPayload(payload: GuestPayload, env: DoorEnv = process.env): string | null {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const m = mac(env, "guest", body);
  return m ? `${body}${GUEST_SEPARATOR}${m}` : null;
}

export function verifyGuestPayload(
  sig: string,
  env: DoorEnv = process.env,
  now: Date = new Date(),
): GuestPayload | null {
  if (!doorConfigured(env, now)) return null;
  const cut = sig.indexOf(GUEST_SEPARATOR);
  if (cut <= 0) return null;
  const body = sig.slice(0, cut);
  const expected = mac(env, "guest", body);
  if (!expected || !sameText(sig.slice(cut + 1), expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isGuestPayload(parsed)) return null;
  if (parsed.exp <= now.getTime() || parsed.exp > now.getTime() + GUEST_QR_TTL_MS + SLACK_MS) return null;
  return parsed;
}
