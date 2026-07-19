import { getTranslations } from "next-intl/server";
import type { Projection, DailyProgressPoint } from "@/lib/projection-shared";
import { buildProjectionChart, smoothPath, areaPath, ddmm } from "@/lib/dashboard-shared";

// The plot's own coordinate space. The SVG stretches to the panel width, so x
// positions double as percentages of this 0..800 domain for the HTML labels.
const W = 800;
const H = 210;
const Y_TOP = 12;
const Y_BOTTOM = 188;

const pct = (x: number): string => `${(x / W) * 100}%`;

// Progress so far as a solid gold curve, the forecast to 100 percent as a soft
// dashed continuation, with the deadline and the buffer between them. The
// forecast is a straight extrapolation because that is exactly what the rate
// model claims: drawing it as a curve would imply precision we do not have.
export async function ProjectionPanel({
  history,
  projection,
  today,
  plannedEnd,
  currentPercent,
}: {
  history: DailyProgressPoint[];
  projection: Projection;
  today: string;
  plannedEnd: string | null;
  currentPercent: number;
}) {
  const t = await getTranslations("dashboard");

  const chart = buildProjectionChart({
    history,
    today,
    projectedFinish: projection.projectedFinish,
    plannedEnd,
    width: W,
    yTop: Y_TOP,
    yBottom: Y_BOTTOM,
  });

  const days = projection.daysVsDeadline;
  const badge =
    days == null ? null : days >= 0 ? t("buffer", { days }) : t("behind", { days: -days });

  const last = chart.actual.length > 0 ? chart.actual[chart.actual.length - 1] : null;
  const line = smoothPath(chart.actual);
  const projLine = chart.projection ? smoothPath(chart.projection) : null;
  const deadlineLabel = ddmm(plannedEnd);

  return (
    <section className="e-sec e-reveal">
      <div className="e-panel">
        <div className="e-panel-h">
          <div>
            <div className="t">{t("pathToCompletion")}</div>
            <div className="s">{t("pathSub")}</div>
          </div>
          {badge && (
            <span className={days != null && days < 0 ? "e-proj-badge late" : "e-proj-badge"}>
              {badge}
            </span>
          )}
        </div>

        {chart.actual.length === 0 ? (
          <div className="e-proj-empty">{t("gathering")}</div>
        ) : (
          <div className="e-proj-plot">
            <svg
              className="e-proj-svg"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              role="presentation"
            >
              <defs>
                <linearGradient id="e-proj-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffd21a" stopOpacity=".22" />
                  <stop offset="1" stopColor="#ffd21a" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g stroke="rgba(255,255,255,.06)" strokeWidth="1" vectorEffect="non-scaling-stroke">
                <line x1="0" y1="20" x2={W} y2="20" />
                <line x1="0" y1="80" x2={W} y2="80" />
                <line x1="0" y1="140" x2={W} y2="140" />
                <line x1="0" y1={Y_BOTTOM} x2={W} y2={Y_BOTTOM} />
              </g>

              {chart.buffer && (
                <rect
                  x={chart.buffer.x}
                  y="8"
                  width={chart.buffer.width}
                  height={Y_BOTTOM - 8}
                  fill="rgba(74,208,122,.07)"
                />
              )}

              {chart.deadlineX != null && (
                <line
                  x1={chart.deadlineX}
                  y1="6"
                  x2={chart.deadlineX}
                  y2={Y_BOTTOM}
                  stroke="rgba(255,255,255,.28)"
                  strokeWidth="1.5"
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {chart.todayX != null && (
                <line
                  x1={chart.todayX}
                  y1="6"
                  x2={chart.todayX}
                  y2={Y_BOTTOM}
                  stroke="var(--e-gold)"
                  strokeWidth="1.5"
                  strokeDasharray="2 4"
                  opacity=".55"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {chart.actual.length > 1 && (
                <path d={areaPath(line, chart.actual, Y_BOTTOM)} fill="url(#e-proj-grad)" />
              )}
              {chart.actual.length > 1 && (
                <path
                  d={line}
                  fill="none"
                  stroke="var(--e-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {projLine && (
                <path
                  d={projLine}
                  fill="none"
                  stroke="var(--e-gold)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="1 9"
                  opacity=".65"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {last && (
              <>
                <span
                  className="e-proj-dot"
                  style={{ left: pct(last.x), top: `${(last.y / H) * 100}%` }}
                />
                <span
                  className="e-proj-val e-mono"
                  style={{ left: pct(last.x), top: `${(last.y / H) * 100}%` }}
                >
                  {Math.round(currentPercent)}%
                </span>
              </>
            )}
            {chart.todayX != null && (
              <span className="e-proj-lab today" style={{ left: pct(chart.todayX) }}>
                {t("today")}
              </span>
            )}
            {chart.deadlineX != null && deadlineLabel && (
              <span className="e-proj-lab end" style={{ left: pct(chart.deadlineX) }}>
                {t("deadline", { date: deadlineLabel })}
              </span>
            )}
          </div>
        )}

        <div className="e-proj-foot">{t("forYourPlanning")}</div>
      </div>
    </section>
  );
}
