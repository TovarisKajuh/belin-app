import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export { renderEmail, escapeHtml } from "@/lib/email-shared";

// Outgoing mail. Three rules, each of them learned the expensive way somewhere:
//
// 1. A send never throws into a write path. An hour sheet that was submitted
//    stays submitted even if the notification bounces off a dead SMTP host.
// 2. Every attempt is written to email_log, sent or failed, including refusals.
//    Without that row, "did the link ever go out" is unanswerable.
// 3. On latency-sensitive paths (login, where response time would otherwise
//    reveal whether an address is registered) the caller wraps this in Next's
//    after(), which runs the send once the response is out. Do NOT detach the
//    promise instead: a serverless function can freeze before it lands, which
//    is the same reason notifyProject is awaited everywhere.

const FROM = "Belin <obvestila@getbelin.com>";
const SEND_TIMEOUT_MS = 4000;

// The demo seed populates people with addresses on *-demo.si, which is a domain
// nobody owns. Mail to them hard bounces, and enough hard bounces cost us the
// sending reputation of the real getbelin.com domain. Refuse them at the door
// and log the refusal so the skip is visible rather than mysterious.
const DEMO_DOMAIN = /-demo\.si$/i;

export async function sendEmail(input: {
  to: string;
  kind: string;
  projectId: string | null;
  subject: string;
  html: string;
  /**
   * Set when the caller has decided this mail must NOT go out (a missing base
   * URL, so every link in it would be dead). The attempt is written to
   * email_log as failed with this reason and nothing is sent. Rule 2 says every
   * attempt is visible; a refusal is an attempt with a known answer.
   */
  refuseReason?: string;
  /**
   * Files to attach. Used by the accountant share, which sends the invoice
   * PDF itself: an accountant who has to click a link, sign in and download is
   * an accountant who asks the subcontractor to email it instead.
   */
  attachments?: { filename: string; content: Buffer }[];
}): Promise<void> {
  const to = input.to.trim();

  if (input.refuseReason) {
    await logEmail(input, "failed", null, input.refuseReason);
    return;
  }

  if (DEMO_DOMAIN.test(to)) {
    await logEmail(input, "failed", null, "demo-domain");
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await logEmail(input, "failed", null, "no-api-key");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await Promise.race([
      resend.emails.send({
        from: FROM,
        to,
        subject: input.subject,
        html: input.html,
        ...(input.attachments?.length
          ? { attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
          : {}),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), SEND_TIMEOUT_MS),
      ),
    ]);

    if (result.error) {
      await logEmail(input, "failed", null, String(result.error.message ?? result.error));
      return;
    }
    await logEmail(input, "sent", result.data?.id ?? null, null);
  } catch (err) {
    await logEmail(input, "failed", null, err instanceof Error ? err.message : String(err));
  }
}

async function logEmail(
  input: { to: string; kind: string; projectId: string | null },
  status: "sent" | "failed",
  providerId: string | null,
  error: string | null,
): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("email_log").insert({
      to_email: input.to,
      kind: input.kind,
      project_id: input.projectId,
      status,
      provider_id: providerId,
      error,
    });
  } catch {
    // The log is diagnostics, not the product. If even this fails there is
    // nothing useful left to do, and throwing here would defeat rule 1.
  }
}
