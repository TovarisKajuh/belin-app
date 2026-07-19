import { describe, it, expect } from "vitest";
import {
  tokenForCredentials,
  otherScenarioToken,
  describeDemoToken,
  SCENARIO_TOKENS,
  SCENARIOS,
} from "@/lib/auth-shared";

describe("tokenForCredentials", () => {
  it("lands the EPC pair in the current state as the EPC", () => {
    expect(tokenForCredentials("12345", "12345")).toBe(SCENARIO_TOKENS.current.epc);
  });

  it("lands the sub pair in the current state as the sub", () => {
    expect(tokenForCredentials("54321", "54321")).toBe(SCENARIO_TOKENS.current.sub);
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
    expect(tokenForCredentials("  12345  ", "12345")).toBe(SCENARIO_TOKENS.current.epc);
    // A trimmed password would accept a secret the user did not set.
    expect(tokenForCredentials("12345", " 12345 ")).toBeNull();
  });
});

describe("demo scenarios", () => {
  it("gives every scenario and role a distinct token, so no switch can cross roles", () => {
    const all = SCENARIOS.flatMap((s) => [SCENARIO_TOKENS[s].epc, SCENARIO_TOKENS[s].sub]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("identifies which scenario and role a demo token belongs to", () => {
    expect(describeDemoToken(SCENARIO_TOKENS.current.epc)).toEqual({ scenario: "current", role: "epc" });
    expect(describeDemoToken(SCENARIO_TOKENS.start.sub)).toEqual({ scenario: "start", role: "sub" });
  });

  it("switches state while keeping the role", () => {
    expect(otherScenarioToken(SCENARIO_TOKENS.current.epc)).toBe(SCENARIO_TOKENS.start.epc);
    expect(otherScenarioToken(SCENARIO_TOKENS.start.epc)).toBe(SCENARIO_TOKENS.current.epc);
    expect(otherScenarioToken(SCENARIO_TOKENS.current.sub)).toBe(SCENARIO_TOKENS.start.sub);
    expect(otherScenarioToken(SCENARIO_TOKENS.start.sub)).toBe(SCENARIO_TOKENS.current.sub);
  });

  it("round trips back to where it started", () => {
    for (const s of SCENARIOS) {
      for (const role of ["epc", "sub"] as const) {
        const from = SCENARIO_TOKENS[s][role];
        expect(otherScenarioToken(otherScenarioToken(from)!)).toBe(from);
      }
    }
  });

  it("refuses to switch a token outside the demo set, so a real project is never moved", () => {
    expect(otherScenarioToken("some-real-project-token")).toBeNull();
    expect(describeDemoToken("some-real-project-token")).toBeNull();
  });
});
