import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveActorFromToken, requireProjectActor } from "@/lib/actor";
import { getHoursPageData } from "@/lib/data/hours";
import { getProjectCore } from "@/lib/data/project-core";
import { CommandBar } from "@/components/project/CommandBar";
import { HoursTabs } from "@/components/hours/HoursTabs";

// The crew's own hour sheets, reached from their link.
//
// Writing down the hours you worked is site work, and the people who know what
// happened are the ones who were there, so a link may draft and submit. It may
// never DECIDE: canDecide is false here by construction, and the action refuses
// a link actor again on the server.
export default async function TokenHoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, token } = await params;
  const initialTab = (await searchParams).tab === "co" ? "co" : "hours";
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  const projectActor = await requireProjectActor(actor, actor.projectId);
  const core = await getProjectCore(projectActor);
  const data = await getHoursPageData(projectActor, false);
  if (!core || !data) notFound();

  const docLocale = core.language === "de" || core.language === "en" ? core.language : "sl";

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
        <HoursTabs
          actionKey={token}
          projectId={actor.projectId}
          locale={docLocale}
          country={data.country}
          role={data.role}
          canDecide={false}
          sheets={data.sheets}
          orders={data.orders}
          initialTab={initialTab}
          />

        <p className="hr-back">
          <Link href={`/${locale}/p/${token}`}>&larr;</Link>
        </p>
      </main>
    </div>
  );
}
