import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BelinMark } from "@/components/BelinMark";
import { NotificationBell } from "@/components/app/NotificationBell";
import { getUnreadCount } from "@/lib/data/notifications";
import type { ProjectListRow } from "@/lib/data/projects-list";
import type { PersonActor } from "@/lib/actor";

// What a signed-in person sees first: their projects, newest first, each one a
// door into the full project surface. The EPC also gets the way in to a new
// one; a subcontractor does not, because subs are attached to projects rather
// than creating them.
export async function ProjectList({
  locale,
  actor,
  projects,
}: {
  locale: string;
  actor: PersonActor;
  projects: ProjectListRow[];
}) {
  const t = await getTranslations("projects");
  const tApp = await getTranslations("app");
  const tSettings = await getTranslations("settings");
  const isEpc = actor.orgType === "epc";
  // The inbox lives on the list, where a person lands after signing in: it is
  // the one screen that is not about a single project.
  const unread = await getUnreadCount(actor);

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
            <NotificationBell initialUnread={unread} />
            <Link href={`/${locale}/app/settings`} className="cb-nav">
              {tSettings("title")}
            </Link>
            {isEpc && (
              <Link href={`/${locale}/app/new`} className="pl-new">
                {t("new")}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="e-wrap">
        <section className="e-sec e-reveal">
          <div className="e-eyebrow">{tApp("signedInAs", { name: actor.fullName })}</div>

          {projects.length === 0 ? (
            <p className="pl-empty">{t("empty")}</p>
          ) : (
            <ul className="pl-list">
              {projects.map((p) => {
                const facts = [p.city, p.kwp !== null ? `${p.kwp} kWp` : null, p.subName]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={p.id} className="pl-item">
                    <Link href={`/${locale}/app/${p.id}`} className="pl-link">
                      <div className="pl-name">{p.name}</div>
                      {facts && <div className="pl-facts">{facts}</div>}
                      <div className={`pl-status s-${p.status}`}>{t(`status.${p.status}`)}</div>
                    </Link>
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
