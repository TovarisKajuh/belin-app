"use client";
import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DashboardPhoto } from "@/lib/data/epc-dashboard";
import { fmtDate } from "@/lib/format";
import { Lightbox } from "./Lightbox";

// Every site photo, newest day first, opening into the shared lightbox. Photos
// are the EPC's evidence, so they are shown full size on demand rather than
// only as thumbnails buried in the log.
export function PhotoGallery({ photos }: { photos: DashboardPhoto[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => {
      setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length));
    },
    [photos.length]
  );

  const items = photos.map((p) => ({ url: p.url, label: fmtDate(p.date, locale, { style: "dayMonth" }) }));

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("sitePhotos")}</div>

      {photos.length === 0 ? (
        <div className="e-proj-empty">{t("noPhotos")}</div>
      ) : (
        <div className="e-gal">
          {photos.map((photo, i) => (
            <button className="e-gi" key={`${photo.url}-${i}`} type="button" onClick={() => setOpen(i)}>
              <img src={photo.url} alt="" />
              <span className="l">{fmtDate(photo.date, locale, { style: "dayMonth" })}</span>
            </button>
          ))}
        </div>
      )}

      <Lightbox items={items} open={open} onClose={close} onStep={step} />
    </section>
  );
}
