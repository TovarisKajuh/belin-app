"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateOrgAction, type OrgFormState } from "@/app/[locale]/app/settings/actions";
import { PendingButton } from "@/components/auth/PendingButton";
import type { OrgSettings } from "@/lib/data/org-settings";

const INITIAL: OrgFormState = { saved: false, error: null };

// The company record. Three of these fields (VAT id, IBAN, accountant address)
// decide where money goes and what a tax authority sees, which is why the
// action behind this form is admin and owner only.
export function OrgForm({ locale, org }: { locale: string; org: OrgSettings }) {
  const t = useTranslations("settings");
  const [state, formAction] = useActionState(updateOrgAction, INITIAL);
  const tToast = useTranslations("toast");
  useEffect(() => {
    if (state.saved && !state.error) toast.success(tToast("orgSaved"));
  }, [state, tToast]);

  return (
    <form className="st-card st-card--form" action={formAction}>
      <input type="hidden" name="locale" value={locale} />

      <Field name="name" label={t("orgName")} defaultValue={org.name} required />
      <Field name="address" label={t("address")} defaultValue={org.address ?? ""} />

      <div className="st-row">
        <Field
          name="contactEmail"
          label={t("contactEmail")}
          type="email"
          defaultValue={org.contactEmail ?? ""}
        />
        <Field name="contactPhone" label={t("contactPhone")} defaultValue={org.contactPhone ?? ""} />
      </div>

      <div className="st-row">
        <Field name="vatId" label={t("vatId")} defaultValue={org.vatId ?? ""} />
        <Field name="iban" label={t("iban")} defaultValue={org.iban ?? ""} />
      </div>

      <Field
        name="accountantEmail"
        label={t("accountantEmail")}
        type="email"
        defaultValue={org.accountantEmail ?? ""}
        hint={t("accountantHint")}
      />

      {state.error && (
        <p className="lp-error" role="alert">
          {state.error === "forbidden" ? t("inviteForbidden") : t("inviteInvalid")}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="lp-note" role="status">
          {t("saved")}
        </p>
      )}

      <PendingButton className="lp-submit">{t("save")}</PendingButton>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="lp-field">
      <span className="lp-label">{label}</span>
      <input
        className="lp-input"
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoCapitalize="off"
        spellCheck={false}
        required={required}
      />
      {hint && <span className="st-hint">{hint}</span>}
    </label>
  );
}
