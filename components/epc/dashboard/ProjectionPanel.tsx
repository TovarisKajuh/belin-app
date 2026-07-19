import { getTranslations } from "next-intl/server";
import type { DailyProgressPoint, Projection } from "@/lib/projection-shared";
import { TempoChart } from "@/components/epc/dashboard/TempoChart";

// Daily pace, not cumulative progress.
//
// The cumulative curve that used to live here duplicated the hero percentage
// directly above it, and controlled studies show cumulative charts are misread
// 82 to 88 percent of the time when the question is whether the rate is rising
// or falling. This panel therefore shows the derivative: what each working day
// produced, against the pace the plan requires. The projection line and the
// deadline buffer band were removed on the founder's instruction; the buffer
// still appears as the badge, which is where a single number belongs.
export async function ProjectionPanel({
  history,
  projection,
  today,
  plannedStart,
  plannedEnd,
}: {
  history: DailyProgressPoint[];
  projection: Projection;
  today: string;
  plannedStart: string | null;
  plannedEnd: string | null;
}) {
  const t = await getTranslations("dashboard");

  const days = projection.daysVsDeadline;
  const badge =
    days == null ? null : days >= 0 ? t("buffer", { days }) : t("behind", { days: -days });

  return (
    <section className="e-sec e-reveal">
      <div className="e-projx">
        <div className="e-panel-h">
          <div>
            <div className="t">{t("dailyTempo")}</div>
            <div className="s">{t("tempoSubtitle")}</div>
          </div>
          {badge && (
            <span className={days != null && days < 0 ? "e-proj-badge late" : "e-proj-badge"}>
              {badge}
            </span>
          )}
        </div>

        <TempoChart
          history={history}
          today={today}
          plannedStart={plannedStart}
          plannedEnd={plannedEnd}
        />
      </div>
    </section>
  );
}
