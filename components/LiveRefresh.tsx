"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { PING_EVENT } from "@/lib/realtime-shared";
import { setLiveSubscribed } from "@/lib/live-store";
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
// this only owns the timers and the router.refresh() call. Whether the channel
// is up goes to lib/live-store, which the header's LiveBadge reads.
export function LiveRefresh({ topic }: { topic: string }) {
  const router = useRouter();

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
        setLiveSubscribed(status === "SUBSCRIBED");
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
      setLiveSubscribed(false);
    };
  }, [topic, router]);

  return null;
}
