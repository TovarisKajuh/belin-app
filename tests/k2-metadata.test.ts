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
  expect(m.reportLanguage).toBe("de");
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
  expect(m.roofs).toEqual([
    {
      name: "Dach 1",
      moduleCount: 2,
      kwp: 0.91,
      moduleType: "TSM-455NEG9R.28 (Vertex S+) 1.762x1.134x30 mm",
      // UPGRADED by the hardening plan: pitch and covering now come from this
      // roof's own statics pages, because one project can mix roof types.
      pitchDeg: 35,
      covering: "Ziegel",
    },
  ]);
});

// UPGRADED by the hardening plan. The shipped parser declared this report's
// roofs unrecoverable, because the 3.1.97 era merges the whole roof row into
// one line and "Dach 1" never appears alone. The breadcrumb grammar finds the
// area anyway, from its Statikbericht and Ergebnisse pages.
it("k2-report-2023: the merged row era still yields its roof", () => {
  const m = extractMetadata(load("k2-report-2023"));
  expect(m.projectName).toBe("6,400 kWp Meyer Burger");
  expect(m.author).toBe("Phillip Theele");
  expect(m.customer).toBeNull();
  expect(m.moduleWp).toBe(400);
  expect(m.moduleCount).toBe(16);
  expect(m.kwpTotal).toBe(6.4);
  expect(m.verified).toBe(false); // "ENTHÄLT WARNUNG(EN)"
  expect(m.roofs).toEqual([
    {
      name: "Dach 1",
      moduleCount: 16,
      kwp: 6.4,
      // Null on purpose: a merged row has no covering line and no wattage line
      // of its own to slice a module name out of, and inventing one would put
      // the table's column header on the crew's delivery checklist.
      moduleType: null,
      pitchDeg: 2,
      covering: "Folie, Kies, ...",
    },
  ]);
});

it("forum1: block mode pairing and two roofs with different modules", () => {
  const m = extractMetadata(load("forum1"));
  expect(m.projectName).toBe("Bietigheim-Bissingen");
  expect(m.windZone).toBe("1"); // proves positional block pairing
  expect(m.snowZone).toBe("2");
  expect(m.address).toBe("74321 Bietigheim-Bissingen, Deutschland");
  expect(m.moduleCount).toBe(57);
  expect(m.kwpTotal).toBe(26.02);
  // The two roofs carry DIFFERENT modules, which is exactly why each roof's kWp
  // is computed from its own wattage rather than the project wide one.
  expect(m.roofs).toEqual([
    {
      name: "Dach 1",
      moduleCount: 41,
      kwp: 18.655, // 41 x 455 Wp
      moduleType: "AIKO-A455-MAH54Db (1757x1134x30) 1.757x1.134x30 mm",
      pitchDeg: 22,
      covering: "Ziegel",
    },
    {
      name: "Dach 3",
      moduleCount: 16,
      kwp: 7.36, // 16 x 460 Wp
      moduleType: "AIKO-A460-MAH54Db (1757x1134x30) 1.757x1.134x30 mm",
      pitchDeg: 22,
      covering: "Ziegel",
    },
  ]);
  // The panel counts of the individual roofs must add up to the project total,
  // the number the founder found missing on 2026-07-20.
  expect(m.roofs.reduce((n, r) => n + (r.moduleCount ?? 0), 0)).toBe(m.moduleCount);
});

it("forum1: the block mode cover is never positionally paired", () => {
  // forum1's cover extracts as a label block followed by a value block. Pairing
  // it would marry Gesellschaft to the project subtitle. Null is the honest answer.
  const m = extractMetadata(load("forum1"));
  expect(m.company).toBeNull();
});

