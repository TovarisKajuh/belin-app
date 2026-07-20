import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveActorFromSession } from "@/lib/auth";
import { requireOfficeActor } from "@/lib/actor";
import { listProjectsForPerson } from "@/lib/data/projects-list";
import { ensureCrewLink } from "@/lib/data/invites";
import { canIssueCrewLink } from "@/lib/invites-shared";
import { appBaseUrl } from "@/lib/app-url";
import { InvitePanel } from "@/components/settings/InvitePanel";
import { CrewLink } from "@/components/settings/CrewLink";
import { BelinMark } from "@/components/BelinMark";

// Settings. Task B5 gives it the invitations and the crew link; Task B6 adds
// the company details and the compliance vault to the same page.
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/app/settings`)}`);

  let person;
  try {
    person = requireOfficeActor(actor);
  } catch {
    // A Bauleiter or a crew account: this page hands out accounts and will soon
    // hold the IBAN, so it belongs to the people who run the company.
    redirect(`/${locale}/app`);
  }

  const t = await getTranslations("settings");
  const projects = await listProjectsForPerson(person);

  // The crew link is per project and only the sub office hands it out.
  const crewLinks = canIssueCrewLink(person.orgType, person.role)
    ? await Promise.all(
        projects.map(async (p) => ({
          projectId: p.id,
          name: p.name,
          url: `${appBaseUrl() ?? ""}/${locale}/p/${await ensureCrewLink(p.id)}`,
        })),
      )
    : [];

  return (
    <div className="belin-dark">
      <div className="e-grain" aria-hidden />

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
            <Link href={`/${locale}/app`} className="cb-nav">
              {t("backToProjects")}
            </Link>
          </div>
        </div>
      </div>

      <div className="e-wrap">
        {person.orgType === "epc" && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("peopleSection")}</h2>
            <InvitePanel
              locale={locale}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            />
          </section>
        )}

        {crewLinks.length > 0 && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("crewLink")}</h2>
            <p className="st-note">{t("crewLinkNote")}</p>
            <div className="st-grid">
              {crewLinks.map((l) => (
                <CrewLink
                  key={l.projectId}
                  name={l.name}
                  url={l.url}
                  copyLabel={t("copyLink")}
                  copiedLabel={t("copied")}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
