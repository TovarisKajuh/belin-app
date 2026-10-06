import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/landing/Wordmark";

// Reached only when a project link really does not resolve: a missing or
// revoked token. An outage throws past this to the error page.
export default async function ProjectLinkNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("errors");
  const tProject = await getTranslations("project");
  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />
      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark href={`/${locale}`} />
        </header>
        <div className="lp-solo">
          <section className="lp-card" aria-labelledby="nf-title">
            <div className="lp-card-glow" aria-hidden />
            <h1 id="nf-title" className="lp-card-title">
              {tProject("notFoundTitle")}
            </h1>
            <p className="lp-card-sub">{tProject("notFoundBody")}</p>
            <Link className="lp-enter er-home" href={`/${locale}`}>
              {t("home")}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
