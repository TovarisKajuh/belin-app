import { getLocale, getTranslations } from "next-intl/server";
import { formatCapacity } from "@/lib/portfolio-shared";
import { fmtNumber } from "@/lib/format";
import type { PortfolioData } from "@/lib/data/portfolio";

// The book of work in four numbers.
//
// Three of them are capacity, and they read as one timeline: what is done, what
// is being built, what is next. They partition the whole portfolio and never
// double count, because a roof is in exactly one of those three states.
//
// "Done" leads, because it is the number an EPC quotes about itself and the one
// that answers "are these people any good". The other two only make sense
// beside it: 491 kWp in progress means one thing for a company that has
// installed a megawatt and quite another for one that has installed fifty.
//
// These are single values, so they are stat tiles rather than a chart. A bar
// chart of four unrelated numbers would take longer to read than the numbers.
export async function PortfolioHeader({ data }: { data: PortfolioData }) {
  const t = await getTranslations("portfolio");
  const locale = await getLocale();
  // In the reader's format: "1,0 MWp" and "491 kWp" in Slovenian, not "1 MWp"
  // beside "245.7".
  const show = (c: { value: number; unit: "kWp" | "MWp" }) =>
    fmtNumber(c.value, locale, c.unit === "MWp" ? { decimals: 1 } : { maxDecimals: 0 });

  const installed = formatCapacity(data.kwpInstalled);
  const running = formatCapacity(data.kwpInProgress);
  const pipeline = formatCapacity(data.kwpPipeline);

  const tiles = [
    {
      label: t("installed"),
      value: installed.value,
      unit: installed.unit,
      // The scope, said out loud: without it a lifetime total sitting beside an
      // in-progress total is two numbers that look like they mean the same.
      sub: t("installedSub", { n: data.finishedCount }),
    },
    { label: t("kwp"), value: running.value, unit: running.unit, sub: t("kwpSub", { n: data.activeCount }) },
    { label: t("pipeline"), value: pipeline.value, unit: pipeline.unit, sub: t("pipelineSub") },
  ];

  return (
    <div className="pf-strip">
      {tiles.map((tile) => (
        <div key={tile.label} className="pf-tile">
          <span className="pf-tile-l">{tile.label}</span>
          <span className="pf-tile-v">
            {show(tile)}
            <span className="pf-tile-u"> {tile.unit}</span>
          </span>
          <span className="pf-tile-s">{tile.sub}</span>
        </div>
      ))}
    </div>
  );
}

// What is waiting on somebody, under the list rather than over it.
//
// These two led the screen and the founder could not say what either meant.
// That is the correct verdict on a headline: an hour sheet awaiting a decision
// and an incident this week are real, but they are today's inbox, not the shape
// of the business, and putting them first said the opposite. A zero stays quiet
// so the number still registers on the day it is not zero.
export async function PortfolioFooter({ data }: { data: PortfolioData }) {
  const t = await getTranslations("portfolio");
  // The counted phrases come from the app namespace, which already carries them
  // as ICU plurals. Slovenian has four forms and "1 listov ur" is wrong in a way
  // a Slovenian reader notices immediately, so the number cannot be bolted onto
  // a fixed noun.
  const tApp = await getTranslations("app");

  if (data.openHourSheets === 0 && data.incidentsThisWeek === 0) return null;

  const items = [
    data.openHourSheets > 0 ? tApp("openHours", { n: data.openHourSheets }) : null,
    data.incidentsThisWeek > 0 ? tApp("incidents", { n: data.incidentsThisWeek }) : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="pf-foot">
      <span className="pf-foot-l">{t("waiting")}</span>
      {items.map((item) => (
        <span key={item} className="pf-foot-i">
          {item}
        </span>
      ))}
    </div>
  );
}
