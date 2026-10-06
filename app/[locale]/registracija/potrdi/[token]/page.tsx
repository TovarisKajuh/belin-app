import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { loadSignupForConfirm } from "@/lib/data/signups";
import { SUPPORT } from "@/lib/legal";
import { ConfirmSignup } from "@/components/signup/ConfirmSignup";
import { BelinMark } from "@/components/BelinMark";

// The link in the confirmation email lands here. Rendering this page reads the
// signup and changes nothing; only the button creates the company.
export default async function ConfirmSignupPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signup");
  const view = await loadSignupForConfirm(token);

  const shell = (body: React.ReactNode) => (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />
      <div className="lp-wrap">
        <div className="lp-solo">
          <section className="lp-card su-card">
            <div className="lp-card-glow" aria-hidden />
            <div className="lp-brand" style={{ marginBottom: 22 }}>
              <BelinMark />
              <span className="lp-wm">BELIN</span>
            </div>
            {body}
          </section>
        </div>
      </div>
    </main>
  );

  if (view.state !== "ready") {
    const message =
      view.state === "used" ? t("confirmUsed") : view.state === "expired" ? t("confirmExpired") : t("confirmInvalid");
    const href = view.state === "used" ? `/${locale}/login` : `/${locale}/registracija`;
    const label = view.state === "used" ? t("loginLink") : t("startAgain");
    return shell(
      <>
        <h1 className="lp-card-title">{t("confirmTitle")}</h1>
        <p className="lp-card-sub">{message}</p>
        <Link href={href} className="lp-submit" style={{ textDecoration: "none" }}>{label}</Link>
      </>,
    );
  }

  const rows: [string, string | null][] = [
    [t("rowCompany"), view.company],
    [t("rowVat"), view.vatId],
    [t("rowAddress"), view.address],
    [t("rowName"), view.fullName],
    [t("rowEmail"), view.email],
  ];

  return shell(
    <>
      <h1 className="lp-card-title">{t("confirmTitle")}</h1>
      <p className="lp-card-sub">{t("confirmLead")}</p>
      <dl className="su-sum">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="su-sum-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <ConfirmSignup
        locale={locale}
        token={token}
        cta={t("confirmCta")}
        loginLabel={t("loginLink")}
        errors={{
          invalid: t("confirmInvalid"),
          expired: t("confirmExpired"),
          used: t("confirmUsed"),
          emailTaken: t("confirmEmailTaken"),
          closed: t("closedBody", { contact: SUPPORT.email }),
          generic: t("confirmGeneric", { contact: SUPPORT.email }),
        }}
      />
    </>,
  );
}
