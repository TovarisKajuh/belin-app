import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CommandBar } from "@/components/project/CommandBar";
import { TodayPosts } from "@/components/project/TodayPosts";
import { LiveRefresh } from "@/components/LiveRefresh";
import { projectTopic } from "@/lib/realtime-shared";
import { formatMoney } from "@/lib/po-shared";
import type { CrewHomeData } from "@/lib/data/reports";
import type { MaterialState } from "@/lib/materials-shared";
import type { CardTone, SubWaiting } from "@/lib/sub-home-shared";
import { IncidentButton } from "@/components/crew/IncidentButton";

// The subcontractor OFFICE view: what is happening on my site, and what is
// waiting for my signature. Every card is a door into the screen where the
// thing is done, and the ones that are the office's move say so in gold.
//
// Until 2026-10-06 the four "Čaka na vas" cards were hard-coded empty states,
// so the office read "Naročilnice še ni." on a project whose naročilnica was
// waiting for its signature. They now come from getSubWaiting (six small reads)
// shaped by the pure, tested rules in lib/sub-home-shared.ts.
//
// Numbers and dates are formatted locally here because the shared formatter
// (lib/format.ts, Task 1.11) was deferred past the 06.10 meeting; swap these
// two helpers for it when it lands.
const INTL_LOCALE: Record<string, string> = { sl: "sl-SI", de: "de-DE", en: "en-GB" };

