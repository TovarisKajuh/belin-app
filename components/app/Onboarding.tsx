import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SUPPORT } from "@/lib/legal";
import { getOrgName } from "@/lib/data/orgs";
import { firstName } from "@/lib/onboarding-shared";
import type { PersonActor } from "@/lib/actor";

/**
 * What an EPC sees before its first project: three steps, the first one a
 * button, and a person to call beside them. It replaces the one-line empty
 * state of the portfolio and disappears the moment a project exists.
 */
export async function Onboarding({
  locale,
  actor,
  welcome,
}: {
  locale: string;
  actor: PersonActor;
  /** Arrived straight from the signup confirmation. */
  welcome: boolean;
}) {
  const t = await getTranslations("onboarding");
  const company = welcome ? await getOrgName(actor.orgId) : null;
  const phoneHref = SUPPORT.phone ? `tel:${SUPPORT.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="ob">
      <div className="ob-head">
        <h1 className="ob-title">{t("welcome", { name: firstName(actor.fullName) })}</h1>
        {company && <p className="ob-created">{t("created", { company })}</p>}
        <p className="ob-lead">{t("lead")}</p>
      </div>

      <div className="ob-grid">
        <ol className="ob-steps">
          <li className="ob-step is-next">
            <span className="ob-num e-mono" aria-hidden>1</span>
            <div>
              <h2 className="ob-step-h">{t("step1Title")}</h2>
              <p className="ob-step-p">{t("step1Body")}</p>
              <Link href={`/${locale}/app/new`} className="ob-cta">{t("step1Cta")}</Link>
            </div>
          </li>
          <li className="ob-step">
            <span className="ob-num e-mono" aria-hidden>2</span>
            <div>
              <h2 className="ob-step-h">
                {t("step2Title")} <span className="ob-later">{t("later")}</span>
              </h2>
              <p className="ob-step-p">{t("step2Body")}</p>
            </div>
          </li>
          <li className="ob-step">
            <span className="ob-num e-mono" aria-hidden>3</span>
            <div>
              <h2 className="ob-step-h">
                {t("step3Title")} <span className="ob-later">{t("later")}</span>
              </h2>
              <p className="ob-step-p">{t("step3Body")}</p>
            </div>
          </li>
        </ol>

        <aside className="ob-side">
          <div className="ob-card">
            <span className="ob-card-h">{t("helpTitle")}</span>
            <span className="ob-card-p">{t("helpBody")}</span>
            <a className="ob-contact" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            {SUPPORT.phone && phoneHref && (
              <a className="ob-contact" href={phoneHref}>{SUPPORT.phone}</a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