// UPGRADED by the hardening plan, for the same reason as k2-report-2023.
it("forum2: the other merged row report also yields its roof", () => {
  const m = extractMetadata(load("forum2"));
  expect(m.reportVersion).toBe("3.1.97.0");
  expect(m.projectName).toBe("Neues Projekt");
  expect(m.mountingSystem).toBe("SingleRail");
  expect(m.roofs).toEqual([
    {
      name: "Dach 1",
      moduleCount: 16,
      kwp: 6.88,
      moduleType: null,
      pitchDeg: 25,
      covering: "Ziegel",
    },
  ]);
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

// The real customer reports.

it("kadir: the english report, end to end", () => {
  const m = extractMetadata(load("kadir-trainer-projekt"));
  expect(m.reportLanguage).toBe("en");
  expect(m.projectName).toBe("Kadir Trainer Projekt");
  expect(m.reportVersion).toBe("3.2.81.0");
  expect(m.reportDate).toBe("2026-03-24"); // from a slash dated footer
  expect(m.customer).toBe("Kadir");
  expect(m.company).toBe("Avesol d.o.o.");
  expect(m.author).toBe("Jan Drozg");
  // THE COVER ADDRESS TRAP: this cover also carries "Address Poštna ulica 1,
  // 2000, Maribor", the planning company's own office. The site is in Austria.
  expect(m.address).toBe("Felixdorfer G. 34B, 2700 Wiener Neustadt, Austria");
  expect(m.address).not.toContain("Maribor");
  expect(m.mountingSystem).toBe("SolidRail");
  expect(m.moduleWp).toBe(500);
  expect(m.moduleCount).toBe(20);
  expect(m.kwpTotal).toBe(10); // "Total 20 10.00 kWp"
  expect(m.roofType).toBe("Tile");
  expect(m.pitchDeg).toBe(45);
  expect(m.verified).toBe(true);
  expect(m.plannedInstallDate).toBe("2026-03-23");
  expect(m.roofs).toEqual([
    {
      name: "Area 1",
      moduleCount: 20,
      kwp: 10,
      moduleType: "TSM-500NEG18R.25 (Vertex S+) 1,961x1,134x30 mm",
      pitchDeg: 45,
      covering: "Tile",
    },
  ]);
});

it("martin-lang: two Bereich areas, each with its own pitch", () => {
  const m = extractMetadata(load("martin-lang"));
  expect(m.projectName).toBe("Martin Lang");
  expect(m.company).toBe("Lumix Solutions GmbH");
  expect(m.author).toBe("Samuel Wolf");
  expect(m.moduleCount).toBe(22);
  expect(m.kwpTotal).toBe(9.79);
  // Austria states a wind SPEED and no zone at all; keeping the figure as text
  // is honest, and dropping it would lose the load information entirely.
  expect(m.windZone).toBe("25,8 m/s");
  expect(m.snowZone).toBeNull();
  expect(m.roofs).toEqual([
    {
      name: "Bereich 1",
      moduleCount: 12,
      kwp: 5.34,
      moduleType: "TSM-445NEG9R.28 (Vertex S+) 1.762x1.134x30 mm",
      pitchDeg: 20,
      covering: "Ziegel",
    },
    {
      name: "Bereich 2",
      moduleCount: 10,
      kwp: 4.45,
      moduleType: "TSM-445NEG9R.28 (Vertex S+) 1.762x1.134x30 mm",
      // A different pitch from Bereich 1: the same site, two different days of
      // work, which is the whole reason pitch is a per area field.
      pitchDeg: 40,
      covering: "Ziegel",
    },
  ]);
  expect(m.roofs.reduce((n, r) => n + (r.moduleCount ?? 0), 0)).toBe(22);
});

it("planung-engelmeier: a planner's own area name and a period decimal pitch", () => {
  const m = extractMetadata(load("planung-engelmeier"));
  expect(m.customer).toBe("Christian Engelmeier");
  expect(m.moduleCount).toBe(33);
  expect(m.kwpTotal).toBe(14.85);
  // "Dachneigung 8.1°" in a GERMAN report: the comma only pitch regex the
  // shipped parser used returned null here, at both levels.
  expect(m.pitchDeg).toBe(8.1);
  expect(m.roofs).toEqual([
    {
      name: "Block 01 - Gezeichnete Belegungsfläche 01",
      moduleCount: 33,
      kwp: 14.85,
      // The SKU is wrap mangled by the PDF itself ("TSM-450" / "NEG9R.25").
      // Pinned as is: this is what the document says, and "repairing" it would
      // be inventing a part number.
      moduleType: "TSM-450 NEG9R.25 Vertex S+ 1.762x1.134x30 mm",
      pitchDeg: 8.1,
      covering: "Blechfalz",
    },
  ]);
});

it("thomas-woginger: two areas whose table rows are byte identical", () => {
  // Both areas print "12 5.34 kWp". Collecting row ends into a Set instead of a
  // list would collapse them, break the count match, and blank both roofs.
  const m = extractMetadata(load("thomas-woginger"));
  expect(m.roofs.map((r) => [r.name, r.moduleCount])).toEqual([
    ["Bereich 1", 12],
    ["Bereich 2", 12],
  ]);
  expect(m.moduleCount).toBe(24);
});

it("petra-ullrich: heights glued onto the row ends", () => {
  // This german report merges the height into the row end ("5,00 m 9 4.005
  // kWp"), exactly as the english one does. End anchoring is what survives it.
  const m = extractMetadata(load("petra-ullrich"));
  expect(m.roofs.map((r) => [r.name, r.moduleCount, r.kwp])).toEqual([
    ["Bereich 1", 9, 4.005],
    ["Bereich 2", 6, 2.67],
  ]);
  expect(m.moduleCount).toBe(15);
});

it("every fixture's roof counts add up to its project total", () => {
  // The invariant the founder's first catch was about, now enforced everywhere
  // a report breaks its areas out.
  for (const name of [
    "forum1",
    "forum2",
    "k2-report-2025",
    "k2-report-2023",
    "kadir-trainer-projekt",
    "martin-lang",
    "petra-ullrich",
    "planung-engelmeier",
    "thomas-woginger",
  ]) {
    const m = extractMetadata(load(name));
    const summed = m.roofs.reduce((n, r) => n + (r.moduleCount ?? 0), 0);
    expect(summed, `${name} roofs must sum to its total`).toBe(m.moduleCount);
  }
});
