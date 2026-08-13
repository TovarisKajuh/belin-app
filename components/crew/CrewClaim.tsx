"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { claimCrewAction, type ClaimState } from "@/app/[locale]/p/[token]/claim-actions";

// A man on the roof joining the app, once, ever.
//
// He types his address, taps the link in his mail, and that phone is signed in
// from then on: the app opens from the home screen every morning with no login
// and no link. This is the SAME magic link the office uses, which is the point.
// One way into the product for everybody in it.
//
// An earlier version listed the crew's names and let you tap one. It was two
// fewer taps and completely wrong: anybody holding a forwarded link could file
// reports as Luka, and these reports are evidence. Holding the link proves you
// are on the site; the mail proves you are you.
export function CrewClaim({
  locale,
  token,
  projectName,
}: {
  locale: string;
  token: string;
  projectName: string;
}) {
  const t = useTranslations("claim");
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimCrewAction, {
    sent: false,
    error: null,
  });

  if (state.sent) {
    return (
      <main className="belin-dark cl-wrap">
        <div className="e-grain" aria-hidden />
        <div className="cl-card">
          <p className="cl-project">{projectName}</p>
          <h1 className="cl-title">{t("sentTitle")}</h1>
          <p className="cl-sub">{t("sentBody")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="belin-dark cl-wrap">
      <div className="e-grain" aria-hidden />
      <form className="cl-card" action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />

        <p className="cl-project">{projectName}</p>
        <h1 className="cl-title">{t("title")}</h1>
        <p className="cl-sub">{t("subtitle")}</p>

        <div className="cl-new">
          <span className="b-label">{t("nameLabel")}</span>
          <input
            className="b-field"
            name="fullName"
            placeholder={t("newPlaceholder")}
            autoComplete="name"
            enterKeyHint="next"
            required
          />

          <span className="b-label">{t("emailLabel")}</span>
          <input
            className="b-field"
            name="email"
            type="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            enterKeyHint="go"
            required
          />

          <button type="submit" className="cl-join" disabled={pending}>
            {pending ? t("joining") : t("join")}
          </button>
        </div>

        {state.error ? (
          <p className="ic-error">
            {t(state.error === "email" ? "errEmail" : state.error === "name" ? "errName" : "errInvalid")}
          </p>
        ) : null}
      </form>
    </main>
  );
}
