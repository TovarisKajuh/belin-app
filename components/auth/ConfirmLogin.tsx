"use client";

import { useActionState } from "react";
import { confirmLoginAction, type ConfirmState } from "@/app/[locale]/auth/verify/[token]/actions";
import { PendingButton } from "./PendingButton";

const INITIAL: ConfirmState = { error: null };

// The one control that consumes a magic link. It is a POST for a reason: see
// the note on the page and on confirmLoginAction.
export function ConfirmLogin({
  locale,
  token,
  next,
  confirmLabel,
  invalidLabel,
}: {
  locale: string;
  token: string;
  next: string;
  confirmLabel: string;
  invalidLabel: string;
}) {
  const [state, formAction] = useActionState(confirmLoginAction, INITIAL);

  return (
    <form className="lp-form" action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p className="lp-error" role="alert">
          {invalidLabel}
        </p>
      )}

      <PendingButton className="lp-submit">{confirmLabel}</PendingButton>
    </form>
  );
}
