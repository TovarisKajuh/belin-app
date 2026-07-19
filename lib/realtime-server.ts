import "server-only";
import { projectTopic, PING_EVENT } from "@/lib/realtime-shared";

// Broadcast a contentless ping on the project's topic after a write, so open
// clients re-run their server components. AWAITED at every call site (never
// fire-and-forget: a serverless function can freeze before a detached promise
// lands), but wrapped so it can never throw into the write path. A missed ping
// is harmless: the client refreshes on its next poll or wake.
export async function notifyProject(projectId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ topic: projectTopic(projectId), event: PING_EVENT, payload: {} }],
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // best effort
  }
}
