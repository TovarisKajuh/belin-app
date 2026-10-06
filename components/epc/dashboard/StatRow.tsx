import { getLocale, getTranslations } from "next-intl/server";
import type { Projection } from "@/lib/projection-shared";
import { fmtDate, fmtNumber } from "@/lib/format";

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
  const locale = await getLocale();

  const { workingDaysElapsed, workingDaysTotal, ratePctPerDay, projectedFinish, daysVsDeadline } =
    projection;
  const finish = projectedFinish ? fmtDate(projectedFinish, locale, { style: "dayMonth" }) : null;

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
              {fmtNumber(workingDaysElapsed, locale)}
              {workingDaysTotal != null && <span className="u"> / ~{fmtNumber(workingDaysTotal, locale)}</span>}
            </div>
            <div className="s">{t("workingDaysSub")}</div>
          </div>
        )}

        {ratePctPerDay != null && (
          <div className="e-stat">
            <div className="l">{t("tempo")}</div>
            <div className="v e-mono">
              {fmtNumber(ratePctPerDay, locale, { decimals: 1 })}
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
          <div className="v e-mono">{fmtNumber(photoCount, locale)}</div>
          <div className="s">{t("photosSub")}</div>
        </div>
      </div>
    </section>
  );
}
