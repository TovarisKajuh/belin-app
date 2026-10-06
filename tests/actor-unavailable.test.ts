import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq"]) chain[method] = () => chain;
      chain.maybeSingle = async () => state.result;
      return chain;
    },
  }),
}));

import { requireProjectActor, resolveActorFromToken, resolvePersonActor } from "@/lib/actor";
import { DataUnavailableError } from "@/lib/db-error";

const person = {
  kind: "person" as const,
  personId: "p1",
  orgId: "org-epc",
  orgType: "epc" as const,
  role: "admin" as const,
  fullName: "Test",
  email: "t@example.com",
};

beforeEach(() => {
  state.result = { data: null, error: null };
});

// 05.10.2026: the database paused and every production link said the link
// was revoked. An outage must reach the error page, not the not-found page.
describe("actor resolution during an outage", () => {
  it("resolveActorFromToken throws on a failed read", async () => {
    state.result = { data: null, error: { message: "fetch failed" } };
    await expect(resolveActorFromToken("demo-epc-k7m2x9q4")).rejects.toBeInstanceOf(DataUnavailableError);
  });

  it("resolveActorFromToken still answers null for a link that does not exist", async () => {
    await expect(resolveActorFromToken("demo-epc-k7m2x9q4")).resolves.toBeNull();
  });

  it("resolvePersonActor throws on a failed read and is null for a missing person", async () => {
    state.result = { data: null, error: { message: "fetch failed" } };
    await expect(resolvePersonActor("p1")).rejects.toBeInstanceOf(DataUnavailableError);
    state.result = { data: null, error: null };
    await expect(resolvePersonActor("p1")).resolves.toBeNull();
  });

  it("requireProjectActor separates an outage from a project that is not yours", async () => {
    state.result = { data: null, error: { message: "fetch failed" } };
    await expect(requireProjectActor(person, "x")).rejects.toBeInstanceOf(DataUnavailableError);
    state.result = { data: null, error: null };
    await expect(requireProjectActor(person, "x")).rejects.toThrow("Forbidden: no such project.");
  });
});
