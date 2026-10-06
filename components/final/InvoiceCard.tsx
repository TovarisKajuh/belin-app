"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fmtDate } from "@/lib/format";
import { formatMoney } from "@/lib/po-shared";
import type { InvoiceView } from "@/lib/invoice-view";
import {
  generateInvoiceAction,
  shareInvoiceAction,
} from "@/app/[locale]/app/[projectId]/final/actions";

// The invoice card.
//
// Two deliberate frictions. The warnings from composition are shown after
// generating rather than hidden: "your hours are not on this invoice because
// nobody agreed an hourly rate" is the single most useful sentence this screen
// can say, and it is useless the day after the invoice went out.
//
// The share button names the destination address BEFORE sending. An invoice
// leaving for the wrong accountant is not something a confirmation dialog
// should hide behind the word "confirm".

export function InvoiceCard({
  projectId,
  locale,
  invoice,
  canManage,
  accountantEmail,
}: {
  projectId: string;
  locale: "sl" | "de" | "en";
  invoice: InvoiceView | null;
  /** True only for the subcontractor's office: they issue the invoice. */
  canManage: boolean;
  accountantEmail: string | null;
}) {
  const t = useTranslations("invoice");
  const uiLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmShare, setConfirmShare] = useState(false);

  const day = (value: string | null) =>
    value
      ? fmtDate(value, uiLocale)
      : "";

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        const key = err instanceof Error ? err.message : "";
        const suffix = key.startsWith("invoice.") ? key.slice("invoice.".length) : "conflict";
        try {
          setError(t(suffix));
        } catch {
          setError(t("conflict"));
        }
      }
    });
  };

  return (
    <div className="b-card fn-card">
      <span className="b-label">{t("title")}</span>

      {invoice ? (
        <>
          <p className="fn-state ok">
            {invoice.number} · {day(invoice.issueDate)}
          </p>
          <p className="inv-total">{formatMoney(invoice.totalGross, locale)}</p>
          {invoice.vatMode === "reverse_charge" ? (
            <p className="fn-note">{t("reverseChargeShort")}</p>
          ) : null}

          <a
            className="hr-pdf"
            href={`/api/pdf/invoice/${invoice.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("download")}
          </a>

          {invoice.sentToAccountantAt ? (
            <p className="fn-note">
              {t("shared", { date: day(invoice.sentToAccountantAt), email: invoice.accountantEmail ?? "" })}
            </p>
          ) : canManage ? (
            confirmShare ? (
              <div className="inv-confirm">
                {/* The address is named before anything is sent. */}
                <p className="fn-note">{t("shareConfirm", { email: accountantEmail ?? "" })}</p>
                <div className="hr-actions">
                  <button
                    type="button"
                    className="rp-send"
                    disabled={pending || !accountantEmail}
                    onClick={() => run(() => shareInvoiceAction(projectId, invoice.id))}
                  >
                    {t("share")}
                  </button>
                  <button type="button" className="ic-cancel" onClick={() => setConfirmShare(false)}>
                    {t("cancel")}
                  </button>
                </div>
                {!accountantEmail ? <p className="ic-error">{t("errNoAccountant")}</p> : null}
              </div>
            ) : (
              <div className="hr-actions">
                <button type="button" className="rp-open" onClick={() => setConfirmShare(true)}>
                  {t("share")}
                </button>
              </div>
            )
          ) : null}
        </>
      ) : (
        <>
          <p className="fn-note">{canManage ? t("none") : t("byContractor")}</p>
          {canManage ? (
            <div className="hr-actions">
              <button
                type="button"
                className="rp-open"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await generateInvoiceAction(projectId);
                    setWarnings(result.warnings);
                  })
                }
              >
                {pending ? t("generating") : t("generate")}
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* Said once, when it can still be acted on. */}
      {warnings.map((warning) => (
        <p key={warning} className="inv-warn">
          {warning === "no-rate" ? t("warnNoRate") : t("warnCoNoAmount")}
        </p>
      ))}

      {error ? <p className="ic-error">{error}</p> : null}
    </div>
  );
}
