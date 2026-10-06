"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PhotoCapture } from "./PhotoCapture";
import { Sheet } from "@/components/ui/Sheet";
import { createBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/action-result";
import { REQUEST_TYPES, type RequestRow, type RequestType } from "@/lib/requests-shared";
import {
  requestRequestPhotoTarget as targetByToken,
  createRequestAction as createByToken,
  listRequestsAction as listByToken,
} from "@/app/[locale]/p/[token]/actions";
import {
  requestRequestPhotoTarget as targetBySession,
  createRequestAction as createBySession,
  listRequestsAction as listBySession,
} from "@/app/[locale]/app/[projectId]/actions";

// "I need something" from the roof, and the answer coming back to the same
// place.
//
// The second half is the part that matters. A crew member has no account and no
// inbox, so an answer that only appears on the EPC's dashboard never reaches
// the person who asked; they phone instead, which is the thing this product
// exists to stop. So the sheet that asks is also the sheet that shows what came
// back, and it is the first thing visible when it opens.

export function RequestButton({
  token,
  projectId,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
}) {
  const key = token ?? projectId;
  const requestTarget = token ? targetByToken : targetBySession;
  const createRequest = token ? createByToken : createBySession;
  const listRequests = token ? listByToken : listBySession;

  const t = useTranslations("request");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RequestType>("material");
  const [text, setText] = useState("");
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftId = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listRequests(key)
      .then((loaded) => {
        if (!cancelled) setRows(loaded);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, key, listRequests]);

  const close = () => {
    setOpen(false);
    setText("");
    setBlobs([]);
    setError(null);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let photoPath: string | null = null;
      if (blobs.length > 0) {
        const target = await requestTarget(key, draftId.current);
        const supabase = createBrowserClient();
        const result = await supabase.storage
          .from("photos")
          .uploadToSignedUrl(target.path, target.token, blobs[0], { contentType: "image/jpeg" });
        // A failed picture does not cancel the question.
        if (!result.error) photoPath = target.path;
      }

      unwrap(await createRequest(key, {
        clientGeneratedId: draftId.current,
        type,
        text,
        photoPath,
      }));

      draftId.current = crypto.randomUUID();
      setDone(true);
      setText("");
      setBlobs([]);
      setRows(await listRequests(key).catch(() => rows ?? []));
      setTimeout(() => setDone(false), 1500);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const code = message.startsWith("request.err.") ? message.slice("request.err.".length) : "generic";
      setError(t(`err.${["type", "text"].includes(code) ? code : "generic"}`));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="rq-cta" onClick={() => setOpen(true)}>
        {t("cta")}
      </button>
    );
  }

  return (
    <Sheet label={t("cta")} onClose={close} busy={busy}>
        <p className="ic-h">{t("text")}</p>

        {/* Answers first: what came back is the first thing visible (crew-walk M9). */}
        {rows && rows.length > 0 ? (
          <div className="rq-mine">
            <p className="b-label">{t("yourRequests")}</p>
            <ul className="rq-list">
              {rows.map((row) => (
                <li key={row.id} className={`rq-row${row.status === "resolved" ? " done" : ""}`}>
                  <p className="rq-t">{row.text}</p>
                  {row.responseNote ? (
                    <p className="rq-answer">
                      <span className="rq-tag">{t("resolvedTag")}</span> {row.responseNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rq-types">
          {REQUEST_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              className={`rq-type${type === option ? " on" : ""}`}
              onClick={() => setType(option)}
            >
              {t(`types.${option}`)}
            </button>
          ))}
        </div>

        <textarea
          className="b-field ic-note"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("text")}
        />

        <div className="ic-photos">
          <PhotoCapture
            blobs={blobs}
            onChange={(next) => setBlobs(next.slice(0, 1))}
            addLabel={t("photo")}
          />
        </div>

        {error ? <p className="ic-error">{error}</p> : null}

        <div className="ic-actions">
          <button
            type="button"
            className="b-btn"
            onClick={submit}
            disabled={busy || done || text.trim().length === 0}
          >
            {done ? t("sent") : t("submit")}
          </button>
          <button type="button" className="ic-cancel" onClick={close} disabled={busy}>
            {t("cancel")}
          </button>
        </div>

    </Sheet>
  );
}
