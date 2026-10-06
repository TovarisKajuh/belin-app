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
import { fmtDate, fmtKwp, fmtNumber } from "@/lib/format";
import { mapsUrl } from "@/lib/maps";
import { IconMapPin } from "@/components/epc/dashboard/DashEmpty";

// The dark EPC dashboard: the shell and hero, then what the site did (the
// newest report, the tempo, the scope by phase, the photos and the day by day
// log), then what needs the EPC (requests, incidents), then the reference
// panels. The material panel comes first when it is the news. Everything below
// the hero reveals on scroll.
export async function EpcDashboard({
  token,
  projectId,
  data,
  locale,
  beforeHero = null,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  data: EpcDashboardData;
  locale: string;
  /** Rendered first inside the page column, under the sticky bar (the "add a subcontractor" panel). */
  beforeHero?: React.ReactNode;
}) {
  const t = await getTranslations("dashboard");
  const core = data.core;
  const sub = data.subName;
  const proj = data.projection;
  const finish = proj.projectedFinish ? fmtDate(proj.projectedFinish, locale, { style: "dayMonth" }) : null;
  const facts = [core.kwp != null ? fmtKwp(core.kwp, locale) : null, sub].filter(Boolean).join(" · ");
  const mapUrl = mapsUrl({
    street: core.addressStreet,
    zip: core.addressZip,
    city: core.addressCity,
    lat: core.lat,
    lng: core.lng,
  });
  const addressLine = [core.addressStreet, [core.addressZip, core.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  // Material is the news before the first report (day one: the delivery
  // check is all there is) and whenever the latest check found a shortfall.
  const materialFirst =
    data.reportCount === 0 || (data.material.latest !== null && !data.material.latest.isComplete);
  const material = (
    <MaterialPanel token={token} projectId={projectId} country={core.country} material={data.material} />
  );

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
        {beforeHero}
        {data.needsReview && sub && <AlertStrip subName={sub} />}

        <section className="e-hero">
          <div>
            <div className="e-eyebrow e-fadein">{t("overview")}</div>
            <h1 className="e-h1 e-fadein e-d1">
              {core.name}
              {facts && <span className="sub">{facts}</span>}
            </h1>
            {mapUrl && addressLine ? (
              <a
                className="e-addr e-fadein e-d2"
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${addressLine}, ${t("maps")}`}
              >
                <IconMapPin size={16} />
                {addressLine}
              </a>
            ) : null}
            <div className="e-chips e-fadein e-d3">
              <div className="e-chip">
                <div className="l">{t("tempo")}</div>
                <div className="v e-mono">
                  {proj.ratePctPerDay != null ? (
                    <>
                      {fmtNumber(proj.ratePctPerDay, locale, { decimals: 1 })}
                      <span className="u"> %{t("perDay")}</span>
                    </>
                  ) : (
                    t("gathering")
                  )}
                </div>
                {proj.ratePctPerDay != null ? <div className="s">{t("tempoSub")}</div> : null}
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

        {materialFirst && material}

        {data.latest && <LatestOnSite latest={data.latest} subName={sub} />}

        <ProjectionPanel
          history={data.history}
          projection={proj}
          today={core.today}
          plannedStart={core.plannedStart}
          plannedEnd={core.plannedEnd}
        />

        <ScopeByPhase scope={data.scope} />

        <PhotoGallery photos={data.gallery} />

        <DailyLogFeed
          days={data.days}
          projectId={projectId}
          projectName={core.name}
          subName={sub}
          canShare={token === null}
        />

        <RequestsPanel
          projectId={projectId}
          requests={data.requests}
          canResolve={token === null}
        />

        <IncidentsPanel incidents={data.incidents} />

        {!materialFirst && material}

        <RoofPanel roofs={data.roofs} />

        <CompliancePanel docs={data.compliance} subName={sub} />

        <StatRow projection={proj} photoCount={data.photoCount} />

        <div className="e-foot">Belin · {t("endOfOverview")}</div>
      </div>
      <RevealController />
      <LiveRefresh topic={projectTopic(core.id)} />
    </div>
  );
}
