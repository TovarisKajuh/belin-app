"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@/lib/supabase/client";
import { PING_EVENT } from "@/lib/realtime-shared";
import {
  reduceLive,
  initialLiveState,
  POLL_INTERVAL_MS,
  PING_DEBOUNCE_MS,
  type LiveState,
  type LiveEvent,
} from "@/lib/realtime-client-core";

// Subscribes to the project's realtime topic and re-runs the server components
// on a contentless ping. All timing decisions live in the pure reduceLive core;
// this only owns the timers, the router.refresh() call, and the live badge.
export function LiveRefresh({ topic, showBadge = false }: { topic: string; showBadge?: boolean }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [subscribed, setSubscribed] = useState(false);

  const stateRef = useRef<LiveState>(initialLiveState());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const dispatch = (event: LiveEvent) => {
      const d = reduceLive(stateRef.current, event);
      stateRef.current = d.state;
      if (d.refresh) router.refresh();
      if (d.scheduleDebounce) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
          () => dispatch({ type: "debounce", at: Date.now() }),
          PING_DEBOUNCE_MS
        );
      }
      if (d.setPolling === true && !pollRef.current) {
        pollRef.current = setInterval(() => dispatch({ type: "poll", at: Date.now() }), POLL_INTERVAL_MS);
      }
      if (d.setPolling === false && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(topic, { config: { broadcast: { self: true }, private: false } })
      .on("broadcast", { event: PING_EVENT }, () =>
        dispatch({ type: "ping", at: Date.now(), hidden: document.hidden })
      )
      .subscribe((status) => {
        setSubscribed(status === "SUBSCRIBED");
        dispatch({ type: "status", value: status, at: Date.now() });
      });

    const onWake = () => dispatch({ type: "wake", at: Date.now() });
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [topic, router]);

  if (!showBadge || !subscribed) return null;
  return (
    <div className="e-live-fixed">
      <span className="e-live">{t("live")}</span>
    </div>
  );
}
