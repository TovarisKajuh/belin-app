import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUndoQueue, UNDO_MS } from "@/lib/undo-queue";

describe("undo queue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires once after the delay", () => {
    const q = createUndoQueue();
    const fire = vi.fn();
    q.schedule("s1", fire);
    vi.advanceTimersByTime(UNDO_MS - 1);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(q.has("s1")).toBe(false);
  });

  it("never fires once cancelled", () => {
    const q = createUndoQueue();
    const fire = vi.fn();
    q.schedule("s1", fire);
    expect(q.cancel("s1")).toBe(true);
    vi.advanceTimersByTime(UNDO_MS * 2);
    expect(fire).not.toHaveBeenCalled();
    expect(q.cancel("s1")).toBe(false);
  });

  it("flushAll fires every pending action immediately, exactly once", () => {
    const q = createUndoQueue();
    const a = vi.fn();
    const b = vi.fn();
    q.schedule("a", a);
    q.schedule("b", b);
    q.flushAll();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UNDO_MS * 2);
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("rescheduling the same id keeps a single pending action", () => {
    const q = createUndoQueue();
    const first = vi.fn();
    const second = vi.fn();
    q.schedule("s1", first);
    q.schedule("s1", second);
    vi.advanceTimersByTime(UNDO_MS);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
