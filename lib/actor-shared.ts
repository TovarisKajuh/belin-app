const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isPlausibleToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

// A client-supplied id that will be interpolated into a storage path must be a
// real UUID, so it can never carry slashes or "../" that would escape the
// project prefix.
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Which side of a project an actor stands on, or null when they have no
 * business with it at all. Kept pure and separate from the database lookup so
 * the rule itself can be tested exhaustively.
 *
 * For a person the side comes from WHICH column their org matched, never from
 * their job title: the same admin is the EPC on one project and could be the
 * subcontractor on another.
 */
export function resolveProjectRole(
  actor:
    | { kind: "token"; role: "epc" | "sub"; projectId: string }
    | { kind: "person"; orgId: string },
  project: { id: string; epc_org_id: string; sub_org_id: string | null },
): "epc" | "sub" | null {
  if (actor.kind === "token") {
    // A link is scoped to one project; a valid token shown against another one
    // is still a stranger.
    return actor.projectId === project.id ? actor.role : null;
  }

  if (!actor.orgId) return null;
  if (actor.orgId === project.epc_org_id) return "epc";
  if (project.sub_org_id && actor.orgId === project.sub_org_id) return "sub";
  return null;
}
