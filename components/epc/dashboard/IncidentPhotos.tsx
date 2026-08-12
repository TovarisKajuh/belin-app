"use client";
import { useCallback, useState } from "react";
import { Lightbox } from "./Lightbox";

// The thumbnail strip on an incident row, opening the shared lightbox. Split
// out of IncidentsPanel because the panel itself is a server component and the
// viewer needs state; the same split MaterialDocs already makes.
export function IncidentPhotos({ urls, label }: { urls: string[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = urls.map((url) => ({ url, label }));

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null ? null : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  return (
    <>
      <div className="ip-thumbs">
        {urls.map((url, i) => (
          <button key={url} type="button" className="ip-thumb" onClick={() => setOpen(i)} aria-label={label}>
            <img src={url} alt="" />
          </button>
        ))}
      </div>
      <Lightbox items={items} open={open} onClose={close} onStep={step} />
    </>
  );
}
