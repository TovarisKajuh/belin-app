export type InviteKind = "sub_company" | "epc_member" | "crew";
export type OrgType = "epc" | "sub";
export type PersonRole = "admin" | "bauleiter" | "owner" | "crew";

export const INVITE_TTL_DAYS = 14;

/**
 * Who may invite whom. The whole policy is this one function, because an
 * invite is how a stranger gets an account: if the rule were spread across
 * surfaces, each surface would eventually drift into its own answer.
 *
 * The shape of it:
 * - The EPC brings in subcontractor COMPANIES (sub_company) and its own
 *   colleagues (epc_member). Nothing else crosses an organization boundary.
 * - The subcontractor invites nobody by email. Their crew is reached with a
 *   shared link, because a roofer should not need an inbox and an account to
 *   report their day.
 * - A Bauleiter is excluded. They run sites; they do not decide who gets an
 *   account. Crew, obviously, invite nobody.
 */
export function allowedInviteKinds(orgType: OrgType, role: PersonRole): InviteKind[] {
  if (role !== "admin" && role !== "owner") return [];
  if (orgType === "epc") return ["sub_company", "epc_member"];
  return [];
}

export function canCreateInvite(orgType: OrgType, role: PersonRole, kind: InviteKind): boolean {
  return allowedInviteKinds(orgType, role).includes(kind);
}

/**
 * Which role a new EPC colleague gets. Bauleiter is the default because it is
 * the smaller grant: an admin can spend money, a Bauleiter cannot, so making
 * somebody an admin has to be a deliberate act rather than a default.
 */
export function epcMemberRole(explicit: string | null | undefined): "admin" | "bauleiter" {
  return explicit === "admin" ? "admin" : "bauleiter";
}

/** Only the sub office may hand out a crew link, and only for their own site. */
export function canIssueCrewLink(orgType: OrgType, role: PersonRole): boolean {
  return orgType === "sub" && (role === "admin" || role === "owner");
}
