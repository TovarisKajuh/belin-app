import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";
import type { CrewHomeData } from "@/lib/data/reports";
import type { MaterialState } from "@/lib/materials-shared";
import { IncidentButton } from "@/components/crew/IncidentButton";

// The subcontractor OFFICE view.
//
// It exists because a sub office person is not crew. Sending them to the roof
// reporting screen would ask a company owner to log headcount and photos, while
// hiding the things they actually sign: the naročilnica, the hours, the change
// orders, the finalization. So this screen reads rather than writes: what is
// happening on my site, and what is waiting for my signature.
//
// The cards for parts that have not been built yet render their empty state
// instead of being hidden, so the shape of the screen is honest about what is
// coming rather than quietly rearranging itself later.
export async function SubHome({
  locale,
  projectId,
  data,
  material,
  crewToken,
}: {
  locale: string;
  projectId: string;
  data: CrewHomeData;
  material: MaterialState;
  /**
   * The project's crew link token, when this person may hold it. Most subs are
   * two to ten people and the boss is often on the roof himself, so the
   * reporting screen has to be one click from his own dashboard rather than a
   * link he digs out of Settings.
   */
  crewToken: string | null;
}) {
  const t = await getTranslations("sub");
  const tCrew = await getTranslations("crew");

  const address = [
    data.addressStreet,
    [data.addressZip, data.addressCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  // Shortfalls the crew actually recorded on the latest delivery check. Items
  // the check never covered are a separate signal (uncoveredOrChanged) and are
  // not shortfalls, so they are deliberately not counted here.
  const missing = (material.latest?.items ?? []).filter((i) => i.status !== "present").length;

  return (
    <main className="belin-dark">
      <div className="e-grain" aria-hidden />
      <LiveRefresh topic={projectTopic(projectId)} />

      <CommandBar
        token={null}
        projectId={projectId}
        projectName={data.projectName}
        meta={address || null}
        status={data.status}
        role="sub"
        locale={locale}
        active="overview"
      />

      <div className="e-wrap">
        <section className="e-sec e-reveal">
          <div className="e-eyebrow">{t("eyebrow")}</div>

          {/* The office reports incidents too: a call from the crew often lands
              here first, and the person taking it should not have to open the
              crew link to write it down. */}
          <div className="sh-actions">
            <IncidentButton token={null} projectId={projectId} />
            {crewToken && (
              <Link href={`/${locale}/p/${crewToken}`} className="sh-crew">
                {t("openCrew")}
              </Link>
            )}
          </div>

          <div className="sh-grid">
            <div className="sh-card sh-card--wide">
              <span className="e-proj-lab">{tCrew("progress")}</span>
              <div className="sh-big">
                {data.progressPercent}
                <span className="sh-unit"> %</span>
              </div>
              <div className="sh-bar" aria-hidden>
                <i style={{ width: `${Math.max(0, Math.min(100, data.progressPercent))}%` }} />
              </div>
            </div>

            <div className="sh-card">
              <span className="e-proj-lab">{t("material")}</span>
              <div className="sh-big">{missing}</div>
              <p className="sh-note">{missing === 0 ? t("materialOk") : t("materialMissing")}</p>
            </div>
          </div>
        </section>

        <section className="e-sec e-reveal">
          <h2 className="e-sec-h">{t("waiting")}</h2>
          <div className="sh-grid">
            <div className="sh-card sh-card--empty">
              <span className="e-proj-lab">{t("po")}</span>
              <p className="sh-note">{t("poEmpty")}</p>
            </div>
            <div className="sh-card sh-card--empty">
              <span className="e-proj-lab">{t("hours")}</span>
              <p className="sh-note">{t("hoursEmpty")}</p>
            </div>
            <div className="sh-card sh-card--empty">
              <span className="e-proj-lab">{t("changeOrders")}</span>
              <p className="sh-note">{t("changeOrdersEmpty")}</p>
            </div>
            <div className="sh-card sh-card--empty">
              <span className="e-proj-lab">{t("finalization")}</span>
              <p className="sh-note">{t("finalizationEmpty")}</p>
            </div>
          </div>
        </section>

        <section className="e-sec e-reveal">
          <h2 className="e-sec-h">{t("fromSite")}</h2>
          <div className="sh-card">
            <TodayPosts posts={data.todayPosts} />
          </div>
        </section>
      </div>
    </main>
  );
}
