"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatMoney, lineTotal, poTotals } from "@/lib/po-shared";
import { savePoDraftAction, sendPoAction } from "@/app/[locale]/app/[projectId]/po/actions";
import type { PoView } from "@/lib/data/purchase-orders";
import { unwrap } from "@/lib/action-result";

// The EPC's side of the naročilnica: build the lines, price them, send it.
//
// The money column is the point of the screen, so it is the only thing on it
// rendered in gold and in tabular figures: a column of amounts should be
// scannable down the edge without reading a single description.
//
// Totals are computed with the same pure functions the server uses, so what
// the EPC sees while typing is exactly what the stored document will say. A
// separate client-side formula here is how the printed total and the screen
// total end up disagreeing by a cent.

type DraftLine = {
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
};

const EMPTY_LINE: DraftLine = { description: "", qty: "", unit: "kos", unitPrice: "" };

function toNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function PoBuilder({
  projectId,
  locale,
  po,
  suggestedFirstLine,
}: {
  projectId: string;
  locale: "sl" | "de" | "en";
  po: PoView | null;
  /** "Montaža FV sistema 120 kWp, Kranj", built from the project itself. */
  suggestedFirstLine: string;
}) {
  const t = useTranslations("po");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const [lines, setLines] = useState<DraftLine[]>(() =>
    po && po.lines.length > 0
      ? po.lines.map((line) => ({
          description: line.description,
          qty: line.qty === null ? "" : String(line.qty),
          unit: line.unit ?? "",
          unitPrice: line.unitPrice === null ? "" : String(line.unitPrice),
        }))
      : [{ ...EMPTY_LINE, description: suggestedFirstLine, qty: "1" }],
  );
  const [regieRate, setRegieRate] = useState(
    po?.regieHourlyRate === null || po?.regieHourlyRate === undefined ? "" : String(po.regieHourlyRate),
  );
  const [paymentTerms, setPaymentTerms] = useState(po?.paymentTerms ?? "");
  const [deadline, setDeadline] = useState(po?.deadline ?? "");

  const computed = useMemo(
    () =>
      lines.map((line) => {
        const qty = toNumber(line.qty);
        const unitPrice = toNumber(line.unitPrice);
        return lineTotal(qty, unitPrice) ?? 0;
      }),
    [lines],
  );
  const total = useMemo(() => poTotals(computed.map((value) => ({ total: value }))), [computed]);

  const update = (index: number, patch: Partial<DraftLine>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const payload = () => ({
    lines: lines.map((line) => ({
      description: line.description,
      qty: toNumber(line.qty),
      unit: line.unit.trim() || null,
      unitPrice: toNumber(line.unitPrice),
      total: null,
    })),
    regieHourlyRate: toNumber(regieRate),
    paymentTerms: paymentTerms.trim() || null,
    deadline: deadline || null,
  });

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        // Failures arrive as codes ("po.conflict") through unwrap(), so the
        // screen speaks the user's language without the server knowing about
        // i18n, in production too.
        const key = err instanceof Error ? err.message : "";
        setError(key.startsWith("po.") ? t(key.slice(3)) : t("conflict"));
      }
    });
  };

  const save = () =>
    run(async () => {
      unwrap(await savePoDraftAction(projectId, payload()));
      toast.success(tToast("poSaved"));
    });

  const send = () =>
    run(async () => {
      const saved = unwrap(await savePoDraftAction(projectId, payload()));
      unwrap(await sendPoAction(projectId, saved.poId));
      toast.success(tToast("poSent"));
      setConfirmSend(false);
    });

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("title")}</div>

      <div className="b-card po-card">
        <div className="po-lines" role="table">
          <div className="po-head" role="row">
            <span>{t("description")}</span>
            <span>{t("qty")}</span>
            <span>{t("unitPrice")}</span>
            <span className="po-num-h">{t("lineTotal")}</span>
            <span />
          </div>

          {lines.map((line, index) => (
            <div className="po-row" role="row" key={index}>
              <input
                className="b-field"
                value={line.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder={t("description")}
                aria-label={t("description")}
              />
              <div className="po-qty">
                <input
                  className="b-field"
                  inputMode="decimal"
                  value={line.qty}
                  onChange={(e) => update(index, { qty: e.target.value })}
                  aria-label={t("qty")}
                />
                <input
                  className="b-field po-unit"
                  value={line.unit}
                  onChange={(e) => update(index, { unit: e.target.value })}
                  aria-label={t("unit")}
                />
              </div>
              <input
                className="b-field"
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(e) => update(index, { unitPrice: e.target.value })}
                aria-label={t("unitPrice")}
              />
              <span className="po-num">{formatMoney(computed[index] ?? 0, locale)}</span>
              <button
                type="button"
                className="po-x"
                onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                aria-label={t("removeLine")}
                disabled={lines.length === 1}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="po-add"
          onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
        >
          + {t("addLine")}
        </button>

        <div className="po-total">
          <span>{t("lineTotal")}</span>
          <b>{formatMoney(total, locale)}</b>
        </div>
      </div>

      <div className="b-card po-terms">
        <label className="po-f">
          <span className="b-label">{t("regieRate")}</span>
          <input
            className="b-field"
            inputMode="decimal"
            value={regieRate}
            onChange={(e) => setRegieRate(e.target.value)}
          />
        </label>
        <label className="po-f">
          <span className="b-label">{t("deadlineField")}</span>
          <input
            className="b-field"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label className="po-f po-f-wide">
          <span className="b-label">{t("paymentTerms")}</span>
          <input
            className="b-field"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="po-error">{error}</p> : null}

      {confirmSend ? (
        <div className="b-card po-confirm">
          <p className="po-confirm-t">{t("sendConfirm")}</p>
          <div className="po-actions">
            <button type="button" className="b-btn" onClick={send} disabled={pending}>
              {t("send")}
            </button>
            <button type="button" className="po-ghost" onClick={() => setConfirmSend(false)}>
              {t("edit")}
            </button>
          </div>
        </div>
      ) : (
        <div className="po-actions">
          <button
            type="button"
            className="b-btn"
            onClick={() => setConfirmSend(true)}
            disabled={pending || total <= 0}
          >
            {t("send")}
          </button>
          <button type="button" className="po-ghost" onClick={save} disabled={pending}>
            {t("draft")}
          </button>
        </div>
      )}
    </section>
  );
}
