import { getTranslations } from "next-intl/server";
import type { EpcDashboardData } from "@/lib/data/epc-dashboard";
import { CommandBar } from "@/components/project/CommandBar";
import { AlertStrip } from "@/components/epc/dashboard/AlertStrip";
import { ProgressRing } from "@/components/epc/dashboard/ProgressRing";
import { ProjectionPanel } from "@/components/epc/dashboard/ProjectionPanel";
import { ScopeByPhase } from "@/components/epc/dashboard/ScopeByPhase";
import { IncidentsPanel } from "./dashboard/IncidentsPanel";
import { RequestsPanel } from "./dashboard/RequestsPanel";
import { CompliancePanel } from "./dashboard/CompliancePanel";
import { MaterialPanel } from "@/components/epc/dashboard/MaterialPanel";
import { RoofPanel } from "@/components/epc/dashboard/RoofPanel";
import { StatRow } from "@/components/epc/dashboard/StatRow";
import { LatestOnSite } from "@/components/epc/dashboard/LatestOnSite";
import { DailyLogFeed } from "@/components/epc/dashboard/DailyLogFeed";
import { PhotoGallery } from "@/components/epc/dashboard/PhotoGallery";
import { RevealController } from "@/components/epc/dashboard/RevealController";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";
import { ddmm } from "@/lib/dashboard-shared";

// The dark EPC dashboard: the shell and hero, then the path to completion,
// the scope by phase, the headline numbers, the newest report, the day by day
// log and the site photos. Everything below the hero reveals on scroll.
export async function EpcDashboard({
  token,
  projectId,
  data,
  locale,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  data: EpcDashboardData;
  locale: string;
}) {
  const t = await getTranslations("dashboard");
  const core = data.core;
  const sub = data.subName;
  const proj = data.projection;
  const finish = ddmm(proj.projectedFinish);
  const facts = [core.kwp != null ? `${core.kwp} kWp` : null, sub].filter(Boolean).join(" · ");

  return (
    <div className="belin-dark">
      <div className="e-grain" />
      <CommandBar
        token={token}
        projectId={projectId}
        projectName={core.name}
        meta={sub}
        status={core.status}
        role="epc"
        locale={locale}
        active="overview"
      />
      <div className="e-wrap">
        {data.needsReview && sub && <AlertStrip subName={sub} />}

        <section className="e-hero">
          <div>
            <div className="e-eyebrow e-fadein">{t("overview")}</div>
            <h1 className="e-h1 e-fadein e-d1">
              {core.name}
              {facts && <span className="sub">{facts}</span>}
            </h1>
            <div className="e-chips e-fadein e-d3">
              <div className="e-chip">
                <div className="l">{t("tempo")}</div>
                <div className="v e-mono">
                  {proj.ratePctPerDay != null ? (
                    <>
                      {proj.ratePctPerDay}
                      <span className="u"> %{t("perDay")}</span>
                    </>
                  ) : (
                    t("gathering")
                  )}
                </div>
              </div>
              <div className="e-chip">
                <div className="l">{t("plannedFinish")}</div>
                <div className="v e-mono">{finish ?? t("gathering")}</div>
              </div>
              <div className="e-chip">
                <div className="l">{t("team")}</div>
                <div className="v e-mono">
                  {data.latest?.headcount ?? 0}
                  <span className="u"> {t("onSite")}</span>
                </div>
              </div>
            </div>
          </div>

          <ProgressRing
            percent={data.progressPercent}
            reportCount={data.reportCount}
            photoCount={data.photoCount}
          />
        </section>

        <ProjectionPanel
          history={data.history}
          projection={proj}
          today={core.today}
          plannedStart={core.plannedStart}
          plannedEnd={core.plannedEnd}
        />

        <ScopeByPhase scope={data.scope} />

        <RoofPanel roofs={data.roofs} />
        <MaterialPanel token={token} projectId={projectId} country={core.country} material={data.material} />

        <RequestsPanel
          projectId={projectId}
          requests={data.requests}
          canResolve={token === null}
        />

        <IncidentsPanel incidents={data.incidents} />

        <CompliancePanel docs={data.compliance} subName={sub} />

        <StatRow projection={proj} photoCount={data.photoCount} />

        {data.latest && <LatestOnSite latest={data.latest} subName={sub} />}

        <DailyLogFeed days={data.days} />

        <PhotoGallery photos={data.gallery} />

        <div className="e-foot">Belin · {t("endOfOverview")}</div>
      </div>
      <RevealController />
      <LiveRefresh topic={projectTopic(core.id)} showBadge />
    </div>
  );
}
