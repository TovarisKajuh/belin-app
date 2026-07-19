// Pure decision core for the live-refresh client. Kept framework-free so every
// timing rule is unit-tested without a browser or a websocket. The component
// owns the actual timers and the router.refresh() call; this decides WHEN.

export const PING_DEBOUNCE_MS = 1200; // collapse a burst of pings into one refresh
export const POLL_INTERVAL_MS = 25_000; // fallback cadence when the channel is down
export const WAKE_THROTTLE_MS = 5_000; // at most one wake-driven refresh per 5s

export interface LiveState {
  dirty: boolean; // a ping arrived while hidden; refresh on the next wake
  polling: boolean;
  lastRefreshAt: number;
  debouncePending: boolean; // a trailing ping-debounce timer is armed
}

export function initialLiveState(): LiveState {
  return { dirty: false, polling: false, lastRefreshAt: -Infinity, debouncePending: false };
}

export type LiveEvent =
  | { type: "ping"; at: number; hidden: boolean }
  | { type: "wake"; at: number }
  | { type: "status"; value: string; at: number }
  | { type: "debounce"; at: number } // the armed trailing timer fired
  | { type: "poll"; at: number };

export interface LiveDecision {
  state: LiveState;
  refresh: boolean; // call router.refresh() now
  scheduleDebounce: boolean; // (re)arm the 1200ms trailing timer
  setPolling: boolean | null; // start (true) / stop (false) the poll timer, or leave it (null)
}

export function reduceLive(state: LiveState, event: LiveEvent): LiveDecision {
  const base: LiveDecision = {
    state,
    refresh: false,
    scheduleDebounce: false,
    setPolling: null,
  };

  switch (event.type) {
    case "ping": {
      if (event.hidden) {
        // Do not refresh a hidden tab; remember to on the next wake.
        return { ...base, state: { ...state, dirty: true } };
      }
      // Visible: arm (or re-arm) the trailing debounce; the burst collapses to
      // one refresh when the timer fires.
      return { ...base, state: { ...state, debouncePending: true }, scheduleDebounce: true };
    }

    case "debounce": {
      if (!state.debouncePending) return base; // stale timer, superseded
      return {
        ...base,
        state: { ...state, debouncePending: false, lastRefreshAt: event.at },
        refresh: true,
      };
    }

    case "wake": {
      if (!state.dirty) return base;
      if (event.at - state.lastRefreshAt < WAKE_THROTTLE_MS) {
        // Throttled: keep dirty so a later wake past the window catches up.
        return base;
      }
      return {
        ...base,
        state: { ...state, dirty: false, lastRefreshAt: event.at },
        refresh: true,
      };
    }

    case "status": {
      if (event.value === "SUBSCRIBED") {
        if (!state.polling) return base;
        return { ...base, state: { ...state, polling: false }, setPolling: false };
      }
      if (event.value === "CHANNEL_ERROR" || event.value === "TIMED_OUT") {
        if (state.polling) return base;
        return { ...base, state: { ...state, polling: true }, setPolling: true };
      }
      return base;
    }

    case "poll": {
      // Suppress a poll tick that lands inside a live ping-debounce window; the
      // debounce refresh is about to fire anyway.
      if (state.debouncePending) return base;
      return { ...base, state: { ...state, lastRefreshAt: event.at }, refresh: true };
    }

    default:
      return base;
  }
}
