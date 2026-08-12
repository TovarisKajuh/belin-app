"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { PhotoCapture } from "@/components/crew/PhotoCapture";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/po-shared";
import { MAX_CO_PHOTOS, type ChangeOrderRow } from "@/lib/change-orders-view";
import {
  createChangeOrderAction,
  decideChangeOrderAction,
  requestChangeOrderPhotoTargets,
} from "@/app/[locale]/app/[projectId]/hours/actions";

// Nachträge: work nobody agreed to when the price was set.
//
// The amount field is optional and says so. A crew member photographing a
// rotten batten at four in the afternoon usually cannot price it, and refusing
// the claim until somebody can would throw away the evidence at the moment it
// is easiest to capture. The hint under the field is honest about the
// consequence instead: without a number, this bills nothing.

export function ChangeOrderList({
  actionKey,
  projectId,
  locale,
  role,
  canDecide,
  orders,
}: {
  actionKey: string;
  projectId: string;
  locale: "sl" | "de" | "en";
  role: "epc" | "sub";
  canDecide: boolean;
  orders: ChangeOrderRow[];
}) {
  const t = useTranslations("co");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [blobs, setBlobs] = useState<Blob[]>([]);

  const draftId = useRef<string>(crypto.randomUUID());

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
        setError(key.startsWith("co.") ? t(key.slice(3)) : t("conflict"));
      }
    });
  };

  const submit = () =>
    run(async () => {
      let photoPaths: string[] = [];
      if (blobs.length > 0) {
        const targets = await requestChangeOrderPhotoTargets(
          actionKey,
          projectId,
          draftId.current,
          blobs.length,
        );
        const supabase = createBrowserClient();
        const results = await Promise.all(
          targets.map((tg, i) =>
            supabase.storage.from("photos").uploadToSignedUrl(tg.path, tg.token, blobs[i], {
              contentType: "image/jpeg",
            }),
          ),
        );
        photoPaths = targets.filter((_, i) => !results[i].error).map((tg) => tg.path);
      }

      const parsed = Number(amount.trim().replace(/\s/g, "").replace(",", "."));
      await createChangeOrderAction(actionKey, projectId, {
        clientGeneratedId: draftId.current,
        title,
        description: description || null,
        amount: amount.trim() && Number.isFinite(parsed) ? parsed : null,
        photoPaths,
      });

      draftId.current = crypto.randomUUID();
      setTitle("");
      setDescription("");
      setAmount("");
      setBlobs([]);
      setAdding(false);
    });

  return (
    <section className="e-sec e-reveal">
      <div className="hr-head">
        <div className="e-sec-h">{t("title")}</div>
        {role === "sub" && !adding ? (
          <button type="button" className="hr-new" onClick={() => setAdding(true)}>
            {t("new")}
          </button>
        ) : null}
      </div>

      {error ? <p className="ic-error">{error}</p> : null}

      {adding ? (
        <div className="b-card hr-form co-form">
          <label className="hr-f hr-f-wide">
            <span className="b-label">{t("titleField")}</span>
            <input className="b-field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="hr-f hr-f-wide">
            <span className="b-label">{t("desc")}</span>
            <input
              className="b-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="hr-f">
            <span className="b-label">{t("amount")}</span>
            <input
              className="b-field"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="co-hint">{t("amountHint")}</span>
          </label>
          <div className="hr-f">
            <span className="b-label">{t("photos")}</span>
            <PhotoCapture
              blobs={blobs}
              onChange={(next) => setBlobs(next.slice(0, MAX_CO_PHOTOS))}
              addLabel={t("photos")}
            />
          </div>
          <div className="hr-actions">
            <button
              type="button"
              className="rp-send"
              disabled={pending || title.trim().length === 0}
              onClick={submit}
            >
              {t("submit")}
            </button>
            <button type="button" className="ic-cancel" onClick={() => setAdding(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {orders.length === 0 && !adding ? (
        <p className="ip-empty">{t("empty")}</p>
      ) : (
        <ul className="ip-list">
          {orders.map((order) => (
            <li key={order.id} className={`hr-sheet s-${order.status}`}>
              <div className="ip-head">
                <span className="ip-kind">
                  {t("orderNo", { number: order.number })} · {order.title}
                </span>
                <span className={`hr-badge s-${order.status}`}>{t(`status.${order.status}`)}</span>
              </div>

              {order.description ? <p className="ip-note">{order.description}</p> : null}

              <p className="co-amount">
                {order.amount === null ? (
                  <span className="co-noamount">{t("noAmount")}</span>
                ) : (
                  formatMoney(order.amount, locale)
                )}
              </p>

              {order.photoUrls.length > 0 ? (
                <div className="ip-thumbs">
                  {order.photoUrls.map((url) => (
                    <a key={url} className="ip-thumb" href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" />
                    </a>
                  ))}
                </div>
              ) : null}

              {order.decidedByName && order.decidedAt ? (
                <p className="ip-who">
                  {order.decidedByName} · {day(order.decidedAt)}
                </p>
              ) : order.authorName ? (
                <p className="ip-who">{order.authorName}</p>
              ) : null}

              {canDecide && order.status === "submitted" ? (
                <div className="hr-decide">
                  <button
                    type="button"
                    className="rp-send"
                    disabled={pending}
                    onClick={() => run(() => decideChangeOrderAction(projectId, order.id, true))}
                  >
                    {t("approve")}
                  </button>
                  <button
                    type="button"
                    className="hr-reject"
                    disabled={pending}
                    onClick={() => run(() => decideChangeOrderAction(projectId, order.id, false))}
                  >
                    {t("reject")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
