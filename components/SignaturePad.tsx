"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Signing with a finger, on a phone, on a roof.
//
// Pointer events rather than touch events, because the same handler then works
// for a finger, a stylus and a mouse, and the EPC may well be signing on a
// laptop while the subcontractor signs on a phone.
//
// touchAction none on the canvas is what stops the browser scrolling the page
// while somebody signs, which is the difference between a signature and a
// smear. setPointerCapture keeps the stroke alive if the finger leaves the
// canvas mid-signature.
//
// The canvas is sized in DEVICE pixels and scaled back down, so a signature
// captured on a phone is not a blurry 2x mess when printed on the protocol.

export function SignaturePad({
  name,
  onCapture,
  disabled,
}: {
  /** Whose signature this is, shown under the line. */
  name: string;
  /** Called with the PNG whenever the drawing changes, or null when cleared. */
  onCapture: (png: Blob | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("final");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a1628";
  }, []);

  useEffect(() => {
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [setup]);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointAt(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointAt(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current) return;
    canvasRef.current?.toBlob((blob) => onCapture(blob), "image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setHasInk(false);
    onCapture(null);
  };

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
        <button type="button" className="sig-clear" onClick={clear} disabled={!hasInk || disabled}>
          {t("clearSignature")}
        </button>
      </div>
      {!hasInk ? <p className="sig-hint">{t("signHint")}</p> : null}
    </div>
  );
}
