import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  signupLinkState,
  signupRpcError,
  validateSignup,
  type SignupInput,
} from "@/lib/signup-shared";

const GOOD: SignupInput = {
  vat: "si 8026 7432",
  company: "  Sončna   streha d.o.o. ",
  address: "Dunajska cesta 50, 1000 Ljubljana",
  country: "si",
  fullName: "Marko Novak",
  email: "Marko.Novak@Example.si ",
  phone: "",
  consent: true,
};

describe("validateSignup", () => {
  it("cleans a good signup", () => {
    expect(validateSignup(GOOD)).toEqual({
      ok: true,
      value: {
        vatId: "SI80267432",
        company: "Sončna streha d.o.o.",
        address: "Dunajska cesta 50, 1000 Ljubljana",
        country: "si",
        fullName: "Marko Novak",
        email: "marko.novak@example.si",
        phone: null,
      },
    });
  });
  it("takes the country from the VAT prefix over the select", () => {
    const r = validateSignup({ ...GOOD, vat: "ATU14703908", country: "si" });
    expect(r.ok && r.value.country).toBe("at");
  });
  it("names the first problem", () => {
    expect(validateSignup({ ...GOOD, vat: "123" })).toEqual({ ok: false, error: "vatFormat" });
    expect(validateSignup({ ...GOOD, company: "  " })).toEqual({ ok: false, error: "companyRequired" });
    expect(validateSignup({ ...GOOD, address: "" })).toEqual({ ok: false, error: "addressRequired" });
    expect(validateSignup({ ...GOOD, fullName: "M" })).toEqual({ ok: false, error: "nameRequired" });
    expect(validateSignup({ ...GOOD, email: "marko@" })).toEqual({ ok: false, error: "emailInvalid" });
    expect(validateSignup({ ...GOOD, consent: false })).toEqual({ ok: false, error: "consentRequired" });
  });
  it("caps lengths instead of failing on them", () => {
    const r = validateSignup({ ...GOOD, company: "x".repeat(500), phone: "0".repeat(80) });
    expect(r.ok && r.value.company.length).toBe(200);
    expect(r.ok && r.value.phone?.length).toBe(40);
  });
});

describe("isValidEmail", () => {
  it("accepts ordinary addresses and refuses broken ones", () => {
    expect(isValidEmail("a.b+gate4@gmail.com")).toBe(true);
    expect(isValidEmail("a b@x.si")).toBe(false);
    expect(isValidEmail("a@x")).toBe(false);
  });
});

describe("signupLinkState", () => {
  const now = new Date("2026-10-06T18:00:00Z");
  it("is ready, used or expired", () => {
    expect(signupLinkState({ consumed_at: null, expires_at: "2026-10-07T18:00:00Z" }, now)).toBe("ready");
    expect(signupLinkState({ consumed_at: "2026-10-06T17:00:00Z", expires_at: "2026-10-07T18:00:00Z" }, now)).toBe("used");
    expect(signupLinkState({ consumed_at: null, expires_at: "2026-10-06T17:59:59Z" }, now)).toBe("expired");
  });
});

describe("signupRpcError", () => {
  it("maps the function's messages and nothing else", () => {
    expect(signupRpcError("signup.emailTaken")).toBe("emailTaken");
    expect(signupRpcError("signup.used")).toBe("used");
    expect(signupRpcError("signup.expired")).toBe("expired");
    expect(signupRpcError("signup.invalid")).toBe("invalid");
    expect(signupRpcError("connection reset")).toBe("generic");
  });
});
