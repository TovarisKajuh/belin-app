"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { fmtDate } from "@/lib/format";
import { unwrap } from "@/lib/action-result";
import {
  generateCompletionReportAction,
  requestFinalizationAction,
} from "@/app/[locale]/app/[projectId]/final/actions";
import type { ProjectStatus } from "@/lib/project-status";
import type { AcceptanceView } from "@/lib/acceptance-view";
import { AcceptanceFlow } from "./AcceptanceFlow";
import { InvoiceCard } from "./InvoiceCard";
import type { InvoiceView } from "@/lib/invoice-view";
import { IconCheck } from "@/components/epc/dashboard/DashEmpty";

// The handover screen: request, report, acceptance, invoice.
//
// It exists as one place because finishing a job is a sequence, not four
// unrelated buttons, and the order matters: nobody signs an acceptance before
// the report exists, and nobody bills before the acceptance. Cards that are not
// their turn yet say what has to happen first rather than sitting there greyed
// out with no explanation.

export function FinalHub({
  projectId,
  status,
  role,
  isOffice,
  requestedAt,
  report,
  acceptance,
  defaultSubSignerName,
  invoice,
  accountantEmail,
  locale,
}: {
  projectId: string;
  status: ProjectStatus;
  role: "epc" | "sub";
  isOffice: boolean;
  requestedAt: string | null;
  /** The latest generated completion report, if one exists. */
  report: { id: string; createdAt: string } | null;
  acceptance: AcceptanceView | null;
  defaultSubSignerName: string | null;
  invoice: InvoiceView | null;
  accountantEmail: string | null;
  locale: "sl" | "de" | "en";
}) {
  const t = useTranslations("final");
  const tToast = useTranslations("toast");
  const uiLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The server writes the activity row after the response, so the refresh
  // right after the click has no date yet; the action returns its own.
  const [justRequestedAt, setJustRequestedAt] = useState<string | null>(null);
  const shownRequestedAt = requestedAt ?? justRequestedAt;

  const inReview = status === "reviewing";
  const finished = status === "finished";

  // The closing chain at a glance (LF4): which step is done and which one is
  // now. Only a signed FINAL acceptance ticks Prevzem, never a partial one.
  const steps = [
    { key: "handover", label: t("handover"), done: inReview || finished || Boolean(requestedAt) },
    { key: "report", label: t("reportCard"), done: Boolean(report) },
    {
      key: "acceptance",
      label: t("acceptanceCard"),
      done: acceptance?.kind === "final" && acceptance.status === "signed",
    },
    { key: "invoice", label: t("invoiceCard"), done: Boolean(invoice) },
  ];
  const nowIndex = steps.findIndex((s) => !s.done);

  const request = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { requestedAt: at } = unwrap(await requestFinalizationAction(projectId));
        setJustRequestedAt(at);
        toast.success(tToast("handoverRequested"));
        setConfirming(false);
        router.refresh();
      } catch (err) {
        const key = err instanceof Error ? err.message : "";
        setError(key === "common.askOffice" ? t("askOffice") : t("conflict"));
      }
    });
  };

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("title")}</div>

      <ol className="fn-steps" aria-label={t("title")}>
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={s.done ? "fn-step is-done" : i === nowIndex ? "fn-step is-now" : "fn-step"}
            aria-current={i === nowIndex ? "step" : undefined}
          >
            <span className="fn-step-n e-mono" aria-hidden>
              {s.done ? <IconCheck size={14} /> : i + 1}
            </span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      {error ? <p className="ic-error">{error}</p> : null}

      <div className="fn-grid">
        <div className="b-card fn-card">
          <span className="b-label">{t("handover")}</span>

          {finished ? (
            <p className="fn-state ok">{t("finished")}</p>
          ) : inReview ? (
            <p className="fn-state ok">
              {shownRequestedAt
                ? t("requested", {
                    date: fmtDate(shownRequestedAt, uiLocale),
                  })
                : t("requestedPlain")}
            </p>
          ) : (
            <p className="fn-state">{t("notRequested")}</p>
          )}

          {/* Only the subcontractor's office declares the job finished: it is
              the company speaking, not whoever is on the roof today. */}
          {!inReview && !finished && role === "sub" ? (
            isOffice ? (
              confirming ? (
                <>
                  <p className="fn-note">{t("requestConfirm")}</p>
                  <div className="hr-actions">
                    <button type="button" className="rp-send" disabled={pending} onClick={request}>
                      {t("request")}
                    </button>
                    <button type="button" className="ic-cancel" onClick={() => setConfirming(false)}>
                      {t("cancel")}
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="rp-open" onClick={() => setConfirming(true)}>
                  {t("request")}
                </button>
              )
            ) : (
              <p className="fn-note">{t("askOffice")}</p>
            )
          ) : null}
        </div>

        {/* The remaining three cards land with Tasks 13, 14 and 15. Each says
            what it is waiting for rather than appearing broken. */}
        <div className="b-card fn-card">
          <span className="b-label">{t("reportCard")}</span>

          {report ? (
            <>
              <p className="fn-state ok">
                {t("generatedAt", {
                  date: fmtDate(report.createdAt, uiLocale),
                })}
              </p>
              <a
                className="hr-pdf"
                href={`/api/pdf/report/${report.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon icon={FileDown} />
                {t("download")}
              </a>
            </>
          ) : null}

          <div className="hr-actions">
            <button
              type="button"
              className="rp-open"
              disabled={pending || generating}
              onClick={() => {
                setError(null);
                setGenerating(true);
                startTransition(async () => {
                  try {
                    unwrap(await generateCompletionReportAction(projectId));
                    toast.success(tToast("reportGenerated"));
                    router.refresh();
                  } catch {
                    setError(t("conflict"));
                  } finally {
                    setGenerating(false);
                  }
                });
              }}
            >
              {generating ? t("generating") : t("generate")}
            </button>
          </div>
        </div>
        {/* The acceptance opens once the job has been handed over: inspecting
            work nobody has declared finished is not an acceptance. */}
        {inReview || finished || acceptance ? (
          role === "epc" ? (
            <AcceptanceFlow
              projectId={projectId}
              acceptance={acceptance}
              defaultSubSignerName={defaultSubSignerName}
            />
          ) : (
            <div className="b-card fn-card">
              <span className="b-label">{t("acceptanceCard")}</span>
              <p className="fn-note">
                {acceptance?.status === "signed" ? t("acceptanceSignedShort") : t("acceptanceByClient")}
              </p>
              {acceptance?.status === "signed" ? (
                <a
                  className="hr-pdf"
                  href={`/api/pdf/abnahme/${acceptance.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon icon={FileDown} />
                  {t("downloadProtocol")}
                </a>
              ) : null}
            </div>
          )
        ) : (
          <div className="b-card fn-card">
            <span className="b-label">{t("acceptanceCard")}</span>
            <p className="fn-note">{t("afterHandover")}</p>
          </div>
        )}
        {/* Billing opens once the work has been accepted, or once an invoice
            exists: invoicing for work nobody signed off is how disputes start. */}
        {(acceptance?.status === "signed" && acceptance.kind === "final" && acceptance.declaration !== "refused") ||
        invoice ? (
          <InvoiceCard
            projectId={projectId}
            locale={locale}
            invoice={invoice}
            canManage={role === "sub" && isOffice}
            accountantEmail={accountantEmail}
          />
        ) : (
          <div className="b-card fn-card">
            <span className="b-label">{t("invoiceCard")}</span>
            <p className="fn-note">{t("afterAcceptance")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
