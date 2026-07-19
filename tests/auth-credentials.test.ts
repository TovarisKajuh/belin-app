import { describe, it, expect } from "vitest";
import { tokenForCredentials, DEMO_USERS } from "@/lib/auth-shared";

describe("tokenForCredentials", () => {
  it("maps the EPC pair to the EPC project token", () => {
    expect(tokenForCredentials("12345", "12345")).toBe("demo-epc-k7m2x9q4");
  });

  it("maps the sub pair to the sub project token", () => {
    expect(tokenForCredentials("54321", "54321")).toBe("demo-sub-r8p3n6w1");
  });

  it("never issues a token when the password belongs to the other account", () => {
    expect(tokenForCredentials("12345", "54321")).toBeNull();
    expect(tokenForCredentials("54321", "12345")).toBeNull();
  });

  it("rejects a wrong password, an unknown user and empty input", () => {
    expect(tokenForCredentials("12345", "12346")).toBeNull();
    expect(tokenForCredentials("00000", "00000")).toBeNull();
    expect(tokenForCredentials("", "")).toBeNull();
  });

  it("trims the username but compares the password exactly", () => {
    expect(tokenForCredentials("  12345  ", "12345")).toBe("demo-epc-k7m2x9q4");
    // A trimmed password would accept a secret the user did not set.
    expect(tokenForCredentials("12345", " 12345 ")).toBeNull();
  });

  it("gives the two accounts different tokens, so a login cannot cross roles", () => {
    const tokens = new Set(DEMO_USERS.map((d) => d.token));
    expect(tokens.size).toBe(DEMO_USERS.length);
  });
});
