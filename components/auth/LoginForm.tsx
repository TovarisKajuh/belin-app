"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "@/app/actions/auth";

const INITIAL: LoginState = { error: null };

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form className="lp-form" action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />

      <label className="lp-field">
        <span className="lp-label">{t("username")}</span>
        <input
          className="lp-input"
          name="username"
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("password")}</span>
        <input
          className="lp-input"
          name="password"
          type="password"
          enterKeyHint="go"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error && (
        <p className="lp-error" role="alert">
          {t("invalid")}
        </p>
      )}

      <button className="lp-submit" type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
        <svg viewBox="0 0 24 24" aria-hidden width="17" height="17">
          <path
            d="M5 12h13M13 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
