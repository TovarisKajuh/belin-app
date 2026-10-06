import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ProjectListRow } from "@/lib/data/projects-list";
import { HeaderSession } from "@/components/app/HeaderSession";

// Which roof today.
//
// Name and town, nothing else, and only the sites that can be worked on
// today (the caller filters with crewPickable). The office list beside this
// one carries capacity totals and schedule variance, which are the right
// things for a man deciding where to send a crew and the wrong things for
// the man already in the van.
export async function CrewProjectPicker({
  locale,
  projects,
}: {
  locale: string;
  projects: ProjectListRow[];
}) {
  const t = await getTranslations("claim");
  const tCrew = await getTranslations("crew");

  return (
    <main className="belin-dark cl-wrap">
      <div className="e-grain" aria-hidden />
      <div className="cl-card">
        {/* No command bar on this one screen, so the account menu (and the
            presenter's role switch) sit in a row of their own above the list. */}
        <div className="cl-session">
          <HeaderSession locale={locale} />
        </div>
        <h1 className="cl-title">{t("pickProject")}</h1>
        {projects.length === 0 ? (
          <p className="cl-sub">{tCrew("pickerEmpty")}</p>
        ) : (
          <div className="cl-roster">
            {projects.map((project) => (
              <Link key={project.id} href={`/${locale}/app/${project.id}`} className="cl-name cl-proj">
                <span className="cl-proj-main">
                  <b>{project.name}</b>
                  {project.city ? <small>{project.city}</small> : null}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
