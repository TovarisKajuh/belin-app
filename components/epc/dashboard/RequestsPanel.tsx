"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { RequestRow } from "@/lib/requests-shared";
import { resolveRequestAction } from "@/app/[locale]/app/[projectId]/actions";

// The office side of the crew's questions.
//
// Answering requires a note, always. "Resolved" with no words tells the crew
// nothing and they will phone anyway, which defeats the whole exchange; the
// note IS the answer, and it is what the asking sheet shows back on the roof.
export function RequestsPanel({
  projectId,
  requests,
  canResolve,
}: {
  projectId: string;
  requests: RequestRow[];
  /** False on a link surface: answering is an office act. */
  canResolve: boolean;
}) {
  const t = useTranslations("dashboard");
  const tReq = useTranslations("request");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answering, setAnswering] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = requests.filter((row) => row.status === "open");

  const resolve = (requestId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await resolveRequestAction(projectId, requestId, note);
        setAnswering(null);
        setNote("");
        router.refresh();
      } catch {
        setError(tReq("err.generic"));
      }
    });
  };

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("requests")}</div>

      {open.length === 0 ? (
        <p className="ip-empty">{t("noRequests")}</p>
      ) : (
        <ul className="ip-list">
          {open.map((row) => (
            <li key={row.id} className="rp-row">
              <div className="ip-head">
                <span className="ip-kind">{tReq(`types.${row.type}`)}</span>
                {row.authorName ? <span className="ip-date">{row.authorName}</span> : null}
              </div>
              <p className="ip-note">{row.text}</p>

              {row.photoUrl ? (
                <a className="rp-photo" href={row.photoUrl} target="_blank" rel="noreferrer">
                  <img src={row.photoUrl} alt="" />
                </a>
              ) : null}

              {canResolve && answering === row.id ? (
                <div className="rp-answer">
                  <input
                    className="b-field"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("responseNote")}
                    aria-label={t("responseNote")}
                  />
                  <button
                    type="button"
                    className="rp-send"
                    disabled={pending || note.trim().length === 0}
                    onClick={() => resolve(row.id)}
                  >
                    {t("resolve")}
                  </button>
                </div>
              ) : canResolve ? (
                <button type="button" className="rp-open" onClick={() => setAnswering(row.id)}>
                  {t("resolve")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="ic-error">{error}</p> : null}
    </section>
  );
}
