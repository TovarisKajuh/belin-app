import { getTranslations } from "next-intl/server";
import type { Projection } from "@/lib/projection-shared";
import { ddmm } from "@/lib/dashboard-shared";

// The four headline numbers. Each tile is omitted when its value is not known
// yet, so an early project shows fewer, honest tiles instead of empty ones.
export async function StatRow({
  projection,
  photoCount,
}: {
  projection: Projection;
  photoCount: number;
}) {
  const t = await getTranslations("dashboard");

  const { workingDaysElapsed, workingDaysTotal, ratePctPerDay, projectedFinish, daysVsDeadline } =
    projection;
  const finish = ddmm(projectedFinish);

  const buffer =
    daysVsDeadline == null
      ? null
      : daysVsDeadline >= 0
        ? { text: t("buffer", { days: daysVsDeadline }), ok: true }
        : { text: t("behind", { days: -daysVsDeadline }), ok: false };

  return (
    <section className="e-sec e-reveal">
      <div className="e-stats">
        {workingDaysElapsed != null && (
          <div className="e-stat">
            <div className="l">{t("workingDays")}</div>
            <div className="v e-mono">
              {workingDaysElapsed}
              {workingDaysTotal != null && <span className="u"> / ~{workingDaysTotal}</span>}
            </div>
            <div className="s">{t("workingDaysSub")}</div>
          </div>
        )}

        {ratePctPerDay != null && (
          <div className="e-stat">
            <div className="l">{t("tempo")}</div>
            <div className="v e-mono">
              {ratePctPerDay}
              <span className="u"> %{t("perDay")}</span>
            </div>
            <div className="s">{t("tempoSub")}</div>
          </div>
        )}

        {finish && (
          <div className="e-stat">
            <div className="l">{t("plannedFinish")}</div>
            <div className="v e-mono">{finish}</div>
            {buffer && (
              <div className="s">
                <span className={buffer.ok ? "ok" : undefined}>{buffer.text}</span>
              </div>
            )}
          </div>
        )}

        <div className="e-stat">
          <div className="l">{t("photosLabel")}</div>
          <div className="v e-mono">{photoCount}</div>
          <div className="s">{t("photosSub")}</div>
        </div>
      </div>
    </section>
  );
}
