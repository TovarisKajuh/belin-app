import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
import { TodayPosts } from "@/components/project/TodayPosts";
import type { CrewHomeData } from "@/lib/data/reports";

export async function CrewHome({ token, data }: { token: string; data: CrewHomeData }) {
  const t = await getTranslations("crew");
  const address = [data.addressStreet, [data.addressZip, data.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="b-screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 className="b-h" style={{ fontSize: 24 }}>{data.projectName}</h1>
          {address && <p className="b-sub" style={{ marginTop: 4 }}>{address}</p>}
        </div>
        <ProjectStatusControl token={token} role="sub" status={data.status} />
      </div>

      <div className="b-card" style={{ marginTop: 16 }}>
        <span className="b-label">{t("progress")}</span>
        <div className="b-progress-num">
          {data.progressPercent}
          <span style={{ fontSize: 22, color: "var(--muted)" }}> %</span>
        </div>
      </div>

      <h2 className="b-h" style={{ fontSize: 18, marginTop: 8, marginBottom: 8 }}>{t("todayReport")}</h2>
      <CrewReportForm token={token} scope={data.scope} />

      <div className="b-card">
        <span className="b-label">{t("todayPosts")}</span>
        <TodayPosts posts={data.todayPosts} />
      </div>
    </main>
  );
}
