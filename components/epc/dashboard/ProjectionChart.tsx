"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyProgressPoint, Projection } from "@/lib/projection-shared";
import { buildProjectionChart, monotonePath, areaPath, ddmm } from "@/lib/dashboard-shared";

// Measuring before paint avoids a visible reflow of the curve on load. On the
// server there is nothing to measure, so it falls back to a plain effect.
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAD_TOP = 20;
const PAD_BOTTOM = 34; // room for the date labels under the plot

const pc = (x: number, total: number): string => `${total > 0 ? (x / total) * 100 : 0}%`;

// The chart draws at the container's true pixel width rather than into a fixed
// viewBox that gets stretched. A stretched viewBox compresses the curve
// horizontally on a phone (making gentle slopes look like steep steps) and
// distorts stroke weights, text and circles. At 1:1 none of that happens.
export function ProjectionChart({
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
  const t = useTranslations("dashboard");
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);

  useMeasureEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // ResizeObserver delivery rides the rendering pipeline and can be starved
    // in a throttled tab, which leaves the chart at a stale width. The window
    // listener is a cheap belt and braces so the size always catches up.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const height = Math.max(180, Math.min(300, Math.round(width * 0.46)));

  const chart = buildProjectionChart({
    history,
    today,
    currentPercent,
    projectedFinish: projection.projectedFinish,
    plannedEnd,
    width,
    yTop: PAD_TOP,
    yBottom: height - PAD_BOTTOM,
  });

  if (chart.actual.length === 0) {
    return <div className="e-proj-empty">{t("gathering")}</div>;
  }

  const line = monotonePath(chart.actual);
  const area = areaPath(line, chart.actual, chart.yBottom);
  const forecast = chart.projection ? monotonePath(chart.projection) : null;
  const last = chart.actual[chart.actual.length - 1];
  const showAxis = width >= 460;

  const gridYs = [chart.yTop, (chart.yTop + chart.yBottom) / 2, chart.yBottom];
  const startLabel = ddmm(history[0]?.date ?? today);
  const deadlineLabel = ddmm(plannedEnd);

  return (
    <div className="e-chart" ref={box} style={{ height }}>
      <svg
        className="e-proj-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="presentation"
        style={{ marginTop: 0 }}
      >
        <defs>
          <linearGradient id="e-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff9d0f" />
            <stop offset="0.55" stopColor="#ffd21a" />
            <stop offset="1" stopColor="#ffe488" />
          </linearGradient>
          <linearGradient id="e-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.30" />
            <stop offset="0.55" stopColor="#ffd21a" stopOpacity="0.07" />
            <stop offset="1" stopColor="#ffd21a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="e-forecast-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe488" stopOpacity="0.22" />
          </linearGradient>
          <filter id="e-line-blur" x="-25%" y="-60%" width="150%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <g stroke="rgba(255,255,255,.055)" strokeWidth="1">
          {gridYs.map((y) => (
            <line key={y} x1="0" y1={y} x2={width} y2={y} />
          ))}
        </g>

        {chart.buffer && (
          <rect
            className="e-chart-soft"
            x={chart.buffer.x}
            y={chart.yTop - 8}
            width={chart.buffer.width}
            height={chart.yBottom - chart.yTop + 8}
            fill="rgba(74,208,122,.06)"
          />
        )}

        {chart.deadlineX != null && (
          <line
            className="e-chart-soft"
            x1={chart.deadlineX}
            y1={chart.yTop - 8}
            x2={chart.deadlineX}
            y2={chart.yBottom}
            stroke="rgba(255,255,255,.26)"
            strokeWidth="1.5"
            strokeDasharray="2 5"
          />
        )}

        {chart.todayX != null && (
          <line
            className="e-chart-soft"
            x1={chart.todayX}
            y1={chart.yTop - 8}
            x2={chart.todayX}
            y2={chart.yBottom}
            stroke="var(--e-gold)"
            strokeWidth="1.5"
            strokeDasharray="2 5"
            opacity=".5"
          />
        )}

        {chart.actual.length > 1 && (
          <path className="e-chart-soft" d={area} fill="url(#e-area-grad)" />
        )}

        {/* A blurred copy under the stroke is what gives the line its glow. */}
        {chart.actual.length > 1 && (
          <path
            className="e-chart-soft"
            d={line}
            fill="none"
            stroke="var(--e-gold)"
            strokeWidth="7"
            strokeLinecap="round"
            opacity=".45"
            filter="url(#e-line-blur)"
          />
        )}

        {chart.actual.length > 1 && (
          <path
            className="e-chart-line"
            d={line}
            fill="none"
            stroke="url(#e-line-grad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
          />
        )}

        {forecast && (
          <path
            className="e-chart-soft"
            d={forecast}
            fill="none"
            stroke="url(#e-forecast-grad)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="0.5 7"
          />
        )}

        <circle className="e-chart-halo" cx={last.x} cy={last.y} r="10" fill="var(--e-gold)" />
        <circle
          className="e-chart-dot"
          cx={last.x}
          cy={last.y}
          r="5"
          fill="var(--e-gold)"
          stroke="#0b1524"
          strokeWidth="2.5"
        />

        {showAxis && (
          <g fill="rgba(255,255,255,.28)" fontSize="10.5" fontWeight="600">
            <text x="2" y={chart.yTop - 6}>
              100 %
            </text>
          </g>
        )}
      </svg>

      {/* Labels are placed as a percentage of the measured width rather than in
          pixels. If a measurement is ever stale, they stay proportionally
          inside the box instead of shooting off screen and forcing the page
          to scroll sideways. */}
      <span
        className="e-proj-val e-mono"
        style={{ left: pc(last.x, width), top: `${(last.y / height) * 100}%` }}
      >
        {Math.round(currentPercent)}%
      </span>

      {chart.todayX != null && (
        <span className="e-proj-lab today" style={{ left: pc(chart.todayX, width) }}>
          {t("today")}
        </span>
      )}
      {startLabel && chart.actual.length > 1 && (
        <span className="e-proj-lab start">{startLabel}</span>
      )}
      {chart.deadlineX != null && deadlineLabel && (
        <span className="e-proj-lab end" style={{ left: pc(chart.deadlineX, width) }}>
          {t("deadline", { date: deadlineLabel })}
        </span>
      )}
    </div>
  );
}
