"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyProgressPoint, Projection } from "@/lib/projection-shared";
import {
  buildProjectionChart,
  monotonePath,
  areaPath,
  ddmm,
  isoFromDays,
} from "@/lib/dashboard-shared";

// Measuring before paint avoids a visible reflow of the curve on load. On the
// server there is nothing to measure, so it falls back to a plain effect.
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAD_TOP = 26;
const PAD_BOTTOM = 34; // the x-axis band lives inside the height, never clipped
const PAD_LEFT = 38; // room for the y-axis percentages
const PAD_RIGHT = 14;

const Y_TICKS = [0, 25, 50, 75, 100];

// The path animation is decoration. Anyone who asks for less motion gets the
// finished curve immediately instead.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

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
  const [active, setActive] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useMeasureEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // ResizeObserver delivery rides the rendering pipeline and can be starved
    // in a throttled tab, so a window listener backs it up.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const height = Math.max(230, Math.min(400, Math.round(width * 0.52)));
  const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);

  const chart = useMemo(
    () =>
      buildProjectionChart({
        history,
        today,
        currentPercent,
        projectedFinish: projection.projectedFinish,
        plannedEnd,
        width: plotW,
        yTop: PAD_TOP,
        yBottom: height - PAD_BOTTOM,
      }),
    [history, today, currentPercent, projection.projectedFinish, plannedEnd, plotW, height]
  );

  // Evenly spaced date ticks across the whole span, like a month axis.
  const xTicks = useMemo(() => {
    const span = chart.domainEndDay - chart.domainStartDay;
    if (span <= 0) return [];
    const count = width < 420 ? 4 : width < 700 ? 6 : 8;
    return Array.from({ length: count }, (_, i) => {
      const day = Math.round(chart.domainStartDay + (span * i) / (count - 1));
      return { x: chart.xOfDay(day), label: ddmm(isoFromDays(day)) ?? "" };
    });
  }, [chart, width]);

  if (chart.actual.length === 0) {
    return <div className="e-proj-empty">{t("gathering")}</div>;
  }

  const yOf = (p: number) =>
    chart.yBottom - (Math.min(100, Math.max(0, p)) / 100) * (chart.yBottom - chart.yTop);

  const line = monotonePath(chart.actual);
  const area = areaPath(line, chart.actual, chart.yBottom);
  const forecast = chart.projection ? monotonePath(chart.projection) : null;
  const last = chart.actual[chart.actual.length - 1];

  const activePoint = active != null ? chart.actual[active] : null;
  const activeData = active != null ? chart.points[active] : null;
  const activeGain =
    active != null && active > 0
      ? chart.points[active].cumulativePercent - chart.points[active - 1].cumulativePercent
      : null;

  // The crosshair snaps to the nearest reported day, so the reader aims at a
  // date rather than at a 2px line.
  const pickNearest = (clientX: number) => {
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left - PAD_LEFT;
    let best = 0;
    let bestDist = Infinity;
    chart.actual.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => {
        const next = (i == null ? chart.actual.length - 1 : i) + step;
        return Math.max(0, Math.min(chart.actual.length - 1, next));
      });
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  const tooltipLeft = activePoint ? PAD_LEFT + activePoint.x : 0;
  const tooltipFlip = tooltipLeft > width * 0.6;

  return (
    <div className="e-chart" ref={box} style={{ height }}>
      <svg
        className="e-chart-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t("pathToCompletion")}: ${Math.round(currentPercent)}%`}
      >
        <defs>
          <linearGradient id="e-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff8f0a" />
            <stop offset="0.5" stopColor="#ffd21a" />
            <stop offset="1" stopColor="#ffe9a3" />
          </linearGradient>
          <linearGradient id="e-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.34" />
            <stop offset="0.45" stopColor="#ffb020" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ff8f0a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="e-forecast-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffe9a3" stopOpacity="0.18" />
          </linearGradient>
          <filter id="e-line-blur" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <g transform={`translate(${PAD_LEFT},0)`}>
          {/* Solid hairline grid: dashed gridlines read as thresholds. */}
          {Y_TICKS.map((p) => (
            <line
              key={p}
              x1={0}
              y1={yOf(p)}
              x2={plotW}
              y2={yOf(p)}
              stroke="rgba(255,255,255,.055)"
              strokeWidth="1"
            />
          ))}

          {chart.buffer && (
            <rect
              x={chart.buffer.x}
              y={chart.yTop - 10}
              width={chart.buffer.width}
              height={chart.yBottom - chart.yTop + 10}
              fill="rgba(74,208,122,.07)"
            />
          )}

          {chart.deadlineX != null && (
            <line
              x1={chart.deadlineX}
              y1={chart.yTop - 10}
              x2={chart.deadlineX}
              y2={chart.yBottom}
              stroke="rgba(255,255,255,.3)"
              strokeWidth="1.5"
              strokeDasharray="2 5"
            />
          )}
          {chart.todayX != null && (
            <line
              x1={chart.todayX}
              y1={chart.yTop - 10}
              x2={chart.todayX}
              y2={chart.yBottom}
              stroke="var(--e-gold)"
              strokeWidth="1.5"
              strokeDasharray="2 5"
              opacity=".45"
            />
          )}

          {chart.actual.length > 1 && <path d={area} fill="url(#e-area-grad)" />}

          {/* A blurred copy beneath the stroke is what makes the line glow. */}
          {chart.actual.length > 1 && (
            <path
              d={line}
              fill="none"
              stroke="#ffc400"
              strokeWidth="10"
              strokeLinecap="round"
              opacity=".33"
              filter="url(#e-line-blur)"
            />
          )}

          {chart.actual.length > 1 && (
            <path
              className={reducedMotion ? undefined : "e-chart-line"}
              d={line}
              fill="none"
              stroke="url(#e-line-grad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={reducedMotion ? undefined : 1}
            />
          )}

          {forecast && (
            <path
              d={forecast}
              fill="none"
              stroke="url(#e-forecast-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.5 8"
            />
          )}

          {/* Resting marker, hidden while scrubbing so there is only ever one dot. */}
          {!activePoint && (
            <>
              <circle className="e-chart-halo" cx={last.x} cy={last.y} r="10" fill="var(--e-gold)" />
              <circle
                cx={last.x}
                cy={last.y}
                r="5.5"
                fill="var(--e-gold)"
                stroke="#0b1524"
                strokeWidth="2.5"
              />
            </>
          )}

          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1={chart.yTop - 10}
                x2={activePoint.x}
                y2={chart.yBottom}
                stroke="rgba(255,255,255,.42)"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6.5"
                fill="var(--e-gold)"
                stroke="#0b1524"
                strokeWidth="3"
              />
            </>
          )}

          <g className="e-chart-axis">
            {xTicks.map((tick, i) => (
              <text key={i} x={tick.x} y={chart.yBottom + 20} textAnchor="middle">
                {tick.label}
              </text>
            ))}
          </g>
        </g>

        <g className="e-chart-axis">
          {Y_TICKS.map((p) => (
            <text key={p} x={PAD_LEFT - 9} y={yOf(p) + 3.5} textAnchor="end">
              {p}
            </text>
          ))}
        </g>

        {/* One transparent surface takes every pointer, so the reader never has
            to hit the line itself. */}
        <rect
          x={PAD_LEFT}
          y={0}
          width={plotW}
          height={height}
          fill="transparent"
          style={{ touchAction: "pan-y" }}
          onPointerMove={(e) => pickNearest(e.clientX)}
          onPointerDown={(e) => pickNearest(e.clientX)}
          onPointerLeave={() => setActive(null)}
tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        />
      </svg>

      {activeData && activePoint && (
        <div
          className={tooltipFlip ? "e-chart-tip flip" : "e-chart-tip"}
          style={{ left: tooltipLeft, top: activePoint.y }}
        >
          <div className="v e-mono">{activeData.cumulativePercent.toFixed(1)}%</div>
          <div className="d e-mono">{ddmm(activeData.date)}</div>
          {activeGain != null && activeGain > 0 && (
            <div className="g e-mono">+{activeGain.toFixed(1)}</div>
          )}
        </div>
      )}
    </div>
  );
}
