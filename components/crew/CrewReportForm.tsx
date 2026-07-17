"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Stepper } from "./Stepper";
import { PhotoCapture } from "./PhotoCapture";
import { createBrowserClient } from "@/lib/supabase/client";
import { requestPhotoTargets, submitReport } from "@/app/[locale]/p/[token]/actions";
import type { ScopeItemStatus } from "@/lib/data/reports";

export function CrewReportForm({ token, scope }: { token: string; scope: ScopeItemStatus[] }) {
  const t = useTranslations("crew");
  const router = useRouter();
  const [headcount, setHeadcount] = useState(1);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  // One idempotency id per draft, not per attempt (audit finding H4): a retry
  // after a lost response reuses it, so the server upsert cannot duplicate the
  // entry. Reset only after a confirmed success.
  const draftId = useRef(crypto.randomUUID());

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      let photoPaths: string[] = [];
      if (blobs.length > 0) {
        const targets = await requestPhotoTargets(token, draftId.current, blobs.length);
        const supabase = createBrowserClient();
        const results = await Promise.all(
          targets.map((tg, i) =>
            supabase.storage.from("photos").uploadToSignedUrl(tg.path, tg.token, blobs[i], {
              contentType: "image/jpeg",
            })
          )
        );
        photoPaths = targets.filter((_, i) => !results[i].error).map((tg) => tg.path);
      }
      await submitReport(token, {
        clientGeneratedId: draftId.current,
        note,
        headcount,
        quantities: scope.map((s) => ({ scopeItemId: s.id, qty: qty[s.id] ?? 0 })),
        photoPaths,
      });
      setDone(true);
      setBlobs([]);
      setNote("");
      setQty({});
      setHeadcount(1);
      draftId.current = crypto.randomUUID();
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    } catch {
      // Keep the form populated so the crew can retry the same draft.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="b-card">
        <span className="b-label">{t("photos")}</span>
        <PhotoCapture blobs={blobs} onChange={setBlobs} addLabel={t("addPhoto")} />
      </div>

      <div className="b-card">
        <span className="b-label">{t("headcount")}</span>
        <Stepper value={headcount} onChange={setHeadcount} min={0} max={99} ariaLabel={t("headcount")} />
      </div>

      <div className="b-card">
        <span className="b-label">{t("quantitiesToday")}</span>
        {scope.map((s) => (
          <div key={s.id} className="b-scope-row">
            <div>
              <div className="b-h" style={{ fontSize: 16 }}>{s.name}</div>
              <div className="b-sub">
                {t("installedOfTarget", { installed: s.installedQty, target: s.targetQty, unit: s.unit })}
              </div>
            </div>
            <Stepper
              value={qty[s.id] ?? 0}
              onChange={(n) => setQty((prev) => ({ ...prev, [s.id]: n }))}
              min={0}
              max={s.targetQty}
              step={10}
              ariaLabel={s.name}
            />
          </div>
        ))}
      </div>

      <div className="b-card">
        <span className="b-label">{t("note")}</span>
        <textarea
          className="b-field"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
        />
      </div>

      <div className="b-submit-bar">
        {failed && (
          <p className="b-sub" role="alert" style={{ color: "var(--warn)", margin: "0 0 8px" }}>
            {t("submitFailed")}
          </p>
        )}
        <button className="b-btn" onClick={onSubmit} disabled={busy}>
          {done ? t("submitted") : busy ? t("submitting") : t("submit")}
        </button>
      </div>
    </div>
  );
}
