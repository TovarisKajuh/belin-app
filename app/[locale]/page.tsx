import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { resolveActorFromSession } from "@/lib/auth";
import { safeNext } from "@/lib/auth-core";
import { Story } from "@/components/landing/Story";
import { Wordmark } from "@/components/landing/Wordmark";
import { LegalLinks } from "@/components/landing/LegalLinks";
import { signupOpen } from "@/lib/data/signups";

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

  // A guarded route now sends signed-out visitors to /login directly, so `next`
  // reaching the landing page is an older link or a hand-typed URL. It is still
  // carried through the header button rather than dropped, because losing it
  // means signing in and landing somewhere you did not ask for.
  const { next } = await searchParams;
  const safe = safeNext(next) ?? "";
  const signInHref = safe
    ? `/${locale}/login?next=${encodeURIComponent(safe)}`
    : `/${locale}/login`;

  const t = await getTranslations("landing");
  const tSignup = await getTranslations("signup");

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />

      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark />

          <div className="lp-top-r">
            <nav className="lp-locales" aria-label={t("languageLabel")}>
              {routing.locales.map((l) => (
                <Link key={l} href={`/${l}`} aria-current={l === locale ? "page" : undefined}>
                  {l}
                </Link>
              ))}
            </nav>

            {/* Two ways in: the gold one for a company that is new, the quiet
                one for people who already have an account. On a phone only the
                gold one fits beside the language switch; existing users reach
                login from /app and from the closing section. While signup is
                closed this is exactly the single button it always was. */}
            <Link
              href={signInHref}
              className={signupOpen() ? "lp-enter su-enter-quiet su-hide-narrow" : "lp-enter"}
            >
              {t("useApp")}
            </Link>
            {signupOpen() && (
              <Link href={`/${locale}/registracija`} className="lp-enter">
                {tSignup("ctaStart")}
              </Link>
            )}
          </div>
        </header>

        <div className="lp-grid">
          <section className="lp-hero">
            <p className="lp-eyebrow">{t("eyebrow")}</p>
            {/* The headline is a sentence in two halves, a claim and its span,
                so it is set as two: the promise in full ink, what it covers
                underneath in the softer one. Split on the colon the copy
                already contains in all three languages, and falling back to one
                plain line if a future wording has none. */}
            {(() => {
              const title = t("title");
              const at = title.indexOf(":");
              if (at < 0) return <h1 className="lp-title">{title}</h1>;
              return (
                <h1 className="lp-title">
                  {title.slice(0, at + 1)}
                  <span className="lp-title-2">{title.slice(at + 1).trim()}</span>
                </h1>
              );
            })()}
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

          {/* Both sides of the product, in one picture: the office on a desk,
              the roof in a hand. The two screens are real, shot from the seeded
              demo by the marketing pipeline, not drawn. */}
          <section className="lp-stage" aria-hidden={false}>
            <span className="lp-stage-glow" aria-hidden />
            <Image
              src="/landing/hero-laptop.webp"
              alt={t("heroLaptopAlt")}
              width={1800}
              height={1082}
              sizes="(max-width: 900px) 96vw, 62vw"
              priority
              className="lp-stage-laptop"
            />
            <Image
              src="/landing/hero-phone.webp"
              alt={t("heroPhoneAlt")}
              width={1100}
              height={888}
              sizes="(max-width: 900px) 42vw, 24vw"
              priority
              className="lp-stage-phone"
            />
          </section>
        </div>

      </div>

      {/* The product story below the fold. */}
      <Story locale={locale} />

      <div className="lp-wrap">
        <footer className="lp-foot">
          <span>{t("footer")}</span>
          <LegalLinks locale={locale} />
        </footer>
      </div>
    </main>
  );
}
