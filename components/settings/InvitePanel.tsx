"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createInviteAction, type InviteState } from "@/app/[locale]/app/settings/actions";
import { PendingButton } from "@/components/auth/PendingButton";

const INITIAL: InviteState = { sent: false, error: null };

// The EPC's two invitations: a subcontractor company onto one project, and a
// colleague into their own organization. Nothing here can invite across an
// organization boundary except the first, which is the whole point of the
// matrix in lib/invites-shared.ts.
//
// Each card owns its own action state. Sharing one would announce "invitation
// sent" on the card the person did not use.
export function InvitePanel({
  locale,
  projects,
}: {
  locale: string;
  projects: { id: string; name: string }[];
}) {
  const t = useTranslations("settings");

  return (
    <div className="st-grid">
      {projects.length === 0 ? (
        // Every project already has a subcontractor. Said plainly, with the way
        // forward, rather than offering a form that can only be refused.
        <div className="st-card">
          <h3 className="st-h">{t("inviteSub")}</h3>
          <p className="st-note">{t("inviteSubNoProjects")}</p>
        </div>
      ) : (
        <InviteForm
          locale={locale}
          kind="sub_company"
          title={t("inviteSub")}
          note={t("inviteSubNote")}
        >
          <label className="lp-field">
            <span className="lp-label">{t("project")}</span>
            <select className="lp-input" name="projectId" required>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </InviteForm>
      )}

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
