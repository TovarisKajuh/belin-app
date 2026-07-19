// Pure half of the demo login, kept out of lib/auth.ts so it is testable
// without the server-only and next/headers imports (same split as
// actor-shared.ts / actor.ts).
//
// TEMPORARY. Logged as debt in CHANGELOG.md on 2026-07-19 and replaced by
// magic-link auth in phase 3, before the German EPC pilot on 27.07.

export type DemoUser = { username: string; password: string; token: string };

// The tokens are stable constants in scripts/seed-demo.mjs (upserted by fixed
// id), so re-running the seed does not invalidate a login.
export const DEMO_USERS: readonly DemoUser[] = [
  { username: "12345", password: "12345", token: "demo-epc-k7m2x9q4" },
  { username: "54321", password: "54321", token: "demo-sub-r8p3n6w1" },
];

/**
 * Returns the project token for a valid credential pair, or null.
 *
 * The username is trimmed because phone keyboards add trailing spaces; the
 * password is compared exactly, since trimming it would silently accept a
 * different secret than the one that was set.
 */
export function tokenForCredentials(username: string, password: string): string | null {
  const u = username.trim();
  const match = DEMO_USERS.find((d) => d.username === u && d.password === password);
  return match ? match.token : null;
}
