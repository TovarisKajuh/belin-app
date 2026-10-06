"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  lookupVatAction,
  signupAction,
  type SignupState,
} from "@/app/[locale]/registracija/actions";
import { PendingButton } from "@/components/auth/PendingButton";

const INITIAL: SignupState = { status: "idle" };
const COUNTRIES = ["si", "at", "de"] as const;

type Note = "fromVies" | "validNoData" | "notFound" | "unavailable" | "badFormat";
const NOTE_KEY: Record<Note, string> = {
  fromVies: "vatFromVies",
  validNoData: "vatValidNoData",
  notFound: "vatNotFound",
  unavailable: "vatUnavailable",
  badFormat: "vatBadFormat",
};

// One screen, every input controlled: React 19 resets uncontrolled fields after
// a form action, and a person who mistyped one field must not lose the other
// six. The VAT number goes first because it fills two of the others.
export function SignupForm({ locale, contact }: { locale: string; contact: string }) {
  const t = useTranslations("signup");
  const [state, formAction] = useActionState(signupAction, INITIAL);
  const [checking, startCheck] = useTransition();

  const [vat, setVat] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState<string>("si");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const lastLookup = useRef("");
  // What VIES wrote, so a later lookup may replace its own text but never
  // something the person typed.
  const filled = useRef({ company: "", address: "" });

  function lookup(raw: string, fallback: string) {
    const key = `${fallback}:${raw.trim().toUpperCase()}`;
    if (!raw.trim() || key === lastLookup.current) return;
    lastLookup.current = key;

    startCheck(async () => {
      const res = await lookupVatAction(raw, fallback);
      if (res.status === "badFormat") {
        setNote("badFormat");
        return;
      }
      setVat(res.vat);
      setCountry(res.country);
      if (res.status !== "valid") {
        setNote(res.status === "invalid" ? "notFound" : "unavailable");
        return;
      }
      if (!res.name && !res.address) {
        setNote("validNoData");
        return;
      }
      const prev = filled.current;
      if (res.name) setCompany((cur) => (cur === "" || cur === prev.company ? res.name ?? cur : cur));
      if (res.address) setAddress((cur) => (cur === "" || cur === prev.address ? res.address ?? cur : cur));
      filled.current = { company: res.name ?? "", address: res.address ?? "" };
      setNote("fromVies");
    });
  }

  if (state.status === "sent") {
    return (
      <div className="su-sent" role="status">
        <h2 className="lp-card-title">{t("sentTitle")}</h2>
        <p className="lp-note">{t("sentBody", { email: state.email })}</p>
        <p className="su-hint">{t("sentHelp", { contact })}</p>
      </div>
    );
  }

  const noteClass =
    note === "fromVies" ? "su-hint is-ok" : note === "validNoData" ? "su-hint" : "su-hint is-warn";

  return (
    <form
      className="lp-form"
      action={formAction}
      noValidate
      onSubmit={(e) => {
        // React 19 calls form.reset() after an action passed as `action`. A
        // controlled text input survives that (React keeps its value attribute
        // in step), but a controlled checkbox falls back to its initial
        // defaultChecked: after any error the consent box showed unticked, and
        // the next submit failed with "consentRequired" for a person who had
        // ticked it. Dispatching the action ourselves inside a transition is
        // React's own opt out of the reset; useFormStatus still sees the
        // submit, so PendingButton keeps working, and without JavaScript the
        // `action` above still posts the form.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="lp-field">
        <span className="lp-label">{t("vatLabel")}</span>
        <input
          className="lp-input"
          name="vat"
          value={vat}
          onChange={(e) => {
            setVat(e.target.value);
            setNote(null);
          }}
          onBlur={(e) => lookup(e.target.value, country)}
          placeholder={t("vatPlaceholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="next"
        />
        {checking ? (
          <span className="su-hint" role="status">{t("vatChecking")}</span>
        ) : note ? (
          <span className={noteClass} role="status">{t(NOTE_KEY[note])}</span>
        ) : null}
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("companyLabel")}</span>
        <input className="lp-input" name="company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("addressLabel")}</span>
        <input className="lp-input" name="address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("countryLabel")}</span>
        <select
          className="lp-input"
          name="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            // A number typed without its prefix means something else in
            // another country, so it is looked up again.
            lastLookup.current = "";
            if (vat.trim()) lookup(vat, e.target.value);
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{t(`country_${c}`)}</option>
          ))}
        </select>
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("nameLabel")}</span>
        <input className="lp-input" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("emailLabel")}</span>
        <input
          className="lp-input"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <label className="lp-field">
        <span className="lp-label">{t("phoneLabel")}</span>
        <input className="lp-input" name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </label>

      <label className="su-check">
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {t.rich("consent", {
            terms: (chunks) => <Link href={`/${locale}/pogoji`} target="_blank" rel="noopener">{chunks}</Link>,
            privacy: (chunks) => <Link href={`/${locale}/zasebnost`} target="_blank" rel="noopener">{chunks}</Link>,
          })}
        </span>
      </label>

      <div className="su-hp" aria-hidden="true">
        <label>
          {t("honeypot")}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.status === "error" && (
        <p className="lp-error" role="alert">{t(`error_${state.error}`, { contact })}</p>
      )}

      <PendingButton className="lp-submit">{t("submit")}</PendingButton>
    </form>
  );
}
