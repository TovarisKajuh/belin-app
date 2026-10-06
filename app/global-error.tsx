"use client";

// The last resort, used only when app/[locale]/layout.tsx itself throws.
// It replaces the root layout, so it brings its own html and body, and its
// own styles: globals.css and the message catalogs are loaded by the layout
// that just failed. Slovenian, the default locale and the meeting language.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "16px",
          boxSizing: "border-box",
          background: "#0b1524",
          color: "#f4f1ea",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main style={{ width: "100%", maxWidth: 420 }}>
          <p style={{ margin: "0 0 24px", fontWeight: 800, letterSpacing: ".07em" }}>BELIN</p>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Začasna napaka</h1>
          <p style={{ margin: "8px 0 24px", fontSize: 14, color: "#cfcabf", lineHeight: 1.5 }}>
            Strani trenutno ni bilo mogoče naložiti. Vaši podatki so varni. Poskusite znova čez nekaj sekund.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 48,
              padding: "0 22px",
              border: "none",
              borderRadius: 11,
              background: "#ffd21a",
              color: "#14100a",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Poskusi znova
          </button>
          {error.digest ? (
            <p style={{ marginTop: 18, fontSize: 12, color: "#8f8a7e" }}>Koda napake: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
