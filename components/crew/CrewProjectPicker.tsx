import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ProjectListRow } from "@/lib/data/projects-list";

// Which roof today.
//
// Name and town, nothing else. The office list beside this one carries capacity
// totals and schedule variance, which are the right things for a man deciding
// where to send a crew and the wrong things for the man already in the van.
export async function CrewProjectPicker({
  locale,
  projects,
}: {
  locale: string;
  projects: ProjectListRow[];
}) {
  const t = await getTranslations("claim");

  return (
    <main className="belin-dark cl-wrap">
      <div className="e-grain" aria-hidden />
      <div className="cl-card">
        <h1 className="cl-title">{t("pickProject")}</h1>
        <div className="cl-roster">
          {projects.map((project) => (
            <Link key={project.id} href={`/${locale}/app/${project.id}`} className="cl-name">
              {project.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
