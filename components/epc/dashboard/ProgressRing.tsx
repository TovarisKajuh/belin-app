"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fmtPct } from "@/lib/format";
import type { CSSProperties } from "react";

const CIRCUMFERENCE = 596.9; // 2 * pi * r, r = 95

// The glowing gold progress ring. The arc draws to the real percentage (via the
// --e-arc-offset CSS variable the keyframe reads) and the centre number counts up.
export function ProgressRing({
  percent,
  reportCount,
  photoCount,
}: {
  percent: number;
  reportCount: number;
  photoCount: number;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const target = Math.round(percent);
    const dur = 1300;
    let t0 = 0;
    let raf = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const to = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 320);
    return () => {
      window.clearTimeout(to);
      cancelAnimationFrame(raf);
    };
  }, [percent]);

  const clamped = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="e-ringwrap e-fadein e-d2">
      <div className="e-ringbox">
        <div className="e-ringglow" />
        <svg className="e-ringsvg" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="e-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffe488" />
              <stop offset="1" stopColor="#ffd21a" />
            </linearGradient>
            <filter id="e-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="120" cy="120" r="95" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
          <circle
            className="e-arc"
            cx="120"
            cy="120"
            r="95"
            fill="none"
            stroke="url(#e-ring-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            filter="url(#e-ring-glow)"
            style={{ "--e-arc-offset": String(offset) } as CSSProperties}
          />
        </svg>
        <div className="e-ringc">
          <div className="pct">{fmtPct(display, locale, 0)}</div>
          <div className="lab">{t("totalProgress")}</div>
          <div className="pf">{t("computedFrom", { reports: reportCount, photos: photoCount })}</div>
        </div>
      </div>
    </div>
  );
}
