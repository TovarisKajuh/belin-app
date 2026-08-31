import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { resolveActorFromSession } from "@/lib/auth";
import { safeNext } from "@/lib/auth-core";
import { LoginForm } from "@/components/auth/LoginForm";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { Wordmark } from "@/components/landing/Wordmark";
import { LegalLinks } from "@/components/landing/LegalLinks";

/**
 * Signing in, on its own screen.
 *
 * It used to be a card in the landing hero, sharing the fold with the pitch.
 * The hero now carries the product itself, so the form moved here and the
 * landing header carries one gold button pointing at it. Every guarded route
 * sends a signed-out visitor straight to this page rather than to the pitch,
 * so nobody has to read a landing page to find the way in.
 *
 * The whole magic link path is unchanged: same form, same action, same `next`.
 */
export default async function Login({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in: there is nothing to do here. Resolved, not read from the
  // cookie, for the same reason the landing page resolves it: a stale cookie
  // that bounces between here and /app is an infinite redirect.
  if (await resolveActorFromSession()) redirect(`/${locale}/app`);

  const { next } = await searchParams;
  const safe = safeNext(next) ?? "";
  const demoLogin = process.env.DEMO_LOGIN === "1";

  const t = await getTranslations("landing");

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />

      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark href={`/${locale}`} />

          <nav className="lp-locales" aria-label={t("languageLabel")}>
            {routing.locales.map((l) => (
              <Link
                key={l}
                // The destination survives the language switch. Losing it here
                // would quietly drop a visitor on /app after signing in,
                // instead of on the page they were trying to open.
                href={safe ? `/${l}/login?next=${encodeURIComponent(safe)}` : `/${l}/login`}
                aria-current={l === locale ? "page" : undefined}
              >
                {l}
              </Link>
            ))}
          </nav>
        </header>

        <div className="lp-solo">
          <section className="lp-card" aria-labelledby="lp-card-title">
            <div className="lp-card-glow" aria-hidden />
            <h1 id="lp-card-title" className="lp-card-title">
              {t("signIn")}
            </h1>
            <p className="lp-card-sub">{t("signInSub")}</p>
            <MagicLinkForm locale={locale} next={safe} />
            {/* The demo password path is opt IN and fail closed: it appears only
                when DEMO_LOGIN is exactly "1". Task J4 deletes it outright. */}
            {demoLogin && <LoginForm locale={locale} />}
          </section>
        </div>

        {/* Both spans, like the landing page: `.lp .lp-foot` is a
            space-between flex row, so a lone child sits hard against the left
            edge and reads as a layout bug. */}
        <footer className="lp-foot">
          <span>{t("footer")}</span>
          <LegalLinks locale={locale} />
        </footer>
      </div>
    </main>
  );
}
