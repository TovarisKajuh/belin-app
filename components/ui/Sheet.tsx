"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A bottom sheet that is always above the page. Rendered into <body>, outside
// every stacking context: inside the crew screen's .b-screen (z-index 1) it
// sat UNDER the tab bar, and Prekliči was covered by the Dnevnik tab (crew-walk
// H4, 2026-10-05). The wrapper carries .belin-dark so the tokens still apply;
// .belin-dark.ui-portal (globals.css, 5.10 block) stops it painting the page
// background or taking 100vh.
//
// Minimal form for the 06.10 meeting (Task 5.10, morning cut): no close X,
// because each sheet already ends in its own Prekliči. Escape and a tap on the
// backdrop close it too, unless a send is in flight.
export function Sheet({
  label,
  onClose,
  busy = false,
  children,
}: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [busy, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="belin-dark ui-portal">
      <div
        className="ic-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <div className="ic-inner">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
