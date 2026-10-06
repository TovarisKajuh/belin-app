import { describe, expect, it, vi } from "vitest";
import { getLiveSnapshot, getServerLiveSnapshot, setLiveSubscribed, subscribeLive } from "@/lib/live-store";

describe("live store", () => {
  it("notifies only on change and never changes the server snapshot", () => {
    const listener = vi.fn();
    const off = subscribeLive(listener);
    setLiveSubscribed(true);
    setLiveSubscribed(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getLiveSnapshot().subscribed).toBe(true);
    expect(getServerLiveSnapshot().subscribed).toBe(false);
    off();
    setLiveSubscribed(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getLiveSnapshot().subscribed).toBe(false);
  });
});
