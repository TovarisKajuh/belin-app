import { describe, expect, it } from "vitest";
import {
  DataUnavailableError,
  isDataUnavailable,
  rethrowIfUnavailable,
  throwIfReadFailed,
} from "@/lib/db-error";

describe("a failed read is not a missing row", () => {
  it("throws on a Supabase error and stays quiet without one", () => {
    expect(() => throwIfReadFailed({ message: "fetch failed" }, "test")).toThrow(DataUnavailableError);
    expect(() => throwIfReadFailed(null, "test")).not.toThrow();
    expect(() => throwIfReadFailed(undefined, "test")).not.toThrow();
  });

  it("is recognised by name too, so a copy from another module bundle still counts", () => {
    const foreign = Object.assign(new Error("x"), { name: "DataUnavailableError" });
    expect(isDataUnavailable(foreign)).toBe(true);
    expect(isDataUnavailable(new Error("Forbidden: no such project."))).toBe(false);
  });

  it("rethrows only the outage, so a page's catch can still answer notFound for the rest", () => {
    expect(() => rethrowIfUnavailable(new DataUnavailableError("x"))).toThrow(DataUnavailableError);
    expect(() => rethrowIfUnavailable(new Error("Forbidden: not a party to this project."))).not.toThrow();
  });
});
