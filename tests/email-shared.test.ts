import { describe, it, expect } from "vitest";
import { renderEmail, escapeHtml } from "@/lib/email-shared";

describe("escapeHtml", () => {
  it("escapes every character that can break out of text or an attribute", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("leaves ordinary text, including Slovenian letters, untouched", () => {
    expect(escapeHtml("Naročilnica je sprejeta, hvala.")).toBe(
      "Naročilnica je sprejeta, hvala.",
    );
  });
});

describe("renderEmail", () => {
  const html = () =>
    renderEmail("Nova naročilnica", ["Prva vrstica.", "Druga vrstica."], "Odpri", "https://app.example/sl/app");

  it("produces one self-contained HTML document with no external assets", () => {
    const out = html();
    expect(out).toContain("<table");
    expect(out).toContain("Nova naročilnica");
    expect(out).toContain("Prva vrstica.");
    expect(out).toContain("Druga vrstica.");
    expect(out).toContain("https://app.example/sl/app");
    expect(out).toContain("Odpri");
    // no linked stylesheets, scripts or remote images: mail clients strip them
    // and some of them leak a read receipt
    expect(out).not.toMatch(/<script|<link|src="http/);
  });

  it("carries the brand shell", () => {
    const out = html();
    expect(out).toContain("#0b1524");
    expect(out).toContain("#d4a843");
    expect(out).toContain("Belin");
    expect(out).toContain("getbelin.com");
  });

  // Body lines interpolate text typed by a crew member on a roof. If that text
  // reached the HTML unescaped, anyone with the app could post a link into the
  // other side's inbox under our verified sending domain.
  it("escapes an injected anchor in a body line", () => {
    const evil = `<a href="https://evil.example">click me</a>`;
    const out = renderEmail("Zahteva", [evil], "Odpri", "https://app.example/sl/app");
    expect(out).not.toContain("<a href=\"https://evil.example\"");
    expect(out).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;");
  });

  it("escapes the heading and the CTA label too", () => {
    const out = renderEmail("<b>hi</b>", ["ok"], `"><script>x</script>`, "https://app.example/");
    expect(out).not.toContain("<b>hi</b>");
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });

  // The CTA url lands inside an href attribute, so it needs the same treatment
  // even though we always build it ourselves.
  it("escapes quotes in the CTA url so it cannot break out of the attribute", () => {
    const out = renderEmail("H", ["b"], "Odpri", `https://app.example/"><script>x</script>`);
    expect(out).not.toContain("<script>x</script>");
  });
});
