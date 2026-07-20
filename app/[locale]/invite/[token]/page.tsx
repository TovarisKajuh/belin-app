import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { loadInvite } from "@/lib/data/invites";
import { AcceptInvite } from "@/components/invite/AcceptInvite";
import { BelinMark } from "@/components/BelinMark";

// Where an invited company or colleague creates their account. Rendering this
// page consumes nothing: the form below does, on POST.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("invite");
  const invite = await loadInvite(token);

  const shell = (body: React.ReactNode) => (
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
            {body}
          </section>
        </div>
      </div>
    </main>
  );

  if (!invite) {
    return shell(
      <>
        <h1 className="lp-card-title">{t("title")}</h1>
        <p className="lp-card-sub">{t("invalid")}</p>
        <Link href={`/${locale}`} className="lp-submit" style={{ textDecoration: "none" }}>
          {t("goHome")}
        </Link>
      </>,
    );
  }

  // The slot was filled between the invitation being sent and opened. Said
  // plainly rather than letting the form fail at the end.
  if (invite.kind === "sub_company" && invite.alreadyLinked) {
    return shell(
      <>
        <h1 className="lp-card-title">{t("title")}</h1>
        <p className="lp-card-sub">{t("alreadyLinked")}</p>
      </>,
    );
  }

  const intro =
    invite.kind === "sub_company"
      ? t("body", { org: invite.orgName ?? "", project: invite.projectName ?? "" })
      : t("bodyMember", { org: invite.orgName ?? "" });

  return shell(
    <>
      <h1 className="lp-card-title">{t("title")}</h1>
      <p className="lp-card-sub">{intro}</p>
      <AcceptInvite
        locale={locale}
        token={token}
        needsOrgName={invite.kind === "sub_company"}
        email={invite.email ?? ""}
        labels={{
          orgName: t("orgName"),
          yourName: t("yourName"),
          email: t("email"),
          cta: t("acceptCta"),
          invalid: t("invalid"),
          alreadyLinked: t("alreadyLinked"),
          emailTaken: t("emailTaken"),
          login: t("login"),
        }}
      />
    </>,
  );
}
