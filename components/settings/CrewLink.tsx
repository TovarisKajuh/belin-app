"use client";

import { useState } from "react";

// The crew's way onto a site: one link, copied and sent by whatever the crew
// already uses. No account, no password, no app install, because the person
// opening it is standing on a roof.
export function CrewLink({
  name,
  url,
  copyLabel,
  copiedLabel,
}: {
  name: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The link is on screen and selectable either way, so this is not worth
      // an error state.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="st-card">
      <h3 className="st-h">{name}</h3>
      <p className="st-url">{url}</p>
      <button type="button" className="lp-submit" onClick={copy}>
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
