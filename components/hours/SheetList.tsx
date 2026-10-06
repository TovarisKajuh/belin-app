"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fmtDate, fmtNumber } from "@/lib/format";
import {
  effectiveStatus,
  workingDaysLeft,
  type Country,
  type SheetStatus,
} from "@/lib/hours-shared";
import type { HourSheet } from "@/lib/hours-view";
import { SheetEditor } from "./SheetEditor";
import {
  createSheetAction,
  decideSheetAction,
  submitSheetAction,
} from "@/app/[locale]/app/[projectId]/hours/actions";

// Regiestunden, both sides of them.
//
// The countdown is the feature. A submitted sheet approves itself after six
// working days of silence, and a client who does not know that is a client who
// gets surprised by an invoice. So the number of days left is on the row, in
// amber at two and red at one, and the sentence under it says plainly what
// happens when it runs out. Nobody should ever be able to say they were not
// told.

export function SheetList({
  actionKey,
  projectId,
  country,
  role,
  canDecide,
  sheets,
}: {
  /** The link token, or the project id when signed in. */
  actionKey: string;
  projectId: string;
  country: Country;
  role: "epc" | "sub";
  canDecide: boolean;
  sheets: HourSheet[];
}) {
  const t = useTranslations("hours");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const now = new Date();

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        const key = err instanceof Error ? err.message : "";
        setError(key.startsWith("hours.") ? t(key.slice(6)) : t("conflict"));
      }
    });
  };

  const day = (value: string | null) =>
    value ? fmtDate(value, locale) : "";

  const statusLabel = (status: SheetStatus) =>
    status === "deemed_approved" ? t("deemed") : t(`status.${status}`);

  return (
    <section className="e-sec e-reveal">
      <div className="hr-head">
        <div className="e-sec-h">{t("title")}</div>
        {role === "sub" ? (
          <button
            type="button"
            className="hr-new"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const created = await createSheetAction(actionKey, projectId);
                setEditing(created.sheetId);
              })
            }
          >
            {t("new")}
          </button>
        ) : null}
      </div>

      {error ? <p className="ic-error">{error}</p> : null}

      {sheets.length === 0 ? (
        <p className="ip-empty">{t("empty")}</p>
      ) : (
        <ul className="ip-list">
          {sheets.map((sheet) => {
            const status = effectiveStatus(
              { status: sheet.status, deadline_at: sheet.deadlineAt },
              now,
            );
            const daysLeft =
              status === "submitted" && sheet.deadlineAt
                ? workingDaysLeft(sheet.deadlineAt.slice(0, 10), now, country)
                : null;

            return (
              <li key={sheet.id} className={`hr-sheet s-${status}`}>
                <div className="ip-head">
                  <span className="ip-kind">
                    {t("sheetNo", { number: sheet.number })} · {t("total", { hours: fmtNumber(sheet.totalHours, locale) })}
                  </span>
                  <span className={`hr-badge s-${status}`}>{statusLabel(status)}</span>
                </div>

                {status === "submitted" && daysLeft !== null ? (
                  <p
                    className={`hr-count${daysLeft <= 1 ? " red" : daysLeft <= 2 ? " amber" : ""}`}
                  >
                    {t("daysLeft", { n: daysLeft })}
                    <span className="hr-count-note"> {t("deemedNote", { n: 6 })}</span>
                  </p>
                ) : null}

                {status === "submitted" && sheet.deadlineAt ? (
                  <p className="ip-who">{t("deadline", { date: day(sheet.deadlineAt) })}</p>
                ) : null}
                {sheet.decidedAt && sheet.decidedByName ? (
                  <p className="ip-who">
                    {sheet.decidedByName} · {day(sheet.decidedAt)}
                  </p>
                ) : null}

                {sheet.status === "draft" && role === "sub" ? (
                  <SheetEditor
                    actionKey={actionKey}
                    projectId={projectId}
                    sheet={sheet}
                    open={editing === sheet.id}
                    onToggle={() => setEditing(editing === sheet.id ? null : sheet.id)}
                    onSubmitSheet={() =>
                      run(async () => {
                        await submitSheetAction(actionKey, projectId, sheet.id);
                        setEditing(null);
                      })
                    }
                  />
                ) : (
                  <ul className="hr-lines">
                    {sheet.lines.map((line) => (
                      <li key={line.id}>
                        <span className="hr-l-date">{fmtDate(line.workDate, locale, { style: "dayMonth" })}</span>
                        <span className="hr-l-desc">{line.description}</span>
                        <span className="hr-l-h">{fmtNumber(line.hours, locale)} h</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Person sessions only, per the PDF access matrix: a link
                    surface shows no document buttons at all. */}
                {actionKey === projectId && sheet.status !== "draft" ? (
                  <a
                    className="hr-pdf"
                    href={`/api/pdf/regie/${sheet.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("pdf")}
                  </a>
                ) : null}

                {canDecide && status === "submitted" ? (
                  <div className="hr-decide">
                    <button
                      type="button"
                      className="rp-send"
                      disabled={pending}
                      onClick={() => run(() => decideSheetAction(projectId, sheet.id, true))}
                    >
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      className="hr-reject"
                      disabled={pending}
                      onClick={() => run(() => decideSheetAction(projectId, sheet.id, false))}
                    >
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
