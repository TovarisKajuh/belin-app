import { describe, it, expect } from "vitest";
import { resolveProjectRole } from "@/lib/actor-shared";

const PROJECT = {
  id: "p1",
  epc_org_id: "org-epc",
  sub_org_id: "org-sub",
};

const tokenActor = (over: Partial<{ projectId: string; role: "epc" | "sub" }> = {}) =>
  ({
    kind: "token" as const,
    role: over.role ?? ("epc" as const),
    projectId: over.projectId ?? "p1",
    orgId: "org-epc",
    tokenId: "t1",
  });

const personActor = (orgId: string) =>
  ({
    kind: "person" as const,
    personId: "person-1",
    orgId,
    orgType: "epc" as const,
    role: "admin" as const,
    fullName: "Ana Novak",
    email: "ana@example.com",
  });

describe("resolveProjectRole, token actors", () => {
  it("keeps the role the token was issued for", () => {
    expect(resolveProjectRole(tokenActor({ role: "epc" }), PROJECT)).toBe("epc");
    expect(resolveProjectRole(tokenActor({ role: "sub" }), PROJECT)).toBe("sub");
  });

  // A link is scoped to exactly one project. Presenting it against another
  // project must fail even though the token itself is perfectly valid.
  it("refuses a token pointed at a different project", () => {
    expect(resolveProjectRole(tokenActor({ projectId: "other" }), PROJECT)).toBeNull();
  });
});

describe("resolveProjectRole, person actors", () => {
  // The side is decided by WHICH column the org matched, never by the person's
  // job title: the same admin is the EPC on one project and could be the sub on
  // another.
  it("gives the EPC side when the org owns the project", () => {
    expect(resolveProjectRole(personActor("org-epc"), PROJECT)).toBe("epc");
  });

  it("gives the sub side when the org is the subcontractor", () => {
    expect(resolveProjectRole(personActor("org-sub"), PROJECT)).toBe("sub");
  });

  it("refuses an org with no part in the project", () => {
    expect(resolveProjectRole(personActor("org-stranger"), PROJECT)).toBeNull();
  });

  it("refuses when the project has no subcontractor yet", () => {
    const noSub = { ...PROJECT, sub_org_id: null };
    expect(resolveProjectRole(personActor("org-sub"), noSub)).toBeNull();
    expect(resolveProjectRole(personActor("org-epc"), noSub)).toBe("epc");
  });

  // Guards against a null org id ever matching a null column.
  it("never matches null against null", () => {
    const noSub = { ...PROJECT, sub_org_id: null };
    const nullOrg = { ...personActor("org-x"), orgId: null as unknown as string };
    expect(resolveProjectRole(nullOrg, noSub)).toBeNull();
  });
});
