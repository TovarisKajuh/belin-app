import { getTranslations } from "next-intl/server";
import type { PortfolioData } from "@/lib/data/portfolio";

// Four numbers, as numbers.
//
// These are single headline values, so they are stat tiles rather than a
// chart: a bar chart of four unrelated counts would take longer to read than
// the counts themselves, and comparing "active projects" to "incidents this
// week" on a shared axis would be meaningless.
//
// Only counts that mean something get emphasis. A zero is deliberately quiet:
// no open hour sheets is the normal state, and shouting it would train the
// reader to ignore the number on the day it is not zero.
export async function PortfolioHeader({ data }: { data: PortfolioData }) {
  const t = await getTranslations("portfolio");

  const tiles: { label: string; value: number; unit?: string; alert?: boolean }[] = [
    { label: t("active"), value: data.activeCount },
    { label: t("kwp"), value: data.kwpInProgress, unit: "kWp" },
    { label: t("openHours"), value: data.openHourSheets, alert: data.openHourSheets > 0 },
    {
      label: t("openIncidents"),
      value: data.incidentsThisWeek,
      alert: data.incidentsThisWeek > 0,
    },
  ];

  return (
    <div className="pf-strip">
      {tiles.map((tile) => (
        <div key={tile.label} className="pf-tile">
          <span className="pf-tile-l">{tile.label}</span>
          <span className={`pf-tile-v${tile.alert ? " alert" : ""}`}>
            {tile.value}
            {tile.unit ? <span className="pf-tile-u"> {tile.unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
