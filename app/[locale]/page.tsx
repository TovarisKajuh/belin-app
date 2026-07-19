import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { sessionToken } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

// A rising-gold cell pattern, the same mark the command bar and the launch
// animation use, drawn larger here.
const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

const POINTS = ["point1", "point2", "point3"] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in: skip the landing page entirely. Checked on the cookie
  // alone, so a signed-out visitor costs no database round trip.
  if (await sessionToken()) redirect(`/${locale}/app`);

  const t = await getTranslations("landing");

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />

      <div className="lp-wrap">
        <header className="lp-top">
          <div className="lp-brand">
            <span className="lp-mark" aria-hidden>
              {MARK.map((v, i) => (
                <i key={i} className={v ? "g" : undefined} />
              ))}
            </span>
            <span className="lp-wm">BELIN</span>
          </div>

          <nav className="lp-locales" aria-label={t("languageLabel")}>
            {routing.locales.map((l) => (
              <Link key={l} href={`/${l}`} aria-current={l === locale ? "page" : undefined}>
                {l}
              </Link>
            ))}
          </nav>
        </header>

        <div className="lp-grid">
          <section className="lp-hero">
            <p className="lp-eyebrow">{t("eyebrow")}</p>
            <h1 className="lp-title">{t("title")}</h1>
            <p className="lp-sub">{t("subtitle")}</p>

            <ul className="lp-points">
              {POINTS.map((k) => (
                <li key={k}>
                  <span className="lp-tick" aria-hidden />
                  {t(k)}
                </li>
              ))}
            </ul>
          </section>

          <section className="lp-card" aria-labelledby="lp-card-title">
            <div className="lp-card-glow" aria-hidden />
            <h2 id="lp-card-title" className="lp-card-title">
              {t("signIn")}
            </h2>
            <p className="lp-card-sub">{t("signInSub")}</p>
            <LoginForm locale={locale} />
          </section>
        </div>

        <footer className="lp-foot">{t("footer")}</footer>
      </div>
    </main>
  );
}
