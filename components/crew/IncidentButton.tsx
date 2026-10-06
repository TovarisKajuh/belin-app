"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PhotoCapture } from "./PhotoCapture";
import { Sheet } from "@/components/ui/Sheet";
import { createBrowserClient } from "@/lib/supabase/client";
import { INCIDENT_KINDS, MAX_INCIDENT_PHOTOS, type IncidentKind } from "@/lib/incidents-shared";
import {
  requestIncidentPhotoTargets as targetsByToken,
  createIncidentAction as createByToken,
} from "@/app/[locale]/p/[token]/actions";
import {
  requestIncidentPhotoTargets as targetsBySession,
  createIncidentAction as createBySession,
} from "@/app/[locale]/app/[projectId]/actions";

// "Something went wrong" in under thirty seconds, one handed, in the rain.
//
// The kind is chosen first and is the only required input, because for a rain
// stop or an obstruction the kind IS the message. Only a general zaplet asks
// for words. Photos are optional and a failed upload never blocks the record:
// the fact that it happened, and when, is what the other side needs tonight.
//
// This sits OUTSIDE the material gate on the crew screen. Rain on day one,
// before the delivery has even arrived, is exactly the story this exists for.

export function IncidentButton({
  token,
  projectId,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
}) {
  const key = token ?? projectId;
  const requestTargets = token ? targetsByToken : targetsBySession;
  const createIncident = token ? createByToken : createBySession;

  const t = useTranslations("incident");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IncidentKind | null>(null);
  const [note, setNote] = useState("");
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One id per draft, not per attempt: a retry after a dropped connection must
  // upload into the same folder rather than orphan the first attempt's photos.
  const draftId = useRef<string>(crypto.randomUUID());

  const close = () => {
    setOpen(false);
    setKind(null);
    setNote("");
    setBlobs([]);
    setError(null);
  };

  const submit = async () => {
    if (!kind || busy) return;
    setBusy(true);
    setError(null);
    try {
      let photoPaths: string[] = [];
      if (blobs.length > 0) {
        const targets = await requestTargets(key, draftId.current, blobs.length);
        const supabase = createBrowserClient();
        const results = await Promise.all(
          targets.map((tg, i) =>
            supabase.storage.from("photos").uploadToSignedUrl(tg.path, tg.token, blobs[i], {
              contentType: "image/jpeg",
            }),
          ),
        );
        // Whatever landed, landed. A photo that failed to upload is not a
        // reason to lose the report it belonged to.
        photoPaths = targets.filter((_, i) => !results[i].error).map((tg) => tg.path);
      }

      await createIncident(key, {
        clientGeneratedId: draftId.current,
        kind,
        note,
        photoPaths,
      });

      setDone(true);
      draftId.current = crypto.randomUUID();
      setTimeout(() => {
        setDone(false);
        close();
        router.refresh();
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const code = message.startsWith("incident.err.") ? message.slice("incident.err.".length) : "generic";
      setError(t(`err.${["kind", "note", "photos"].includes(code) ? code : "generic"}`));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ic-cta" onClick={() => setOpen(true)}>
        {t("cta")}
      </button>
    );
  }

  return (
    <Sheet label={t("cta")} onClose={close} busy={busy}>
        <p className="ic-h">{t("title")}</p>

        <div className="ic-kinds">
          {INCIDENT_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              className={`ic-kind${kind === option ? " on" : ""}`}
              onClick={() => setKind(option)}
            >
              {t(`kinds.${option}`)}
            </button>
          ))}
        </div>

        {kind === "obstruction" ? <p className="ic-hint">{t("obstructionHint")}</p> : null}

        {kind ? (
          <>
            <label className="b-label" htmlFor="ic-note">
              {kind === "incident" ? t("note") : t("noteOptional")}
            </label>
            <textarea
              id="ic-note"
              className="b-field ic-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
            />

            <div className="ic-photos">
              <PhotoCapture
                blobs={blobs}
                onChange={(next) => setBlobs(next.slice(0, MAX_INCIDENT_PHOTOS))}
                addLabel={t("photos")}
              />
            </div>
          </>
        ) : null}

        {error ? <p className="ic-error">{error}</p> : null}

        <div className="ic-actions">
          <button
            type="button"
            className="b-btn"
            onClick={submit}
            disabled={!kind || busy || done}
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
