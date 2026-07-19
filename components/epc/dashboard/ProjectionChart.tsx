"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyProgressPoint, Projection } from "@/lib/projection-shared";
import {
  buildProjectionChart,
  monotonePath,
  areaPath,
  ddmm,
  isoFromDays,
  nearestIndex,
} from "@/lib/dashboard-shared";

// Measuring before paint avoids a visible reflow of the curve on load. On the
// server there is nothing to measure, so it falls back to a plain effect.
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAD_TOP = 18;
const PAD_BOTTOM = 30; // the x-axis date band lives inside the height
const PAD_LEFT = 8; // no y-axis label column: the line runs nearly full bleed
const PAD_RIGHT = 14;

const pc = (x: number, total: number): string => `${total > 0 ? (x / total) * 100 : 0}%`;

// The hero projection chart, rebuilt to the researched architecture
// (docs/superpowers/plans/2026-07-19-hero-projection-chart.md): hand-rolled
// SVG like Coinbase/Robinhood, layered-stroke glow with zero filter elements,
// shared userSpaceOnUse gradients, a fixed readout slot instead of a floating
// tooltip, and a Robinhood-style scrub where the dot glides along the curve
// while the readout snaps to real reported days. During the gesture nothing
// goes through React state: one rAF writes transforms and text through refs.
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
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const linePathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const hairRef = useRef<SVGLineElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const gainRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);

  // Path sample table for the glide: xs/ys at ~1 sample per horizontal pixel.
  const samplesRef = useRef<{ xs: Float32Array; ys: Float32Array } | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const pointerXRef = useRef(0);
  const activeIdxRef = useRef<number | null>(null);

  useMeasureEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // ResizeObserver delivery rides the rendering pipeline and can be starved
    // in a throttled tab, so a window listener backs it up. The sample table is
    // rebuilt by the effect keyed on the resulting width, so it never goes
    // stale after a rotate.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const height = Math.max(220, Math.min(360, Math.round(width * 0.5)));
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

  const line = chart.actual.length > 0 ? monotonePath(chart.actual) : "";

  // Rebuild the glide table whenever the rendered geometry changes.
  useEffect(() => {
    const path = linePathRef.current;
    if (!path || chart.actual.length === 0) {
      samplesRef.current = null;
      return;
    }
    const total = path.getTotalLength();
    const n = Math.max(2, Math.ceil(plotW / 2));
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength(total > 0 ? (i / (n - 1)) * total : 0);
      xs[i] = p.x;
      ys[i] = p.y;
    }
    samplesRef.current = { xs, ys };
  }, [line, plotW, height, chart.actual.length]);

  const nf = useMemo(
    () =>
      new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale]
  );

  // Per-day scrub lookups: x position, value, gain over the previous report.
  const days = useMemo(() => {
    const xs = new Float32Array(chart.actual.length);
    chart.actual.forEach((p, i) => {
      xs[i] = p.x;
    });
    const gains = chart.points.map((p, i) =>
      i > 0 ? p.cumulativePercent - chart.points[i - 1].cumulativePercent : 0
    );
    return { xs, gains };
  }, [chart]);

  const last = chart.actual.length > 0 ? chart.actual[chart.actual.length - 1] : null;

  if (chart.actual.length === 0 || !last) {
    return <div className="e-proj-empty">{t("gathering")}</div>;
  }

  const area = areaPath(line, chart.actual, chart.yBottom);
  const forecast = chart.projection ? monotonePath(chart.projection) : null;

  const yOf = (p: number) =>
    chart.yBottom - (Math.min(100, Math.max(0, p)) / 100) * (chart.yBottom - chart.yTop);

  // Sparse date axis: 3 labels on a phone, 5 on desktop, skipping any that
  // would collide with the today or deadline markers, which carry their own.
  const xTicks = (() => {
    const span = chart.domainEndDay - chart.domainStartDay;
    if (span <= 0) return [];
    const count = width < 460 ? 3 : 5;
    const ticks: { x: number; label: string; anchor: "start" | "middle" | "end" }[] = [];
    for (let i = 0; i < count; i++) {
      const day = Math.round(chart.domainStartDay + (span * i) / (count - 1));
      const x = chart.xOfDay(day);
      if (chart.todayX != null && Math.abs(x - chart.todayX) < 48) continue;
      if (chart.deadlineX != null && Math.abs(x - chart.deadlineX) < 56) continue;
      ticks.push({
        x,
        label: ddmm(isoFromDays(day)) ?? "",
        anchor: i === 0 ? "start" : i === count - 1 ? "end" : "middle",
      });
    }
    return ticks;
  })();

  const defaultVal = `${nf.format(currentPercent)}%`;
  const dayLabel = (i: number) => {
    const p = chart.points[i];
    return p.date === today ? t("today") : (ddmm(p.date) ?? "");
  };

  const setReadout = (i: number) => {
    const p = chart.points[i];
    if (valRef.current) valRef.current.textContent = `${nf.format(p.cumulativePercent)}%`;
    if (dateRef.current) dateRef.current.textContent = dayLabel(i);
    if (gainRef.current)
      gainRef.current.textContent = days.gains[i] > 0.05 ? `+${nf.format(days.gains[i])}` : "";
  };

  const showMarkerAt = (x: number, y: number) => {
    dotRef.current?.setAttribute("transform", `translate(${x},${y})`);
    const hair = hairRef.current;
    if (hair) {
      hair.setAttribute("x1", String(x));
      hair.setAttribute("x2", String(x));
      hair.style.opacity = "1";
    }
  };

  const restore = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    rafRef.current = 0;
    timerRef.current = 0;
    activeIdxRef.current = null;
    dotRef.current?.setAttribute("transform", `translate(${last.x},${last.y})`);
    if (hairRef.current) hairRef.current.style.opacity = "0";
    if (valRef.current) valRef.current.textContent = defaultVal;
    if (dateRef.current) dateRef.current.textContent = t("today");
    if (gainRef.current) gainRef.current.textContent = "";
  };

  const applyScrub = () => {
    rafRef.current = 0;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    const table = samplesRef.current;
    if (!table) return;
    const x = Math.min(last.x, Math.max(chart.actual[0].x, pointerXRef.current));
    // Glide: the dot follows the curve itself, between data points.
    const si = nearestIndex(table.xs, x);
    let y = table.ys[si];
    if (si < table.xs.length - 1 && table.xs[si + 1] > table.xs[si]) {
      const f = Math.min(1, Math.max(0, (x - table.xs[si]) / (table.xs[si + 1] - table.xs[si])));
      y = table.ys[si] + f * (table.ys[si + 1] - table.ys[si]);
    }
    showMarkerAt(x, y);
    // Snap: the numbers shown are always a real reported day.
    const di = nearestIndex(days.xs, x);
    if (di !== activeIdxRef.current && di >= 0) {
      activeIdxRef.current = di;
      setReadout(di);
    }
  };

  // rAF-coalesced, with a short timeout backstop: throttled tabs starve rAF,
  // and an interaction that carries data must still respond there.
  const schedule = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(applyScrub);
    if (!timerRef.current) timerRef.current = window.setTimeout(applyScrub, 48);
  };

  const onPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    pointerXRef.current = e.clientX - svg.getBoundingClientRect().left - PAD_LEFT;
    schedule();
  };

  const stepTo = (i: number) => {
    const clamped = Math.max(0, Math.min(chart.points.length - 1, i));
    activeIdxRef.current = clamped;
    const p = chart.actual[clamped];
    showMarkerAt(p.x, p.y);
    setReadout(clamped);
    if (liveRef.current)
      liveRef.current.textContent = `${dayLabel(clamped)} · ${nf.format(chart.points[clamped].cumulativePercent)}%`;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = activeIdxRef.current ?? chart.points.length - 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepTo(cur + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepTo(cur - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      stepTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      stepTo(chart.points.length - 1);
    } else if (e.key === "Escape") {
      restore();
    }
  };

  return (
    <div className="e-chartx" ref={box}>
      <div className="e-chartx-readout">
        <span className="v" ref={valRef}>
          {defaultVal}
        </span>
        <span className="d" ref={dateRef}>
          {t("today")}
        </span>
        <span className="g" ref={gainRef} />
      </div>
      <div className="e-sr" aria-live="polite" ref={liveRef} />

      <div style={{ position: "relative" }}>
        <svg
          className="e-chartx-svg"
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${t("pathToCompletion")}: ${nf.format(currentPercent)}%`}
        >
          <defs>
            {/* userSpaceOnUse: objectBoundingBox gradients collapse on flat
                segments and drift between the layered copies. One gradient in
                plot coordinates is shared by every stroked layer. */}
            <linearGradient
              id="e-x-stroke"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={plotW}
              y2="0"
            >
              <stop offset="0" stopColor="#b8791e" />
              <stop offset="0.55" stopColor="#ffd21a" />
              <stop offset="1" stopColor="#ffe9a3" />
            </linearGradient>
            <linearGradient
              id="e-x-area"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={chart.yTop}
              x2="0"
              y2={chart.yBottom}
            >
              <stop offset="0" stopColor="#ffd21a" stopOpacity="0.30" />
              <stop offset="0.45" stopColor="#ffb020" stopOpacity="0.10" />
              <stop offset="1" stopColor="#ff8f0a" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="e-x-halo">
              <stop offset="0" stopColor="#ffd21a" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffd21a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${PAD_LEFT},0)`}>
            {/* Exactly three solid hairlines: dashed grids read as thresholds. */}
            {[25, 50, 75].map((p) => (
              <line
                key={p}
                x1="0"
                y1={yOf(p)}
                x2={plotW}
                y2={yOf(p)}
                stroke="rgba(255,255,255,.05)"
                strokeWidth="1"
              />
            ))}

            {chart.buffer && (
              <rect
                x={chart.buffer.x}
                y={chart.yTop - 8}
                width={chart.buffer.width}
                height={chart.yBottom - chart.yTop + 8}
                fill="rgba(74,208,122,.06)"
              />
            )}

            {chart.deadlineX != null && (
              <line
                x1={chart.deadlineX}
                y1={chart.yTop - 8}
                x2={chart.deadlineX}
                y2={chart.yBottom}
                stroke="rgba(255,255,255,.22)"
                strokeWidth="1.5"
                strokeDasharray="2 5"
              />
            )}
            {chart.todayX != null && (
              <line
                x1={chart.todayX}
                y1={chart.yTop - 8}
                x2={chart.todayX}
                y2={chart.yBottom}
                stroke="var(--e-gold)"
                strokeWidth="1.5"
                strokeDasharray="2 5"
                opacity=".45"
              />
            )}

            {chart.actual.length > 1 && <path d={area} fill="url(#e-x-area)" />}

            {/* Layered-stroke glow: same geometry, widening and fading. */}
            {chart.actual.length > 1 && (
              <>
                <path d={line} fill="none" stroke="url(#e-x-stroke)" strokeWidth="12" strokeLinecap="round" opacity="0.06" />
                <path d={line} fill="none" stroke="url(#e-x-stroke)" strokeWidth="7" strokeLinecap="round" opacity="0.12" />
                <path d={line} fill="none" stroke="url(#e-x-stroke)" strokeWidth="3.5" strokeLinecap="round" opacity="0.22" />
              </>
            )}
            <path
              ref={linePathRef}
              d={line}
              fill="none"
              stroke="url(#e-x-stroke)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {forecast && (
              <path
                d={forecast}
                fill="none"
                stroke="url(#e-x-stroke)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 6"
                opacity="0.5"
              />
            )}

            <line
              ref={hairRef}
              x1={last.x}
              y1={chart.yTop - 6}
              x2={last.x}
              y2={chart.yBottom}
              stroke="rgba(255,255,255,.4)"
              strokeWidth="1"
              style={{ opacity: 0 }}
            />

            {/* One dot, always: at rest on the newest point, gliding while
                scrubbing. The halo breathes; every frame is a valid state. */}
            <g ref={dotRef} transform={`translate(${last.x},${last.y})`}>
              <circle className="e-chartx-halo" r="14" fill="url(#e-x-halo)" />
              <circle r="5" fill="var(--e-gold)" stroke="#0b1524" strokeWidth="2.5" />
            </g>

            <g className="e-chartx-axis">
              {xTicks.map((tick, i) => (
                <text key={i} x={tick.x} y={chart.yBottom + 20} textAnchor={tick.anchor}>
                  {tick.label}
                </text>
              ))}
            </g>

            {/* One transparent surface takes every pointer, so nobody has to
                hit a 2.75px line. pan-y keeps vertical page scroll native. */}
            <rect
              className="e-chartx-surface"
              x="0"
              y="0"
              width={plotW}
              height={height}
              fill="transparent"
              tabIndex={0}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                onPointer(e);
              }}
              onPointerMove={onPointer}
              onPointerUp={restore}
              onPointerCancel={restore}
              onPointerLeave={restore}
              onKeyDown={onKeyDown}
              onBlur={restore}
            />
          </g>
        </svg>

        {chart.todayX != null && (
          <span className="e-proj-lab today" style={{ left: pc(PAD_LEFT + chart.todayX, width) }}>
            {t("today")}
          </span>
        )}
        {chart.deadlineX != null && ddmm(plannedEnd) && (
          <span className="e-proj-lab end" style={{ left: pc(PAD_LEFT + chart.deadlineX, width) }}>
            {t("deadline", { date: ddmm(plannedEnd) as string })}
          </span>
        )}
      </div>
    </div>
  );
}
