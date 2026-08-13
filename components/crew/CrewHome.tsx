import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import { MaterialCheck } from "./MaterialCheck";
import { IncidentButton } from "./IncidentButton";
import { InstallHint } from "./InstallHint";
import { RequestButton } from "./RequestButton";
import { CrewTabs, type CrewTab } from "./CrewTabs";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";
import type { CrewHomeData } from "@/lib/data/reports";
import type { MaterialState } from "@/lib/materials-shared";

/**
 * The roof screen.
 *
 * `nav` decides whether this is one long column or one tab of several. It is
 * present exactly when the screen was reached through /app/[projectId], which
 * is where a signed-in crew person lives. The legacy link-token rendering
 * passes null and keeps the single column it always had: tabs are links to
 * project routes, and a token holder has no project routes to link to.
 */
export async function CrewHome({
  token,
  projectId,
  data,
  material,
  nav = null,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  data: CrewHomeData;
  material: MaterialState;
  nav?: { locale: string; active: Extract<CrewTab, "overview" | "report"> } | null;
}) {
  const t = await getTranslations("crew");
  const address = [data.addressStreet, [data.addressZip, data.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  // Untabbed, this is the whole screen. Tabbed, reporting keeps every piece it
  // had and the read-only parts move to Pregled, so the default landing is
  // still the form and nothing about filing a report changed.
  const showReport = !nav || nav.active === "report";
  const showOverview = !nav || nav.active === "overview";

  const hero = (
    <div className="b-card b-hero">
      <span className="b-label">{t("progress")}</span>
      <div className="b-progress-num">
        {data.progressPercent}
        <span className="b-progress-unit"> %</span>
      </div>
    </div>
  );

  // Same dark shell, same command bar and the same --e-* surfaces as the EPC
  // dashboard: the two sides are one product, not two apps. What stays
  // crew-specific is the layout, which is built for one hand on a roof.
  return (
    <main className={`belin-dark${nav ? " b-tabbed" : ""}`}>
      <div className="e-grain" aria-hidden />
      <CommandBar
        token={token}
        projectId={projectId}
        projectName={data.projectName}
        meta={null}
        status={data.status}
        role="sub"
      />

      <div className="b-screen">
        {address && <p className="b-sub b-addr">{address}</p>}

        {hero}

        {/* Shown until the app is on the home screen, then never again. A
            permanent session is only half of "it is an app": the other half is
            not having to find it. */}
        {showReport && <InstallHint />}

        {showReport && (
          /* OUTSIDE the material gate, deliberately. Rain on day one, before
             the delivery has even arrived, is exactly what this is for, and
             the gate hides everything else until the first check exists. */
          <div className="cr-quick">
            <IncidentButton token={token} projectId={projectId} />
            <RequestButton token={token} projectId={projectId} />
          </div>
        )}

        {/* On BOTH tabs. It is a gate before the first check, and a status card
            after it, and neither is something a tab should be able to hide. */}
        <MaterialCheck
          token={token}
          projectId={projectId}
          country={data.country}
          material={material}
        />

        {showReport && !material.needsFirstCheck && (
          <>
            <h2 className="b-h b-sec">{t("todayReport")}</h2>
            <CrewReportForm token={token} projectId={projectId} scope={data.scope} />
          </>
        )}

        {showOverview && !material.needsFirstCheck && (
          <div className="b-card">
            <span className="b-label">{t("todayPosts")}</span>
            <TodayPosts posts={data.todayPosts} />
          </div>
        )}
      </div>

      {nav && <CrewTabs locale={nav.locale} projectId={projectId} active={nav.active} />}
      <LiveRefresh topic={projectTopic(data.projectId)} />
    </main>
  );
}
