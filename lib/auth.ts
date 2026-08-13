import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import {
  resolveActorFromToken,
  resolvePersonActor,
  type Actor,
  type SessionActor,
} from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newRawToken, SESSION_TTL_DAYS } from "@/lib/auth-core";
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

// One cookie carries two kinds of session. A person session is stored as
// "p:" plus the raw session token; anything else is a project token, exactly as
// before. The prefix is what keeps the two apart, so a person cookie can never
// be mistaken for a project link (and vice versa) by a caller that only
// understands one of them.
const PERSON_PREFIX = "p:";

/** The raw cookie value, whichever kind of session it holds. */
async function sessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * The project token held by the session, without a database round trip.
 * Returns null for a person session: those carry no project token, and callers
 * that thread a token into a component must not receive one.
 */
export async function sessionToken(): Promise<string | null> {
  const value = await sessionCookie();
  if (!value || value.startsWith(PERSON_PREFIX)) return null;
  return value;
}

/** Issue a person session: a fresh token, hashed at rest, cookie holds the raw. */
export async function startPersonSession(personId: string): Promise<void> {
  const raw = newRawToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400000);

  const db = createAdminClient();
  const { error } = await db.from("sessions").insert({
    person_id: personId,
    token_hash: hashToken(raw),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`Could not start session: ${error.message}`);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, PERSON_PREFIX + raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

/**
 * Revoke the current person session server side, then clear the cookie.
 * Deleting the cookie alone is not logout: the raw token would still open a
 * session for anyone who captured it.
 */
export async function endPersonSession(): Promise<void> {
  const value = await sessionCookie();
  const raw = value?.startsWith(PERSON_PREFIX) ? value.slice(PERSON_PREFIX.length) : null;
  if (raw) {
    try {
      const db = createAdminClient();
      await db.from("sessions").update({ revoked: true }).eq("token_hash", hashToken(raw));
    } catch {
      // The cookie still gets cleared below. A session that outlives its logout
      // is bad, but a logout that refuses to log out is worse.
    }
  }
  await endSession();
}

/**
 * The session equivalent of resolveActorFromToken: identity comes from the
 * request context instead of the URL. A "p:" value resolves to the person
 * behind a live session row; anything else resolves as a project token. A "p:"
 * with an empty or unknown remainder resolves to null and NEVER falls through
 * to project-token resolution.
 */
export async function resolveActorFromSession(): Promise<SessionActor | null> {
  const value = await sessionCookie();
  if (!value) return null;

  if (value.startsWith(PERSON_PREFIX)) {
    const raw = value.slice(PERSON_PREFIX.length);
    if (!raw) return null;

    const db = createAdminClient();
    // Revocation and expiry are filtered in the query itself, so there is no
    // window where a stale row is read and then judged.
    const { data, error } = await db
      .from("sessions")
      .select("id, person_id, expires_at")
      .eq("token_hash", hashToken(raw))
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;

    // Rolling session: a device that is used keeps being signed in, and only an
    // abandoned one ever expires. This matters most for crew, whose whole
    // credential IS this session: a roofer being asked to claim his name again
    // mid project because thirty days passed would read as the app forgetting
    // him. Refreshed only in the second half of the window, so a phone in daily
    // use writes this row once a fortnight rather than on every page load, and
    // fire and forget, because a failed refresh must not fail the request.
    const msLeft = new Date(data.expires_at).getTime() - Date.now();
    if (msLeft < (SESSION_TTL_DAYS / 2) * 86400000) {
      const renewed = new Date(Date.now() + SESSION_TTL_DAYS * 86400000).toISOString();
      const sessionId = data.id;
      // Deferred through after(), not a bare void: a Supabase query builder is
      // LAZY, so an unawaited chain is a request that never leaves. The first
      // version of this looked right, typechecked, and refreshed nothing.
      const renew = async () => {
        await db.from("sessions").update({ expires_at: renewed }).eq("id", sessionId);
      };
      try {
        after(() => renew().catch(() => {}));
      } catch {
        // Outside a request scope (a script): do it inline rather than not at all.
        await renew().catch(() => {});
      }
    }

    return resolvePersonActor(data.person_id);
  }

  return resolveActorFromToken(value);
}

/** The token-session narrowing, for the surfaces that still require a link. */
export async function resolveTokenActorFromSession(): Promise<Actor | null> {
  const actor = await resolveActorFromSession();
  return actor && actor.kind === "token" ? actor : null;
}
