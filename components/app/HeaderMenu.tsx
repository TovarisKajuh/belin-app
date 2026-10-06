"use client";

import { useEffect, useRef } from "react";

// A small popover for the command bar, built on <details> so it opens and
// closes with no React state. The one thing <details> does not do is close
// when you tap elsewhere, and a menu left hanging open over a phone screen is
// its own defect, so a tap outside it or Escape closes it.
export function HeaderMenu({
  className,
  summaryClassName,
  label,
  summary,
  children,
}: {
  className: string;
  summaryClassName: string;
  /** Accessible name of the toggle; the summary itself may be an icon. */
  label: string;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName} aria-label={label}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
