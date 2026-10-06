"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fmtDate, fmtNumber } from "@/lib/format";
import type { HourSheet } from "@/lib/hours-view";
import {
  addLineAction,
  removeLineAction,
} from "@/app/[locale]/app/[projectId]/hours/actions";

// Adding a line to a draft hour sheet.
//
// Hours default to 8 with 4, 8 and 10 as one-tap chips, because a standard day
// is by far the most common entry and making somebody tap a stepper sixteen
// times to reach it is the sort of thing that gets an app abandoned on a roof.
// The half-hour steppers are there for the days that were not standard.
//
// The date defaults to today and the description to the previous line's, since
// Regiestunden are usually several days of the same unplanned work.

const QUICK_HOURS = [4, 8, 10];

export function SheetEditor({
  actionKey,
  projectId,
  sheet,
  open,
  onToggle,
  onSubmitSheet,
}: {
  actionKey: string;
  projectId: string;
  sheet: HourSheet;
  open: boolean;
  onToggle: () => void;
  onSubmitSheet: () => void;
}) {
  const t = useTranslations("hours");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const lastLine = sheet.lines[sheet.lines.length - 1];
  const [workDate, setWorkDate] = useState(lastLine?.workDate ?? today);
  const [hours, setHours] = useState(8);
  const [description, setDescription] = useState(lastLine?.description ?? "");

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

  return (
    <div className="hr-editor">
      <ul className="hr-lines">
        {sheet.lines.map((line) => (
          <li key={line.id}>
            <span className="hr-l-date">
              {fmtDate(line.workDate, locale, { style: "dayMonth" })}
            </span>
            <span className="hr-l-desc">{line.description}</span>
            <span className="hr-l-h">{fmtNumber(line.hours, locale)} h</span>
            <button
              type="button"
              className="po-x"
              aria-label={t("removeLine")}
              disabled={pending}
              onClick={() => run(() => removeLineAction(actionKey, projectId, line.id))}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="hr-form">
          <label className="hr-f">
            <span className="b-label">{t("date")}</span>
            <input
              className="b-field"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </label>

          <div className="hr-f">
            <span className="b-label">{t("hoursLabel")}</span>
            <div className="hr-quick">
              {QUICK_HOURS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`hr-chip${hours === value ? " on" : ""}`}
                  onClick={() => setHours(value)}
                >
                  {value} h
                </button>
              ))}
            </div>
            <div className="b-stepper hr-stepper">
              <button
                type="button"
                className="b-step-btn"
                onClick={() => setHours((h) => Math.max(0.5, Math.round((h - 0.5) * 2) / 2))}
                aria-label="-"
              >
                −
              </button>
              <span className="b-step-val">{fmtNumber(hours, locale)}</span>
              <button
                type="button"
                className="b-step-btn"
                onClick={() => setHours((h) => Math.round((h + 0.5) * 2) / 2)}
                aria-label="+"
              >
                +
              </button>
            </div>
          </div>

          <label className="hr-f hr-f-wide">
            <span className="b-label">{t("description")}</span>
            <input
              className="b-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </label>

          {error ? <p className="ic-error">{error}</p> : null}

          <div className="hr-actions">
            <button
              type="button"
              className="rp-send"
              disabled={pending || description.trim().length === 0}
              onClick={() =>
                run(async () => {
                  await addLineAction(actionKey, projectId, {
                    sheetId: sheet.id,
                    workDate,
                    hours,
                    description,
                    personId: null,
                  });
                  setDescription("");
                })
              }
            >
              {t("addLine")}
            </button>
            <button type="button" className="ic-cancel" onClick={onToggle}>
              {t("close")}
            </button>
          </div>
        </div>
      ) : (
        <div className="hr-actions">
          <button type="button" className="rp-open" onClick={onToggle}>
            {t("addLine")}
          </button>
          {sheet.lines.length > 0 ? (
            <button type="button" className="hr-submit" disabled={pending} onClick={onSubmitSheet}>
              {t("submit")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
