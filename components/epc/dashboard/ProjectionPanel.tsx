import { getTranslations } from "next-intl/server";
import type { Projection, DailyProgressPoint } from "@/lib/projection-shared";
import { ProjectionChart } from "@/components/epc/dashboard/ProjectionChart";

// The panel is the frame (title, buffer badge, disclaimer). The chart measures
// its own width, so the drawing itself is a client component.
export async function ProjectionPanel({
  history,
  projection,
  today,
  plannedEnd,
  currentPercent,
}: {
  history: DailyProgressPoint[];
  projection: Projection;
  today: string;
  plannedEnd: string | null;
  currentPercent: number;
}) {
  const t = await getTranslations("dashboard");

  const days = projection.daysVsDeadline;
  const badge =
    days == null ? null : days >= 0 ? t("buffer", { days }) : t("behind", { days: -days });

  return (
    <section className="e-sec e-reveal">
      <div className="e-panel">
        <div className="e-panel-h">
          <div>
            <div className="t">{t("pathToCompletion")}</div>
            <div className="s">{t("pathSub")}</div>
          </div>
          {badge && (
            <span className={days != null && days < 0 ? "e-proj-badge late" : "e-proj-badge"}>
              {badge}
            </span>
          )}
        </div>

        <ProjectionChart
          history={history}
          projection={projection}
          today={today}
          plannedEnd={plannedEnd}
          currentPercent={currentPercent}
        />

        <div className="e-proj-foot">{t("forYourPlanning")}</div>
      </div>
    </section>
  );
}
