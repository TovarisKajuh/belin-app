import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveActorFromToken, requireProjectActor } from "@/lib/actor";
import { getHoursPageData } from "@/lib/data/hours";
import { getProjectCore } from "@/lib/data/project-core";
import { CommandBar } from "@/components/project/CommandBar";
import { SheetList } from "@/components/hours/SheetList";

// The crew's own hour sheets, reached from their link.
//
// Writing down the hours you worked is site work, and the people who know what
// happened are the ones who were there, so a link may draft and submit. It may
// never DECIDE: canDecide is false here by construction, and the action refuses
// a link actor again on the server.
export default async function TokenHoursPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  const projectActor = await requireProjectActor(actor, actor.projectId);
  const core = await getProjectCore(projectActor);
  const data = await getHoursPageData(projectActor, false);
  if (!core || !data) notFound();

  return (
    <div className="belin-dark">
      <div className="e-grain" aria-hidden />
      <CommandBar
        token={token}
        projectId={actor.projectId}
        projectName={core.name}
        meta={core.addressCity}
        status={core.status}
        role={data.role}
      />

      <main className="container">
        <SheetList
          actionKey={token}
          projectId={actor.projectId}
          country={data.country}
          role={data.role}
          canDecide={false}
          sheets={data.sheets}
        />

        <p className="hr-back">
          <Link href={`/${locale}/p/${token}`}>&larr;</Link>
        </p>
      </main>
    </div>
  );
}
