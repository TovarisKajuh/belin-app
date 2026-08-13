"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  crew: { id: string; fullName: string; disabledAt: string | null }[];
}) {
  const t = useTranslations("settings");
  const [state, addAction] = useActionState<CrewState, FormData>(addCrewMemberAction, {
    error: null,
  });
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const toggle = (personId: string, disabled: boolean) =>
    start(async () => {
      await setCrewDisabledAction(personId, disabled);
    });

  return (
    <div className="st-card">
      <h2 className="e-sec-h">{t("crewRoster")}</h2>
      <p className="st-note">{t("crewRosterNote")}</p>

      {crew.length > 0 && (
        <ul className="cr-list">
          {crew.map((person) => (
            <li key={person.id} className={`cr-row${person.disabledAt ? " off" : ""}`}>
              <span className="cr-name">{person.fullName}</span>
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
        <button type="submit" className="rp-send" disabled={normalizeCrewName(name) === null}>
          {t("crewAdd")}
        </button>
      </form>

      {state.error === "name" ? <p className="ic-error">{t("crewAddError")}</p> : null}
    </div>
  );
}
