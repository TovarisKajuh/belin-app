"use client";

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
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="b-stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="b-step-btn" onClick={() => onChange(clamp(value - step))} aria-label="minus">
        &minus;
      </button>
      <span className="b-step-val" aria-live="polite">{value}</span>
      <button type="button" className="b-step-btn" onClick={() => onChange(clamp(value + step))} aria-label="plus">
        +
      </button>
    </div>
  );
}
