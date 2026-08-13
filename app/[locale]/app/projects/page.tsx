import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveTokenActorFromSession } from "@/lib/auth";
import { listProjectsForOrg } from "@/lib/data/projects-list";
import { BelinMark } from "@/components/BelinMark";
import { LocaleSwitch } from "@/components/LocaleSwitch";

// The EPC's project list. It exists because identity is still a project token:
// without it, a project created in the wizard is reachable only through the
// link shown once on the done screen.
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await resolveTokenActorFromSession();
  if (!actor || actor.role !== "epc") {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app/projects`)}`);
  }

  const [projects, t, tLanding] = await Promise.all([
    listProjectsForOrg(actor),
    getTranslations("projects"),
    getTranslations("landing"),
  ]);

  return (
    <div className="belin-dark">
      <div className="e-grain" />

      <div className="e-bar">
        <div className="e-bar-in">
          <div className="e-brand">
            <BelinMark />
            <span className="e-wm">BELIN</span>
            <span className="e-bproj">
              <b>{t("title")}</b>
            </span>
          </div>
          <div className="e-br">
            <LocaleSwitch label={tLanding("languageLabel")} />
            <Link href={`/${locale}/app/new`} className="pl-new">
              {t("new")}
            </Link>
          </div>
        </div>
      </div>

      <div className="e-wrap">
        <section className="e-sec">
          <div className="e-eyebrow">{t("eyebrow")}</div>

          {projects.length === 0 ? (
            <p className="pl-empty">{t("empty")}</p>
          ) : (
            <ul className="pl-list">
              {projects.map((p) => {
                const facts = [
                  p.city,
                  p.kwp !== null ? `${p.kwp} kWp` : null,
                  p.subName,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const card = (
                  <>
                    <div className="pl-name">{p.name}</div>
                    {facts && <div className="pl-facts">{facts}</div>}
                    <div className={`pl-status s-${p.status}`}>{t(`status.${p.status}`)}</div>
                  </>
                );

                return (
                  <li key={p.id} className="pl-item">
                    {p.epcToken ? (
                      <Link href={`/${locale}/p/${p.epcToken}`} className="pl-link">
                        {card}
                      </Link>
                    ) : (
                      // A project with no live EPC token cannot be opened. Shown
                      // rather than hidden, so it is never silently missing.
                      <div className="pl-link pl-dead">{card}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
