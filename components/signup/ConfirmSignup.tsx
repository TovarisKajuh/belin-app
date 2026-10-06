"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmSignupAction, type ConfirmSignupState } from "@/app/[locale]/registracija/potrdi/[token]/actions";
import { PendingButton } from "@/components/auth/PendingButton";
import type { ConfirmError } from "@/lib/signup-shared";

const INITIAL: ConfirmSignupState = { error: null };

export function ConfirmSignup({
  locale,
  token,
  cta,
  errors,
  loginLabel,
}: {
  locale: string;
  token: string;
  cta: string;
  errors: Record<ConfirmError, string>;
  loginLabel: string;
}) {
  const [state, formAction] = useActionState(confirmSignupAction, INITIAL);
  const needsLogin = state.error === "emailTaken" || state.error === "used";

  return (
    <form className="lp-form" action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="lp-error" role="alert">
          {errors[state.error]}
          {needsLogin && (
            <>
              {" "}
              <Link href={`/${locale}/login`}>{loginLabel}</Link>
            </>
          )}
        </p>
      )}
      <PendingButton className="lp-submit">{cta}</PendingButton>
    </form>
  );
}
