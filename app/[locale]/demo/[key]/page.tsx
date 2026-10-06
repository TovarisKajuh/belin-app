import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import QRCode from "qrcode";
import { appBaseUrl } from "@/lib/app-url";
import { doorOpen, signGuestPayload, GUEST_QR_TTL_MS } from "@/lib/demo/door";
import {
  DEMO_PERSONAS,
  ENTRY_TARGETS,
  PERSONA_NOTE_KEY,
  PERSONA_ROLE_KEY,
  SWITCHABLE_PERSONAS,
  type DemoEntryTarget,
  type DemoProjectKey,
} from "@/lib/demo/personas";
import { getDemoHealth } from "@/lib/demo/health";
import { dbLight, freshLight, poLight, regionLight, sheetLight, type LightState } from "@/lib/demo/health-shared";
import { lastSiteDayBefore, todayInLjubljana } from "@/lib/demo/calendar";
import { enterAsAction } from "./actions";

// The presenter panel. Its URL carries the door key, so: never indexed, never
// cached, and no Referer header ever leaves for another site. "same-origin",
// not "no-referrer": with no-referrer Chrome sends "Origin: null" on the
// persona form's server-action POST, and Next 15.5's action handler does
// new URL(origin), which throws and turns every persona button into a 500.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Belin",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

const TARGET_LABEL: Record<DemoEntryTarget, string> = {
  trenutno: "projectTrenutno",
  dan1: "projectDan1",
  portfelj: "projectPortfolio",
};
const ERROR_KEY: Record<string, string> = {
  missing: "errorMissing",
  "not-demo": "errorNotDemo",
  disabled: "errorDisabled",
};

function slDate(value: string): string {
  const date = value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Ljubljana",
  }).format(date);
}

const qrSvg = (text: string) =>
  QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a1628ff", light: "#ffffffff" },
  });

