"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fmtDate } from "@/lib/format";
import { unwrap } from "@/lib/action-result";
import { SignaturePad } from "@/components/SignaturePad";
import { DECLARATIONS, type AcceptanceView, type Declaration } from "@/lib/acceptance-view";
import {
  addDefectAction,
  removeDefectAction,
  saveAcceptanceStepAction,
  saveSignatureAction,
  signAcceptanceAction,
  startAcceptanceAction,
} from "@/app/[locale]/app/[projectId]/final/actions";

// Conducting the acceptance.
//
// Every field saves the moment it changes. This happens on a roof, on one
// phone passed between two people, on whatever signal the site has; a form
// that only saved at the end would lose a finished inspection to a dropped
// connection, and nobody walks the roof a second time.
//
// The penalty reservation is a checkbox with fixed wording, sitting next to the
// sentence that will be printed and a line saying what happens if it is left
// unticked. A client who accepts without expressly reserving the contractual
// penalty loses it for good, and that is not something to bury in a tooltip.

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function AcceptanceFlow({
  projectId,
  acceptance,
  defaultSubSignerName,
}: {
  projectId: string;
  acceptance: AcceptanceView | null;
  /** The sub office admin, prefilled but always editable: whoever is there signs. */
  defaultSubSignerName: string | null;
}) {
  const t = useTranslations("final");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [defectText, setDefectText] = useState("");
  const [defectDue, setDefectDue] = useState("");
  const [defectAgreement, setDefectAgreement] = useState<"agreed" | "disputed">("agreed");

  const messageFor = (err: unknown): string => {
    const key = err instanceof Error ? err.message : "";
    if (key.startsWith("final.err.")) return t(`err.${key.slice("final.err.".length)}`);
    if (key === "final.alreadySigned") return t("alreadySigned");
    return t("conflict");
  };

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        setError(messageFor(err));
      }
    });
  };

  const save = (payload: Parameters<typeof saveAcceptanceStepAction>[2]) => {
    if (!acceptance) return;
    run(async () => unwrap(await saveAcceptanceStepAction(projectId, acceptance.id, payload)));
  };

  // One upload per signature, when the signer confirms. Returns whether it was
  // stored, so the pad only locks once the server holds the image.
  const saveSignature = async (side: "epc" | "sub", png: Blob): Promise<boolean> => {
    if (!acceptance) return false;
    setError(null);
    try {
      // unwrap() throws on a returned failure, so the pad stays open and never
      // locks on "Podpis je shranjen." while the server holds nothing.
      unwrap(await saveSignatureAction(projectId, acceptance.id, side, await blobToBase64(png)));
      router.refresh();
      return true;
    } catch (err) {
      setError(messageFor(err));
      return false;
    }
  };

  // A prefilled default is not a stored value. The sub signer's name is
  // suggested from the company record, and if nobody edits the field it would
  // stay null in the database while the screen showed a name: signing would
  // then refuse for a missing name that is visibly right there. Persist the
  // suggestion once, so what the protocol says matches what the screen shows.
  const [defaultPersisted, setDefaultPersisted] = useState(false);
  useEffect(() => {
    if (!acceptance || acceptance.status !== "draft") return;
    if (acceptance.subSignerName || !defaultSubSignerName || defaultPersisted) return;
    setDefaultPersisted(true);
    // A failure is a resolved { ok: false }, not a rejection: both reset the
    // flag so the suggestion is persisted on the next render.
    void saveAcceptanceStepAction(projectId, acceptance.id, {
      subSignerName: defaultSubSignerName,
    }).then(
      (result) => {
        if (!result.ok) setDefaultPersisted(false);
      },
      () => setDefaultPersisted(false),
    );
  }, [acceptance, defaultSubSignerName, defaultPersisted, projectId]);

  if (!acceptance) {
    return (
      <div className="b-card fn-card">
        <span className="b-label">{t("acceptanceCard")}</span>
        <p className="fn-note">{t("noAcceptance")}</p>
        <div className="hr-actions">
          <button
            type="button"
            className="rp-open"
            disabled={pending}
            onClick={() => run(async () => unwrap(await startAcceptanceAction(projectId, "final")))}
          >
            {t("startAcceptance")}
          </button>
          <button
            type="button"
            className="ic-cancel"
            disabled={pending}
            onClick={() => run(async () => unwrap(await startAcceptanceAction(projectId, "partial")))}
          >
            {t("kindPartial")}
          </button>
        </div>
        {error ? <p className="ic-error">{error}</p> : null}
      </div>
    );
  }

  if (acceptance.status === "signed") {
    return (
      <div className="b-card fn-card">
        <span className="b-label">{t("acceptanceCard")}</span>
        <p className="fn-state ok">
          {acceptance.conductedAt
            ? t("acceptanceSigned", { date: fmtDate(acceptance.conductedAt, locale) })
            : t("acceptanceOpen")}
        </p>
        <p className="fn-note">
          {acceptance.declaration ? t(`decl.${acceptance.declaration}`) : ""}
          {acceptance.penaltyReserved ? ` · ${t("penaltyReserve")}` : ""}
        </p>
        <a
          className="hr-pdf"
          href={`/api/pdf/abnahme/${acceptance.id}`}
          target="_blank"
          rel="noreferrer"
        >
          {t("downloadProtocol")}
        </a>
      </div>
    );
  }

  return (
    <div className="b-card fn-card fn-card--wide">
      <span className="b-label">{t("acceptanceCard")}</span>
      <p className="fn-state">{t("acceptanceOpen")}</p>

      {error ? <p className="ic-error">{error}</p> : null}

      <label className="hr-f hr-f-wide">
        <span className="b-label">{t("attendees")}</span>
        <input
          className="b-field"
          defaultValue={acceptance.attendees ?? ""}
          placeholder={t("attendeesHint")}
          onBlur={(e) => save({ attendees: e.target.value })}
        />
      </label>

      <div className="ac-block">
        <span className="b-label">{t("defects")}</span>
        {acceptance.defects.length === 0 ? (
          <p className="fn-note">{t("noDefects")}</p>
        ) : (
          <ul className="ac-defects">
            {acceptance.defects.map((defect) => (
              <li key={defect.id}>
                <span className="ac-d-text">{defect.description}</span>
                <span className="ac-d-meta">
                  {defect.dueDate ?? ""} · {t(defect.agreement === "disputed" ? "disputed" : "agreed")}
                </span>
                <button
                  type="button"
                  className="po-x"
                  disabled={pending}
                  onClick={() => run(async () => unwrap(await removeDefectAction(projectId, defect.id)))}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="ac-defect-form">
          <input
            className="b-field"
            value={defectText}
            placeholder={t("defectDescription")}
            onChange={(e) => setDefectText(e.target.value)}
          />
          <input
            className="b-field"
            type="date"
            value={defectDue}
            onChange={(e) => setDefectDue(e.target.value)}
          />
          <select
            className="b-field"
            value={defectAgreement}
            onChange={(e) => setDefectAgreement(e.target.value as "agreed" | "disputed")}
          >
            <option value="agreed">{t("agreed")}</option>
            <option value="disputed">{t("disputed")}</option>
          </select>
          <button
            type="button"
            className="rp-send"
            disabled={pending || defectText.trim().length === 0}
            onClick={() =>
              run(async () => {
                unwrap(await addDefectAction(projectId, acceptance.id, {
                  description: defectText,
                  dueDate: defectDue || null,
                  agreement: defectAgreement,
                }));
                setDefectText("");
                setDefectDue("");
              })
            }
          >
            {t("addDefect")}
          </button>
        </div>
      </div>

      <div className="ac-block">
        <span className="b-label">{t("declaration")}</span>
        <div className="ac-decls">
          {DECLARATIONS.map((declaration: Declaration) => (
            <button
              key={declaration}
              type="button"
              className={`rq-type${acceptance.declaration === declaration ? " on" : ""}`}
              onClick={() => save({ declaration })}
            >
              {t(`decl.${declaration}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="hr-f">
        <span className="b-label">{t("warranty")}</span>
        <input
          className="b-field"
          type="date"
          defaultValue={acceptance.warrantyStart ?? ""}
          onBlur={(e) => save({ warrantyStart: e.target.value })}
        />
      </label>

      <div className="ac-penalty">
        <label className="po-check">
          <input
            type="checkbox"
            defaultChecked={acceptance.penaltyReserved}
            onChange={(e) => save({ penaltyReserved: e.target.checked })}
          />
          <span>{t("penaltyReserve")}</span>
        </label>
        <p className="ac-penalty-text">{t("penaltySentence")}</p>
        <p className="fn-note">{t("penaltyHint")}</p>
      </div>

      {/* The pads are NOT disabled while another field saves (pending): a
          signer who starts right after ticking a box would otherwise lose the
          strokes drawn during that round trip, silently. Each pad uploads on its
          own confirm, independent of the field saves. */}
      <div className="ac-signs">
        <div>
          <label className="hr-f hr-f-wide">
            <span className="b-label">{t("signEpc")}</span>
            <input
              className="b-field"
              defaultValue={acceptance.epcSignerName ?? ""}
              placeholder={t("signerName")}
              onBlur={(e) => save({ epcSignerName: e.target.value })}
            />
          </label>
          <SignaturePad
            name={acceptance.epcSignerName ?? ""}
            saved={acceptance.hasEpcSignature}
            onConfirm={(png) => saveSignature("epc", png)}
          />
        </div>

        <div>
          <p className="fn-note ac-pass">{t("passDevice")}</p>
          <label className="hr-f hr-f-wide">
            <span className="b-label">{t("signSub")}</span>
            <input
              className="b-field"
              defaultValue={acceptance.subSignerName ?? defaultSubSignerName ?? ""}
              placeholder={t("signerName")}
              onBlur={(e) => save({ subSignerName: e.target.value })}
            />
          </label>
          <SignaturePad
            name={acceptance.subSignerName ?? defaultSubSignerName ?? ""}
            saved={acceptance.hasSubSignature}
            onConfirm={(png) => saveSignature("sub", png)}
          />
        </div>
      </div>

      <div className="hr-actions">
        <button
          type="button"
          className="b-btn"
          disabled={pending || !acceptance.hasEpcSignature || !acceptance.hasSubSignature}
          onClick={() => run(async () => unwrap(await signAcceptanceAction(projectId, acceptance.id)))}
        >
          {t("signAndClose")}
        </button>
        {!acceptance.hasEpcSignature || !acceptance.hasSubSignature ? <p className="fn-note">{t("signFirst")}</p> : null}
      </div>
    </div>
  );
}