export async function SubHome({
  locale,
  projectId,
  data,
  material,
  crewToken,
  waiting,
}: {
  locale: string;
  projectId: string;
  data: CrewHomeData;
  material: MaterialState;
  /**
   * The project's crew link token, when this person may hold it. Most subs are
   * two to ten people and the boss is often on the roof himself, so the
   * reporting screen has to be one click from his own dashboard rather than a
   * link he digs out of Settings.
   */
  crewToken: string | null;
  waiting: SubWaiting;
}) {
  const t = await getTranslations("sub");
  const tw = await getTranslations("sub.waitingCards");
  const tCrew = await getTranslations("crew");
  const uiLocale = locale === "de" || locale === "en" ? locale : "sl";
  const intl = INTL_LOCALE[uiLocale];
  const num = (n: number, maxDecimals = 1) => new Intl.NumberFormat(intl, { maximumFractionDigits: maxDecimals }).format(n);
  const date = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(intl, { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Ljubljana" }).format(
          new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso),
        )
      : "";

  const address = [
    data.addressStreet,
    [data.addressZip, data.addressCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  // Shortfalls the crew actually recorded on the latest delivery check. Items
  // the check never covered are a separate signal (uncoveredOrChanged) and are
  // not shortfalls, so they are deliberately not counted here. With no check
  // at all the card says so, instead of a "0" that reads as "all delivered".
  const missing = (material.latest?.items ?? []).filter((i) => i.status !== "present").length;
  const base = `/${locale}/app/${projectId}`;

  const { po, hours, co, final } = waiting;
  const poNumber = { number: po.number ?? 0 };
  const poText =
    po.state === "none"
      ? tw("poNone")
      : po.state === "sent"
        ? po.tone === "action"
          ? tw("poSent", poNumber)
          : tw("poSentOffice", poNumber)
        : po.state === "accepted"
          ? tw("poAccepted", poNumber)
          : po.state === "rejected"
            ? tw("poRejected", poNumber)
            : tw("poCancelled", poNumber);
  const poMeta =
    po.state === "sent" && po.date
      ? tw("received", { date: date(po.date) })
      : po.state === "accepted" && po.date
        ? tw("acceptedOn", { date: date(po.date) })
        : null;

  const hoursText =
    hours.drafts > 0
      ? tw("hoursDrafts", { n: hours.drafts })
      : hours.awaiting > 0
        ? tw("hoursAwaiting", { n: hours.awaiting })
        : hours.approvedHours > 0
          ? tw("hoursApproved", { hours: num(hours.approvedHours) })
          : tw("hoursNone");
  const hoursMeta =
    [
      hours.awaiting > 0 && hours.nearestDaysLeft !== null ? tw("hoursCountdown", { days: hours.nearestDaysLeft }) : null,
      hours.rejected > 0 ? tw("hoursRejected", { n: hours.rejected }) : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;

  const coText =
    co.submitted > 0 ? tw("coAwaiting", { n: co.submitted }) : co.approved > 0 ? tw("coApproved", { n: co.approved }) : tw("coNone");
  const coMeta =
    co.approved > 0
      ? [tw("coTotal", { amount: formatMoney(co.approvedAmount, uiLocale) }), co.unpriced > 0 ? tw("coUnpriced", { n: co.unpriced }) : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  const finalText = {
    running: tw("finalRunning"),
    ready: final.tone === "action" ? tw("finalReady") : tw("finalReadyOffice"),
    requested: tw("finalRequested", { date: date(final.date) }),
    acceptanceOpen: tw("finalAcceptanceOpen"),
    accepted: final.tone === "action" ? tw("finalAccepted") : tw("finalAcceptedOffice"),
    invoiced: tw("finalInvoiced", { number: final.invoiceNumber ?? "", date: date(final.date) }),
    finished: tw("finalFinished"),
  }[final.state];

  return (
    <main className="belin-dark">
      <div className="e-grain" aria-hidden />
      <LiveRefresh topic={projectTopic(projectId)} />

      <CommandBar
        token={null}
        projectId={projectId}
        projectName={data.projectName}
        meta={address || null}
        status={data.status}
        role="sub"
        locale={locale}
        active="overview"
      />

      <div className="e-wrap">
        <section className="e-sec e-reveal">
          <div className="e-eyebrow">{t("eyebrow")}</div>

          {/* The office reports incidents too: a call from the crew often lands
              here first, and the person taking it should not have to open the
              crew link to write it down. */}
          <div className="sh-actions">
            <IncidentButton token={null} projectId={projectId} />
            {crewToken && (
              <Link href={`/${locale}/p/${crewToken}`} className="sh-crew">
                {t("openCrew")}
              </Link>
            )}
          </div>

          <div className="sh-grid">
            <div className="sh-card sh-card--wide">
              <span className="sh-lab">{tCrew("progress")}</span>
              <div className="sh-big">
                {num(data.progressPercent)}
                <span className="sh-unit"> %</span>
              </div>
              <div className="sh-bar" aria-hidden>
                <i style={{ width: `${Math.max(0, Math.min(100, data.progressPercent))}%` }} />
              </div>
            </div>

            <div className="sh-card">
              <span className="sh-lab">{t("material")}</span>
              {material.latest ? (
                <>
                  <div className="sh-big">{num(missing, 0)}</div>
                  <p className="sh-note">{missing === 0 ? t("materialOk") : t("materialMissing")}</p>
                </>
              ) : (
                <p className="sh-state sh-state--idle">{t("materialNone")}</p>
              )}
            </div>
          </div>
        </section>

        <section className="e-sec e-reveal">
          <h2 className="e-sec-h">
            {t("waiting")}
            {waiting.actionCount > 0 ? <span className="sh-count">{tw("count", { n: waiting.actionCount })}</span> : null}
          </h2>
          <div className="sh-grid">
            <WaitCard
              href={`${base}/po`}
              tone={po.tone}
              label={t("po")}
              text={poText}
              meta={poMeta}
              cta={po.tone === "action" ? tw("poReview") : tw("open")}
              flag={tw("yourMove")}
            />
            <WaitCard
              href={`${base}/hours`}
              tone={hours.tone}
              label={t("hours")}
              text={hoursText}
              meta={hoursMeta}
              cta={hours.drafts > 0 ? tw("hoursSubmit") : tw("open")}
              flag={tw("yourMove")}
            />
            <WaitCard
              href={`${base}/hours?tab=co`}
              tone={co.tone}
              label={t("changeOrders")}
              text={coText}
              meta={coMeta}
              cta={tw("open")}
              flag={tw("yourMove")}
            />
            <WaitCard
              href={`${base}/final`}
              tone={final.tone}
              label={t("finalization")}
              text={finalText}
              meta={null}
              cta={
                final.state === "ready" && final.tone === "action"
                  ? tw("finalRequest")
                  : final.state === "accepted" && final.tone === "action"
                    ? tw("finalInvoice")
                    : tw("open")
              }
              flag={tw("yourMove")}
            />
          </div>
        </section>

        <section className="e-sec e-reveal">
          <h2 className="e-sec-h">{t("fromSite")}</h2>
          <div className="sh-card">
            <TodayPosts posts={data.todayPosts} />
          </div>
        </section>
      </div>
    </main>
  );
}

function WaitCard({
  href,
  tone,
  label,
  text,
  meta,
  cta,
  flag,
}: {
  href: string;
  tone: CardTone;
  label: string;
  text: string;
  meta: string | null;
  cta: string;
  flag: string;
}) {
  return (
    <Link href={href} className={`sh-card sh-card--${tone}`}>
      <span className="sh-head">
        <span className="sh-lab">{label}</span>
        {tone === "action" ? <span className="sh-flag">{flag}</span> : null}
      </span>
      <span className="sh-state">{text}</span>
      {meta ? <span className="sh-note">{meta}</span> : null}
      <span className="sh-cta">
        {cta}
        <span aria-hidden> ›</span>
      </span>
    </Link>
  );
}
