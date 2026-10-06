import { getLocale, getTranslations } from "next-intl/server";
import type { IncidentRow } from "@/lib/data/incidents";
import { fmtDate } from "@/lib/format";
import { IncidentPhotos } from "./IncidentPhotos";
import { DashEmpty, IconCircleCheck } from "./DashEmpty";
import { CloudRain, Construction, TriangleAlert } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

// What went wrong on site, in the EPC's field of view.
//
// The rows are tinted by kind rather than labelled with a severity, because the
// three kinds mean different things to the person reading: an obstruction is
// usually THEIR problem to solve (somebody is blocking the crew), rain is
// nobody's fault and explains a slow day, and an incident is the one that may
// need a phone call. Colour carries that faster than a word does.
export async function IncidentsPanel({ incidents }: { incidents: IncidentRow[] }) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const tKinds = await getTranslations("incident.kinds");

  return (
    <section className="e-sec e-reveal">
      <div className="e-sec-h">{t("incidents")}</div>

      {incidents.length === 0 ? (
        <DashEmpty
          compact
          icon={<IconCircleCheck size={20} />}
          title={t("empty.incidentsTitle")}
          body={t("empty.incidentsBody")}
        />
      ) : (
        <ul className="ip-list">
          {incidents.map((incident) => (
            <li key={incident.id} className={`ip-row k-${incident.kind}`}>
              <div className="ip-head">
                <span className="ip-kind">
                  <Icon
                    icon={incident.kind === "rain_stop" ? CloudRain : incident.kind === "obstruction" ? Construction : TriangleAlert}
                    size={14}
                  />
                  {tKinds(incident.kind)}
                </span>
                <span className="ip-date">{fmtDate(incident.occurredOn, locale, { style: "dayMonth" })}</span>
              </div>

              {/* An empty note is normal for rain and obstructions: the kind is
                  the message, and the label above already carried it. */}
              {incident.note ? <p className="ip-note">{incident.note}</p> : null}

              {incident.authorName ? <p className="ip-who">{incident.authorName}</p> : null}

              {incident.photoUrls.length > 0 ? (
                <IncidentPhotos
                  urls={incident.photoUrls}
                  label={`${tKinds(incident.kind)} ${fmtDate(incident.occurredOn, locale, { style: "dayMonth" })}`}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
