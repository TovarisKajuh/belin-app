import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { resolveActorFromSession } from "@/lib/auth";
import { safeNext } from "@/lib/auth-core";
import { LoginForm } from "@/components/auth/LoginForm";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

// A rising-gold cell pattern, the same mark the command bar and the launch
// animation use, drawn larger here.
const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

const POINTS = ["point1", "point2", "point3"] as const;

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in: skip the landing page entirely. This RESOLVES the
  // session rather than just reading the cookie. A cookie that no longer
  // resolves (expired, revoked, or a session from a rebuilt database) would
  // otherwise bounce here, get sent to /app, fail to resolve there, and be sent
  // straight back: an infinite redirect. A signed-out visitor has no cookie at
  // all and still costs no database round trip.
  if (await resolveActorFromSession()) redirect(`/${locale}/app`);

  const { next } = await searchParams;
  const demoLogin = process.env.DEMO_LOGIN === "1";

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
            <MagicLinkForm locale={locale} next={safeNext(next) ?? ""} />
            {/* The demo password path is opt IN and fail closed: it appears only
                when DEMO_LOGIN is exactly "1". Task J4 deletes it outright. */}
            {demoLogin && <LoginForm locale={locale} />}
          </section>
        </div>

        <footer className="lp-foot">{t("footer")}</footer>
      </div>
    </main>
  );
}
