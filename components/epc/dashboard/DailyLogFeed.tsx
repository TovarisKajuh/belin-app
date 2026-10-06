import { getTranslations, getLocale } from "next-intl/server";
import type { DashboardDay } from "@/lib/data/epc-dashboard";
import { ddmm, weekdayShort, quantitySummary } from "@/lib/dashboard-shared";
import { appBaseUrl } from "@/lib/app-url";
import { ShareLink } from "@/components/share/ShareLink";
import { DashEmpty, IconClipboard } from "./DashEmpty";

// Day by day, newest first: who was there, what was installed, the note and the
// weather it was done in. This is the record that later backs a Nachtrag or a
// disputed Abnahme, so every reported day gets a row, including quiet ones.
//
// Empty, it recruits: the crew link is the subcontractor office's to hand out
// (canIssueCrewLink), so the EPC shares the PROJECT link with the
// subcontractor, prewritten, and the office sends its crew the report link.
export async function DailyLogFeed({
  days,
  projectId,
  projectName,
  subName,
  canShare,
}: {
  days: DashboardDay[];
  projectId: string;
  projectName: string;
  subName: string | null;
  /** Only a signed-in EPC shares; a link-token viewer has no project route to share. */
  canShare: boolean;
}) {
  const t = await getTranslations("dashboard");
  const tw = await getTranslations("weather");
  const locale = await getLocale();

  if (days.length === 0) {
    const tShare = await getTranslations("share");
    return (
      <section className="e-sec e-reveal">
        <div className="e-sec-h">
          {t("dailyLog")} · {t("dayByDay")}
        </div>
        <DashEmpty
          icon={<IconClipboard size={22} />}
          title={t("empty.logTitle")}
          body={subName ? t("empty.logBody", { sub: subName }) : t("empty.logBodyNoSub")}
          action={
            canShare && subName ? (
              <ShareLink
                url={`${appBaseUrl() ?? ""}/${locale}/app/${projectId}`}
                subject={t("empty.logShareSubject", { project: projectName })}
                message={t("empty.logShareMessage", { project: projectName })}
                labels={{
                  copy: tShare("copy"),
                  copied: tShare("copied"),
                  share: tShare("share"),
                  whatsapp: tShare("whatsapp"),
                  email: tShare("email"),
                }}
              />
            ) : null
          }
        />
      </section>
    );
  }

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">
        {t("dailyLog")} · {t("dayByDay")}
      </div>
      <div className="e-feed">
        {days.map((day) => {
            const qty = quantitySummary(day.quantities, locale);
            return (
              <div className="e-day" key={day.entryId}>
                <div className="e-day-date">
                  {weekdayShort(day.date, locale)}
                  <span className="dn e-mono">{ddmm(day.date)}</span>
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
                          <img src={url} alt="" loading="lazy" decoding="async" width={36} height={36} />
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
