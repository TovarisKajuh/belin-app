import { setRequestLocale } from "next-intl/server";
import { CrewHome } from "@/components/crew/CrewHome";
import { LogoutPill } from "@/components/auth/LogoutPill";
import { requireCrewSurface } from "../crew-route";

// The read half of the roof screen: how far the job has got, what the material
// check says, and what has been filed today. Everything here is something the
// crew LOOK at; everything they DO is one tab away on Poročaj.
export default async function CrewOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const { data, material } = await requireCrewSurface(locale, projectId);

  return (
    <>
      <CrewHome
        token={null}
        projectId={projectId}
        data={data}
        material={material}
        nav={{ locale, active: "overview" }}
      />
      <LogoutPill locale={locale} raised />
    </>
  );
}
