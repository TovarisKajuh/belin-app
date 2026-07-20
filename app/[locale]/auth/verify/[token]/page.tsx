import { setRequestLocale, getTranslations } from "next-intl/server";
import { safeNext } from "@/lib/auth-core";
import { ConfirmLogin } from "@/components/auth/ConfirmLogin";
import { BelinMark } from "@/components/BelinMark";

// The magic link lands here. Rendering this page does NOT sign anybody in and
// does not touch the token: mail scanners fetch every link in an email before
// the recipient does, and a GET that consumed the token would leave the human
// staring at "this link has expired". The button below is the only thing that
// consumes it.
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const { next } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />

      <div className="lp-wrap">
        <div className="lp-solo">
          <section className="lp-card">
            <div className="lp-card-glow" aria-hidden />
            <div className="lp-brand" style={{ marginBottom: 22 }}>
              <BelinMark />
              <span className="lp-wm">BELIN</span>
            </div>

            <h1 className="lp-card-title">{t("confirmTitle")}</h1>
            <p className="lp-card-sub">{t("loginBody")}</p>

            <ConfirmLogin
              locale={locale}
              token={token}
              next={safeNext(next) ?? ""}
              confirmLabel={t("confirmLogin")}
              invalidLabel={t("linkInvalid")}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
