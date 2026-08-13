import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BelinMark } from "@/components/BelinMark";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { NotificationBell } from "@/components/app/NotificationBell";
import { getUnreadCount } from "@/lib/data/notifications";
import { getPortfolio } from "@/lib/data/portfolio";
import { PortfolioHeader } from "./PortfolioHeader";
import { ScheduleBar } from "./ScheduleBar";
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
  const tLanding = await getTranslations("landing");
  const isEpc = actor.orgType === "epc";

  // Ahead, behind, or exactly on the promised day. Three sentences rather than a
  // signed number, because "-2" on a card is a puzzle and "2 delovna dneva
  // zamude" is a fact. Slovenian needs all four plural forms here.
  const scheduleLabel = (days: number | null) => {
    if (days === null) return t("scheduleUnknown");
    if (days === 0) return t("scheduleOnTime");
    return days > 0 ? t("scheduleAhead", { n: days }) : t("scheduleBehind", { n: -days });
  };
  // The inbox lives on the list, where a person lands after signing in: it is
  // the one screen that is not about a single project.
  const unread = await getUnreadCount(actor);
  // One batched load for the whole portfolio: an EPC with twenty projects
  // should not pay twenty round trips for a list screen.
  const portfolio = await getPortfolio(actor);

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
            <LocaleSwitch label={tLanding("languageLabel")} />
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
            <>
              <PortfolioHeader data={portfolio} />

              <ul className="pl-list">
                {portfolio.projects.map((p) => {
                  const facts = [p.city, p.kwp !== null ? `${p.kwp} kWp` : null, p.subName]
                    .filter(Boolean)
                    .join(" · ");

                  // What is waiting on somebody, said only when there is
                  // something: a row of zeroes on every card would train the
                  // reader to stop looking at the line that matters.
                  const waiting = [
                    p.openHours > 0 ? tApp("openHours", { n: p.openHours }) : null,
                    p.openRequests > 0 ? tApp("openRequests", { n: p.openRequests }) : null,
                    p.incidentsThisWeek > 0 ? tApp("incidents", { n: p.incidentsThisWeek }) : null,
                  ].filter(Boolean);

                  return (
                    <li key={p.id} className="pl-item">
                      <Link href={`/${locale}/app/${p.id}`} className="pl-link pl-link--rich">
                        <div className="pl-main">
                          <div className="pl-name">{p.name}</div>
                          {facts && <div className="pl-facts">{facts}</div>}
                          {waiting.length > 0 ? (
                            <div className="pl-waiting">{waiting.join(" · ")}</div>
                          ) : null}
                        </div>

                        <div className="pl-figure">
                          <span className="pl-pct">
                            {p.progressPercent}
                            <span className="pl-pct-u"> %</span>
                          </span>
                          <ScheduleBar days={p.scheduleDays} label={scheduleLabel(p.scheduleDays)} />
                        </div>

                        <div className={`pl-status s-${p.status}`}>{t(`status.${p.status}`)}</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
