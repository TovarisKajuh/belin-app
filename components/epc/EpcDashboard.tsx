import { getTranslations } from "next-intl/server";
import type { EpcDashboardData } from "@/lib/data/epc-dashboard";
import { CommandBar } from "@/components/epc/dashboard/CommandBar";
import { AlertStrip } from "@/components/epc/dashboard/AlertStrip";
import { ProgressRing } from "@/components/epc/dashboard/ProgressRing";

function ddmm(iso: string | null): string | null {
  if (!iso || iso.length < 10) return null;
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

// The dark EPC dashboard. This first slice is the shell (command bar, conditional
// alert) and the hero (project identity, quick chips, the glowing progress ring).
// Scope, projection, stats, feed and gallery are added as further sections.
export async function EpcDashboard({ token, data }: { token: string; data: EpcDashboardData }) {
  const t = await getTranslations("dashboard");
  const core = data.core;
  const sub = data.subName;
  const proj = data.projection;
  const finish = ddmm(proj.projectedFinish);
  const facts = [core.kwp != null ? `${core.kwp} kWp` : null, sub].filter(Boolean).join(" · ");

  return (
    <div className="epc-dark">
      <div className="e-grain" />
      <CommandBar token={token} projectName={core.name} subName={sub} status={core.status} />
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
      </div>
    </div>
  );
}
