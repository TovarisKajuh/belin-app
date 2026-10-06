import { getTranslations, getLocale } from "next-intl/server";
import type { ScopeItemStatus } from "@/lib/data/project-core";
import { fmtNumber, fmtPct } from "@/lib/format";

// Every scope item as a flat row: installed against target, with the same
// per-item percentage the weighted project progress is built from.
export async function ScopeByPhase({ scope }: { scope: ScopeItemStatus[] }) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  if (scope.length === 0) return null;

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("scopeByPhase")}</div>
      <div className="e-scope-grid">
        {scope.map((s) => {
          const percent =
            s.targetQty > 0
              ? Math.min(100, Math.round((s.installedQty / s.targetQty) * 100))
              : 0;
          return (
            <div className="e-srow" key={s.id}>
              <span className="e-sname">{s.name}</span>
              <span className="e-strack">
                <span className="e-sfill" style={{ width: `${percent}%` }} />
              </span>
              <span className="e-snums e-mono">
                <b>{fmtNumber(s.installedQty, locale)}</b> / {fmtNumber(s.targetQty, locale)} {s.unit}
              </span>
              <span className={percent === 0 ? "e-spct z e-mono" : "e-spct e-mono"}>
                {fmtPct(percent, locale, 0)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
