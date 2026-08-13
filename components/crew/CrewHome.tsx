import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import { MaterialCheck } from "./MaterialCheck";
import { IncidentButton } from "./IncidentButton";
import { InstallHint } from "./InstallHint";
import { RequestButton } from "./RequestButton";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";
import type { CrewHomeData } from "@/lib/data/reports";
import type { MaterialState } from "@/lib/materials-shared";

export async function CrewHome({
  token,
  projectId,
  data,
  material,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  data: CrewHomeData;
  material: MaterialState;
}) {
  const t = await getTranslations("crew");
  const address = [data.addressStreet, [data.addressZip, data.addressCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  // Same dark shell, same command bar and the same --e-* surfaces as the EPC
  // dashboard: the two sides are one product, not two apps. What stays
  // crew-specific is the layout, which is built for one hand on a roof.
  return (
    <main className="belin-dark">
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

        <div className="b-card b-hero">
          <span className="b-label">{t("progress")}</span>
          <div className="b-progress-num">
            {data.progressPercent}
            <span className="b-progress-unit"> %</span>
          </div>
        </div>

        {/* Shown until the app is on the home screen, then never again. A
            permanent session is only half of "it is an app": the other half is
            not having to find it. */}
        <InstallHint />

        {/* OUTSIDE the material gate, deliberately. Rain on day one, before
            the delivery has even arrived, is exactly what this is for, and the
            gate hides everything else until the first check exists. */}
        <div className="cr-quick">
          <IncidentButton token={token} projectId={projectId} />
          <RequestButton token={token} projectId={projectId} />
        </div>

        {material.needsFirstCheck ? (
          // The gate: no report form and no today posts until the first check
          // (or the "not arrived yet" escape) exists.
          <MaterialCheck token={token} projectId={projectId} country={data.country} material={material} />
        ) : (
          <>
            <MaterialCheck token={token} projectId={projectId} country={data.country} material={material} />

            <h2 className="b-h b-sec">{t("todayReport")}</h2>
            <CrewReportForm token={token} projectId={projectId} scope={data.scope} />

            <div className="b-card">
              <span className="b-label">{t("todayPosts")}</span>
              <TodayPosts posts={data.todayPosts} />
            </div>
          </>
        )}
      </div>
      <LiveRefresh topic={projectTopic(data.projectId)} />
    </main>
  );
}
