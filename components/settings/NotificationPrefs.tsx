"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setNotificationPrefAction } from "@/app/[locale]/app/settings/actions";
import { recipientsFor, NOTIFY_KINDS, type NotifyKind } from "@/lib/notify-shared";

/**
 * A person's own email preferences, one switch per kind of event that actually
 * reaches their side. Showing an EPC a switch for events only subcontractors
 * receive would be a lie about what the switch does.
 *
 * Preferences are opt out: everything is on until switched off, so a person who
 * never opens this page still hears about the naročilnica waiting for them.
 */
export function NotificationPrefs({
  prefs,
  side,
}: {
  prefs: Record<string, unknown>;
  side: "epc" | "sub";
}) {
  const t = useTranslations("notify");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const kind of NOTIFY_KINDS) out[kind] = prefs[kind] !== false;
    return out;
  });

  const kinds = NOTIFY_KINDS.filter((kind) => recipientsFor(kind).includes(side));

  function toggle(kind: NotifyKind, wanted: boolean) {
    // Moved immediately, because a switch that waits for a round trip feels
    // broken. The server is the record; this is only the visible state.
    setLocal((prev) => ({ ...prev, [kind]: wanted }));

    const data = new FormData();
    data.set("kind", kind);
    data.set("wanted", wanted ? "1" : "0");
    startTransition(async () => {
      await setNotificationPrefAction(data);
      router.refresh();
    });
  }

  return (
    <div className="st-card">
      <ul className="np-list">
        {kinds.map((kind) => (
          <li key={kind} className="np-item">
            <span className="np-label">{t(`pref.${kind}`)}</span>
            <label className="np-switch">
              <input
                type="checkbox"
                checked={local[kind] ?? true}
                onChange={(e) => toggle(kind, e.currentTarget.checked)}
              />
              <span className="np-track" aria-hidden />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
