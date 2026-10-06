import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The seed is data the buyer reads on every screen and document. These are the
// mistakes that already shipped once: a real company as the demo client, real
// brands on the portfolio, AVESOL's real rate on the naročilnica.
const seed = readFileSync(path.resolve(__dirname, "../scripts/seed-demo.mjs"), "utf8");

describe("demo seed identity", () => {
  it("names no real company the GTM base forbids, and no real brand", () => {
    expect(seed).not.toMatch(/sonce/i);
    expect(seed).not.toMatch(/\b(Lidl|Trimo|Gorenje|Qlandia)\b/);
    // "Lumora" was the planned demo client until a bizi.si check on 06.10
    // found a real LUMORA d.o.o. registered in Ljubljana.
    expect(seed).not.toMatch(/lumora/i);
  });

  it("never carries AVESOL's real price or rate", () => {
    expect(seed).not.toMatch(/118500|118\.500/);
    expect(seed).not.toMatch(/regie_hourly_rate:\s*48\b/);
  });

  it("gives every literal address a domain the mailer refuses", () => {
    expect(seed).toMatch(/const EPC_MAIL = "[a-z]+-demo\.si";/);
    const literals = [...seed.matchAll(/["'`]([a-z0-9.]+@[a-z0-9.-]+\.[a-z]+)["'`]/g)].map((m) => m[1]);
    expect(literals.filter((address) => !/-demo\.si$/.test(address))).toEqual([]);
  });

  it("prints only bank accounts that pass the IBAN check", () => {
    // An invented account that fails mod-97 is the first thing an accountant's
    // software rejects; the founder's default (Task 0.6 r) is an invented one
    // that passes, never AVESOL's real account.
    const ibans = [...seed.matchAll(/"(SI\d{2}(?: ?\d{4}){3} ?\d{3})"/g)].map((m) => m[1].replace(/\s+/g, ""));
    expect(ibans.length).toBeGreaterThanOrEqual(4);
    const mod97 = (iban: string) =>
      [...(iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))].reduce(
        (rest, digit) => (rest * 10 + Number(digit)) % 97,
        0,
      );
    expect(ibans.filter((iban) => mod97(iban) !== 1)).toEqual([]);
  });
});
