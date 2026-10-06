// A client-side delay that can be called off. Used to give a money decision
// five seconds of "Razveljavi" before the server ever hears about it: the
// server emits the notification the moment it decides, so an undo has to
// happen BEFORE the call, not after it. Framework-free so vitest pins it.

export const UNDO_MS = 5000;

export interface UndoQueue {
  schedule(id: string, fire: () => void, delayMs?: number): void;
  cancel(id: string): boolean;
  flushAll(): void;
  has(id: string): boolean;
}

interface Timers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createUndoQueue(timers: Timers = realTimers): UndoQueue {
  const pending = new Map<string, { handle: unknown; fire: () => void }>();
  return {
    schedule(id, fire, delayMs = UNDO_MS) {
      const existing = pending.get(id);
      if (existing) timers.clear(existing.handle);
      const handle = timers.set(() => {
        pending.delete(id);
        fire();
      }, delayMs);
      pending.set(id, { handle, fire });
    },
    cancel(id) {
      const entry = pending.get(id);
      if (!entry) return false;
      timers.clear(entry.handle);
      pending.delete(id);
      return true;
    },
    flushAll() {
      for (const [id, entry] of [...pending]) {
        timers.clear(entry.handle);
        pending.delete(id);
        entry.fire();
      }
    },
    has(id) {
      return pending.has(id);
    },
  };
}
