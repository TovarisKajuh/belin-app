"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/po-shared";
import { acceptPoAction, rejectPoAction } from "@/app/[locale]/app/[projectId]/po/actions";
import type { PoView as PoData } from "@/lib/data/purchase-orders";

// The read side of the naročilnica: what the subcontractor's office sees, and
// what the EPC sees once it is out of their hands.
//
// Acceptance is deliberately slower than one tap. It is the only act in the
// product that creates a payment obligation, so it asks for a checkbox and
// states plainly what gets recorded. A crew member on a roof should be able to
// do everything else one handed in seconds; this one should make somebody stop
// and read.

export function PoView({
  projectId,
  locale,
  po,
  canDecide,
  isSubSide,
}: {
  projectId: string;
  locale: "sl" | "de" | "en";
  po: PoData;
  /** True only for a signed-in sub office person. */
  canDecide: boolean;
  isSubSide: boolean;
}) {
  const t = useTranslations("po");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const day = (value: string | null) =>
    value ? format.dateTime(new Date(value), { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        const key = err instanceof Error ? err.message : "";
        setError(key.startsWith("po.") ? t(key.slice(3)) : t("conflict"));
      }
    });
  };

  const statusLine =
    po.status === "accepted"
      ? t("accepted", { date: day(po.acceptedAt) })
      : po.status === "rejected"
        ? t("rejected", { date: day(po.rejectedAt) })
        : po.status === "sent"
          ? t("sent", { date: day(po.sentAt) })
          : t("draft");

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("title")}</div>

      <div className="b-card po-card">
        <div className="po-view-top">
          <span className={`e-proj-badge${po.status === "rejected" ? " late" : ""}`}>{statusLine}</span>
          {po.pdfUrl ? (
            <a className="po-ghost" href={`/api/pdf/po/${po.id}`} target="_blank" rel="noreferrer">
              {t("download")}
            </a>
          ) : null}
        </div>

        <div className="po-lines">
          {po.lines.map((line, index) => (
            <div className="po-view-row" key={index}>
              <span className="po-view-desc">{line.description}</span>
              <span className="po-view-qty">
                {line.qty === null ? "" : `${line.qty}${line.unit ? ` ${line.unit}` : ""}`}
              </span>
              <span className="po-num">{formatMoney(line.total, locale)}</span>
            </div>
          ))}
        </div>

        <div className="po-total">
          <span>{t("lineTotal")}</span>
          <b>{formatMoney(po.totalNet, locale)}</b>
        </div>

        {po.regieHourlyRate !== null ? (
          <p className="po-meta">
            {t("regieRate")}: {formatMoney(po.regieHourlyRate, locale)}
          </p>
        ) : null}
        {po.paymentTerms ? <p className="po-meta">{po.paymentTerms}</p> : null}
        {po.acceptedByName ? (
          <p className="po-meta">{t("acceptedBy", { name: po.acceptedByName })}</p>
        ) : null}
        {po.rejectionNote ? <p className="po-meta">{po.rejectionNote}</p> : null}
      </div>

      {error ? <p className="po-error">{error}</p> : null}

      {po.status === "sent" && isSubSide && !canDecide ? (
        <p className="po-meta">{t("askOfficeToAccept")}</p>
      ) : null}

      {po.status === "sent" && canDecide && !rejecting ? (
        <div className="b-card po-confirm">
          <p className="po-confirm-t">{t("acceptNote")}</p>
          <label className="po-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>{t("acceptConfirm")}</span>
          </label>
          <div className="po-actions">
            <button
              type="button"
              className="b-btn"
              disabled={!confirmed || pending}
              onClick={() => run(() => acceptPoAction(projectId, po.id))}
            >
              {t("accept")}
            </button>
            <button type="button" className="po-ghost" onClick={() => setRejecting(true)}>
              {t("reject")}
            </button>
          </div>
        </div>
      ) : null}

      {po.status === "sent" && canDecide && rejecting ? (
        <div className="b-card po-confirm">
          <label className="po-f po-f-wide">
            <span className="b-label">{t("rejectNote")}</span>
            <input className="b-field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="po-actions">
            <button
              type="button"
              className="b-btn"
              disabled={pending || note.trim().length === 0}
              onClick={() => run(() => rejectPoAction(projectId, po.id, note))}
            >
              {t("reject")}
            </button>
            <button type="button" className="po-ghost" onClick={() => setRejecting(false)}>
              {t("edit")}
            </button>
          </div>
        </div>
      ) : null}

      {po.status === "sent" && !isSubSide ? <p className="po-meta">{t("waitingForSub")}</p> : null}
    </section>
  );
}
