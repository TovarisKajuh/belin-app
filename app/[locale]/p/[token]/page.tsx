import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getProjectSummary } from "@/lib/data/projects";
import { getCrewHome } from "@/lib/data/reports";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { DevSwapBar } from "@/components/dev/DevSwapBar";
import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";

export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  let view: React.ReactNode;
  if (actor.role === "sub") {
    const data = await getCrewHome(actor);
    if (!data) notFound();
    view = <CrewHome token={token} data={data} />;
  } else {
    // epc: phase 0 summary plus today's entries with photos.
    // The full dashboard (history, gallery, chart, feed) is phase 1b.
    const t = await getTranslations("project");
    const tc = await getTranslations("crew");
    const project = await getProjectSummary(actor);
    if (!project) notFound();
    const today = await getCrewHome(actor);
    const address = [project.addressStreet, `${project.addressZip ?? ""} ${project.addressCity ?? ""}`.trim()]
      .filter(Boolean)
      .join(", ");
    view = (
      <main className="container section">
        <div className="card card-full fade-up">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <span className="tl-tag">{t("roleEpc")}</span>
            <ProjectStatusControl token={token} role="epc" status={project.status} />
          </div>
          <h1 className="section-title" style={{ marginTop: 12 }}>{project.name}</h1>
          <p className="section-label">{t("address")}: {address}</p>
          <div className="stat-value" style={{ marginTop: 18 }}>
            {project.progressPercent}
            <span className="unit">%</span>
          </div>
          <div className="stat-label">{t("progress")}</div>
          <table className="log-table" style={{ marginTop: 24 }}>
            <thead>
              <tr><th>{t("scope")}</th><th></th></tr>
            </thead>
            <tbody>
              {project.scopeItems.map((item) => (
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
          {!today || today.todayPosts.length === 0 ? (
            <p className="b-sub">{tc("noPostsYet")}</p>
          ) : (
            today.todayPosts.map((post) => (
              <div key={post.id} className="b-scope-row" style={{ alignItems: "flex-start", flexDirection: "column" }}>
                <div>
                  <div className="b-h" style={{ fontSize: 15 }}>
                    {tc("postSummary", { headcount: post.headcount ?? 0, photos: post.photoCount })}
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

  const sibling = await getSiblingToken(actor);
  return (
    <>
      {view}
      {sibling && <DevSwapBar locale={locale} siblingToken={sibling.token} targetRole={sibling.role} />}
    </>
  );
}
