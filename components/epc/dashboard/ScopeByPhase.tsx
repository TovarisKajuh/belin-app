import { getTranslations, getLocale } from "next-intl/server";
import type { ScopeItemStatus } from "@/lib/data/project-core";

// Every scope item as a flat row: installed against target, with the same
// per-item percentage the weighted project progress is built from.
export async function ScopeByPhase({ scope }: { scope: ScopeItemStatus[] }) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  if (scope.length === 0) return null;

  const nf = new Intl.NumberFormat(locale);

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
                <b>{nf.format(s.installedQty)}</b> / {nf.format(s.targetQty)} {s.unit}
              </span>
              <span className={percent === 0 ? "e-spct z e-mono" : "e-spct e-mono"}>
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
