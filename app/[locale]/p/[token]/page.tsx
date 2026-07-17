import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getProjectSummary } from "@/lib/data/projects";
import { getCrewHome } from "@/lib/data/reports";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { DevSwapBar } from "@/components/dev/DevSwapBar";

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
    // epc: phase 0 summary, replaced by the dashboard in phase 1b.
    const t = await getTranslations("project");
    const project = await getProjectSummary(actor);
    if (!project) notFound();
    const address = [project.addressStreet, `${project.addressZip ?? ""} ${project.addressCity ?? ""}`.trim()]
      .filter(Boolean)
      .join(", ");
    view = (
      <main className="container section">
        <div className="card card-full fade-up">
          <span className="tl-tag">{t("roleEpc")}</span>
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
