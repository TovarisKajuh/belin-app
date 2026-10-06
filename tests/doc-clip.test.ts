import { describe, expect, it } from "vitest";
import { clipAtWord } from "@/lib/pdf/doc-format";

// The completion report cover printed "...zaradi dostave drugega iz", cut in
// the middle of a word (production verification, 2026-10-06).
describe("clipAtWord", () => {
  it("leaves a short summary alone", () => {
    expect(clipAtWord("Montaža vrst 1 do 4.", 90)).toBe("Montaža vrst 1 do 4.");
  });

  it("ends a long summary at a word boundary with an ellipsis", () => {
    const text =
      "Montaža nadaljevana na južnem delu strehe, delo prekinjeno ob 14.00 zaradi dostave drugega izmenjevalnika.";
    const clipped = clipAtWord(text, 90);
    expect(clipped.length).toBeLessThanOrEqual(90);
    expect(clipped.endsWith("…")).toBe(true);
    expect(text.startsWith(clipped.slice(0, -1))).toBe(true);
    // The character after the kept text is a space: no word was cut.
    expect(text[clipped.length - 1]).toBe(" ");
  });

  it("drops a trailing comma before the ellipsis", () => {
    expect(clipAtWord("Ena dva tri štiri, pet šest sedem osem devet", 22)).toBe("Ena dva tri štiri…");
  });

  it("collapses whitespace from joined notes", () => {
    expect(clipAtWord("  Prvi   zapis \n drugi zapis ", 90)).toBe("Prvi zapis drugi zapis");
  });
});
