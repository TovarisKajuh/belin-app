"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fmtDate, fmtNumber } from "@/lib/format";
import { PhotoCapture } from "./PhotoCapture";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  requestMaterialDocTargets as requestMaterialDocTargetsByToken,
  submitMaterialCheckAction as submitMaterialCheckByToken,
} from "@/app/[locale]/p/[token]/actions";
import {
  requestMaterialDocTargets as requestMaterialDocTargetsBySession,
  submitMaterialCheckAction as submitMaterialCheckBySession,
} from "@/app/[locale]/app/[projectId]/actions";
import {
  buildCheckItemsPayload,
  parseQty,
  type MaterialState,
  type MaterialCheckStatus,
  type CheckDraft,
} from "@/lib/materials-shared";
import { hhmm, projectZone } from "@/lib/project-time";

const STATUSES: MaterialCheckStatus[] = ["present", "partial", "missing"];

export function MaterialCheck({
  token,
  projectId,
  country,
  material,
  mode = "full",
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  country: string | null;
  material: MaterialState;
  /**
   * "alertOnly" (the crew report tab): after the first check, render only when
   * something changed and needs a recheck, so the form stays on the first
   * screen. The settled status card lives on Pregled.
   */
  mode?: "full" | "alertOnly";
}) {
  const key = token ?? projectId;
  const requestMaterialDocTargets = token
    ? requestMaterialDocTargetsByToken
    : requestMaterialDocTargetsBySession;
  const submitMaterialCheckAction = token
    ? submitMaterialCheckByToken
    : submitMaterialCheckBySession;
  const t = useTranslations("crew.material");
  const locale = useLocale();
  const tCrew = useTranslations("crew");
  const router = useRouter();

  const gate = material.needsFirstCheck;
  const [expanded, setExpanded] = useState(false);
  const showForm = gate || expanded;

  const [status, setStatus] = useState<Record<string, MaterialCheckStatus | null>>({});
  const [missingText, setMissingText] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [notes, setNotes] = useState<Blob[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // "Material še ni prispel" tells the EPC the delivery is late: one stray tap
  // on a roof must not send that (crew-walk M5), so it asks once.
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [error, setError] = useState<"unresolved" | "badQty" | "submitFailed" | null>(null);

  const draftId = useRef(crypto.randomUUID());
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Which lines the latest check does not settle: uncovered, or changed since.
  const checkedAtMs = material.latest ? Date.parse(material.latest.checkedAt) : null;
  const covered = new Set(material.latest?.items.map((i) => i.materialItemId) ?? []);
  const isNovo = (id: string, updatedAt: string) =>
    material.latest != null &&
    checkedAtMs != null &&
    (!covered.has(id) || Date.parse(updatedAt) > checkedAtMs);

  function setStatusFor(id: string, s: MaterialCheckStatus, qty: number) {
    setStatus((prev) => ({ ...prev, [id]: s }));
    setError(null);
    if (s === "present") {
      setMissingText((prev) => ({ ...prev, [id]: "" }));
    } else if (s === "missing") {
      setMissingText((prev) => ({ ...prev, [id]: qty > 0 ? String(qty) : "" }));
    } else {
      // partial: clear and focus the input so the crew types the shortfall.
      setMissingText((prev) => ({ ...prev, [id]: "" }));
      setTimeout(() => inputRefs.current[id]?.focus(), 0);
    }
  }

  function allPresent() {
    const next: Record<string, MaterialCheckStatus> = {};
    for (const item of material.items) next[item.id] = "present";
    setStatus(next);
    setMissingText({});
    setError(null);
  }

  function buildDraft(): CheckDraft {
    const draft: CheckDraft = {};
    for (const item of material.items) {
      const s = status[item.id] ?? null;
      const raw = missingText[item.id];
      const missingQty = raw != null && raw.trim() !== "" ? parseQty(raw) : null;
      draft[item.id] = { status: s, missingQty };
    }
    return draft;
  }

  async function uploadSlot(clientId: string, kind: "photos" | "notes", blobs: Blob[]) {
    if (blobs.length === 0) return [] as string[];
    const targets = await requestMaterialDocTargets(
      key,
      clientId,
      kind === "photos" ? blobs.length : 0,
      kind === "notes" ? blobs.length : 0
    );
    const list = kind === "photos" ? targets.photos : targets.notes;
    const supabase = createBrowserClient();
    const results = await Promise.all(
      list.map((tg, i) =>
        supabase.storage.from("photos").uploadToSignedUrl(tg.path, tg.token, blobs[i], {
          contentType: "image/jpeg",
        })
      )
    );
    return list.filter((_, i) => !results[i].error).map((tg) => tg.path);
  }

  async function onSubmit() {
    if (busy) return;
    const result = buildCheckItemsPayload(material.items, buildDraft());
    if (!result.ok) {
      setError(result.error);
      if (result.error === "unresolved") {
        const firstUnresolved = material.items.find((i) => (status[i.id] ?? null) === null);
        if (firstUnresolved) {
          rowRefs.current[firstUnresolved.id]?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
      return;
    }
    await send(result.items);
  }

  // The escape: nothing arrived. An empty check unlocks reporting and tells the
  // EPC, truthfully, that there is no delivery yet.
  async function onNotArrived() {
    if (busy) return;
    await send([]);
  }

  async function send(items: { material_item_id: string; status: MaterialCheckStatus; missing_qty: number | null }[]) {
    setBusy(true);
    setError(null);
    try {
      const clientId = draftId.current;
      const materialPhotoPaths = await uploadSlot(clientId, "photos", photos);
      const deliveryNotePaths = await uploadSlot(clientId, "notes", notes);
      await submitMaterialCheckAction(key, {
        clientGeneratedId: clientId,
        note,
        items,
        materialPhotoPaths,
        deliveryNotePaths,
      });
      setStatus({});
      setMissingText({});
      setPhotos([]);
      setNotes([]);
      setNote("");
      setExpanded(false);
      draftId.current = crypto.randomUUID();
      router.refresh();
    } catch {
      setError("submitFailed");
    } finally {
      setBusy(false);
    }
  }

  // Settled summary line (only when a check exists).
  const summary = () => {
    const latest = material.latest;
    if (!latest) return null;
    const shortfall = latest.items.filter((i) => i.status !== "present").length;
    const empty = latest.items.length === 0;
    const when = t("checkedOn", {
      date: fmtDate(latest.checkedAt, locale, { style: "dayMonth", timeZone: projectZone(country) }),
      time: hhmm(latest.checkedAt, country),
    });
    return (
      <div className="mc-sum">
        {empty ? (
          <span className="mc-sum-badge none">{t("summaryNotArrived")}</span>
        ) : shortfall === 0 ? (
          <span className="mc-sum-badge ok">{t("summaryComplete")}</span>
        ) : (
          <span className="mc-sum-badge short">{t("summaryShort", { count: shortfall })}</span>
        )}
        <span className="mc-sum-when">{when}</span>
        {!expanded && (
          <button type="button" className="mc-recheck-btn" onClick={() => setExpanded(true)}>
            {t("recheckAction")}
          </button>
        )}
      </div>
    );
  };

  // After every hook: an early return above one would break the rules of hooks.
  if (mode === "alertOnly" && !gate && material.uncoveredOrChanged === 0 && !expanded) return null;

  return (
    <section aria-live="polite">
      {/* Re-check banner: something changed since the last check. */}
      {!gate && material.uncoveredOrChanged > 0 && (
        <div className="e-alert" role="status" aria-live="polite">
          <div className="e-alert-in">
            <span className="e-alert-ic" aria-hidden>
              !
            </span>
            <span className="e-alert-t">{t("recheckBody", { count: material.uncoveredOrChanged })}</span>
            {!expanded && (
              <button type="button" className="e-alert-b" onClick={() => setExpanded(true)}>
                {t("recheckAction")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={gate ? "b-card mc-gate" : "b-card"} style={gate ? { marginTop: 16 } : undefined}>
        {gate ? (
          <>
            <div className="mc-title">{t("gateTitle")}</div>
            <p className="mc-body">{t("gateBody")}</p>
          </>
        ) : (
          summary()
        )}

        {showForm && (
          <div style={{ marginTop: gate ? 6 : 14 }}>
            <button type="button" className="mc-quick" onClick={allPresent} disabled={busy}>
              {t("allPresent")}
            </button>

            {material.items.map((item) => {
              const s = status[item.id] ?? null;
              return (
                <div key={item.id} className="mc-row" ref={(el) => { rowRefs.current[item.id] = el; }}>
                  <div className="mc-row-head">
                    <div className="mc-name">
                      {item.name}
                      {isNovo(item.id, item.updatedAt) && <span className="mc-badge">{t("newBadge")}</span>}
                    </div>
                    <div className="mc-qty">
                      {fmtNumber(item.qty, locale)} {item.unit}
                    </div>
                  </div>
                  <div className="mc-seg" role="radiogroup" aria-label={item.name}>
                    {STATUSES.map((opt) => {
                      const disabled = opt === "partial" && item.qty <= 0;
                      return (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={s === opt}
                          className={opt === "missing" ? "mc-seg-opt miss" : "mc-seg-opt"}
                          disabled={disabled || busy}
                          onClick={() => setStatusFor(item.id, opt, item.qty)}
                        >
                          {t(opt)}
                        </button>
                      );
                    })}
                  </div>
                  {(s === "partial" || s === "missing") && (
                    <div className="mc-miss">
                      <label htmlFor={`miss-${item.id}`}>{t("missingQty")}</label>
                      <input
                        id={`miss-${item.id}`}
                        ref={(el) => { inputRefs.current[item.id] = el; }}
                        inputMode="decimal"
                        value={missingText[item.id] ?? ""}
                        onChange={(e) =>
                          setMissingText((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <span className="u">{item.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mc-slot">
              <span className="b-label">{t("photoLabel")}</span>
              <PhotoCapture blobs={photos} onChange={setPhotos} addLabel={t("photoLabel")} />
            </div>
            <div className="mc-slot">
              <span className="b-label">{t("deliveryNoteLabel")}</span>
              <PhotoCapture blobs={notes} onChange={setNotes} addLabel={t("deliveryNoteLabel")} />
            </div>

            <div className="b-card" style={{ marginTop: 12 }}>
              <span className="b-label">{tCrew("note")}</span>
              <textarea
                className="b-field"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <p className="b-sub" role="alert" style={{ color: "var(--warn)", margin: "10px 0 0" }}>
                {t(error)}
              </p>
            )}

            <button
              type="button"
              className="b-btn"
              style={{ marginTop: 12 }}
              onClick={onSubmit}
              disabled={busy}
            >
              {busy ? t("submitting") : t("submit")}
            </button>

            {gate && !confirmEmpty && (
              <button
                type="button"
                className="mc-recheck-btn"
                style={{ display: "block", margin: "12px auto 0" }}
                onClick={() => setConfirmEmpty(true)}
                disabled={busy}
              >
                {t("notArrived")}
              </button>
            )}
            {gate && confirmEmpty && (
              <div className="mc-confirm" role="alertdialog" aria-label={tCrew("confirmNotArrived.title")}>
                <p className="mc-confirm-t">{tCrew("confirmNotArrived.title")}</p>
                <p className="mc-confirm-b">{tCrew("confirmNotArrived.body")}</p>
                <div className="mc-confirm-a">
                  <button type="button" className="mc-recheck-btn" onClick={onNotArrived} disabled={busy}>
                    {tCrew("confirmNotArrived.yes")}
                  </button>
                  <button type="button" className="ic-cancel" onClick={() => setConfirmEmpty(false)} disabled={busy}>
                    {tCrew("confirmNotArrived.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
