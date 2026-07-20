import { getTranslations } from "next-intl/server";
import type { DashboardRoof } from "@/lib/data/epc-dashboard";

// The roofs as the plan describes them. A solar site is scheduled and built
// roof by roof, so the per roof panel count is the number an EPC uses to plan a
// crew's day; the project total alone hides it.
export async function RoofPanel({ roofs }: { roofs: DashboardRoof[] }) {
  if (roofs.length === 0) return null;

  const t = await getTranslations("dashboard.roofs");
  const total = roofs.reduce((n, r) => n + (r.moduleCount ?? 0), 0);

  return (
    <section className="e-sec e-reveal">
      <h2 className="e-sec-h">{t("title")}</h2>
      <div className="rp-grid">
        {roofs.map((roof) => (
          <div className="rp-card" key={roof.name}>
            <div className="rp-name">{roof.name}</div>
            <div className="rp-n e-mono">
              {roof.moduleCount ?? "?"}
              <span className="u">{t("modules")}</span>
            </div>
            {roof.kwp !== null && <div className="rp-kwp e-mono">{roof.kwp} kWp</div>}
          </div>
        ))}
      </div>
      <div className="rp-total">{t("total", { n: total })}</div>
    </section>
  );
}
