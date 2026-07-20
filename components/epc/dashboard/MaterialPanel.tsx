import { getTranslations, getLocale } from "next-intl/server";
import type { MaterialPanelData } from "@/lib/data/epc-dashboard";
import { ddmm } from "@/lib/dashboard-shared";
import { hhmm } from "@/lib/project-time";
import { MaterialDocs } from "./MaterialDocs";
import { AddMaterialItem } from "./AddMaterialItem";

// The EPC's view of the Stückliste: whether the crew has checked, what is short,
// the attached documents, and an add-item control that triggers a re-check.
export async function MaterialPanel({
  token,
  projectId,
  country,
  material,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  country: string;
  material: MaterialPanelData;
}) {
  const t = await getTranslations("dashboard.material");
  const locale = await getLocale();
  const nf = new Intl.NumberFormat(locale);

  const latest = material.latest;
  const byId = new Map(material.items.map((i) => [i.id, i]));
  const shortItems = latest ? latest.items.filter((i) => i.status !== "present") : [];
  const notArrived = latest != null && latest.items.length === 0;

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("title")}</div>

      <div className="mp-status">
        {latest === null ? (
          <span className="e-proj-badge late">{t("waiting")}</span>
        ) : notArrived ? (
          <span className="e-proj-badge late">{t("notArrived")}</span>
        ) : shortItems.length === 0 ? (
          <span className="e-proj-badge">{t("complete")}</span>
        ) : (
          <span className="e-proj-badge late">{t("short", { count: shortItems.length })}</span>
        )}

        {material.uncoveredOrChanged > 0 && latest !== null && (
          <span className="mp-recheck">{t("recheckPending", { count: material.uncoveredOrChanged })}</span>
        )}
      </div>

      {shortItems.length > 0 && (
        <div className="mp-shorts">
          {shortItems.map((i) => {
            const item = byId.get(i.materialItemId);
            if (!item) return null;
            return (
              <div className="mp-short" key={i.materialItemId}>
                <span className="mp-short-name">{item.name}</span>
                <span className="mp-short-num e-mono">
                  {t("missingOf", {
                    missing: nf.format(i.missingQty ?? item.qty),
                    qty: nf.format(item.qty),
                    unit: item.unit,
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {latest !== null && (
        <>
          <div className="mp-meta">
            {t("checkedOn", { date: ddmm(latest.checkedAt) ?? "", time: hhmm(latest.checkedAt, country) })}
            {latest.note && (
              <>
                {" · "}
                <b>{t("crewNote")}:</b> {latest.note}
              </>
            )}
          </div>
          {!notArrived && <MaterialDocs docs={latest.docs} />}
        </>
      )}

      <AddMaterialItem token={token} projectId={projectId} />
    </section>
  );
}
