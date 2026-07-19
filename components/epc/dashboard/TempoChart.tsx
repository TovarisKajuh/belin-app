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

const PAD_TOP = 20;
const PAD_BOTTOM = 30; // the working-day axis band lives inside the height
const PAD_LEFT = 34; // room for the percent scale
const PAD_RIGHT = 12;

const BAR_RATIO = 0.72; // bar occupies 72% of its slot, 28% gap
const ZERO_STUB = 3; // a reported zero still gets a visible marker
const TREND_WINDOW = 5; // one working week, trailing
const MAX_BARS_PHONE = 14; // widest count that keeps every bar tappable at 375px

// Daily pace, replacing the cumulative curve.
//
// Rationale, from research logged in the plan: cumulative charts are misread
// 82 to 88 percent of the time when the question is rate of change (MeasuringU,
// two controlled studies), and the cumulative total is already the hero number
// above. This chart therefore encodes the derivative, not the level.
//
// Bars are percentage points gained per WORKING day. Non-working days never
// appear: a zero bar accuses the crew of idling and a weekend must never do
// that. A reported zero gets a visible stub, a missing report gets no mark.
// The dashed line is the pace the original plan demands (takt time), flat by
// design so "above the line" means one thing for the whole project.
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

  const allBars = useMemo(
    () =>
      buildTempoSeries({
        history,
        start: plannedStart ?? history[0]?.date ?? today,
        today,
      }),
    [history, plannedStart, today]
  );

  const required = requiredRate(plannedStart, plannedEnd);

  // On a phone only the most recent fortnight fits while every bar stays a
  // legal tap target, so older days are dropped rather than squeezed.
  const isPhone = width < 460;
  const bars = isPhone && allBars.length > MAX_BARS_PHONE ? allBars.slice(-MAX_BARS_PHONE) : allBars;

  const height = Math.max(200, Math.min(320, Math.round(width * 0.46)));
  const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
  const yTop = PAD_TOP;
  const yBottom = height - PAD_BOTTOM;

  const reported = bars.filter((b) => b.gain != null).map((b) => b.gain as number);
  const maxGain = reported.length > 0 ? Math.max(...reported) : 0;
  // Axis always starts at zero: bar length is the encoding and truncating it
  // would break the comparison. The top is padded so the tallest bar and the
  // required line both sit comfortably inside the plot.
  const yMax = Math.max(maxGain, required ?? 0) * 1.18 || 10;
  const yOf = (v: number) => yBottom - (Math.min(yMax, Math.max(0, v)) / yMax) * (yBottom - yTop);

  const slot = bars.length > 0 ? plotW / bars.length : plotW;
  const barW = Math.max(3, slot * BAR_RATIO);
  const radius = barW < 10 ? 1 : 3;
  const xOf = (i: number) => i * slot + (slot - barW) / 2;

  // Trend: trailing mean over reported days only, so a missing report never
  // reads as a slowdown. Starts once a full window exists.
  const trend = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    bars.forEach((b, i) => {
      if (b.gain == null) return;
      const reportedSoFar = bars.slice(0, i + 1).filter((x) => x.gain != null).length;
      if (reportedSoFar < TREND_WINDOW) return;
      const m = trailingMean(bars, i, TREND_WINDOW);
      if (m != null) pts.push({ x: xOf(i) + barW / 2, y: yOf(m) });
    });
    return pts;
  }, [bars, slot, barW, yMax, height]);

  const avg = reported.length > 0 ? reported.reduce((a, b) => a + b, 0) / reported.length : null;
  const recent = bars.length > 0 ? trailingMean(bars, bars.length - 1, TREND_WINDOW) : null;
  const earlier =
    bars.length > TREND_WINDOW ? trailingMean(bars, bars.length - 1 - TREND_WINDOW, TREND_WINDOW) : null;

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

  const describe = (b: TempoBar): string => {
    if (b.gain == null) return t("noReportDay");
    if (b.gain <= 0.005) return t("zeroDay");
    return required != null && b.gain >= required ? t("aheadOfPace") : t("behindPace");
  };

  const setReadout = (i: number | null) => {
    if (i == null) {
      if (valRef.current) valRef.current.textContent = defaultVal;
      if (subRef.current) subRef.current.textContent = defaultSub;
      return;
    }
    const b = bars[i];
    if (valRef.current)
      valRef.current.textContent = b.gain == null ? "—" : `${nf.format(b.gain)} %${t("perDay")}`;
    if (subRef.current) subRef.current.textContent = `${ddmm(b.date)} · ${describe(b)}`;
    if (liveRef.current)
      liveRef.current.textContent = `${ddmm(b.date)} ${b.gain == null ? t("noReportDay") : nf.format(b.gain) + "%"}`;
  };

  useEffect(() => {
    setReadout(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, defaultVal, defaultSub]);

  const onPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || slot <= 0) return;
    const x = e.clientX - svg.getBoundingClientRect().left - PAD_LEFT;
    const i = Math.floor(x / slot);
    setActive(Math.max(0, Math.min(bars.length - 1, i)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = active ?? bars.length - 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive(Math.min(bars.length - 1, cur + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive(Math.max(0, cur - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(bars.length - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  if (bars.length === 0) {
    return <div className="e-proj-empty">{t("gathering")}</div>;
  }

  // Sparse day labels: first, last, and a couple between, never every bar.
  const tickEvery = Math.max(1, Math.ceil(bars.length / (isPhone ? 3 : 6)));

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
          <linearGradient id="e-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd21a" />
            <stop offset="1" stopColor="#e0a615" />
          </linearGradient>
        </defs>

        <g transform={`translate(${PAD_LEFT},0)`}>
          {/* Recessive hairlines behind the bars. */}
          {[0.5, 1].map((f) => (
            <line
              key={f}
              x1="0"
              y1={yOf(yMax * f)}
              x2={plotW}
              y2={yOf(yMax * f)}
              stroke="rgba(255,255,255,.05)"
              strokeWidth="1"
            />
          ))}
          <line x1="0" y1={yBottom} x2={plotW} y2={yBottom} stroke="rgba(255,255,255,.14)" strokeWidth="1" />

          {bars.map((b, i) => {
            const x = xOf(i);
            if (b.gain == null) {
              // No report: no bar at all, only a faint ghost so the slot is
              // visibly accounted for without implying zero production.
              return (
                <line
                  key={b.date}
                  x1={x + barW / 2}
                  y1={yBottom - 6}
                  x2={x + barW / 2}
                  y2={yBottom}
                  stroke="rgba(255,255,255,.16)"
                  strokeWidth="1"
                  strokeDasharray="1 3"
                />
              );
            }
            const isZero = b.gain <= 0.005;
            const h = isZero ? ZERO_STUB : Math.max(2, yBottom - yOf(b.gain));
            const isActive = active === i;
            return (
              <rect
                key={b.date}
                x={x}
                y={yBottom - h}
                width={barW}
                height={h}
                rx={isZero ? 0 : Math.min(radius, barW / 2, h / 2)}
                fill={isZero ? "var(--e-gold)" : "url(#e-bar-grad)"}
                opacity={isZero ? 0.45 : isActive ? 1 : 0.92}
              />
            );
          })}

          {/* Takt line: thinner than the bars and dashed, so it reads as a
              threshold rather than a seventh series, and always labelled. */}
          {required != null && (
            <>
              <line
                x1="0"
                y1={yOf(required)}
                x2={plotW}
                y2={yOf(required)}
                stroke="#7a8899"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text className="e-tempo-thresh" x="2" y={yOf(required) - 6}>
                {`${t("requiredPace")} ${nf.format(required)}`}
              </text>
            </>
          )}

          {trend.length > 1 && (
            <path
              d={monotonePath(trend)}
              fill="none"
              stroke="rgba(255,255,255,.62)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {active != null && (
            <line
              x1={xOf(active) + barW / 2}
              y1={yTop - 6}
              x2={xOf(active) + barW / 2}
              y2={yBottom}
              stroke="rgba(255,255,255,.34)"
              strokeWidth="1"
            />
          )}

          <g className="e-chartx-axis">
            {bars.map((b, i) =>
              i % tickEvery === 0 || i === bars.length - 1 ? (
                <text key={b.date} x={xOf(i) + barW / 2} y={yBottom + 18} textAnchor="middle">
                  {ddmm(b.date)}
                </text>
              ) : null
            )}
          </g>

          {/* One surface takes every pointer and resolves it to a day by
              position. Slots are uniform, so this is a divide, and it means a
              finger only has to be near a day rather than on a bar that may be
              3px tall. Dragging across the chart scrubs day to day. */}
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

        <g className="e-chartx-axis">
          {[0, yMax / 2, yMax].map((v, i) => (
            <text key={i} x={PAD_LEFT - 8} y={yOf(v) + 3.5} textAnchor="end">
              {Math.round(v)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
