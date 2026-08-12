import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { getHoursPageData } from "@/lib/data/hours";
import { getProjectCore } from "@/lib/data/project-core";
import { CommandBar } from "@/components/project/CommandBar";
import { SheetList } from "@/components/hours/SheetList";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";

// Regiestunden for a signed-in person. The crew reach the same screen through
// their link at /p/[token]/hours; what differs is only who may DECIDE.
export default async function HoursPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) {
    redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/app/${projectId}/hours`)}`);
  }
  if (!isUuid(projectId)) notFound();

  let data;
  let core;
  try {
    const projectActor = await requireProjectActor(actor, projectId);
    core = await getProjectCore(projectActor);
    // Deciding is an office act: admin or owner, and the Bauleiter, who is the
    // person actually on site checking whether those hours were really worked.
    const canDecide =
      actor.kind === "person" &&
      projectActor.role === "epc" &&
      ["admin", "owner", "bauleiter"].includes(actor.role);
    data = await getHoursPageData(projectActor, canDecide);
  } catch {
    notFound();
  }
  if (!data || !core) notFound();

  return (
    <div className="belin-dark">
      <div className="e-grain" aria-hidden />
      <CommandBar
        token={null}
        projectId={projectId}
        projectName={core.name}
        meta={core.addressCity}
        status={core.status}
        role={data.role}
        locale={locale}
        active="hours"
      />
      <LiveRefresh topic={projectTopic(projectId)} />

      <main className="container">
        <SheetList
          actionKey={projectId}
          projectId={projectId}
          country={data.country}
          role={data.role}
          canDecide={data.canDecide}
          sheets={data.sheets}
        />
      </main>
    </div>
  );
}
