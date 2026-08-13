"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { claimCrewAction } from "@/app/[locale]/p/[token]/claim-actions";
import { normalizeCrewName } from "@/lib/crew-shared";

// Who is holding this phone.
//
// Seen once per device, ever. One tap for a name already on the crew, one short
// type for a new man, and then this screen is gone: what it mints is a session,
// and tomorrow the app opens from the home screen already signed in.
//
// Built for the same hand as the reporting screen: names are 56px targets in a
// single column, because this is happening in a van at seven in the morning.
export function CrewClaim({
  locale,
  token,
  roster,
  projectName,
}: {
  locale: string;
  token: string;
  roster: { id: string; fullName: string }[];
  projectName: string;
}) {
  const t = useTranslations("claim");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const claim = (choice: { personId: string } | { newName: string }) =>
    start(async () => {
      setError(null);
      const result = await claimCrewAction(locale, token, choice);
      // A success redirects and never returns; only a refusal comes back.
      if (result?.error) setError(t(result.error === "name" ? "errName" : "errInvalid"));
    });

  return (
    <main className="belin-dark cl-wrap">
      <div className="e-grain" aria-hidden />
      <div className="cl-card">
        <p className="cl-project">{projectName}</p>
        <h1 className="cl-title">{t("title")}</h1>
        <p className="cl-sub">{t("subtitle")}</p>

        {roster.length > 0 && (
          <div className="cl-roster">
            {roster.map((person) => (
              <button
                key={person.id}
                type="button"
                className="cl-name"
                disabled={pending}
                onClick={() => claim({ personId: person.id })}
              >
                {person.fullName}
              </button>
            ))}
          </div>
        )}

        <div className="cl-new">
          <span className="b-label">{roster.length > 0 ? t("newLabel") : t("newLabelFirst")}</span>
          <input
            className="b-field"
            value={newName}
            placeholder={t("newPlaceholder")}
            enterKeyHint="go"
            autoComplete="name"
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="button"
            className="cl-join"
            disabled={pending || normalizeCrewName(newName) === null}
            onClick={() => claim({ newName })}
          >
            {t("join")}
          </button>
        </div>

        {error ? <p className="ic-error">{error}</p> : null}
      </div>
    </main>
  );
}
