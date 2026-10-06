"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  addCrewMemberAction,
  setCrewDisabledAction,
  type CrewState,
} from "@/app/[locale]/app/settings/actions";
import { normalizeCrewName } from "@/lib/crew-shared";

// The boss's crew, and the button that takes a man off it.
//
// This is what the shared link could never do. Under the old model removing one
// person meant revoking the link and re-issuing it to everyone else, so in
// practice nobody ever did it and a man who left kept the site in his pocket.
// Here removal is per person, immediate, and invisible to the rest of the crew.
export function CrewRoster({
  crew,
}: {
  crew: { id: string; fullName: string; email: string | null; disabledAt: string | null }[];
}) {
  const t = useTranslations("settings");
  const [state, addAction] = useActionState<CrewState, FormData>(addCrewMemberAction, {
    error: null,
  });
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const tToast = useTranslations("toast");

  // useActionState hands back a new state object after every submit; the
  // first one is the initial state, which is not a result.
  const firstState = useRef(state);
  useEffect(() => {
    if (state === firstState.current) return;
    // A refused name already shows its own line under the form.
    if (!state.error) toast.success(tToast("crewAdded"));
  }, [state, tToast]);

  const toggle = (personId: string, disabled: boolean) =>
    start(async () => {
      try {
        const res = await setCrewDisabledAction(personId, disabled);
        if (res.error) toast.error(tToast("crewFailed"));
        else toast.success(tToast(disabled ? "crewDisabled" : "crewEnabled"));
      } catch {
        toast.error(tToast("crewFailed"));
      }
    });

  return (
    <div className="st-card">
      <h2 className="e-sec-h">{t("crewRoster")}</h2>
      <p className="st-note">{t("crewRosterNote")}</p>

      {crew.length > 0 && (
        <ul className="cr-list">
          {crew.map((person) => (
            <li key={person.id} className={`cr-row${person.disabledAt ? " off" : ""}`}>
              <span className="cr-name">
                {person.fullName}
                {/* No address means no way in yet: he can still be added by his
                    boss and claim himself later through the site link, but the
                    boss should be able to see which of his men are actually
                    set up. */}
                {person.email ? (
                  <em className="cr-mail">{person.email}</em>
                ) : (
                  <em className="cr-mail cr-mail--none">{t("crewNoEmail")}</em>
                )}
              </span>
              {person.disabledAt && <span className="cr-tag">{t("crewDisabled")}</span>}
              <button
                type="button"
                className="cr-toggle"
                disabled={pending}
                onClick={() => toggle(person.id, !person.disabledAt)}
              >
                {person.disabledAt ? t("crewEnable") : t("crewDisable")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={addAction} className="cr-add">
        <input
          className="b-field"
          name="fullName"
          value={name}
          placeholder={t("crewAddPlaceholder")}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="b-field"
          name="email"
          type="email"
          inputMode="email"
          placeholder={t("crewAddEmail")}
        />
        <button type="submit" className="rp-send" disabled={normalizeCrewName(name) === null}>
          {t("crewAdd")}
        </button>
      </form>

      {state.error === "name" ? <p className="ic-error">{t("crewAddError")}</p> : null}
    </div>
  );
}
