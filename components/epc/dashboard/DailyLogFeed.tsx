import { getTranslations, getLocale } from "next-intl/server";
import type { DashboardDay } from "@/lib/data/epc-dashboard";
import { weekdayShort, quantitySummary } from "@/lib/dashboard-shared";
import { fmtDate } from "@/lib/format";

// Day by day, newest first: who was there, what was installed, the note and the
// weather it was done in. This is the record that later backs a Nachtrag or a
// disputed Abnahme, so every reported day gets a row, including quiet ones.
export async function DailyLogFeed({ days }: { days: DashboardDay[] }) {
  const t = await getTranslations("dashboard");
  const tw = await getTranslations("weather");
  const locale = await getLocale();

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">
        {t("dailyLog")} · {t("dayByDay")}
      </div>
      <div className="e-feed">
        {days.length === 0 ? (
          <div className="e-day">
            <div className="e-day-mid">
              <div className="mn">{t("noEntries")}</div>
            </div>
          </div>
        ) : (
          days.map((day) => {
            const qty = quantitySummary(day.quantities, locale);
            return (
              <div className="e-day" key={day.entryId}>
                <div className="e-day-date">
                  {weekdayShort(day.date, locale)}
                  <span className="dn e-mono">{fmtDate(day.date, locale, { style: "dayMonth" })}</span>
                </div>
                <div className="e-day-mid">
                  <div className="mt">
                    {day.headcount != null && t("workers", { count: day.headcount })}
                    {day.headcount != null && qty && " · "}
                    {qty && <b>{qty}</b>}
                  </div>
                  {day.note && <div className="mn">{day.note}</div>}
                </div>
                <div className="e-day-r">
                  {day.weatherKey && (
                    <span className="e-day-w">
                      {tw(day.weatherKey)}
                      {day.tempC != null && ` ${Math.round(day.tempC)}°`}
                    </span>
                  )}
                  {day.photoUrls.length > 0 && (
                    <span className="e-day-th">
                      {day.photoUrls.slice(0, 4).map((url) => (
                        <span className="t" key={url}>
                          <img src={url} alt="" />
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
