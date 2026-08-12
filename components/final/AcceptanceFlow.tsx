"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [defectText, setDefectText] = useState("");
  const [defectDue, setDefectDue] = useState("");
  const [defectAgreement, setDefectAgreement] = useState<"agreed" | "disputed">("agreed");

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        const key = err instanceof Error ? err.message : "";
        if (key.startsWith("final.err.")) setError(t(`err.${key.slice("final.err.".length)}`));
        else if (key === "final.alreadySigned") setError(t("alreadySigned"));
        else setError(t("conflict"));
      }
    });
  };

  const save = (payload: Parameters<typeof saveAcceptanceStepAction>[2]) => {
    if (!acceptance) return;
    run(() => saveAcceptanceStepAction(projectId, acceptance.id, payload));
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
    void saveAcceptanceStepAction(projectId, acceptance.id, {
      subSignerName: defaultSubSignerName,
    }).catch(() => setDefaultPersisted(false));
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
            onClick={() => run(() => startAcceptanceAction(projectId, "final"))}
          >
            {t("startAcceptance")}
          </button>
          <button
            type="button"
            className="ic-cancel"
            disabled={pending}
            onClick={() => run(() => startAcceptanceAction(projectId, "partial"))}
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
            ? t("acceptanceSigned", { date: acceptance.conductedAt.slice(0, 10) })
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
                  onClick={() => run(() => removeDefectAction(projectId, defect.id))}
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
                await addDefectAction(projectId, acceptance.id, {
                  description: defectText,
                  dueDate: defectDue || null,
                  agreement: defectAgreement,
                });
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
            onCapture={(png) => {
              if (!png) return;
              run(async () =>
                saveSignatureAction(projectId, acceptance.id, "epc", await blobToBase64(png)),
              );
            }}
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
            onCapture={(png) => {
              if (!png) return;
              run(async () =>
                saveSignatureAction(projectId, acceptance.id, "sub", await blobToBase64(png)),
              );
            }}
          />
        </div>
      </div>

      <div className="hr-actions">
        <button
          type="button"
          className="b-btn"
          disabled={pending}
          onClick={() => run(() => signAcceptanceAction(projectId, acceptance.id))}
        >
          {t("signAndClose")}
        </button>
      </div>
    </div>
  );
}
