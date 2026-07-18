"use client";
import { useEffect, useRef, useState } from "react";

// Belin full-screen launch animation. A 16x24 cell grid fills with gold column
// by column to form the Belin mark, then the wordmark fades up, on a warm launch
// background. Self-contained, no dependencies. Shown on app open via SplashGate.
//
// prefers-reduced-motion: skips the long build and shows the finished mark briefly
// before fading, so the launch stays accessible without a long moving animation.
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

  // timeline (seconds)
  const yellowStart = 0.4,
    colStep = 0.06,
    rowOffset = 0.008,
    fade = 0.18;
  const textStart = 1.9,
    textDur = 2.6;
  const END = textStart + textDur; // animation finishes
  const HOLD = 0.6; // pause on the finished logo
  const FADE_MS = 600; // overlay fade-out

  useEffect(() => {
    if (once && typeof window !== "undefined" && sessionStorage.getItem("belinSplash") === "1") {
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
        if (once && typeof window !== "undefined") sessionStorage.setItem("belinSplash", "1");
        window.setTimeout(() => onFinish?.(), FADE_MS);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // grid geometry (16 x 24)
  const blackCount = [18, 16, 17, 14, 15, 12, 13, 15, 11, 9, 12, 8, 10, 6, 8, 5];
  const cols = 16,
    rows = 24,
    step = 9;
  const dark: [number, number, number] = [42, 50, 66];
  const gold: [number, number, number] = [255, 215, 0];
  const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);

  type Cell = { x: number; y: number; c: number; fromBottom: number };
  const black: Cell[] = [];
  const yellow: Cell[] = [];
  for (let c = 0; c < cols; c++) {
    const bc = blackCount[c];
    for (let r = 0; r < rows; r++) {
      const obj: Cell = { x: c * step, y: r * step, c, fromBottom: rows - 1 - r };
      (r >= bc ? yellow : black).push(obj);
    }
  }

  const yellowRects = yellow.map((cell, i) => {
    const reveal = yellowStart + cell.c * colStep + cell.fromBottom * rowOffset;
    const e = 1 - Math.pow(1 - clamp((t - reveal) / fade), 2);
    const fill = "#" + [0, 1, 2].map((k) => hex(lerp(dark[k], gold[k], e))).join("");
    return <rect key={"y" + i} x={cell.x} y={cell.y} width="8" height="8" fill={fill} />;
  });

  const tp = clamp((t - textStart) / textDur);
  const te = 1 - Math.pow(1 - tp, 3);
  const textStyle = { opacity: te, transform: `translateY(${(1 - te) * 16}px)` };

  return (
    <div
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
        viewBox="64 34 172 322"
        style={{ width: "min(92vw, 46vh)", height: "auto", overflow: "visible", display: "block" }}
      >
        <g transform="translate(78, 44)">
          {black.map((cell, i) => (
            <rect key={"b" + i} x={cell.x} y={cell.y} width="8" height="8" fill="#2a3242" />
          ))}
          {yellowRects}
        </g>
        <g style={textStyle}>
          <text
            x="150"
            y="322"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
            fontSize="44"
            fontWeight="600"
            fill="#f2efe9"
            textAnchor="middle"
            letterSpacing="1"
          >
            BELIN
          </text>
          <text
            x="150"
            y="344"
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
