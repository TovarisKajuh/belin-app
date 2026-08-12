import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { getProjectCore } from "@/lib/data/project-core";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommandBar } from "@/components/project/CommandBar";
import { FinalHub } from "@/components/final/FinalHub";
import { getAcceptance } from "@/lib/data/acceptances";
import { getInvoice } from "@/lib/data/invoices";
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

  const { data: report } = await createAdminClient()
    .from("generated_documents")
    .select("id, created_at, storage_path")
    .eq("project_id", projectId)
    .eq("kind", "completion_report")
    .neq("storage_path", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const acceptance = await getAcceptance(actor, projectId);
  const invoice = await getInvoice(actor, projectId);

  // The accountant address belongs to the SUBCONTRACTOR, who issues the
  // invoice, so it is read from the acting person's own organization.
  const { data: ownOrg } = await createAdminClient()
    .from("organizations")
    .select("accountant_email")
    .eq("id", actor.orgId)
    .maybeSingle();

  // Prefilled, never enforced: whoever from the subcontractor is actually on
  // the roof signs, and that is often not the person in the company record.
  const { data: project } = await createAdminClient()
    .from("projects")
    .select("sub_org_id")
    .eq("id", projectId)
    .maybeSingle();

  let defaultSubSignerName: string | null = null;
  if (project?.sub_org_id) {
    const { data: subAdmin } = await createAdminClient()
      .from("people")
      .select("full_name")
      .eq("org_id", project.sub_org_id)
      .in("role", ["admin", "owner"])
      .limit(1)
      .maybeSingle();
    defaultSubSignerName = subAdmin?.full_name ?? null;
  }

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
          report={report ? { id: report.id, createdAt: report.created_at } : null}
          acceptance={acceptance}
          defaultSubSignerName={defaultSubSignerName}
          invoice={invoice}
          accountantEmail={ownOrg?.accountant_email ?? null}
          locale={core.language === "de" || core.language === "en" ? core.language : "sl"}
        />
      </main>
    </div>
  );
}
