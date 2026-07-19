// The per-project realtime topic and event name, shared by the server (which
// broadcasts) and the client (which subscribes). No payload crosses the
// channel, only a contentless ping; the client re-fetches through its
// authorized server components, so there is nothing to leak and no client-side
// merge to get wrong.

export function projectTopic(projectId: string): string {
  return `belin:project:${projectId}`;
}

export const PING_EVENT = "ping";
