"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { requestFinalizationAction } from "@/app/[locale]/app/[projectId]/final/actions";
import type { ProjectStatus } from "@/lib/project-status";

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
}: {
  projectId: string;
  status: ProjectStatus;
  role: "epc" | "sub";
  isOffice: boolean;
  requestedAt: string | null;
}) {
  const t = useTranslations("final");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inReview = status === "reviewing";
  const finished = status === "finished";

  const request = () => {
    setError(null);
    startTransition(async () => {
      try {
        await requestFinalizationAction(projectId);
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

      {error ? <p className="ic-error">{error}</p> : null}

      <div className="fn-grid">
        <div className="b-card fn-card">
          <span className="b-label">{t("handover")}</span>

          {finished ? (
            <p className="fn-state ok">{t("finished")}</p>
          ) : inReview ? (
            <p className="fn-state ok">
              {requestedAt
                ? t("requested", {
                    date: format.dateTime(new Date(requestedAt), {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }),
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
          <p className="fn-note">{t("soon")}</p>
        </div>
        <div className="b-card fn-card">
          <span className="b-label">{t("acceptanceCard")}</span>
          <p className="fn-note">{inReview || finished ? t("soon") : t("afterHandover")}</p>
        </div>
        <div className="b-card fn-card">
          <span className="b-label">{t("invoiceCard")}</span>
          <p className="fn-note">{t("afterAcceptance")}</p>
        </div>
      </div>
    </section>
  );
}
