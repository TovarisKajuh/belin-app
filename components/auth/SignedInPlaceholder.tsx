import { getTranslations } from "next-intl/server";
import type { PersonActor } from "@/lib/actor";
import { BelinMark } from "@/components/BelinMark";

// TEMPORARY, replaced by Task B4's ProjectList and SubHome.
//
// It exists so the magic-link flow has somewhere real to land: without it a
// person session would resolve, find no surface that understands it, and bounce
// between the landing page and /app. Deliberately plain, because every pixel
// here is about to be thrown away.
export async function SignedInPlaceholder({ actor }: { actor: PersonActor }) {
  const t = await getTranslations("auth");

  return (
    <div className="belin-dark">
      <div className="e-grain" aria-hidden />
      <main className="e-wrap">
        <section className="e-sec e-reveal">
          <div className="e-brand" style={{ marginBottom: 18 }}>
            <BelinMark />
            <span className="e-wm">BELIN</span>
          </div>
          <h1 className="e-h1">{t("signedInTitle")}</h1>
          <p className="e-sub">{t("signedInAs", { name: actor.fullName })}</p>
        </section>
      </main>
    </div>
  );
}
