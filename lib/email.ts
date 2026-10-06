import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export { renderEmail, escapeHtml, senderDomain } from "@/lib/email-shared";

// Outgoing mail. Four rules, each of them learned the expensive way somewhere:
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
// 4. The caller learns the outcome. Nothing may be MARKED as sent (an invoice
//    shared, a screen saying delivered) until this returned sent: true.

const DEFAULT_FROM = "Belin <obvestila@getbelin.com>";

/**
 * The sender. EMAIL_FROM exists for one reason: if the getbelin.com domain
 * fails verification in Resend (it lost its DKIM record once, unnoticed for
 * days), production can send from another verified domain by changing an
 * environment variable and redeploying, without a code change at night.
 */
export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export type SendResult = { sent: true; providerId: string | null } | { sent: false; reason: string };
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
}): Promise<SendResult> {
  const to = input.to.trim();

  if (input.refuseReason) {
    await logEmail(input, "failed", null, input.refuseReason);
    return { sent: false, reason: input.refuseReason };
  }

  if (DEMO_DOMAIN.test(to)) {
    await logEmail(input, "failed", null, "demo-domain");
    return { sent: false, reason: "demo-domain" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await logEmail(input, "failed", null, "no-api-key");
    return { sent: false, reason: "no-api-key" };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await Promise.race([
      resend.emails.send({
        from: emailFrom(),
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
      const reason = String(result.error.message ?? result.error);
      await logEmail(input, "failed", null, reason);
      return { sent: false, reason };
    }
    const providerId = result.data?.id ?? null;
    await logEmail(input, "sent", providerId, null);
    return { sent: true, providerId };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await logEmail(input, "failed", null, reason);
    return { sent: false, reason };
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
