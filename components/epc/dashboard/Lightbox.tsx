"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export interface LightboxItem {
  url: string;
  label: string;
}

// Shared full-screen image viewer. Both the site-photo gallery and the material
// document row open into this, so the keyboard handling and the body-scroll
// lock live in one place.
export function Lightbox({
  items,
  open,
  onClose,
  onStep,
}: {
  items: LightboxItem[];
  open: number | null;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const t = useTranslations("dashboard");

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, onStep]);

  if (open === null) return null;
  const current = items[open];
  if (!current) return null;

  return (
    <div className="e-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={current.label}>
      <img src={current.url} alt={current.label} onClick={(e) => e.stopPropagation()} />
      <button className="e-lb-btn e-lb-close" type="button" aria-label={t("closePhoto")} onClick={onClose}>
        ×
      </button>
      {items.length > 1 && (
        <>
          <button
            className="e-lb-btn e-lb-prev"
            type="button"
            aria-label={t("previousPhoto")}
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
          >
            ‹
          </button>
          <button
            className="e-lb-btn e-lb-next"
            type="button"
            aria-label={t("nextPhoto")}
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
