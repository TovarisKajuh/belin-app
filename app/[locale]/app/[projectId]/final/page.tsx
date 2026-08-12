import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { getProjectCore } from "@/lib/data/project-core";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommandBar } from "@/components/project/CommandBar";
import { FinalHub } from "@/components/final/FinalHub";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";

// The handover screen. Signed in only: a project link never reaches the acts
// that end a job and bill for it.
export default async function FinalPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) {
    redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/app/${projectId}/final`)}`);
  }
  if (actor.kind !== "person" || actor.role === "crew") notFound();
  if (!isUuid(projectId)) notFound();

  let core;
  let role: "epc" | "sub";
  try {
    const projectActor = await requireProjectActor(actor, projectId);
    role = projectActor.role;
    core = await getProjectCore(projectActor);
  } catch {
    notFound();
  }
  if (!core) notFound();

  // When the handover was requested, read from the activity trail rather than a
  // column: the event is already recorded there and a second source of the same
  // fact is a second thing to keep in step.
  const { data: requested } = await createAdminClient()
    .from("activity")
    .select("created_at")
    .eq("project_id", projectId)
    .eq("kind", "finalization_requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="belin-dark">
      <div className="e-grain" aria-hidden />
      <CommandBar
        token={null}
        projectId={projectId}
        projectName={core.name}
        meta={core.addressCity}
        status={core.status}
        role={role}
        locale={locale}
        active="final"
      />
      <LiveRefresh topic={projectTopic(projectId)} />

      <main className="container">
        <FinalHub
          projectId={projectId}
          status={core.status}
          role={role}
          isOffice={actor.role === "admin" || actor.role === "owner"}
          requestedAt={requested?.created_at ?? null}
        />
      </main>
    </div>
  );
}
