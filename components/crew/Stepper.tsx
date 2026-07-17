"use client";
import { useEffect, useRef } from "react";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
}) {
  // Rapid taps can land before React re-renders, so deriving the next value
  // from the rendered prop would swallow increments. The ref accumulates
  // within a frame and re-syncs whenever the parent-confirmed value changes.
  const pending = useRef(value);
  useEffect(() => {
    pending.current = value;
  }, [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  function bump(delta: number) {
    pending.current = clamp(pending.current + delta);
    onChange(pending.current);
  }

  return (
    <div className="b-stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="b-step-btn" onClick={() => bump(-step)} aria-label="minus">
        &minus;
      </button>
      <span className="b-step-val" aria-live="polite">{value}</span>
      <button type="button" className="b-step-btn" onClick={() => bump(step)} aria-label="plus">
        +
      </button>
    </div>
  );
}
