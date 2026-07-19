import { getTranslations, getLocale } from "next-intl/server";
import type { DashboardDay } from "@/lib/data/epc-dashboard";
import { quantitySummary } from "@/lib/dashboard-shared";

// The most recent crew report, surfaced on its own so the EPC sees the newest
// state of the site without scrolling the log. The "live" dot is presentational
// for now: realtime push is a separate, later chunk.
export async function LatestOnSite({
  latest,
  subName,
}: {
  latest: DashboardDay;
  subName: string | null;
}) {
  const t = await getTranslations("dashboard");
  const tw = await getTranslations("weather");
  const locale = await getLocale();

  const qty = quantitySummary(latest.quantities, locale);
  const meta = [
    latest.headcount != null ? t("workers", { count: latest.headcount }) : null,
    latest.weatherKey
      ? `${tw(latest.weatherKey)}${latest.tempC != null ? ` ${Math.round(latest.tempC)}°` : ""}`
      : null,
    latest.note ? `"${latest.note}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="e-sec e-reveal">
      <div className="e-live-panel">
        <div className="e-live-h">
          <span className="e-sec-h" style={{ margin: 0 }}>
            {t("latestOnSite")}
          </span>
          <span className="e-live">{t("live")}</span>
        </div>
        <div className="e-live-t">
          {subName ? t("reportSubmitted", { sub: subName }) : t("latestOnSite")}
          {qty && (
            <>
              , <b>{qty}</b>
            </>
          )}
        </div>
        {meta && <div className="e-live-m">{meta}</div>}
        {latest.photoUrls.length > 0 && (
          <div className="e-thumbs">
            {latest.photoUrls.map((url) => (
              <span className="e-thumb" key={url}>
                <img src={url} alt="" />
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
