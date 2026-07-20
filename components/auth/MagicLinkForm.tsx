"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestMagicLink, type MagicLinkState } from "@/app/actions/auth";
import { PendingButton } from "./PendingButton";

const INITIAL: MagicLinkState = { sent: false };

// Email in, link out. There is deliberately no "we do not know that address"
// state: the answer is the same whatever was typed, so the form cannot be used
// to find out who has an account.
export function MagicLinkForm({ locale, next = "" }: { locale: string; next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(requestMagicLink, INITIAL);

  if (state.sent) {
    return (
      <p className="lp-note" role="status">
        {t("linkSent")}
      </p>
    );
  }

  return (
    <form className="lp-form" action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <label className="lp-field">
        <span className="lp-label">{t("emailLabel")}</span>
        <input
          className="lp-input"
          name="email"
          type="email"
          inputMode="email"
          enterKeyHint="go"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>

      <PendingButton className="lp-submit">{t("sendLink")}</PendingButton>
    </form>
  );
}
