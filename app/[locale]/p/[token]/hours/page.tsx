import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveActorFromToken, requireProjectActor } from "@/lib/actor";
import { resolveActorFromSession } from "@/lib/auth";
import { getHoursPageData } from "@/lib/data/hours";
import { getProjectCore } from "@/lib/data/project-core";
import { CommandBar } from "@/components/project/CommandBar";
import { HoursTabs } from "@/components/hours/HoursTabs";

// The crew's own hour sheets, reached from their link.
//
// Since crew claim a name, this is a doorway rather than a destination: an hour
// sheet is a claim for money, and an anonymous one has nobody's name on it. A
// claimed device goes to the same screen inside the app; anybody else is sent
// to the claim door first. Deciding was never possible here and still is not.
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

  if (actor.role === "sub") {
    const session = await resolveActorFromSession();
    const claimed =
      session?.kind === "person" && session.role === "crew" && session.orgId === actor.orgId;
    redirect(
      claimed
        ? `/${locale}/app/${actor.projectId}/hours`
        : `/${locale}/p/${token}`,
    );
  }

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
          showMoney={false}
          />

        <p className="hr-back">
          <Link href={`/${locale}/p/${token}`} aria-label={(await getTranslations("nav"))("overview")}>
            <Icon icon={ArrowLeft} size={22} />
          </Link>
        </p>
      </main>
    </div>
  );
}
