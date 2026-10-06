// Whether the project's realtime channel is up, shared between LiveRefresh
// (which owns the channel) and the header badge (which shows it). A module
// store rather than a second subscription: one channel per page is enough.
// Only ever written from client effects; the server snapshot is always
// "not subscribed", so the badge renders nothing during SSR and hydration.

export interface LiveSnapshot {
  subscribed: boolean;
}

const SERVER: LiveSnapshot = { subscribed: false };
let current: LiveSnapshot = SERVER;
const listeners = new Set<() => void>();

export function setLiveSubscribed(subscribed: boolean): void {
  if (current.subscribed === subscribed) return;
  current = { subscribed };
  for (const listener of listeners) listener();
}

export function subscribeLive(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveSnapshot(): LiveSnapshot {
  return current;
}

export function getServerLiveSnapshot(): LiveSnapshot {
  return SERVER;
}
