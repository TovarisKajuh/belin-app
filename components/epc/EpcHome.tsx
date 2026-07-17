import { getTranslations } from "next-intl/server";
import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
import { TodayPosts } from "@/components/project/TodayPosts";
import type { CrewHomeData } from "@/lib/data/reports";

// The EPC view of the same project. Phase 0 summary plus today's entries with
// photos; the full dashboard (history, gallery, chart, feed) is phase 1b. Built
// from the same getCrewHome data as the crew screen, one fetch (audit finding H6/M2).
export async function EpcHome({ token, data }: { token: string; data: CrewHomeData }) {
  const t = await getTranslations("project");
  const tc = await getTranslations("crew");
  const address = [data.addressStreet, [data.addressZip, data.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="container section">
      <div className="card card-full fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <span className="tl-tag">{t("roleEpc")}</span>
          <ProjectStatusControl token={token} role="epc" status={data.status} />
        </div>
        <h1 className="section-title" style={{ marginTop: 12 }}>{data.projectName}</h1>
        {address && <p className="section-label">{t("address")}: {address}</p>}
        <div className="stat-value" style={{ marginTop: 18 }}>
          {data.progressPercent}
          <span className="unit">%</span>
        </div>
        <div className="stat-label">{t("progress")}</div>
        <table className="log-table" style={{ marginTop: 24 }}>
          <thead>
            <tr><th>{t("scope")}</th><th></th></tr>
          </thead>
          <tbody>
            {data.scope.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="num mono">
                  {t("installedOfTarget", { installed: item.installedQty, target: item.targetQty, unit: item.unit })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card card-full fade-up" style={{ marginTop: 20 }}>
        <span className="b-label">{tc("todayPosts")}</span>
        <TodayPosts posts={data.todayPosts} />
      </div>
    </main>
  );
}
