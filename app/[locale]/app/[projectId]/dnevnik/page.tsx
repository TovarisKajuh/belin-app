import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import { CrewTabs } from "@/components/crew/CrewTabs";
import { getCrewDiary } from "@/lib/data/diary";
import { requireCrewSurface } from "../crew-route";

// The site diary: the last two weeks, newest first, as the crew filed it.
//
// Read only on purpose. A submitted report is a record, and a screen that let
// yesterday be edited from a phone would quietly turn the evidence this product
// exists to produce into something a party can revise after the fact. Getting
// yesterday wrong is a conversation, not a button.
export default async function CrewDiaryPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const { project, data } = await requireCrewSurface(locale, projectId);
  const days = await getCrewDiary(project);

  const t = await getTranslations("crew");
  const format = await getFormatter();

  return (
    <main className="belin-dark b-tabbed">
      <div className="e-grain" aria-hidden />
      <CommandBar
        token={null}
        projectId={projectId}
        projectName={data.projectName}
        meta={null}
        status={data.status}
        role="sub"
      />

      <div className="b-screen">
        <h1 className="b-h b-sec">{t("tabs.diary")}</h1>

        {days.length === 0 ? (
          <p className="b-sub">{t("diaryEmpty")}</p>
        ) : (
          days.map((day) => (
            <div key={day.dateIso} className="b-card cr-day">
              <div className="cr-day-h">
                <span className="b-label">
                  {format.dateTime(new Date(`${day.dateIso}T12:00:00Z`), {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                {day.dateIso === data.todayDate && <span className="b-pill">{t("diaryToday")}</span>}
              </div>
              <TodayPosts posts={day.posts} />
            </div>
          ))
        )}
      </div>

      <CrewTabs locale={locale} projectId={projectId} active="diary" />
    </main>
  );
}
