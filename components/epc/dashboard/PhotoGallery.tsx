"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DashboardPhoto } from "@/lib/data/epc-dashboard";
import { ddmm } from "@/lib/dashboard-shared";

// Every site photo, newest day first, opening into a lightbox. Photos are the
// EPC's evidence, so they are shown full size on demand rather than only as
// thumbnails buried in the log.
export function PhotoGallery({ photos }: { photos: DashboardPhoto[] }) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => {
      setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length));
    },
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    // Hold the page still behind the lightbox.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close, step]);

  const current = open !== null ? photos[open] : null;

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("sitePhotos")}</div>

      {photos.length === 0 ? (
        <div className="e-proj-empty">{t("noPhotos")}</div>
      ) : (
        <div className="e-gal">
          {photos.map((photo, i) => (
            <button
              className="e-gi"
              key={`${photo.url}-${i}`}
              type="button"
              onClick={() => setOpen(i)}
            >
              <img src={photo.url} alt="" />
              <span className="l">{ddmm(photo.date)}</span>
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="e-lightbox" onClick={close} role="dialog" aria-modal="true">
          <img src={current.url} alt="" onClick={(e) => e.stopPropagation()} />
          <button
            className="e-lb-btn e-lb-close"
            type="button"
            aria-label={t("closePhoto")}
            onClick={close}
          >
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="e-lb-btn e-lb-prev"
                type="button"
                aria-label={t("previousPhoto")}
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
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
                  step(1);
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
