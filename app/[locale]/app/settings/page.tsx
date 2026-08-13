import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveActorFromSession } from "@/lib/auth";
import { requireOfficeActor } from "@/lib/actor";
import { listProjectsForPerson } from "@/lib/data/projects-list";
import { ensureCrewLink } from "@/lib/data/invites";
import { canIssueCrewLink } from "@/lib/invites-shared";
import { listOrgCrew } from "@/lib/data/crew";
import { CrewRoster } from "@/components/settings/CrewRoster";
import { appBaseUrl } from "@/lib/app-url";
import {
  getOrgSettings,
  getNotificationPrefs,
  listVaultDocs,
} from "@/lib/data/org-settings";
import { InvitePanel } from "@/components/settings/InvitePanel";
import { CrewLink } from "@/components/settings/CrewLink";
import { OrgForm } from "@/components/settings/OrgForm";
import { VaultPanel } from "@/components/settings/VaultPanel";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { BelinMark } from "@/components/BelinMark";
import { LocaleSwitch } from "@/components/LocaleSwitch";

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
  const tLanding = await getTranslations("landing");
  const [projects, org, prefs, docs] = await Promise.all([
    listProjectsForPerson(person),
    getOrgSettings(person),
    getNotificationPrefs(person),
    person.orgType === "sub" ? listVaultDocs(person) : Promise.resolve([]),
  ]);

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

  // The roster the crew claim their names from. Same gate as the link above it:
  // whoever may hand out the link is whoever may decide who is on the crew.
  const crew = canIssueCrewLink(person.orgType, person.role) ? await listOrgCrew(person) : [];

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
            <LocaleSwitch label={tLanding("languageLabel")} />
            <Link href={`/${locale}/app`} className="cb-nav">
              {t("backToProjects")}
            </Link>
          </div>
        </div>
      </div>

      <div className="e-wrap">
        {org && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("orgSection")}</h2>
            <OrgForm locale={locale} org={org} />
          </section>
        )}

        <section className="e-sec e-reveal">
          <h2 className="e-sec-h">{t("notifSection")}</h2>
          <p className="st-note">{t("notifNote")}</p>
          <NotificationPrefs prefs={prefs} side={person.orgType} />
        </section>

        {person.orgType === "sub" && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("vaultSection")}</h2>
            <VaultPanel docs={docs} today={new Date().toISOString()} />
          </section>
        )}

        {person.orgType === "epc" && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("peopleSection")}</h2>
            <InvitePanel locale={locale} />
          </section>
        )}

        {crew.length >= 0 && canIssueCrewLink(person.orgType, person.role) && (
          <section className="e-sec e-reveal">
            <CrewRoster crew={crew} />
          </section>
        )}

        {crewLinks.length > 0 && (
          <section className="e-sec e-reveal">
            <h2 className="e-sec-h">{t("crewLink")}</h2>
            <p className="st-note">{t("crewLinkNote")}</p>
            <div className="st-grid">
              {crewLinks.map((l) => (
                <CrewLink key={l.projectId} name={l.name} url={l.url} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
