"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  statusTransitions,
  transitionActionKey,
  needsConfirm,
  type ProjectStatus,
  type PartyRole,
} from "@/lib/project-status";
import { setProjectStatus as setProjectStatusByToken } from "@/app/[locale]/p/[token]/actions";
import { setProjectStatus as setProjectStatusBySession } from "@/app/[locale]/app/[projectId]/actions";

export function ProjectStatusControl({
  token,
  projectId,
  role,
  status,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  role: PartyRole;
  status: ProjectStatus;
}) {
  const key = token ?? projectId;
  const setProjectStatus = token ? setProjectStatusByToken : setProjectStatusBySession;
  const t = useTranslations("status");
  const router = useRouter();
  const [current, setCurrent] = useState<ProjectStatus>(status);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // The move waiting for its "yes", shown inside the menu instead of the options.
  const [confirming, setConfirming] = useState<ProjectStatus | null>(null);
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  // Re-sync when the other party changes the status and a refresh re-renders
  // with a new prop (audit finding M11); mirrors the Stepper stale-state fix.
  useEffect(() => {
    setCurrent(status);
  }, [status]);

  // Close the menu on outside click or Escape (audit finding M10).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = statusTransitions(role, current);

  async function choose(next: ProjectStatus) {
    if (busy) return;
    // A move with no way back asks once, inside the menu, in words.
    if (needsConfirm(next) && confirming !== next) {
      setConfirming(next);
      return;
    }
    setBusy(true);
    try {
      const res = await setProjectStatus(key, next);
      if (res.ok) {
        setCurrent(res.status);
        router.refresh();
      }
      setOpen(false);
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="b-status" ref={ref}>
      <button
        type="button"
        className={`b-status-pill s-${current}`}
        onClick={() => {
          if (options.length === 0) return;
          setOpen((o) => !o);
          setConfirming(null);
        }}
        disabled={options.length === 0}
        aria-haspopup={options.length > 0}
        aria-expanded={open}
      >
        <span className="b-status-dot" />
        {t(current)}
        {options.length > 0 && <span className="b-status-caret">{open ? "▴" : "▾"}</span>}
      </button>
      {open && (
        <div className="b-status-menu">
          {confirming ? (
            <div
              className="b-status-confirm"
              role="alertdialog"
              aria-label={t(`action.${transitionActionKey(role, current, confirming)}`)}
            >
              <p className="b-status-confirm-t">{t("confirmCancel")}</p>
              <button
                type="button"
                className="b-status-opt b-status-danger"
                onClick={() => choose(confirming)}
                disabled={busy}
              >
                {t("confirmYes")}
              </button>
              <button
                type="button"
                className="b-status-opt"
                onClick={() => setConfirming(null)}
                disabled={busy}
              >
                {t("confirmNo")}
              </button>
            </div>
          ) : (
            <>
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="b-status-opt"
                  onClick={() => choose(opt)}
                  disabled={busy}
                >
                  {t(`action.${transitionActionKey(role, current, opt)}`)}
                </button>
              ))}
              {/* Where finishing went: to the acceptance, one tap away. Signed-in
                  sessions only, because /final refuses a project link. */}
              {role === "epc" &&
              !token &&
              (current === "active" || current === "paused" || current === "reviewing") ? (
                <a className="b-status-opt b-status-link" href={`/${locale}/app/${projectId}/final`}>
                  {t("finishViaAcceptance")}
                </a>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
