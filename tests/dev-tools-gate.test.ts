import { afterEach, describe, expect, it, vi } from "vitest";

// The swap bar hands its holder the OTHER party's project token. A crew link is
// designed to be forwarded to whoever is on the roof, so anywhere but a
// developer's own machine this would turn every crew link into an entry to the
// client's dashboard.
//
// The gate is one line in one function, which is exactly the kind of line a
// later refactor deletes without noticing, so it gets a test that fails loudly
// rather than a comment that asks nicely. It follows NODE_ENV: Next sets it to
// "production" in every build, so no deployed environment can switch it on.

const actor = { kind: "token", role: "sub", projectId: "p1", token: "t" } as never;

// The module under test is server-only, whose entry point throws outside a
// server component. That marker is doing its job; it just has no meaning in a
// node test runner, so it is stubbed rather than removed from the source.
vi.mock("server-only", () => ({}));

const select = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select }) }),
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  select.mockReset();
});

describe("getSiblingToken", () => {
  it("returns nothing and never touches the database outside development", async () => {
    for (const env of ["production", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      vi.resetModules();
      const { getSiblingToken } = await import("@/lib/data/tokens");
      await expect(getSiblingToken(actor)).resolves.toBeNull();
    }
    expect(select).not.toHaveBeenCalled();
  });

  it("ignores the retired DEMO_LOGIN flag completely", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_LOGIN", "1");
    const { getSiblingToken } = await import("@/lib/data/tokens");
    await expect(getSiblingToken(actor)).resolves.toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("looks the token up in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    select.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { token: "sib" } }) }) }),
        }),
      }),
    });
    const { getSiblingToken } = await import("@/lib/data/tokens");
    await expect(getSiblingToken(actor)).resolves.toEqual({ token: "sib", role: "epc" });
  });
});
