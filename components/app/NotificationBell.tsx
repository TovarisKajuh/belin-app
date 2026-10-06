"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  loadNotificationsAction,
  markAllReadAction,
} from "@/app/[locale]/app/actions";
import type { NotificationRow } from "@/lib/data/notifications";
import { Icon } from "@/components/ui/Icon";
import { Bell, LoaderCircle } from "lucide-react";

// The bell. Deliberately modest: a count, a panel, and reading it empties it.
//
// Freshness comes from what already exists rather than from a second realtime
// channel: project pages refresh through the live ping, and the panel refetches
// when the tab wakes. A dedicated channel for notifications would double the
// realtime surface to make a number arrive a few seconds sooner.
//
// The one line per notification is rendered from the SAME catalog keys the
// emails use, so an event says the same thing in the inbox as in the inbox of
// the person's mail client.

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const t = useTranslations("notify");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  // Closing on an outside tap, and on Escape, because the panel covers content
  // on a phone and a trapped overlay on a roof is worse than no panel at all.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    startTransition(async () => {
      try {
        const loaded = await loadNotificationsAction();
        setRows(loaded);
        if (loaded.some((row) => row.readAt === null)) {
          await markAllReadAction();
          // The badge is cleared locally and the server is NOT re-rendered here.
          // A router.refresh() at this moment rebuilds the page underneath an
          // open panel, which made the list the reader is in the middle of
          // reading flicker away. The next navigation picks up the true count.
          setUnread(0);
        }
      } catch {
        setRows([]);
      }
    });
  };

  const line = (row: NotificationRow) => {
    // The body key may carry variables the payload does not have (an older row,
    // a kind whose payload shape changed). next-intl would throw on a missing
    // variable, so the raw key is the fallback rather than a crashed panel.
    try {
      return t(`body.${row.kind}`, row.payload);
    } catch {
      return t(`pref.${row.kind}`);
    }
  };

  return (
    <div className="nb" ref={panelRef}>
      <button
        type="button"
        className="nb-btn"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={t("title")}
        aria-expanded={open}
      >
        <Icon icon={Bell} size={17} />
        {unread > 0 ? <span className="nb-dot">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="nb-panel" role="dialog" aria-label={t("title")}>
          <div className="nb-h">{t("title")}</div>
          {rows === null ? (
            // A bare "..." reads as unfinished on the projector.
            <div className="nb-empty" role="status">
              <Icon icon={LoaderCircle} size={16} className="bt-spin" label={t("loading")} />
            </div>
          ) : rows.length === 0 ? (
            <div className="nb-empty">{t("empty")}</div>
          ) : (
            <ul className="nb-list">
              {rows.map((row) => (
                <li key={row.id} className={row.readAt === null ? "nb-i unread" : "nb-i"}>
                  <p className="nb-t">{line(row)}</p>
                  <p className="nb-m">
                    {row.projectName ? `${row.projectName} · ` : ""}
                    {format.relativeTime(new Date(row.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
