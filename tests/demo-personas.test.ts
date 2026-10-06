import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkDemoPerson,
  personaForPersonId,
  parseSwitchablePersona,
  parseEntryTarget,
  landingPath,
  switchTarget,
  safeDemoLocale,
  DEMO_LOCALES,
} from "@/lib/demo/personas";
import { DEMO_PERSON, DEMO_PROJECT_TRENUTNO as TR, DEMO_PROJECT_DAN1 as D1, DEMO_BOOK_PROJECT_IDS } from "@/lib/demo/ids";

describe("checkDemoPerson", () => {
  it("refuses a missing person, a person outside a demo company, and a disabled one", () => {
    expect(checkDemoPerson(null)).toBe("missing");
    expect(checkDemoPerson({ isDemo: false, disabledAt: null })).toBe("not-demo");
    expect(checkDemoPerson({ isDemo: true, disabledAt: "2026-10-06T08:00:00Z" })).toBe("disabled");
    expect(checkDemoPerson({ isDemo: true, disabledAt: null })).toBe("ok");
  });
});

describe("personas", () => {
  it("knows exactly the five seeded people and nobody else", () => {
    expect(personaForPersonId(DEMO_PERSON.epcAdmin)).toBe("epcAdmin");
    expect(personaForPersonId(DEMO_PERSON.guest)).toBe("guest");
    expect(personaForPersonId("66666666-6666-4666-8666-666666666604")).toBeNull(); // the founder's own account
    expect(personaForPersonId("not-a-person")).toBeNull();
  });
  it("never lets the guest be chosen as a presenter persona", () => {
    expect(parseSwitchablePersona("guest")).toBeNull();
    expect(parseSwitchablePersona("crew")).toBe("crew");
    expect(parseSwitchablePersona(undefined)).toBeNull();
  });
  it("gives the crew no portfolio", () => {
    expect(parseEntryTarget("portfelj", "crew")).toBeNull();
    expect(parseEntryTarget("dan1", "crew")).toBe("dan1");
    expect(parseEntryTarget("portfelj", "epcAdmin")).toBe("portfelj");
  });
});

describe("where a persona lands", () => {
  it("enters the chosen project or the portfolio", () => {
    expect(landingPath("sl", "trenutno")).toBe(`/sl/app/${TR}`);
    expect(landingPath("sl", "portfelj")).toBe("/sl/app");
  });
  it("keeps the demo project and the language when switching", () => {
    expect(switchTarget("sl", `/sl/app/${TR}/hours`, "subOffice")).toBe(`/sl/app/${TR}`);
    expect(switchTarget("de", `/de/app/${D1}`, "crew")).toBe(`/de/app/${D1}`);
  });
  it("never carries a non-demo project or a foreign path across", () => {
    expect(switchTarget("sl", `/sl/app/${DEMO_BOOK_PROJECT_IDS[0]}`, "epcAdmin")).toBe("/sl/app");
    expect(switchTarget("sl", `https://evil.example/sl/app/${TR}`, "epcAdmin")).toBe("/sl/app");
    expect(switchTarget("sl", `//evil.example/sl/app/${TR}`, "epcAdmin")).toBe("/sl/app");
    expect(switchTarget("sl", "/sl/app/settings", "crew")).toBe(`/sl/app/${TR}`);
  });
  it("only ever builds paths in a real locale", () => {
    expect(safeDemoLocale("de")).toBe("de");
    expect(safeDemoLocale("xx")).toBe("sl");
    const routing = readFileSync(path.resolve(__dirname, "../i18n/routing.ts"), "utf8");
    expect(routing).toContain(`locales: [${DEMO_LOCALES.map((l) => `"${l}"`).join(", ")}]`);
  });
});
