"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  statusTransitions,
  transitionActionKey,
  type ProjectStatus,
  type PartyRole,
} from "@/lib/project-status";
import { setProjectStatus } from "@/app/[locale]/p/[token]/actions";

export function ProjectStatusControl({
  token,
  role,
  status,
}: {
  token: string;
  role: PartyRole;
  status: ProjectStatus;
}) {
  const t = useTranslations("status");
  const router = useRouter();
  const [current, setCurrent] = useState<ProjectStatus>(status);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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
    setBusy(true);
    try {
      const res = await setProjectStatus(token, next);
      if (res.ok) {
        setCurrent(res.status);
        router.refresh();
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="b-status" ref={ref}>
      <button
        type="button"
        className={`b-status-pill s-${current}`}
        onClick={() => options.length > 0 && setOpen((o) => !o)}
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
        </div>
      )}
    </div>
  );
}
