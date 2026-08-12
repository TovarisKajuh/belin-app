import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { isUuid } from "@/lib/actor-shared";
import { getPoPageData } from "@/lib/data/purchase-orders";
import { getProjectCore } from "@/lib/data/project-core";
import { requireProjectActor } from "@/lib/actor";
import { CommandBar } from "@/components/project/CommandBar";
import { AddSubPanel } from "@/components/project/AddSubPanel";
import { PoBuilder } from "@/components/po/PoBuilder";
import { PoView } from "@/components/po/PoView";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";

// The naročilnica screen. Signed in only, by design: this page is where a price
// is set and agreed, and a project link must never reach it.
export default async function PoPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) {
    redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/app/${projectId}/po`)}`);
  }
  // A PROJECT LINK IS REFUSED HERE, even though it opens the project's other
  // screens. The crew link is a shared secret: it gets forwarded into WhatsApp
  // groups, and it is shown as a QR code on a wall during demos. Reading it as
  // authorization to see the agreed contract price would publish that price to
  // everyone who ever glanced at the screen. The office reads the money.
  if (actor.kind !== "person") notFound();
  if (!isUuid(projectId)) notFound();

  let data;
  let core;
  try {
    const projectActor = await requireProjectActor(actor, projectId);
    // Crew people are office-free by design: they report from the roof and are
    // never asked to agree to a price.
    if (actor.kind === "person" && actor.role === "crew") notFound();
    data = await getPoPageData(actor, projectId);
    core = await getProjectCore(projectActor);
  } catch {
    notFound();
  }
  if (!data || !core) notFound();

  const t = await getTranslations("po");

  const city = core.addressCity ?? "";
  const suggestedFirstLine = [
    core.kwp ? `Montaža FV sistema ${core.kwp} kWp` : "Montaža FV sistema",
    city,
  ]
    .filter(Boolean)
    .join(", ");

  // The dark shell plus its grain layer, exactly as the dashboard and the crew
  // screen wrap themselves: the whole product reads as one surface.
  return (
    <div className="belin-dark">
      <div className="e-grain" />
      <CommandBar
        token={null}
        projectId={projectId}
        projectName={core.name}
        meta={city || null}
        status={core.status}
        role={data.role}
        locale={locale}
        active="po"
      />
      <LiveRefresh topic={projectTopic(projectId)} />

      <main className="container">
        {!data.hasSub ? (
          <section className="e-sec e-reveal">
            <div className="e-sec-h">{t("title")}</div>
            <p className="po-meta">{t("noSub")}</p>
            {/* The subcontractor is added right here rather than behind a link
                to settings: the moment you want one is the moment you are
                looking at the naročilnica you cannot send. */}
            <AddSubPanel projectId={projectId} projectName={core.name} locale={locale} />
          </section>
        ) : data.canManage && (!data.po || data.po.status === "draft" || data.po.status === "rejected") ? (
          <PoBuilder
            projectId={projectId}
            locale={data.locale}
            po={data.po}
            suggestedFirstLine={suggestedFirstLine}
          />
        ) : data.po ? (
          <PoView
            projectId={projectId}
            locale={data.locale}
            po={data.po}
            canDecide={data.canDecide}
            isSubSide={data.role === "sub"}
          />
        ) : (
          <section className="e-sec e-reveal">
            <div className="e-sec-h">{t("title")}</div>
            <p className="po-meta">{t("none")}</p>
          </section>
        )}
      </main>
    </div>
  );
}
