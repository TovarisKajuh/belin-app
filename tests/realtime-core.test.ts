import { describe, it, expect } from "vitest";
import {
  reduceLive,
  initialLiveState,
  type LiveState,
  WAKE_THROTTLE_MS,
} from "@/lib/realtime-client-core";

describe("reduceLive", () => {
  it("a visible ping arms the debounce and does not refresh yet", () => {
    const d = reduceLive(initialLiveState(), { type: "ping", at: 100, hidden: false });
    expect(d.refresh).toBe(false);
    expect(d.scheduleDebounce).toBe(true);
    expect(d.state.debouncePending).toBe(true);
  });

  it("the debounce firing refreshes once", () => {
    let s = reduceLive(initialLiveState(), { type: "ping", at: 100, hidden: false }).state;
    const d = reduceLive(s, { type: "debounce", at: 1300 });
    expect(d.refresh).toBe(true);
    expect(d.state.debouncePending).toBe(false);
  });

  it("a burst of visible pings collapses to a single refresh", () => {
    let s = initialLiveState();
    let refreshes = 0;
    for (const at of [100, 300, 700, 1100]) {
      const d = reduceLive(s, { type: "ping", at, hidden: false });
      s = d.state;
      if (d.refresh) refreshes += 1;
    }
    // only the trailing debounce fires a refresh
    const fire = reduceLive(s, { type: "debounce", at: 2300 });
    if (fire.refresh) refreshes += 1;
    expect(refreshes).toBe(1);
  });

  it("a stale debounce (already consumed) does not double refresh", () => {
    let s = reduceLive(initialLiveState(), { type: "ping", at: 100, hidden: false }).state;
    s = reduceLive(s, { type: "debounce", at: 1300 }).state;
    const again = reduceLive(s, { type: "debounce", at: 1400 });
    expect(again.refresh).toBe(false);
  });

  it("a hidden ping sets dirty and does not refresh", () => {
    const d = reduceLive(initialLiveState(), { type: "ping", at: 100, hidden: true });
    expect(d.refresh).toBe(false);
    expect(d.state.dirty).toBe(true);
  });

  it("wake with the dirty flag refreshes once", () => {
    const dirty: LiveState = { ...initialLiveState(), dirty: true };
    const d = reduceLive(dirty, { type: "wake", at: 10_000 });
    expect(d.refresh).toBe(true);
    expect(d.state.dirty).toBe(false);
  });

  it("wake without dirty does nothing", () => {
    const d = reduceLive(initialLiveState(), { type: "wake", at: 10_000 });
    expect(d.refresh).toBe(false);
  });

  it("a second wake within the throttle window does not double refresh", () => {
    const dirty: LiveState = { ...initialLiveState(), dirty: true };
    const first = reduceLive(dirty, { type: "wake", at: 10_000 });
    expect(first.refresh).toBe(true);
    // becomes dirty again, then a rapid wake
    const reDirty: LiveState = { ...first.state, dirty: true };
    const second = reduceLive(reDirty, { type: "wake", at: 10_000 + WAKE_THROTTLE_MS - 1 });
    expect(second.refresh).toBe(false);
    expect(second.state.dirty).toBe(true); // kept for a later wake
  });

  it("channel error enables polling, subscribed disables it", () => {
    const err = reduceLive(initialLiveState(), { type: "status", value: "CHANNEL_ERROR", at: 0 });
    expect(err.setPolling).toBe(true);
    expect(err.state.polling).toBe(true);
    const ok = reduceLive(err.state, { type: "status", value: "SUBSCRIBED", at: 1 });
    expect(ok.setPolling).toBe(false);
    expect(ok.state.polling).toBe(false);
  });

  it("a poll tick refreshes, unless a ping debounce is pending", () => {
    const polling: LiveState = { ...initialLiveState(), polling: true };
    expect(reduceLive(polling, { type: "poll", at: 5000 }).refresh).toBe(true);

    const withPending: LiveState = { ...polling, debouncePending: true };
    expect(reduceLive(withPending, { type: "poll", at: 5000 }).refresh).toBe(false);
  });
});
