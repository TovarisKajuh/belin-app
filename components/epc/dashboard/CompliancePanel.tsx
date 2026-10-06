import { getLocale, getTranslations } from "next-intl/server";
import type { ComplianceDoc } from "@/lib/data/epc-dashboard";
import { fmtDate } from "@/lib/format";

// Whether the crew on the roof is legally allowed to be there.
//
// A1 and the Freistellungsbescheinigung lead the list and are shown even when
// nothing has been uploaded, because their ABSENCE is the finding: an EPC whose
// subcontractor has no A1 on file is the one who gets the letter from the
// customs authority, and a panel that only lists what exists would show that
// company a reassuring blank.
//
// The documents themselves are not linked. This panel answers "is it valid",
// which the EPC is entitled to know; opening an A1, which carries a named
// worker's identity data, stays with the company that uploaded it.

const LEAD_TYPES = ["a1", "freistellungsbescheinigung"] as const;

export async function CompliancePanel({
  docs,
  subName,
}: {
  docs: ComplianceDoc[];
  subName: string | null;
}) {
  const t = await getTranslations("dashboard");
  const tVault = await getTranslations("vault");
  const locale = await getLocale();

  const byType = new Map(docs.map((doc) => [doc.type, doc]));
  const lead = LEAD_TYPES.map((type) => ({ type, doc: byType.get(type) ?? null }));
  const rest = docs.filter((doc) => !LEAD_TYPES.includes(doc.type as (typeof LEAD_TYPES)[number]));

  const stateLabel = (doc: ComplianceDoc | null) => {
    if (!doc) return t("docMissing");
    if (doc.state === "expired") return tVault("expired");
    if (doc.state === "expiringSoon") return tVault("expiringSoon");
    return doc.validUntil ? `${tVault("validUntil")} ${fmtDate(doc.validUntil, locale)}` : tVault("noExpiry");
  };

  const dotClass = (doc: ComplianceDoc | null) =>
    !doc ? "cp-dot missing" : `cp-dot ${doc.state}`;

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("compliance")}</div>
      {subName ? <p className="cp-sub">{subName}</p> : null}

      <ul className="cp-list">
        {lead.map(({ type, doc }) => (
          <li key={type} className="cp-row">
            <span className={dotClass(doc)} aria-hidden />
            <span className="cp-name">{tVault(`types.${type}`)}</span>
            <span className="cp-state">{stateLabel(doc)}</span>
          </li>
        ))}
        {rest.map((doc) => (
          <li key={doc.id} className="cp-row">
            <span className={dotClass(doc)} aria-hidden />
            <span className="cp-name">{doc.title || tVault(`types.${doc.type}`)}</span>
            <span className="cp-state">{stateLabel(doc)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
