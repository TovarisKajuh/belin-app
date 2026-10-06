"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { getLiveSnapshot, getServerLiveSnapshot, subscribeLive } from "@/lib/live-store";

// The "v živo" mark, inside the command bar. It used to float as a fixed pill
// under the bar, outside the content column, where it covered the crew tab bar
// and the status menu's cancel confirm on a phone. LiveRefresh owns the
// channel and reports through lib/live-store; this only reads it.
export function LiveBadge() {
  const t = useTranslations("dashboard");
  const { subscribed } = useSyncExternalStore(subscribeLive, getLiveSnapshot, getServerLiveSnapshot);
  if (!subscribed) return null;
  return (
    <span className="e-live hs-live">
      <span className="hs-live-t">{t("live")}</span>
    </span>
  );
}
