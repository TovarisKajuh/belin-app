"use client";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { MaterialPanelDoc } from "@/lib/data/epc-dashboard";
import { Lightbox } from "./Lightbox";

// The material check's documents (material photos and delivery notes) as a
// thumbnail row that opens the shared lightbox.
export function MaterialDocs({ docs }: { docs: MaterialPanelDoc[] }) {
  const t = useTranslations("dashboard.material");
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + docs.length) % docs.length)),
    [docs.length]
  );

  if (docs.length === 0) return <div className="mp-nodocs">{t("noDocs")}</div>;

  const label = (d: MaterialPanelDoc) => (d.kind === "material_photo" ? t("docPhoto") : t("docNote"));
  const items = docs.map((d) => ({ url: d.url, label: label(d) }));

  return (
    <>
      <div className="mp-docs">
        {docs.map((d, i) => (
          <div className="mp-doc" key={`${d.url}-${i}`}>
            <button className="mp-doc-img" type="button" onClick={() => setOpen(i)} aria-label={label(d)}>
              <img src={d.url} alt="" />
            </button>
            <span className="mp-doc-kind">{label(d)}</span>
          </div>
        ))}
      </div>
      <Lightbox items={items} open={open} onClose={close} onStep={step} />
    </>
  );
}
