// The email shell, kept pure so it can be tested without touching the provider.
//
// Everything is a table with inline styles: that is the only layout that
// survives Outlook, Gmail and the various mobile clients a Bauleiter actually
// reads mail in. No stylesheet, no script, no remote image, so nothing is
// stripped on the way in and no read receipt leaks on the way out.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Every interpolated value passes through here, including the CTA url, which
// lands inside an href attribute. Body lines carry text typed by crew on a
// roof: unescaped, that text could put an arbitrary link into the other side's
// inbox under our own verified sending domain.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const NAVY = "#0b1524";
const GOLD = "#d4a843";
const INK = "#1a2332";
const MUTED = "#6b7684";
const PAPER = "#f4f5f7";

export function renderEmail(
  heading: string,
  bodyLines: string[],
  ctaLabel: string,
  ctaUrl: string,
): string {
  const lines = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${INK};">${escapeHtml(line)}</p>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAPER};margin:0;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background-color:${NAVY};padding:20px 24px;">
            <span style="font-size:18px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">Belin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;font-weight:700;color:${NAVY};">${escapeHtml(heading)}</h1>
            ${lines}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 32px;">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background-color:${GOLD};color:${NAVY};font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 22px;border-top:1px solid #e6e8ec;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">Belin, getbelin.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** The domain of a From address, lowercased: what Resend must report as verified. */
export function senderDomain(from: string): string {
  return (from.match(/@([A-Za-z0-9.-]+)/)?.[1] ?? "").toLowerCase();
}
