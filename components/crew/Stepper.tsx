"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseWholeNumber } from "@/lib/reports-shared";

// Plus and minus for small corrections; the number itself is a button that
// turns into a numeric field, because 63 modules is one tap and two digits,
// not seven taps of ten and three of minus one.
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  ariaLabel,
  typeLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  typeLabel?: string;
}) {
  const t = useTranslations("crew");
  // Rapid taps can land before React re-renders, so the next value comes from
  // a ref that accumulates within a frame and re-syncs from the parent.
  const pending = useRef(value);
  useEffect(() => {
    pending.current = value;
  }, [value]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const bump = (delta: number) => {
    pending.current = clamp(pending.current + delta);
    onChange(pending.current);
  };
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setEditing(false);
      return;
    }
    const parsed = parseWholeNumber(draft);
    if (parsed !== null) {
      pending.current = clamp(parsed);
      onChange(pending.current);
    }
    setEditing(false);
  };

  return (
    <div className="b-stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="b-step-btn" onClick={() => bump(-step)} aria-label={t("decrease")}>
        &minus;
      </button>
      {editing ? (
        <input
          className="b-step-val"
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          aria-label={typeLabel ?? ariaLabel}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              cancelled.current = true;
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="b-step-val"
          aria-label={typeLabel ?? ariaLabel}
          onClick={() => {
            // Escape may have left the flag set when no blur followed it.
            cancelled.current = false;
            setDraft(String(value));
            setEditing(true);
          }}
        >
          <span aria-live="polite">{value}</span>
        </button>
      )}
      <button type="button" className="b-step-btn" onClick={() => bump(step)} aria-label={t("increase")}>
        +
      </button>
    </div>
  );
}
