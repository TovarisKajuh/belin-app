import { getLocale, getTranslations } from "next-intl/server";
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
import { previousDay } from "@/lib/reports-shared";
import { mapsUrl } from "@/lib/maps";
import { fmtDate, fmtNumber } from "@/lib/format";

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
  // Tabbed: the report tab is only the form, so the photo card is on the first
  // screen; reading (progress, install hint) lives on Pregled. Untabbed (the
  // legacy link screen) keeps its single column.
  const readHere = !nav || nav.active === "overview";

  const locale = await getLocale();
  const mapUrl = mapsUrl({
    street: data.addressStreet,
    zip: data.addressZip,
    city: data.addressCity,
    lat: data.lat,
    lng: data.lng,
  });
  const likeLabel = data.lastReport
    ? data.lastReport.date === previousDay(data.todayDate)
      ? t("report.likeYesterday")
      : t("report.likeLast", { date: fmtDate(data.lastReport.date, locale, { style: "dayMonth" }) })
    : null;

  const hero = (
    <div className="b-card b-hero">
      <span className="b-label">{t("progress")}</span>
      <div className="b-progress-num">
        {fmtNumber(data.progressPercent, locale, { maxDecimals: 1 })}
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
        {address && (
          <p className="b-sub b-addr">
            {mapUrl ? (
              <a className="b-addr-link" href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${address}, ${t("maps")}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {address}
              </a>
            ) : (
              address
            )}
          </p>
        )}

        {readHere && hero}

        {/* Shown until the app is on the home screen, then never again. A
            permanent session is only half of "it is an app": the other half is
            not having to find it. */}
        {readHere && <InstallHint />}

        {showReport && (
          /* OUTSIDE the material gate, deliberately. Rain on day one, before
             the delivery has even arrived, is exactly what this is for, and
             the gate hides everything else until the first check exists. */
          <div className="cr-quick cr-quick--compact">
            <IncidentButton token={token} projectId={projectId} />
            <RequestButton token={token} projectId={projectId} />
          </div>
        )}

        {/* A gate before the first check on both tabs. After it, Pregled shows
            the status card and Poročaj shows it only when something changed
            and needs a recheck, so the form stays on the first screen. */}
        <MaterialCheck
          token={token}
          projectId={projectId}
          country={data.country}
          material={material}
          mode={nav && nav.active === "report" && !material.needsFirstCheck ? "alertOnly" : "full"}
        />

        {showReport && !material.needsFirstCheck && (
          <>
            {!nav && <h2 className="b-h b-sec">{t("todayReport")}</h2>}
            <CrewReportForm
              token={token}
              projectId={projectId}
              scope={data.scope}
              lastReport={data.lastReport}
              likeLabel={likeLabel}
            />
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