export default async function DemoDoorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; key: string }>;
  searchParams: Promise<{ gost?: string; napaka?: string }>;
}) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  if (!doorOpen(key)) notFound();

  const { gost, napaka } = await searchParams;
  const guestProject: DemoProjectKey = gost === "dan1" ? "dan1" : "trenutno";
  const t = await getTranslations("demo");
  const now = new Date();
  const today = todayInLjubljana(now);
  const health = await getDemoHealth();

  const sig = signGuestPayload({ persona: "guest", project: guestProject, exp: now.getTime() + GUEST_QR_TTL_MS });
  if (!sig) notFound();
  const base = appBaseUrl();
  const guestPath = `/${locale}/demo/gost/${sig}`;
  const guestUrl = base ? `${base}${guestPath}` : guestPath;
  const [guestSvg, selfSvg] = await Promise.all([
    base ? qrSvg(guestUrl) : Promise.resolve(null),
    base ? qrSvg(`${base}/${locale}/demo/${key}`) : Promise.resolve(null),
  ]);

  const fresh = freshLight(health.fresh, today);
  const sheet = sheetLight(health.sheet, now);
  const po = poLight(health.po);
  const lights: { label: string; state: LightState; value: string }[] = [
    {
      label: t("lightDb"),
      state: dbLight(health.db),
      value: !health.db.ok
        ? t("lightDbDown")
        : !health.db.flagged
          ? t("lightDbFlags")
          : t("lightDbOk", { ms: health.db.ms ?? 0 }),
    },
    {
      label: t("lightRegion"),
      state: regionLight(health.region),
      value: health.region ? t("lightRegionValue", { region: health.region }) : t("lightRegionLocal"),
    },
    {
      label: t("lightFresh"),
      state: fresh,
      value: !health.fresh
        ? t("lightFreshNone")
        : fresh === "ok"
          ? slDate(health.fresh)
          : t("lightFreshStale", { last: slDate(health.fresh), expected: slDate(lastSiteDayBefore(today)) }),
    },
    {
      label: t("lightSheet"),
      state: sheet,
      value: sheet === "ok" && health.sheet?.deadline_at ? t("lightSheetOk", { deadline: slDate(health.sheet.deadline_at) }) : t("lightSheetBad"),
    },
    { label: t("lightPo"), state: po, value: po === "ok" ? t("lightPoOk") : t("lightPoBad") },
  ];

  const until = process.env.DEMO_DOOR_UNTIL ?? "";

  return (
    <main className="belin-dark dm-page">
      <div className="e-grain" aria-hidden />
      <div className="e-wrap">
        <header className="dm-head">
          <h1 className="dm-title">{t("panelTitle")}</h1>
          <p className="dm-sub">{t("panelSub", { until: slDate(until) })}</p>
          {napaka && ERROR_KEY[napaka] ? (
            <p className="dm-alert" role="alert">
              {t(ERROR_KEY[napaka])}
            </p>
          ) : null}
        </header>

        <section className="e-sec" aria-labelledby="dm-health">
          <h2 id="dm-health" className="e-sec-h">
            {t("healthTitle")}
          </h2>
          <ul className="dm-lights">
            {lights.map((light) => (
              <li key={light.label} className="dm-light" data-state={light.state}>
                <span className={`dm-dot ${light.state}`} aria-hidden />
                <span>
                  <span className="dm-light-l">{light.label}</span>
                  <span className="dm-light-v">{light.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="e-sec" aria-labelledby="dm-personas">
          <h2 id="dm-personas" className="e-sec-h">
            {t("personasTitle")}
          </h2>
          <div className="dm-personas">
            {SWITCHABLE_PERSONAS.map((persona) => (
              <article key={persona} className="dm-card">
                <h3 className="dm-card-name">{DEMO_PERSONAS[persona].name}</h3>
                <p className="dm-card-role">{t(PERSONA_ROLE_KEY[persona])}</p>
                <p className="dm-card-note">{t(PERSONA_NOTE_KEY[persona])}</p>
                <div className="dm-card-go">
                  {ENTRY_TARGETS[persona].map((target, i) => (
                    <form key={target} action={enterAsAction}>
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="persona" value={persona} />
                      <input type="hidden" name="project" value={target} />
                      <button
                        type="submit"
                        className={i === 0 ? "dm-btn dm-btn--primary" : "dm-btn"}
                        data-persona={persona}
                        data-project={target}
                      >
                        {t(TARGET_LABEL[target])}
                      </button>
                    </form>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="e-sec" aria-labelledby="dm-guest">
          <h2 id="dm-guest" className="e-sec-h">
            {t("guestTitle")}
          </h2>
          <div className="dm-guest">
            {guestSvg ? (
              <div className="dm-qr" dangerouslySetInnerHTML={{ __html: guestSvg }} />
            ) : (
              <p className="dm-guest-n">{t("guestNoBase")}</p>
            )}
            <div>
              <p className="dm-guest-t">
                {t("guestBody", { project: t(TARGET_LABEL[guestProject]) })}
              </p>
              <p className="dm-guest-n">{t("guestValid")}</p>
              <div className="dm-guest-links">
                <a className="dm-link" href={`/${locale}/demo/${key}?gost=trenutno`} aria-current={guestProject === "trenutno" ? "true" : undefined}>
                  {t("projectTrenutno")}
                </a>
                <a className="dm-link" href={`/${locale}/demo/${key}?gost=dan1`} aria-current={guestProject === "dan1" ? "true" : undefined}>
                  {t("projectDan1")}
                </a>
                <a className="dm-link" href={`/${locale}/demo/${key}?gost=${guestProject}`}>
                  {t("guestRefresh")}
                </a>
                <a className="dm-link dm-qr-link" href={guestUrl}>
                  {t("guestOpenHere")}
                </a>
              </div>
            </div>
          </div>

          {selfSvg ? (
            <details className="dm-self">
              <summary>{t("selfTitle")}</summary>
              <p>{t("selfWarning")}</p>
              <div className="dm-qr" dangerouslySetInnerHTML={{ __html: selfSvg }} />
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}
