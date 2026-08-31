import Link from "next/link";
import { routing } from "@/i18n/routing";
import { Wordmark } from "@/components/landing/Wordmark";
import { OPERATOR } from "@/lib/legal";
import type { LegalCopy, LegalSection } from "@/lib/legal-copy";

/**
 * The shell both legal pages share.
 *
 * Same dark system, wordmark and language switch as the landing page, because a
 * legal page that looks like a different website is the kind of detail a
 * cautious German buyer notices. Narrower measure than the marketing pages:
 * this is prose to be read, not a page to be scanned.
 */
export function LegalPage({
  locale,
  path,
  title,
  subtitle,
  children,
  sections,
}: {
  locale: string;
  /** This page's own route segment, so the language switch stays on the page
   *  the reader is actually reading instead of dropping them on the pitch. */
  path: "impressum" | "zasebnost";
  title: string;
  subtitle?: string;
  /** The identity block, on the Impressum. */
  children?: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />

      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark href={`/${locale}`} />
          <nav className="lp-locales" aria-label="Language">
            {routing.locales.map((l) => (
              <Link key={l} href={`/${l}/${path}`} aria-current={l === locale ? "page" : undefined}>
                {l}
              </Link>
            ))}
          </nav>
        </header>

        <article className="lg-doc">
          <h1 className="lg-title">{title}</h1>
          {subtitle && <p className="lg-sub">{subtitle}</p>}

          {children}

          {sections.map((section) => (
            <section key={section.h} className="lg-sec">
              <h2 className="lg-h2">{section.h}</h2>
              {section.p.map((paragraph, i) => (
                <p key={i} className="lg-p">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>

        <footer className="lp-foot">
          <span>Belin, getbelin.com</span>
        </footer>
      </div>
    </main>
  );
}

/** The identity table on the Impressum, built only from fields that exist. */
export function OperatorBlock({ copy }: { copy: LegalCopy["impressum"] }) {
  const name = [OPERATOR.legalName, OPERATOR.legalForm].filter(Boolean).join(" ");
  const present = (values: (string | null)[]): string[] =>
    values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const address = present([
    OPERATOR.street,
    [OPERATOR.zip, OPERATOR.city].filter(Boolean).join(" "),
    OPERATOR.country,
  ]);

  const rows: { label: string; lines: string[] }[] = [
    { label: copy.labels.operator, lines: present([name]) },
    { label: copy.labels.address, lines: address },
    { label: copy.labels.representative, lines: present([OPERATOR.representative]) },
    { label: copy.labels.contact, lines: present([OPERATOR.email, OPERATOR.phone]) },
    { label: copy.labels.register, lines: present([OPERATOR.registerNumber]) },
    { label: copy.labels.vat, lines: present([OPERATOR.vatId]) },
  ].filter((row) => row.lines.length > 0);

  return (
    <div className="lg-ident">
      {rows.map((row) => (
        <div key={row.label} className="lg-ident-row">
          <span className="lg-ident-label">{row.label}</span>
          <span className="lg-ident-value">
            {row.lines.map((line, i) => (
              <span key={i} className="lg-ident-line">
                {line}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
