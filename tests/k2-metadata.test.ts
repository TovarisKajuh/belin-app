import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { extractMetadata } from "@/lib/k2/k2-metadata";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

it("k2-report-2025: inline mode, full metadata", () => {
  const m = extractMetadata(load("k2-report-2025"));
  expect(m.projectName).toBe("2 Module in Reihe");
  expect(m.reportVersion).toBe("3.2.28.0");
  expect(m.reportDate).toBe("2025-02-27");
  expect(m.author).toBe("Phillip Theele");
  expect(m.customer).toBe("Mustermann");
  expect(m.company).toBe("SEC SolarEnergyConsult Energiesysteme GmbH");
  expect(m.address).toBe("Berliner Ch 11, 39307 Genthin");
  expect(m.mountingSystem).toBe("SingleRail");
  expect(m.moduleWp).toBe(455);
  expect(m.moduleCount).toBe(2);
  expect(m.kwpTotal).toBe(0.91);
  expect(m.windZone).toBe("2");
  expect(m.snowZone).toBe("2");
  expect(m.roofType).toBe("Ziegel");
  expect(m.pitchDeg).toBe(35);
  expect(m.verified).toBe(true);
  expect(m.roofs).toEqual([{ name: "Dach 1", moduleCount: 2, kwp: 0.91 }]);
});

it("k2-report-2023: Bearbeiter maps to author, Leistung era columns", () => {
  const m = extractMetadata(load("k2-report-2023"));
  expect(m.projectName).toBe("6,400 kWp Meyer Burger");
  expect(m.author).toBe("Phillip Theele");
  expect(m.customer).toBeNull();
  expect(m.moduleWp).toBe(400);
  expect(m.moduleCount).toBe(16);
  expect(m.kwpTotal).toBe(6.4);
  expect(m.verified).toBe(false); // "ENTHÄLT WARNUNG(EN)"
  // Version limitation, by design: in 3.1.97 era reports the roof row is a
  // single merged line, so "Dach 1" alone never matches and roofs stays empty.
  expect(m.roofs).toEqual([]);
});

it("forum1: block mode pairing and two roofs", () => {
  const m = extractMetadata(load("forum1"));
  expect(m.projectName).toBe("Bietigheim-Bissingen");
  expect(m.windZone).toBe("1"); // proves positional block pairing
  expect(m.snowZone).toBe("2");
  expect(m.address).toBe("74321 Bietigheim-Bissingen, Deutschland");
  expect(m.moduleCount).toBe(57);
  expect(m.kwpTotal).toBe(26.02);
  expect(m.roofs).toEqual([
    { name: "Dach 1", moduleCount: 41, kwp: 18.655 }, // 41 x 455 Wp
    { name: "Dach 3", moduleCount: 16, kwp: 7.36 }, // 16 x 460 Wp, a DIFFERENT module
  ]);
});

it("forum1: the block mode cover is never positionally paired", () => {
  // forum1's cover extracts as a label block followed by a value block. Pairing
  // it would marry Gesellschaft to the project subtitle. Null is the honest answer.
  const m = extractMetadata(load("forum1"));
  expect(m.company).toBeNull();
});

it("forum2: metadata resolves without any roof detail", () => {
  const m = extractMetadata(load("forum2"));
  expect(m.reportVersion).toBe("3.1.97.0");
  expect(m.projectName).toBe("Neues Projekt");
  expect(m.mountingSystem).toBe("SingleRail");
});

it("the annotations document yields an empty metadata shell", () => {
  const m = extractMetadata(load("k2-base-report-annotations"));
  expect(m.projectName).toBeNull();
  expect(m.roofs).toEqual([]);
});

it("never throws on junk", () => {
  expect(() => extractMetadata([])).not.toThrow();
  expect(() => extractMetadata(["x", "", "\n\n"])).not.toThrow();
  expect(extractMetadata(["x"]).projectName).toBeNull();
});

it("block pairing is refused when the counts disagree", () => {
  // Three labels, two values: guessing here would shift every field. Stay null.
  const page = [
    "Projektinformation",
    "Adresse",
    "Windlastzone",
    "Schneelastzone",
    "74321 Irgendwo",
    "1",
    "| Connecting Strength",
    "Projektübersicht",
  ].join("\n");

  const m = extractMetadata([page, page]);
  expect(m.address).toBeNull();
  expect(m.windZone).toBeNull();
  expect(m.snowZone).toBeNull();
});
