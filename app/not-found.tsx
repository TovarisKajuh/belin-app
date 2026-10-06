// Root not-found: paths the middleware never routes to a locale, such as a
// dotted /nekaj.txt. The root layout returns bare children, so this brings its
// own html and body. Outside any locale there is no catalog to read, so this
// is Slovenian, the default locale, and links to /sl.
export default function RootNotFound() {
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
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Te strani ni</h1>
          <p style={{ margin: "8px 0 24px", fontSize: 14, color: "#cfcabf", lineHeight: 1.5 }}>
            Povezava je morda stara ali pa je v naslovu tipkarska napaka.
          </p>
          <a
            href="/sl"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "0 18px",
              borderRadius: 999,
              background: "#ffd21a",
              color: "#14100a",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Na začetno stran
          </a>
        </main>
      </body>
    </html>
  );
}
