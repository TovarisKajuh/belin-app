"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  requestVaultUploadAction,
  addVaultDocAction,
} from "@/app/[locale]/app/settings/actions";
import { createBrowserClient } from "@/lib/supabase/client";
import { expiryState, VAULT_TYPES, type VaultType } from "@/lib/vault-shared";
import type { VaultDoc } from "@/lib/data/org-settings";

// The compliance vault. An A1 certificate that lapsed yesterday means the crew
// on the roof today is not legally posted, so the list leads with whatever
// expires first and says so in colour before anyone has to read a date.
export function VaultPanel({ docs, today }: { docs: VaultDoc[]; today: string }) {
  const t = useTranslations("vault");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"type" | "failed" | null>(null);
  const now = new Date(today);

  async function onSubmit(form: HTMLFormElement) {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const data = new FormData(form);
      const file = data.get("file");
      if (!(file instanceof File) || file.size === 0) {
        setError("failed");
        return;
      }

      // The mime type decides the stored extension, server side. The filename
      // is never used for anything that reaches a path.
      const target = await requestVaultUploadAction(file.type);
      if (!target.ok) {
        setError(target.error === "type" ? "type" : "failed");
        return;
      }

      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("docs")
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
      if (uploadError) {
        setError("failed");
        return;
      }

      data.set("storagePath", target.path);
      const result = await addVaultDocAction({ saved: false, error: null }, data);
      if (result.error) {
        setError("failed");
        return;
      }

      form.reset();
      startTransition(() => router.refresh());
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="st-grid">
      <form
        className="st-card st-card--form"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(e.currentTarget);
        }}
      >
        <h3 className="st-h">{t("upload")}</h3>

        <label className="lp-field">
          <span className="lp-label">{t("type")}</span>
          <select className="lp-input" name="type" defaultValue="a1">
            {VAULT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="lp-field">
          <span className="lp-label">{t("docTitle")}</span>
          <input className="lp-input" name="title" type="text" />
        </label>

        <div className="st-row">
          <label className="lp-field">
            <span className="lp-label">{t("validFrom")}</span>
            <input className="lp-input" name="validFrom" type="date" />
          </label>
          <label className="lp-field">
            <span className="lp-label">{t("validUntil")}</span>
            <input className="lp-input" name="validUntil" type="date" />
          </label>
        </div>

        <label className="lp-field">
          <span className="lp-label">{t("file")}</span>
          <input
            className="lp-input"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
          />
        </label>

        {error && (
          <p className="lp-error" role="alert">
            {error === "type" ? t("badType") : t("uploadFailed")}
          </p>
        )}

        <button className="lp-submit" type="submit" disabled={busy || pending}>
          {busy ? t("uploading") : t("upload")}
        </button>
      </form>

      <div className="st-card">
        <h3 className="st-h">{t("title")}</h3>
        {docs.length === 0 ? (
          <p className="st-note">{t("empty")}</p>
        ) : (
          <ul className="vt-list">
            {docs.map((doc) => {
              const state = expiryState(doc.validUntil, now);
              return (
                <li key={doc.id} className="vt-item">
                  <span className={`vt-dot vt-${state}`} aria-hidden />
                  <div className="vt-main">
                    <div className="vt-name">
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.title}
                        </a>
                      ) : (
                        doc.title
                      )}
                    </div>
                    <div className="vt-meta">
                      {t(`types.${doc.type}`)}
                      {doc.validUntil ? ` · ${t("validUntil")} ${doc.validUntil}` : ""}
                    </div>
                  </div>
                  {state !== "none" && state !== "valid" && (
                    <span className={`vt-badge vt-${state}`}>
                      {state === "expired" ? t("expired") : t("expiringSoon")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
