"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSubInviteLink } from "@/app/[locale]/app/[projectId]/actions";
import { ShareLink } from "@/components/share/ShareLink";

/**
 * Shown on a project that has no subcontractor yet. This is where an EPC
 * actually notices the gap, so this is where the invitation belongs, rather
 * than in a settings page nobody opens mid job.
 */
export function AddSubPanel({
  projectId,
  projectName,
  locale,
}: {
  projectId: string;
  projectName: string;
  locale: string;
}) {
  const t = useTranslations("project");
  const tInvite = useTranslations("invite");
  const tShare = useTranslations("share");

  const [email, setEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createSubInviteLink(projectId, email.trim() || null, locale);
      if (!res.ok) {
        setError(res.error === "alreadyLinked" ? t("subAlready") : t("subFailed"));
        return;
      }
      setUrl(res.url);
    } catch {
      setError(t("subFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="e-sec e-reveal">
      <h2 className="e-sec-h">{t("noSubTitle")}</h2>
      <div className="st-card st-card--form">
        {url ? (
          <>
            <p className="st-note">{t("subLinkReady")}</p>
            <ShareLink
              url={url}
              subject={tInvite("subject")}
              message={tInvite("shareMessage", { project: projectName })}
              labels={{
                copy: tShare("copy"),
                copied: tShare("copied"),
                share: tShare("share"),
                whatsapp: tShare("whatsapp"),
                email: tShare("email"),
              }}
            />
          </>
        ) : (
          <>
            <p className="st-note">{t("noSubHint")}</p>
            <label className="lp-field">
              <span className="lp-label">{t("subEmailOptional")}</span>
              <input
                className="lp-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="off"
                spellCheck={false}
              />
            </label>
            {error && (
              <p className="lp-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="lp-submit" onClick={generate} disabled={busy}>
              {busy ? t("subGenerating") : t("subGenerate")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
