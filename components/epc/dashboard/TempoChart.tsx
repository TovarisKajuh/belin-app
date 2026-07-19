"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyProgressPoint } from "@/lib/projection-shared";
import {
  buildTempoSeries,
  requiredRate,
  trailingMean,
  monotonePath,
  ddmm,
  type TempoBar,
} from "@/lib/dashboard-shared";

const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAD_TOP = 26;
const PAD_BOTTOM = 26;
const PAD_X = 10;
const TREND_WINDOW = 5;

// Daily pace, drawn as the glowing curve the founder approved rather than as
// bars. The earlier bar version was rejected on sight: swapping the data from
// cumulative to tempo was right, but it also threw away the visual language and
// replaced it with blocky rectangles and axis chrome. The lesson is separate
// the two: change what is plotted, keep how it looks.
//
// Curve is monotone cubic, which on a rising-and-falling series flattens its
// tangents at each local extremum, so the wave passes through every reported
// day without ever bulging past one. The horizontal line is the pace the
// original plan demands (takt time). Non-working days never appear on the axis.
export function TempoChart({
  history,
  today,
  plannedStart,
  plannedEnd,
}: {
  history: DailyProgressPoint[];
  today: string;
  plannedStart: string | null;
  plannedEnd: string | null;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [active, setActive] = useState<number | null>(null);

  useMeasureEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const nf = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale]
  );

  const allDays = useMemo(
    () => buildTempoSeries({ history, start: plannedStart ?? history[0]?.date ?? today, today }),
    [history, plannedStart, today]
  );
  // The curve connects days that were actually reported. A day with no report
  // is not a zero and must not pull the line down to the floor.
  const days = useMemo(() => allDays.filter((d) => d.gain != null), [allDays]);

  const required = requiredRate(plannedStart, plannedEnd);

  const height = Math.max(210, Math.min(300, Math.round(width * 0.42)));
  const plotW = Math.max(10, width - PAD_X * 2);
  const yTop = PAD_TOP;
  const yBottom = height - PAD_BOTTOM;

  const gains = days.map((d) => d.gain as number);
  const peak = Math.max(...gains, required ?? 0, 1);
  const yMax = peak * 1.25;
  const yOf = (v: number) => yBottom - (Math.min(yMax, Math.max(0, v)) / yMax) * (yBottom - yTop);
  const slot = days.length > 1 ? plotW / (days.length - 1) : plotW;
  const xOf = (i: number) => (days.length > 1 ? i * slot : plotW / 2);

  const points = days.map((d, i) => ({ x: xOf(i), y: yOf(d.gain as number) }));
  const line = monotonePath(points);
  const area =
    points.length > 1
      ? `${line} L ${points[points.length - 1].x},${yBottom} L ${points[0].x},${yBottom} Z`
      : "";

  const avg = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
  const recent = allDays.length > 0 ? trailingMean(allDays, allDays.length - 1, TREND_WINDOW) : null;
  const earlier =
    allDays.length > TREND_WINDOW
      ? trailingMean(allDays, allDays.length - 1 - TREND_WINDOW, TREND_WINDOW)
      : null;
  const trendWord =
    recent != null && earlier != null
      ? recent > earlier * 1.05
        ? t("paceRising")
        : recent < earlier * 0.95
          ? t("paceFalling")
          : t("paceSteady")
      : null;

  const defaultVal = avg != null ? `${nf.format(avg)} %${t("perDay")}` : "—";
  const defaultSub = [
    required != null ? `${t("requiredPace")} ${nf.format(required)}` : null,
    trendWord,
  ]
    .filter(Boolean)
    .join(" · ");

  const describe = (d: TempoBar): string => {
    const g = d.gain as number;
    if (g <= 0.005) return t("zeroDay");
    return required != null && g >= required ? t("aheadOfPace") : t("behindPace");
  };

  useEffect(() => {
    if (active == null) {
      if (valRef.current) valRef.current.textContent = defaultVal;
      if (subRef.current) subRef.current.textContent = defaultSub;
      return;
    }
    const d = days[active];
    if (!d) return;
    if (valRef.current) valRef.current.textContent = `${nf.format(d.gain as number)} %${t("perDay")}`;
    if (subRef.current) subRef.current.textContent = `${ddmm(d.date)} · ${describe(d)}`;
    if (liveRef.current) liveRef.current.textContent = `${ddmm(d.date)} ${nf.format(d.gain as number)}%`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, defaultVal, defaultSub]);

  const onPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || days.length === 0) return;
    const x = e.clientX - svg.getBoundingClientRect().left - PAD_X;
    const i = slot > 0 ? Math.round(x / slot) : 0;
    setActive(Math.max(0, Math.min(days.length - 1, i)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = active ?? days.length - 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive(Math.min(days.length - 1, cur + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive(Math.max(0, cur - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(days.length - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  if (days.length === 0) {
    return <div className="e-proj-empty">{t("gathering")}</div>;
  }

  const marker = active != null ? points[active] : points[points.length - 1];
  const firstLabel = ddmm(days[0].date);
  const lastLabel = ddmm(days[days.length - 1].date);

  return (
    <div className="e-tempo" ref={box} onPointerLeave={() => setActive(null)}>
      <div className="e-chartx-readout">
        <span className="v" ref={valRef}>
          {defaultVal}
        </span>
        <span className="d" ref={subRef}>
          {defaultSub}
        </span>
      </div>
      <div className="e-sr" aria-live="polite" ref={liveRef} />

      <svg
        className="e-chartx-svg"
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t("dailyTempo")}: ${defaultVal}`}
      >
        <defs>
          <linearGradient id="e-tempo-stroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={plotW} y2="0">
            <stop offset="0" stopColor="#b8791e" />
            <stop offset="0.5" stopColor="#ffd21a" />
            <stop offset="1" stopColor="#ffe9a3" />
          </linearGradient>
          <linearGradient id="e-tempo-area" gradientUnits="userSpaceOnUse" x1="0" y1={yTop} x2="0" y2={yBottom}>
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.32" />
            <stop offset="0.5" stopColor="#ffb020" stopOpacity="0.10" />
            <stop offset="1" stopColor="#ff8f0a" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="e-tempo-halo">
            <stop offset="0" stopColor="#ffd21a" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffd21a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${PAD_X},0)`}>
          {points.length > 1 && <path d={area} fill="url(#e-tempo-area)" />}

          {/* Takt line: the pace the plan demands. Quiet, so the curve stays
              the brightest thing, but always numerically labelled. */}
          {required != null && (
            <>
              <line
                x1="0"
                y1={yOf(required)}
                x2={plotW}
                y2={yOf(required)}
                stroke="rgba(255,255,255,.26)"
                strokeWidth="1"
                strokeDasharray="5 4"
              />
              <text className="e-tempo-thresh" x="0" y={yOf(required) + 15}>
                {`${t("requiredPace")} ${nf.format(required)}`}
              </text>
            </>
          )}

          {/* Layered-stroke glow, no filter elements: cheap on weak phones. */}
          {points.length > 1 && (
            <>
              <path d={line} fill="none" stroke="url(#e-tempo-stroke)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity="0.07" />
              <path d={line} fill="none" stroke="url(#e-tempo-stroke)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.14" />
              <path d={line} fill="none" stroke="url(#e-tempo-stroke)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.24" />
              <path d={line} fill="none" stroke="url(#e-tempo-stroke)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {active != null && (
            <line
              x1={marker.x}
              y1={yTop - 10}
              x2={marker.x}
              y2={yBottom}
              stroke="rgba(255,255,255,.32)"
              strokeWidth="1"
            />
          )}

          <g transform={`translate(${marker.x},${marker.y})`}>
            <circle className="e-chartx-halo" r="13" fill="url(#e-tempo-halo)" />
            <circle r="4.5" fill="var(--e-gold)" stroke="#0b1524" strokeWidth="2.5" />
          </g>

          <g className="e-chartx-axis">
            <text x="0" y={yBottom + 18} textAnchor="start">
              {firstLabel}
            </text>
            <text x={plotW} y={yBottom + 18} textAnchor="end">
              {lastLabel}
            </text>
          </g>

          <rect
            className="e-tempo-hit"
            x="0"
            y="0"
            width={plotW}
            height={yBottom}
            fill="transparent"
            tabIndex={0}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
          />
        </g>
      </svg>
    </div>
  );
}
