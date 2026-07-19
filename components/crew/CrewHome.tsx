import { getTranslations } from "next-intl/server";
import { CrewReportForm } from "./CrewReportForm";
import { MaterialCheck } from "./MaterialCheck";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import type { CrewHomeData } from "@/lib/data/reports";
import type { MaterialState } from "@/lib/materials-shared";

export async function CrewHome({
  token,
  data,
  material,
}: {
  token: string;
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

        {material.needsFirstCheck ? (
          // The gate: no report form and no today posts until the first check
          // (or the "not arrived yet" escape) exists.
          <MaterialCheck token={token} country={data.country} material={material} />
        ) : (
          <>
            <MaterialCheck token={token} country={data.country} material={material} />

            <h2 className="b-h b-sec">{t("todayReport")}</h2>
            <CrewReportForm token={token} scope={data.scope} />

            <div className="b-card">
              <span className="b-label">{t("todayPosts")}</span>
              <TodayPosts posts={data.todayPosts} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
