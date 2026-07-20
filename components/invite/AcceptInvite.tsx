"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptInviteAction, type AcceptState } from "@/app/[locale]/invite/[token]/actions";
import { PendingButton } from "@/components/auth/PendingButton";

const INITIAL: AcceptState = { error: null };

export function AcceptInvite({
  locale,
  token,
  needsOrgName,
  email,
  labels,
}: {
  locale: string;
  token: string;
  /** A subcontractor company is being created, so it needs a name. */
  needsOrgName: boolean;
  email: string;
  labels: {
    orgName: string;
    yourName: string;
    email: string;
    cta: string;
    invalid: string;
    alreadyLinked: string;
    emailTaken: string;
    login: string;
  };
}) {
  const [state, formAction] = useActionState(acceptInviteAction, INITIAL);

  return (
    <form className="lp-form" action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />

      {needsOrgName && (
        <label className="lp-field">
          <span className="lp-label">{labels.orgName}</span>
          <input className="lp-input" name="orgName" type="text" required />
        </label>
      )}

      <label className="lp-field">
        <span className="lp-label">{labels.yourName}</span>
        <input className="lp-input" name="fullName" type="text" autoComplete="name" required />
      </label>

      <label className="lp-field">
        <span className="lp-label">{labels.email}</span>
        <input
          className="lp-input"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          defaultValue={email}
          required
        />
      </label>

      {state.error && (
        <p className="lp-error" role="alert">
          {labels[state.error]}
          {state.error === "emailTaken" && (
            <>
              {" "}
              <Link href={`/${locale}`}>{labels.login}</Link>
            </>
          )}
        </p>
      )}

      <PendingButton className="lp-submit">{labels.cta}</PendingButton>
    </form>
  );
}
