import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { endPersonSession, startPersonSession } from "@/lib/auth";
import { signDemoCookie, verifyDemoCookie } from "@/lib/demo/door";
import { DEMO_PERSONAS, checkDemoPerson, type DemoPersonCheck, type DemoPersonaKey } from "@/lib/demo/personas";

/** The presenter's marker: an HMAC of its own expiry under DEMO_DOOR_KEY. httpOnly. */
export const DEMO_COOKIE = "belin-demo";

/**
 * Become a demo persona in this browser. Refuses unless the person row exists,
 * belongs to an organization flagged is_demo, and is enabled. Whatever person
 * session this browser held is revoked first. `presenter` sets the belin-demo
 * cookie that shows the persona switch; a guest gets none, and loses any it had.
 */
export async function startDemoPersonaSession(
  persona: DemoPersonaKey,
  opts: { ttlMs: number; presenter: boolean },
): Promise<DemoPersonCheck> {
  const personId = DEMO_PERSONAS[persona].personId;
  const db = createAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, disabled_at, organizations (is_demo)")
    .eq("id", personId)
    .maybeSingle();
  if (error) throw new Error(`Demo door: could not read the persona (${error.message})`);

  const check = checkDemoPerson(
    data ? { isDemo: data.organizations?.is_demo === true, disabledAt: data.disabled_at } : null,
  );
  if (check !== "ok") return check;

  await endPersonSession();
  await startPersonSession(personId, { ttlMs: opts.ttlMs });

  const jar = await cookies();
  const signed = opts.presenter ? signDemoCookie(Date.now() + opts.ttlMs) : null;
  if (signed) {
    jar.set(DEMO_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(opts.ttlMs / 1000),
    });
  } else {
    jar.delete(DEMO_COOKIE);
  }
  return "ok";
}

export async function hasPresenterCookie(): Promise<boolean> {
  try {
    const jar = await cookies();
    return verifyDemoCookie(jar.get(DEMO_COOKIE)?.value);
  } catch {
    return false;
  }
}

export async function clearDemoCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
}
