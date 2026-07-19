import "server-only";
import { cookies } from "next/headers";
import { resolveActorFromToken, type Actor } from "@/lib/actor";
import { tokenForCredentials, describeDemoToken, otherScenarioToken } from "@/lib/auth-shared";
import type { Scenario } from "@/lib/auth-shared";

export { tokenForCredentials, otherScenarioToken };

/** Which demo state the session is currently in, or null outside the demo set. */
export async function sessionScenario(): Promise<Scenario | null> {
  const token = await sessionToken();
  if (!token) return null;
  return describeDemoToken(token)?.scenario ?? null;
}

// DEMO LOGIN, TEMPORARY. Logged as debt in CHANGELOG.md on 2026-07-19.
//
// Two fixed credential pairs map to the two seeded project tokens. This exists
// so the founder and their partner can each open the app at the bare domain and
// land in their own side, instead of passing tokenized URLs around.
//
// It is safe today because the only data behind it is the fake Slovenian seed
// project on a site that is already public. It stops being safe on 27.07, when
// the German EPC puts real project data in. Phase 3 (magic-link auth) replaces
// this file; the session plumbing below is the part that survives.

const SESSION_COOKIE = "belin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function startSession(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The raw token held by the session, without a database round trip. */
export async function sessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * The session equivalent of resolveActorFromToken: identity comes from the
 * request context instead of the URL. This is the token-transport shape that
 * DECISIONS.md deferred to M1; phase 3 changes only how the cookie is issued.
 */
export async function resolveActorFromSession(): Promise<Actor | null> {
  const token = await sessionToken();
  if (!token) return null;
  return resolveActorFromToken(token);
}
