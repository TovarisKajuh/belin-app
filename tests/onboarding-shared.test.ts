import { describe, expect, it } from "vitest";
import { firstName } from "@/lib/onboarding-shared";

describe("onboarding helpers", () => {
  it("greets by first name", () => {
    expect(firstName("Marko Novak")).toBe("Marko");
    expect(firstName("  Ana  ")).toBe("Ana");
    expect(firstName("")).toBe("");
  });
});
