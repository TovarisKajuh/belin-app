import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { resolveActorFromSession } from "@/lib/auth";
import { personaForPersonId } from "@/lib/demo/personas";
import { signupOpen } from "@/lib/data/signups";
import { SUPPORT } from "@/lib/legal";
import { SignupForm } from "@/components/signup/SignupForm";
import { Wordmark } from "@/components/landing/Wordmark";
import { LegalLinks } from "@/components/landing/LegalLinks";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signup" });
  return { title: t("pageTitle") };
}

// The front door for a company that wants to try Belin alone. People signed in
// to an account of their own have nothing to do here. Closed (the kill switch,
// or legal pages missing) it says so and names a person to write to, instead
// of a dead form.
export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // A phone that joined the meeting through the guest QR (D18), or any Demo
  // Door persona, or a project-link session, is not an account of its own: it
  // gets the form. In beat 9 the buyer signs up on the phone that still holds
  // the 2 h guest crew session from beat 4. Only a real person session goes
  // to the app.
  const actor = await resolveActorFromSession();
  if (actor?.kind === "person" && personaForPersonId(actor.personId) === null) redirect(`/${locale}/app`);

  const t = await getTranslations("signup");
  const tLanding = await getTranslations("landing");
  const open = signupOpen();

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />
      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark href={`/${locale}`} />
          <nav className="lp-locales" aria-label={tLanding("languageLabel")}>
            {routing.locales.map((l) => (
              <Link key={l} href={`/${l}/registracija`} aria-current={l === locale ? "page" : undefined}>
                {l}
              </Link>
            ))}
          </nav>
        </header>

        <div className="lp-solo">
          <section className="lp-card su-card" aria-labelledby="su-title">
            <div className="lp-card-glow" aria-hidden />
            <h1 id="su-title" className="lp-card-title">
              {open ? t("title") : t("closedTitle")}
            </h1>
            <p className="lp-card-sub">{open ? t("lead") : t("closedBody", { contact: SUPPORT.email })}</p>
            {open && <SignupForm locale={locale} contact={SUPPORT.email} />}
            <p className="su-alt">
              {t("haveAccount")} <Link href={`/${locale}/login`}>{t("loginLink")}</Link>
            </p>
          </section>
        </div>

        <footer className="lp-foot">
          <span>{tLanding("footer")}</span>
          <LegalLinks locale={locale} />
        </footer>
      </div>
    </main>
  );
}
