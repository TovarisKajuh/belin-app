"use client";
import { useEffect, useRef, useState } from "react";

// Belin launch animation and logo mark: a 3 wide by 4 tall cell grid where the
// columns rise like a bar chart, 1 cell then 2 then 3, filling gold from the
// bottom. Same mark as the command bar, the landing page and the home screen
// icon, so the launch, the header and the app icon are one shape.
//
// prefers-reduced-motion: skips the build and shows the finished mark briefly
// before fading, so the launch stays accessible without a long moving animation.

// Gold cells per column, left to right. This IS the mark.
const GOLD_PER_COL = [1, 2, 3];
const COLS = GOLD_PER_COL.length;
const ROWS = 4;

// cell geometry
const CELL = 22;
const STEP = 28; // cell + gap
const MARK_W = COLS * STEP - (STEP - CELL);
const MARK_H = ROWS * STEP - (STEP - CELL);
const VIEW_W = 240;
const MARK_X = (VIEW_W - MARK_W) / 2;
const MARK_Y = 22;

const SEEN_KEY = "belinSplash";
function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the animation may play again next time, which is harmless.
  }
}

export function BelinSplash({
  background = "#0b1524",
  onFinish,
  once = false,
}: {
  background?: string;
  onFinish?: () => void;
  once?: boolean;
}) {
  const [t, setT] = useState(0);
  const [fading, setFading] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  // timeline (seconds). Far fewer cells than the old 16x24 grid, so each step
  // is much slower: with 3 columns a fast stagger would read as a single flash.
  const yellowStart = 0.35,
    colStep = 0.3,
    rowOffset = 0.1,
    fade = 0.26;
  const textStart = 1.55,
    textDur = 1.5;
  const END = textStart + textDur;
  const HOLD = 0.6; // pause on the finished logo
  const FADE_MS = 600; // overlay fade-out

  useEffect(() => {
    if (once && typeof window !== "undefined" && seenThisSession()) {
      onFinish?.();
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: jump to the finished mark, hold briefly, then fade.
    startRef.current = reduce ? performance.now() - END * 1000 : performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      setT(elapsed);
      if (elapsed >= END + HOLD) {
        setFading(true);
        if (once && typeof window !== "undefined") markSeen();
        window.setTimeout(() => onFinish?.(), FADE_MS);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
  const dark: [number, number, number] = [42, 50, 66];
  // #ffd21a, the --e-gold design token, so the splash, the command bar mark,
  // the landing page and the home screen icon end on the identical gold.
  const gold: [number, number, number] = [255, 210, 26];

  const cells = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const fromBottom = ROWS - 1 - r;
      const isGold = fromBottom < GOLD_PER_COL[c];
      const x = c * STEP;
      const y = r * STEP;

      if (!isGold) {
        cells.push(
          <rect key={`d${c}-${r}`} x={x} y={y} width={CELL} height={CELL} rx="2.5" fill="#2a3242" />
        );
        continue;
      }

      // Columns rise left to right; within a column, cells light bottom up.
      const reveal = yellowStart + c * colStep + fromBottom * rowOffset;
      const e = 1 - Math.pow(1 - clamp((t - reveal) / fade), 2);
      const fill = "#" + [0, 1, 2].map((k) => hex(lerp(dark[k], gold[k], e))).join("");
      cells.push(
        <rect
          key={`g${c}-${r}`}
          x={x}
          y={y}
          width={CELL}
          height={CELL}
          rx="2.5"
          fill={fill}
          style={{ filter: e > 0.05 ? `drop-shadow(0 0 ${6 * e}px rgba(255,215,0,${0.5 * e}))` : undefined }}
        />
      );
    }
  }

  const tp = clamp((t - textStart) / textDur);
  const te = 1 - Math.pow(1 - tp, 3);
  const textStyle = { opacity: te, transform: `translateY(${(1 - te) * 16}px)` };

  return (
    <div
      // Targetable so tests and the screenshot pipeline can wait for the
      // animation to finish rather than sleeping and hoping.
      data-splash=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(72vw, 54vh)",
          aspectRatio: "1",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,215,0,0.16) 0%, transparent 62%)",
          filter: "blur(34px)",
          pointerEvents: "none",
        }}
      />
      <svg
        viewBox={`0 0 ${VIEW_W} 210`}
        style={{ width: "min(66vw, 38vh)", height: "auto", overflow: "visible", display: "block" }}
      >
        <g transform={`translate(${MARK_X}, ${MARK_Y})`}>{cells}</g>
        <g style={textStyle}>
          <text
            x={VIEW_W / 2}
            y="172"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
            fontSize="40"
            fontWeight="700"
            fill="#f2efe9"
            textAnchor="middle"
            letterSpacing="2"
          >
            BELIN
          </text>
          <text
            x={VIEW_W / 2}
            y="194"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
            fontSize="10.5"
            fontWeight="500"
            fill="#8f8a7e"
            textAnchor="middle"
            letterSpacing="5"
          >
            SOFTWARE
          </text>
        </g>
      </svg>
    </div>
  );
}
