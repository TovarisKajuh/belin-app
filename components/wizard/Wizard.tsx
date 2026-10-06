"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createProjectAction, uploadPlanAction } from "@/app/[locale]/app/new/actions";
import type { DraftItem, DraftRoof, ProjectDraft } from "@/lib/k2/k2-project";
import type { SubOption } from "@/lib/data/plan-imports";
import { createSubInviteLink } from "@/app/[locale]/app/[projectId]/actions";
import { ShareLink } from "@/components/share/ShareLink";
import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { K2WarningCode } from "@/lib/k2/k2-shared";

type Step = "plan" | "review" | "sub" | "done";

const COUNTRIES = ["si", "de", "at"] as const;
const LANGUAGES = ["sl", "de", "en"] as const;

// The parser emits warning CODES, never i18n keys; the mapping to copy lives
// here, in the UI, which is the only layer that should know about namespaces.
const WARNING_KEY: Record<K2WarningCode, string> = {
  no_articles: "warnNoArticles",
  per_roof_fallback: "warnPerRoof",
  weight_mismatch: "warnWeight",
  meta_incomplete: "warnMeta",
};

const emptyDraft = (country: string, locale: string): ProjectDraft => ({
  name: "",
  addressStreet: null,
  addressZip: null,
  addressCity: null,
  country,
  // The manual path: there is no plan, so the country is by definition the
  // EPC's default and the review screen says so.
  countryFromPlan: false,
  language: locale,
  kwp: null,
  moduleCount: null,
  moduleType: null,
  mountingSystem: null,
  roofType: null,
  plannedStart: null,
  items: [],
  roofs: [],
});

