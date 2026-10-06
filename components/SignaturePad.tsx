"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Signing with a finger, on a phone, on a roof.
//
// Pointer events rather than touch events, because the same handler then works
// for a finger, a stylus and a mouse. touch-action none on the canvas (CSS)
// stops the page scrolling while somebody signs; setPointerCapture keeps the
// stroke alive if the finger leaves the canvas mid-signature. The canvas is
// sized in DEVICE pixels, so the printed signature is not a blurry 2x mess.
//
// CAPTURE ONCE, ON PURPOSE. The pad used to upload on every lifted finger to
// one fixed storage path. A three-stroke signature became three uploads, and
// storage keeps the FIRST bytes at a reused path (docs/known-issues.md entry
// 2), so the protocol could print only the first stroke. Now the drawing stays
// on the device until the signer presses "Potrdi podpis", and exactly one PNG
// leaves it.
//
// The strokes are kept as points, not only as pixels. A phone fires resize
// whenever its address bar slides in or out, and resizing a canvas wipes it;
// redrawing from the points means a signature survives a scroll.

type Point = { x: number; y: number };

export function SignaturePad({
  name,
  saved,
  onConfirm,
  disabled,
}: {
  /** Whose signature this is, shown under the line. */
  name: string;
  /** True when the server already holds this party's signature. */
  saved: boolean;
  /** Called once, with the finished drawing. Resolves true when it was stored. */
  onConfirm: (png: Blob) => Promise<boolean>;
  disabled?: boolean;
}) {
  const t = useTranslations("final");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [stored, setStored] = useState(saved);
  const [redo, setRedo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setStored(saved), [saved]);
  const locked = stored && !redo;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a1628";
    for (const stroke of strokes.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (locked) return;
    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [locked, paint]);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    strokes.current.push([pointAt(event)]);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const previous = stroke[stroke.length - 1];
    const point = pointAt(event);
    stroke.push(point);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    // A tap without movement is not ink.
    const last = strokes.current[strokes.current.length - 1];
    if (last && last.length < 2) strokes.current.pop();
    setStrokeCount(strokes.current.length);
  };

  const clear = () => {
    strokes.current = [];
    setStrokeCount(0);
    paint();
  };

  const confirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.current.length === 0 || busy) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob && (await onConfirm(blob))) {
        strokes.current = [];
        setStrokeCount(0);
        setStored(true);
        setRedo(false);
      }
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <div className="sig">
        <p className="sig-saved">{t("signatureSaved")}</p>
        <div className="sig-foot">
          <span className="sig-name">{name}</span>
          <button
            type="button"
            className="sig-clear"
            disabled={disabled}
            onClick={() => {
              strokes.current = [];
              setStrokeCount(0);
              setRedo(true);
            }}
          >
            {t("signAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sig">
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="sig-foot">
        <span className="sig-name">{name}</span>
        <div className="sig-btns">
          <button
            type="button"
            className="sig-clear"
            onClick={clear}
            disabled={strokeCount === 0 || disabled || busy}
          >
            {t("clearSignature")}
          </button>
          <button
            type="button"
            className="rp-send sig-confirm"
            onClick={() => void confirm()}
            disabled={strokeCount === 0 || disabled || busy}
          >
            {busy ? t("savingSignature") : t("confirmSignature")}
          </button>
        </div>
      </div>
      <p className="sig-hint">{strokeCount === 0 ? t("signHint") : t("confirmHint")}</p>
    </div>
  );
}
