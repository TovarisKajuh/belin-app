"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Stepper } from "./Stepper";
import { PhotoCapture } from "./PhotoCapture";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  requestPhotoTargets as requestPhotoTargetsByToken,
  submitReport as submitReportByToken,
} from "@/app/[locale]/p/[token]/actions";
import {
  requestPhotoTargets as requestPhotoTargetsBySession,
  submitReport as submitReportBySession,
} from "@/app/[locale]/app/[projectId]/actions";
import type { ScopeItemStatus } from "@/lib/data/reports";
import { applyLikeLast, bumpQty, remainingQty, type LastReport } from "@/lib/reports-shared";
import { fmtNumber } from "@/lib/format";

// Two quick steps beside the typed number: most days are tens of modules and
// tens of metres, and a chip is one tap where the stepper of ten took seven.
const CHIPS = [10, 50] as const;

export function CrewReportForm({
  token,
  projectId,
  scope,
  lastReport,
  likeLabel,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  scope: ScopeItemStatus[];
  /** The last reported day before today, or null on the first day. */
  lastReport: LastReport | null;
  /** "Kot včeraj" or "Kot zadnjič, 2. 10.", computed on the server. */
  likeLabel: string | null;
}) {
  // The two action families take the same arguments, so the only difference is
  // which key identifies the caller: a shared link, or a proven session.
  const key = token ?? projectId;
  const requestPhotoTargets = token ? requestPhotoTargetsByToken : requestPhotoTargetsBySession;
  const submitReport = token ? submitReportByToken : submitReportBySession;
  const t = useTranslations("crew");
  const router = useRouter();
  const locale = useLocale();
  // The crew is usually the same people as last time: start from that.
  const [headcount, setHeadcount] = useState(lastReport?.headcount ?? 1);
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
        const targets = await requestPhotoTargets(key, draftId.current, blobs.length);
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
      await submitReport(key, {
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
        <PhotoCapture blobs={blobs} onChange={setBlobs} addLabel={t("report.takePhoto")} cameraTarget />
      </div>

      <div className="b-card">
        <div className="cr-like">
          <span className="b-label cr-like-l">{t("headcount")}</span>
          {lastReport && likeLabel ? (
            <button
              type="button"
              className="cr-chip"
              title={t("report.likeHint")}
              onClick={() => {
                if (lastReport.headcount != null) setHeadcount(lastReport.headcount);
                setQty(applyLikeLast(lastReport, scope));
              }}
            >
              {likeLabel}
            </button>
          ) : null}
        </div>
        <Stepper value={headcount} onChange={setHeadcount} min={0} max={99} ariaLabel={t("headcount")} />
      </div>

      <div className="b-card">
        <span className="b-label">{t("quantitiesToday")}</span>
        {scope.map((s) => {
          const left = remainingQty(s.targetQty, s.installedQty);
          const value = qty[s.id] ?? 0;
          if (left === 0) {
            return (
              <div key={s.id} className="cr-qrow cr-qrow--done">
                <div className="cr-qhead">
                  <span className="cr-qname">{s.name}</span>
                  <span className="cr-done">{t("report.done")}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={s.id} className="cr-qrow">
              <div className="cr-qhead">
                <span className="cr-qname">{s.name}</span>
                <span className="cr-qleft">{t("report.left", { left: fmtNumber(left - value, locale), unit: s.unit })}</span>
              </div>
              <div className="cr-qctl">
                <Stepper
                  value={value}
                  onChange={(n) => setQty((prev) => ({ ...prev, [s.id]: n }))}
                  min={0}
                  max={left}
                  ariaLabel={s.name}
                  typeLabel={t("report.typeQty", { name: s.name })}
                />
                <div className="cr-qchips">
                  {CHIPS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="cr-chip"
                      disabled={value >= left}
                      onClick={() => setQty((prev) => ({ ...prev, [s.id]: bumpQty(prev[s.id] ?? 0, n, left) }))}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
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
