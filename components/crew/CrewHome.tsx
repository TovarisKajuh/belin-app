import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
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
      <CrewReportForm token={token} entryDate={data.todayDate} scope={data.scope} />

      <div className="b-card">
        <span className="b-label">{t("todayPosts")}</span>
        {data.todayPosts.length === 0 ? (
          <p className="b-sub">{t("noPostsYet")}</p>
        ) : (
          data.todayPosts.map((post) => (
            <div key={post.id} className="b-scope-row" style={{ alignItems: "flex-start", flexDirection: "column" }}>
              <div>
                <div className="b-h" style={{ fontSize: 15 }}>
                  {t("postSummary", { headcount: post.headcount ?? 0, photos: post.photoCount })}
                </div>
                {post.quantities.map((q, i) => (
                  <div key={i} className="b-sub">{q.name}: {q.qty} {q.unit}</div>
                ))}
                {post.note && <div className="b-sub" style={{ marginTop: 4 }}>{post.note}</div>}
              </div>
              {post.photoUrls.length > 0 && (
                <div className="b-thumbs">
                  {post.photoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="b-thumb">
                      <img src={url} alt="" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
