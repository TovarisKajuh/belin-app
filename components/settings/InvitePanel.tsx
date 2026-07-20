"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createInviteAction, type InviteState } from "@/app/[locale]/app/settings/actions";
import { PendingButton } from "@/components/auth/PendingButton";

const INITIAL: InviteState = { sent: false, error: null };

// Colleagues only. Inviting a SUBCONTRACTOR lives on the project itself (the
// wizard's sub step, and the panel on a project that has none), because that is
// the moment an EPC actually wants one; nobody opens settings mid job to add
// the company they are about to send to site.
export function InvitePanel({ locale }: { locale: string }) {
  const t = useTranslations("settings");

  return (
    <div className="st-grid">
      <InviteForm
        locale={locale}
        kind="epc_member"
        title={t("inviteMember")}
        note={t("inviteMemberNote")}
      >
        <label className="lp-field">
          <span className="lp-label">{t("role")}</span>
          {/* Bauleiter first and selected: an admin can spend money, so that
              grant has to be chosen rather than fallen into. */}
          <select className="lp-input" name="role" defaultValue="bauleiter">
            <option value="bauleiter">{t("roleBauleiter")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
        </label>
      </InviteForm>
    </div>
  );
}

function InviteForm({
  locale,
  kind,
  title,
  note,
  children,
}: {
  locale: string;
  kind: "sub_company" | "epc_member";
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("settings");
  const [state, formAction] = useActionState(createInviteAction, INITIAL);

  return (
    <form className="st-card" action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />

      <h3 className="st-h">{title}</h3>
      <p className="st-note">{note}</p>

      {children}

      <label className="lp-field">
        <span className="lp-label">{t("email")}</span>
        <input className="lp-input" name="email" type="email" autoComplete="off" required />
      </label>

      {state.error && (
        <p className="lp-error" role="alert">
          {state.error === "forbidden" ? t("inviteForbidden") : t("inviteInvalid")}
        </p>
      )}
      {state.sent && !state.error && (
        <p className="lp-note" role="status">
          {t("inviteSent")}
        </p>
      )}

      <PendingButton className="lp-submit">{t("inviteSend")}</PendingButton>
    </form>
  );
}
