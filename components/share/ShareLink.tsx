"use client";

import { useState } from "react";

/**
 * A link plus every reasonable way to hand it to somebody.
 *
 * On a phone the native share sheet is the whole point: it offers WhatsApp,
 * SMS, Viber, email, whatever that person actually uses, without us guessing or
 * maintaining a row of brand buttons. On a desktop browser that sheet does not
 * exist, so the fallbacks are explicit: copy, WhatsApp, and email, which covers
 * how these companies actually pass a link around.
 */
export function ShareLink({
  url,
  message,
  subject,
  labels,
}: {
  url: string;
  /** The prewritten message. The link is appended when sharing. */
  message: string;
  subject: string;
  labels: {
    copy: string;
    copied: string;
    share: string;
    whatsapp: string;
    email: string;
  };
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Read once on mount rather than during render, so the server and the client
  // agree on the first paint and React does not complain about a mismatch.
  if (typeof window !== "undefined" && !canShare && typeof navigator.share === "function") {
    queueMicrotask(() => setCanShare(true));
  }

  const full = `${message}\n\n${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be refused; the link is on screen and selectable anyway.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: subject, text: message, url });
    } catch {
      // Cancelled or unavailable: nothing to report, the buttons remain.
    }
  }

  return (
    <div className="sl-wrap">
      <p className="st-url">{url}</p>

      <div className="sl-actions">
        <button type="button" className="lp-submit sl-primary" onClick={copy}>
          {copied ? labels.copied : labels.copy}
        </button>

        {canShare && (
          <button type="button" className="sl-btn" onClick={share}>
            {labels.share}
          </button>
        )}

        <a
          className="sl-btn"
          href={`https://wa.me/?text=${encodeURIComponent(full)}`}
          target="_blank"
          rel="noreferrer"
        >
          {labels.whatsapp}
        </a>

        <a
          className="sl-btn"
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(full)}`}
        >
          {labels.email}
        </a>
      </div>
    </div>
  );
}
