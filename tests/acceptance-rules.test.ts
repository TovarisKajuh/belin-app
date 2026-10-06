import { describe, expect, it } from "vitest";
import { signingProblem, startDecision } from "@/lib/acceptance-rules";

const ok = {
  declaration: "accepted" as const,
  defectCount: 0,
  warrantyStart: "2026-10-06",
  today: "2026-10-06",
  hasEpcSignature: true,
  hasSubSignature: true,
  epcSignerName: "Marko Golob",
  subSignerName: "Boštjan Novak",
};

describe("signingProblem", () => {
  it("lets a complete protocol be signed", () => {
    expect(signingProblem(ok)).toBeNull();
  });
  it("needs a declaration", () => {
    expect(signingProblem({ ...ok, declaration: null })).toBe("final.err.declaration");
  });
  it("refuses a refusal with no defect", () => {
    expect(signingProblem({ ...ok, declaration: "refused" })).toBe("final.err.refusedNeedsDefects");
    expect(signingProblem({ ...ok, declaration: "refused", defectCount: 1, warrantyStart: null })).toBeNull();
  });
  it("refuses reservations with no defect", () => {
    expect(signingProblem({ ...ok, declaration: "with_reservations" })).toBe("final.err.reservationsNeedDefects");
    expect(signingProblem({ ...ok, declaration: "with_reservations", defectCount: 2 })).toBeNull();
  });
  it("refuses a warranty that starts before the acceptance, allows a later one", () => {
    expect(signingProblem({ ...ok, warrantyStart: "2026-10-05" })).toBe("final.err.warrantyBeforeAcceptance");
    expect(signingProblem({ ...ok, warrantyStart: "2026-11-01" })).toBeNull();
  });
  it("needs both signatures and both names", () => {
    expect(signingProblem({ ...ok, hasSubSignature: false })).toBe("final.err.signatures");
    expect(signingProblem({ ...ok, subSignerName: "  " })).toBe("final.err.signerNames");
  });
});

describe("startDecision", () => {
  it("creates the first protocol and reuses an open draft", () => {
    expect(startDecision(null)).toBe("create");
    expect(startDecision({ status: "draft", kind: "final", declaration: null })).toBe("reuse");
  });
  it("allows a final acceptance after a signed partial one", () => {
    expect(startDecision({ status: "signed", kind: "partial", declaration: "accepted" })).toBe("create");
  });
  it("allows a new acceptance after a refused one", () => {
    expect(startDecision({ status: "signed", kind: "final", declaration: "refused" })).toBe("create");
  });
  it("refuses a second final acceptance after an accepted one", () => {
    expect(startDecision({ status: "signed", kind: "final", declaration: "with_reservations" })).toBe("alreadySigned");
  });
});
