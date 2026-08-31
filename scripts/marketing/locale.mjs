// Which language the marketing pipeline is currently shooting.
//
// The assets are not translations of each other, they are separate photographs
// of a differently dressed demo: German screenshots come from the German UI,
// and the German PDFs come from a project whose `language` is de, because the
// documents render from the database rather than from the interface. So every
// output directory is suffixed by locale and nothing overwrites anything.
//
// Slovenian keeps the unsuffixed paths, because it was there first and its
// assets are already committed and referenced by the landing page.

export const LOCALE = (process.env.MARKETING_LOCALE ?? "sl").toLowerCase();

if (!["sl", "de", "en"].includes(LOCALE)) {
  console.error(`MARKETING_LOCALE must be sl, de or en (got "${LOCALE}")`);
  process.exit(1);
}

/** "" for Slovenian, "-de" for German. */
export const SUFFIX = LOCALE === "sl" ? "" : `-${LOCALE}`;

/** An asset directory for the current locale, e.g. dir("framed"). */
export const dir = (name) => `assets/marketing/${name}${SUFFIX}`;

/** A mockup or document file name for the current locale. */
export const named = (name) => `${name}${SUFFIX}`;

/** The browser locale to hand Playwright. */
export const BROWSER_LOCALE = { sl: "sl-SI", de: "de-DE", en: "en-GB" }[LOCALE];
