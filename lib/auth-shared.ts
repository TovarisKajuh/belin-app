// Pure half of the demo login and the demo scenario switch, kept out of
// lib/auth.ts so it is testable without the server-only and next/headers
// imports (same split as actor-shared.ts / actor.ts).
//
// TEMPORARY. Logged as debt in CHANGELOG.md on 2026-07-19 and replaced by
// magic-link auth in phase 3, before the German EPC pilot on 27.07.

export type Role = "epc" | "sub";

/**
 * The two seeded states of the same job:
 * - "current": nine working days logged, roughly half built
 * - "start":   day one, nothing logged, material check still to do
 *
 * Two real projects rather than a filtered view of one, so switching is
 * instant and non-destructive and neither state can corrupt the other. The
 * tokens are stable constants in scripts/seed-demo.mjs (upserted by fixed id),
 * so re-running the seed does not invalidate a session.
 */
export type Scenario = "current" | "start";

export const SCENARIO_TOKENS: Record<Scenario, Record<Role, string>> = {
  current: { epc: "demo-epc-k7m2x9q4", sub: "demo-sub-r8p3n6w1" },
  start: { epc: "demo-epc-start-h3k9m2", sub: "demo-sub-start-q7w4z8" },
};

export const SCENARIOS: readonly Scenario[] = ["current", "start"];

export type DemoUser = { username: string; password: string; role: Role };

// Login always lands in the current state; the switch moves from there.
export const DEMO_USERS: readonly DemoUser[] = [
  { username: "12345", password: "12345", role: "epc" },
  { username: "54321", password: "54321", role: "sub" },
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
  return match ? SCENARIO_TOKENS.current[match.role] : null;
}

/** Which scenario and role a demo token belongs to, or null if it is not one. */
export function describeDemoToken(token: string): { scenario: Scenario; role: Role } | null {
  for (const scenario of SCENARIOS) {
    for (const role of ["epc", "sub"] as const) {
      if (SCENARIO_TOKENS[scenario][role] === token) return { scenario, role };
    }
  }
  return null;
}

/**
 * The same role's token in the other scenario, or null for a token that is not
 * part of the demo set (a real project token must never be switched).
 */
export function otherScenarioToken(token: string): string | null {
  const found = describeDemoToken(token);
  if (!found) return null;
  const next: Scenario = found.scenario === "current" ? "start" : "current";
  return SCENARIO_TOKENS[next][found.role];
}
