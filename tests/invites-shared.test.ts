import { describe, it, expect } from "vitest";
import {
  allowedInviteKinds,
  canCreateInvite,
  canIssueCrewLink,
  epcMemberRole,
  INVITE_TTL_DAYS,
  type PersonRole,
} from "@/lib/invites-shared";

describe("allowedInviteKinds", () => {
  it("lets the EPC office bring in subcontractor companies and its own colleagues", () => {
    for (const role of ["admin", "owner"] as PersonRole[]) {
      expect(allowedInviteKinds("epc", role).sort()).toEqual(["epc_member", "sub_company"]);
    }
  });

  // The sub's crew is reached with a shared link: a roofer should not need an
  // inbox and an account to report their day.
  it("lets the sub office invite nobody by email", () => {
    for (const role of ["admin", "owner"] as PersonRole[]) {
      expect(allowedInviteKinds("sub", role)).toEqual([]);
    }
  });

  // A Bauleiter runs sites; they do not decide who gets an account.
  it("excludes bauleiter and crew on both sides", () => {
    for (const orgType of ["epc", "sub"] as const) {
      for (const role of ["bauleiter", "crew"] as PersonRole[]) {
        expect(allowedInviteKinds(orgType, role)).toEqual([]);
      }
    }
  });
});

describe("canCreateInvite", () => {
  it("agrees with the list", () => {
    expect(canCreateInvite("epc", "admin", "sub_company")).toBe(true);
    expect(canCreateInvite("epc", "owner", "epc_member")).toBe(true);
    expect(canCreateInvite("epc", "bauleiter", "sub_company")).toBe(false);
    expect(canCreateInvite("sub", "admin", "sub_company")).toBe(false);
    expect(canCreateInvite("sub", "admin", "epc_member")).toBe(false);
  });

  // Nobody mints a crew invite by email on either side; the crew link is a
  // project token, not an invite row.
  it("never allows a crew invite by email", () => {
    for (const orgType of ["epc", "sub"] as const) {
      for (const role of ["admin", "owner", "bauleiter", "crew"] as PersonRole[]) {
        expect(canCreateInvite(orgType, role, "crew")).toBe(false);
      }
    }
  });
});

describe("canIssueCrewLink", () => {
  it("belongs to the sub office only", () => {
    expect(canIssueCrewLink("sub", "admin")).toBe(true);
    expect(canIssueCrewLink("sub", "owner")).toBe(true);
    expect(canIssueCrewLink("sub", "bauleiter")).toBe(false);
    expect(canIssueCrewLink("sub", "crew")).toBe(false);
    expect(canIssueCrewLink("epc", "admin")).toBe(false);
  });
});

describe("epcMemberRole", () => {
  // The smaller grant is the default: making somebody an admin, who can spend
  // money, has to be deliberate.
  it("defaults to bauleiter and promotes only on an explicit admin", () => {
    expect(epcMemberRole("admin")).toBe("admin");
    expect(epcMemberRole("bauleiter")).toBe("bauleiter");
    expect(epcMemberRole(null)).toBe("bauleiter");
    expect(epcMemberRole(undefined)).toBe("bauleiter");
    expect(epcMemberRole("owner")).toBe("bauleiter");
    expect(epcMemberRole("ADMIN")).toBe("bauleiter");
  });
});

describe("INVITE_TTL_DAYS", () => {
  it("holds the decided value", () => {
    expect(INVITE_TTL_DAYS).toBe(14);
  });
});