export function Wizard({
  locale,
  subs,
  defaultCountry,
  session,
}: {
  locale: string;
  subs: SubOption[];
  defaultCountry: string;
  /** The command bar's account menu and role switch, rendered by the server page. */
  session?: React.ReactNode;
}) {
  const t = useTranslations("wizard");
  const tInvite = useTranslations("invite");
  const tShare = useTranslations("share");
  const tLanding = useTranslations("landing");

  const [step, setStep] = useState<Step>("plan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importId, setImportId] = useState<string | null>(null);
  const [recognized, setRecognized] = useState(false);
  const [warnings, setWarnings] = useState<K2WarningCode[]>([]);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft(defaultCountry, locale));
  const [items, setItems] = useState<DraftItem[]>([]);
  const [roofs, setRoofs] = useState<DraftRoof[]>([]);
  // "pick" an existing sub, "invite" a new company by link, or "later".
  const [subMode, setSubMode] = useState<"pick" | "invite" | "later">("later");
  const [subOrgId, setSubOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [created, setCreated] = useState<{ projectId: string; epcToken: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // A file dropped beside the box, or on any later step, must not navigate
  // the tab away from the wizard: Chrome opens a dropped PDF in place.
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  function set<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.set("plan", file);
    fd.set("locale", locale);
    fd.set("country", defaultCountry);

    try {
      const res = await uploadPlanAction(fd);
      if (!res.ok) {
        setError(
          res.error === "too_large"
            ? t("tooLarge")
            : res.error === "bad_type"
              ? t("badType")
              : t("uploadFailed"),
        );
        return;
      }
      setImportId(res.upload.importId);
      setRecognized(res.upload.recognized);
      setWarnings(res.upload.warnings);
      setDraft(res.upload.draft);
      setItems(res.upload.draft.items);
      setRoofs(res.upload.draft.roofs);
      setStep("review");
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onCommit() {
    if (busy || !importId) return;
    if (draft.name.trim() === "") {
      setError(t("nameRequired"));
      setStep("review");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await createProjectAction({
        importId,
        subOrgId: subMode === "pick" ? subOrgId : null,
        project: {
          name: draft.name.trim(),
          country: draft.country,
          language: draft.language,
          addressStreet: draft.addressStreet,
          addressZip: draft.addressZip,
          addressCity: draft.addressCity,
          kwp: draft.kwp,
          moduleCount: draft.moduleCount,
          moduleType: draft.moduleType,
          mountingSystem: draft.mountingSystem,
          roofType: draft.roofType,
          // Prefilled from the plan when it states an installation date, and
          // editable on the review screen like everything else.
          plannedStart: draft.plannedStart,
          plannedEnd: null,
        },
        items: items.filter((i) => i.name.trim() !== ""),
        roofs: roofs.filter((r) => r.name.trim() !== ""),
      });

      if (!res.ok) {
        setError(t("createFailed"));
        return;
      }
      setCreated({ projectId: res.projectId, epcToken: res.epcToken });

      // The invitation is minted AFTER the project exists, because it points at
      // that project. A failure here must not lose the project that was just
      // created, so it only costs the link.
      if (subMode === "invite") {
        const invite = await createSubInviteLink(
          res.projectId,
          inviteEmail.trim() || null,
          locale,
        );
        if (invite.ok) setInviteUrl(invite.url);
      }
      setStep("done");
    } catch {
      setError(t("createFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="belin-dark">
      <div className="e-grain" />

      <header className="e-bar">
        <div className="e-bar-in">
          <div className="e-brand">
            <div className="e-mark" aria-hidden="true">
              <i /><i /><i className="g" />
              <i /><i className="g" /><i className="g" />
              <i className="g" /><i className="g" /><i className="g" />
              <i /><i /><i />
            </div>
            <span className="e-wm">Belin</span>
            <span className="e-bproj">
              <b>{t("newProject")}</b>
            </span>
          </div>
          <div className="e-br">
            <LocaleSwitch label={tLanding("languageLabel")} />
            <Link href={`/${locale}/app/projects`} className="wz-exit">
              {t("back")}
            </Link>
            {session}
          </div>
        </div>
      </header>

      <div className="e-wrap">
        <Steps step={step} t={t} />

        {error && (
          <p className="wz-error" role="alert">
            {error}
          </p>
        )}

        {step === "plan" && (
          <section className="e-sec">
            <div
              className={dragOver ? "wz-drop wz-drop-over" : "wz-drop"}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (busy) return;
                const f = e.dataTransfer.files?.[0];
                if (f) void onFile(f);
              }}
            >
              <h1 className="wz-h1">{t("uploadPlan")}</h1>
              <p className="wz-hint">{t("uploadHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="wz-file"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <button
                type="button"
                className="wz-primary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? t("parsing") : t("pick")}
              </button>
            </div>
          </section>
        )}

        {step === "review" && (
          <section className="e-sec">
            <div className="wz-flags">
              {recognized ? (
                <span className="wz-ok">{t("recognized")}</span>
              ) : (
                <span className="wz-warn">{t("warnNotK2")}</span>
              )}
              {warnings.map((w) => (
                <span key={w} className="wz-warn">
                  {t(WARNING_KEY[w])}
                </span>
              ))}
            </div>

            <h2 className="e-sec-h">{t("metaTitle")}</h2>
            <div className="wz-grid">
              <Field label={t("fieldName")} wide>
                <input
                  className="b-field"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field label={t("fieldStreet")} wide>
                <input
                  className="b-field"
                  value={draft.addressStreet ?? ""}
                  onChange={(e) => set("addressStreet", e.target.value || null)}
                />
              </Field>
              <Field label={t("fieldZip")}>
                <input
                  className="b-field"
                  value={draft.addressZip ?? ""}
                  onChange={(e) => set("addressZip", e.target.value || null)}
                />
              </Field>
              <Field label={t("fieldCity")}>
                <input
                  className="b-field"
                  value={draft.addressCity ?? ""}
                  onChange={(e) => set("addressCity", e.target.value || null)}
                />
              </Field>
              <Field label={t("fieldCountry")}>
                <select
                  className={`b-field${draft.countryFromPlan ? "" : " wz-unread"}`}
                  value={draft.country}
                  onChange={(e) => set("country", e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
                {/* The plan did not say, so this is OUR default wearing the
                    same clothes as a fact read from the file. Country decides
                    the VAT clause on every invoice this project will produce,
                    so it says so out loud rather than looking confident. */}
                {!draft.countryFromPlan && (
                  <span className="wz-hint">{t("countryGuess")}</span>
                )}
              </Field>
              <Field label={t("fieldLanguage")}>
                <select
                  className="b-field"
                  value={draft.language}
                  onChange={(e) => set("language", e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("fieldKwp")}>
                <input
                  className="b-field e-mono"
                  inputMode="decimal"
                  value={draft.kwp ?? ""}
                  onChange={(e) => set("kwp", numberOrNull(e.target.value))}
                />
              </Field>
              <Field label={t("fieldModules")}>
                <input
                  className="b-field e-mono"
                  inputMode="numeric"
                  value={draft.moduleCount ?? ""}
                  onChange={(e) => set("moduleCount", numberOrNull(e.target.value))}
                />
              </Field>
              <Field label={t("fieldMounting")}>
                <input
                  className="b-field"
                  value={draft.mountingSystem ?? ""}
                  onChange={(e) => set("mountingSystem", e.target.value || null)}
                />
              </Field>
              <Field label={t("fieldRoof")}>
                <input
                  className="b-field"
                  value={draft.roofType ?? ""}
                  onChange={(e) => set("roofType", e.target.value || null)}
                />
              </Field>
              <Field label={t("fieldStart")}>
                {/* Prefilled when the plan states an installation date. Shown
                    rather than silently stored: the EPC reviews what it got. */}
                <input
                  className="b-field"
                  type="date"
                  value={draft.plannedStart ?? ""}
                  onChange={(e) => set("plannedStart", e.target.value || null)}
                />
              </Field>
            </div>

            {roofs.length > 0 && (
              <>
                <h2 className="e-sec-h wz-sec2">
                  {t("roofsTitle")}
                  <span className="wz-count e-mono">{roofs.length}</span>
                </h2>
                <p className="wz-subhint">{t("roofsHint")}</p>
                <div className="wz-roofs">
                  {roofs.map((roof, i) => (
                    <div className="wz-roof" key={i}>
                      <input
                        className="b-field wz-roof-name"
                        value={roof.name}
                        aria-label={t("roofName")}
                        onChange={(e) => updateRoof(setRoofs, i, { name: e.target.value })}
                      />
                      <label className="wz-roof-n">
                        <span className="wz-label">{t("roofModules")}</span>
                        <input
                          className="b-field e-mono"
                          inputMode="numeric"
                          value={roof.moduleCount ?? ""}
                          onChange={(e) =>
                            updateRoof(setRoofs, i, { moduleCount: numberOrNull(e.target.value) })
                          }
                        />
                      </label>
                      <label className="wz-roof-n">
                        <span className="wz-label">{t("roofKwp")}</span>
                        <input
                          className="b-field e-mono"
                          inputMode="decimal"
                          value={roof.kwp ?? ""}
                          onChange={(e) =>
                            updateRoof(setRoofs, i, { kwp: numberOrNull(e.target.value) })
                          }
                        />
                      </label>
                      {(roof.pitchDeg !== null || roof.covering) && (
                        <div className="wz-roof-spec">
                          {[roof.pitchDeg !== null ? `${roof.pitchDeg}°` : null, roof.covering]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                      {roof.moduleType && <div className="wz-roof-mod">{roof.moduleType}</div>}
                    </div>
                  ))}
                  {/* The roofs must add up to the project total, so the EPC can
                      see at a glance when an edit has broken that. */}
                  <div
                    className={`wz-roof-sum${roofSum(roofs) === draft.moduleCount ? "" : " off"}`}
                  >
                    {t("roofSum", { n: roofSum(roofs), total: draft.moduleCount ?? 0 })}
                  </div>
                </div>
              </>
            )}

            <h2 className="e-sec-h wz-sec2">
              {t("articlesTitle")}
              <span className="wz-count e-mono">{items.length}</span>
            </h2>
            <p className="wz-subhint">{t("articlesHint")}</p>

            {items.length === 0 ? (
              <p className="wz-empty">{t("noItems")}</p>
            ) : (
              <div className="wz-items">
                <div className="wz-items-head">
                  <span>{t("itemName")}</span>
                  <span>{t("itemQty")}</span>
                  <span>{t("itemUnit")}</span>
                  <span />
                </div>
                {items.map((item, i) => (
                  <div className="wz-item" key={i}>
                    <input
                      className="b-field"
                      value={item.name}
                      aria-label={t("itemName")}
                      onChange={(e) => updateItem(setItems, i, { name: e.target.value })}
                    />
                    <input
                      className="b-field e-mono"
                      inputMode="decimal"
                      value={item.qty}
                      aria-label={t("itemQty")}
                      onChange={(e) =>
                        updateItem(setItems, i, { qty: numberOrNull(e.target.value) ?? 0 })
                      }
                    />
                    <input
                      className="b-field"
                      value={item.unit}
                      aria-label={t("itemUnit")}
                      onChange={(e) => updateItem(setItems, i, { unit: e.target.value })}
                    />
                    <button
                      type="button"
                      className="wz-del"
                      aria-label={t("removeRow")}
                      onClick={() => setItems((rows) => rows.filter((_, j) => j !== i))}
                    >
                      <Icon icon={X} size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="wz-ghost"
              onClick={() =>
                setItems((rows) => [
                  ...rows,
                  { name: "", qty: 0, unit: "kos", sortOrder: rows.length },
                ])
              }
            >
              {t("addRow")}
            </button>

            <div className="wz-nav">
              <button type="button" className="wz-ghost" onClick={() => setStep("plan")}>
                {t("reread")}
              </button>
              <button type="button" className="wz-primary" onClick={() => setStep("sub")}>
                {t("next")}
              </button>
            </div>
          </section>
        )}

        {step === "sub" && (
          <section className="e-sec">
            <h2 className="e-sec-h">{t("subPick")}</h2>

            <div className="wz-subs" role="radiogroup" aria-label={t("subPick")}>
              {subs.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  role="radio"
                  aria-checked={subMode === "pick" && subOrgId === s.id}
                  className={`wz-sub${subMode === "pick" && subOrgId === s.id ? " on" : ""}`}
                  onClick={() => {
                    setSubMode("pick");
                    setSubOrgId(s.id);
                  }}
                >
                  {s.name}
                </button>
              ))}

              <button
                type="button"
                role="radio"
                aria-checked={subMode === "invite"}
                className={`wz-sub${subMode === "invite" ? " on" : ""}`}
                onClick={() => setSubMode("invite")}
              >
                {t("subInviteNew")}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={subMode === "later"}
                className={`wz-sub${subMode === "later" ? " on" : ""}`}
                onClick={() => setSubMode("later")}
              >
                {t("subSkip")}
              </button>
            </div>

            {subMode === "invite" && (
              <div className="wz-invite">
                <p className="wz-subhint">{t("subInviteHint")}</p>
                <label className="lp-field">
                  <span className="lp-label">{t("subInviteEmail")}</span>
                  <input
                    className="lp-input"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </label>
              </div>
            )}

            <div className="wz-nav">
              <button type="button" className="wz-ghost" onClick={() => setStep("review")}>
                {t("back")}
              </button>
              <button type="button" className="wz-primary" disabled={busy} onClick={onCommit}>
                {busy ? t("creating") : t("commit")}
              </button>
            </div>
          </section>
        )}

        {step === "done" && created && (
          <section className="e-sec wz-done">
            <div className="wz-eyebrow">{t("createdTitle")}</div>
            <h1 className="wz-h1">{draft.name}</h1>
            <p className="wz-hint">
              {t("articlesTitle")}: {items.length}
            </p>
            {inviteUrl && (
              <div className="wz-invite-done">
                <h2 className="e-sec-h">{t("subInviteReady")}</h2>
                <p className="wz-hint">{t("subInviteReadyHint")}</p>
                <ShareLink
                  url={inviteUrl}
                  subject={tInvite("subject")}
                  message={tInvite("shareMessage", { project: draft.name })}
                  labels={{
                    copy: tShare("copy"),
                    copied: tShare("copied"),
                    share: tShare("share"),
                    whatsapp: tShare("whatsapp"),
                    email: tShare("email"),
                  }}
                />
              </div>
            )}

            <Link className="wz-primary wz-link" href={`/${locale}/app/${created.projectId}`}>
              {t("openProject")}
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

function Steps({ step, t }: { step: Step; t: (k: string) => string }) {
  const order: Step[] = ["plan", "review", "sub"];
  const at = order.indexOf(step);
  const labels = [t("stepPlan"), t("stepReview"), t("stepSub")];

  return (
    <ol className="wz-steps">
      {labels.map((label, i) => (
        <li key={label} className={i === at ? "on" : i < at || step === "done" ? "done" : ""}>
          <span className="n e-mono">{i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`wz-field${wide ? " wide" : ""}`}>
      <span className="wz-label">{label}</span>
      {children}
    </label>
  );
}

function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function roofSum(roofs: DraftRoof[]): number {
  return roofs.reduce((n, r) => n + (r.moduleCount ?? 0), 0);
}

function updateRoof(
  setRoofs: React.Dispatch<React.SetStateAction<DraftRoof[]>>,
  index: number,
  patch: Partial<DraftRoof>,
) {
  setRoofs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
}

function updateItem(
  setItems: React.Dispatch<React.SetStateAction<DraftItem[]>>,
  index: number,
  patch: Partial<DraftItem>,
) {
  setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
}
