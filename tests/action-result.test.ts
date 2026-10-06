import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The real unstable_rethrow rethrows Next's control-flow errors, which carry a
// digest starting NEXT_; this stand-in does the same.
vi.mock("next/navigation", () => ({
  unstable_rethrow: (err: unknown) => {
    const digest = (err as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
  },
}));

import { ActionError, UNEXPECTED, codeOf, unwrap } from "@/lib/action-result";
import { toResult } from "@/lib/action-result-server";

afterEach(() => vi.restoreAllMocks());

describe("codeOf", () => {
  it("passes every key lib/data throws through unchanged", () => {
    for (const key of [
      "po.rejectNote", "po.conflict", "hours.err.description", "hours.conflict", "co.err.title",
      "final.err.signerNames", "final.alreadySigned", "invoice.errNoVatId", "invoice.alreadyShared",
      "incident.err.note", "request.err.text", "common.askOffice", "common.sendFailed",
    ]) {
      expect(codeOf(new Error(key))).toBe(key);
    }
  });

  it("never forwards a message that is not a key", () => {
    for (const message of [
      "Not signed in.", "Forbidden: wrong project.", "Could not save the report",
      "Data unavailable at getProjectCore: fetch failed", "", "po.", "Po.conflict", "secret.value",
    ]) {
      expect(codeOf(new Error(message))).toBe(UNEXPECTED);
    }
    expect(codeOf("po.conflict")).toBe(UNEXPECTED);
  });
});

describe("toResult", () => {
  it("wraps a value", async () => {
    await expect(toResult(async () => ({ poId: "x" }))).resolves.toEqual({ ok: true, data: { poId: "x" } });
  });

  it("turns a thrown key into a code a production build cannot strip", async () => {
    await expect(toResult(async () => { throw new Error("po.rejectNote"); })).resolves.toEqual({
      ok: false,
      code: "po.rejectNote",
    });
  });

  it("hides an unexpected failure from the client and logs it on the server", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(toResult(async () => { throw new Error("relation does not exist"); })).resolves.toEqual({
      ok: false,
      code: UNEXPECTED,
    });
    expect(log).toHaveBeenCalledOnce();
  });

  it("lets redirect and notFound keep propagating", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/sl/app;307;" });
    await expect(toResult(async () => { throw redirect; })).rejects.toBe(redirect);
  });
});

describe("unwrap", () => {
  it("returns the data of a success", () => {
    expect(unwrap({ ok: true, data: 7 })).toBe(7);
  });

  it("throws an ActionError whose message is the code, so the existing catch blocks read it unchanged", () => {
    expect.assertions(3);
    try {
      unwrap({ ok: false, code: "po.conflict" });
    } catch (err) {
      expect(err).toBeInstanceOf(ActionError);
      expect((err as Error).message).toBe("po.conflict");
      expect((err as ActionError).code).toBe("po.conflict");
    }
  });
});
