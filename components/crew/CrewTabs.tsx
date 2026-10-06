import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CameraTabLink } from "./CameraTabLink";

export type CrewTab = "overview" | "report" | "diary" | "hours";

// The roof navigation.
//
// The rule this had to obey: the report path may not get one tap longer. A
// roofer files in under 30 seconds, one handed, and any nav that costs him a
// tap before he can start typing is a nav that made the product worse. So
// REPORTING IS THE DEFAULT TAB, not a destination: a cold open still lands on
// the form, exactly as it did when this screen was a single column. The bar
// only adds a way BACK to it, and a way to the three things that used to be
// unreachable without scrolling past the form or hunting for a link.
//
// Four items, because the fourth is money. Hour sheets are a v1 module and the
// crew file them, so burying Regiestunden inside another tab would hide the
// half of this product that gets people paid. The camera keeps the emphasis of
// a primary action anyway: it is the only filled, raised, gold one.
//
// These are LINKS TO ROUTES, not client state. The back button works, a
// notification can deep link to a tab, each screen stays a server component
// that fetches only its own data, and Next prefetches the neighbours, which is
// what keeps this usable on the rural LTE this app is built for.
export async function CrewTabs({
  locale,
  projectId,
  active,
}: {
  locale: string;
  projectId: string;
  active: CrewTab;
}) {
  const t = await getTranslations("crew");
  const base = `/${locale}/app/${projectId}`;

  const items: { key: CrewTab; href: string; label: string; icon: React.ReactNode }[] = [
    { key: "overview", href: `${base}/pregled`, label: t("tabs.overview"), icon: <IconGauge /> },
    { key: "report", href: base, label: t("tabs.report"), icon: <IconCamera /> },
    { key: "diary", href: `${base}/dnevnik`, label: t("tabs.diary"), icon: <IconDiary /> },
    { key: "hours", href: `${base}/hours`, label: t("tabs.hours"), icon: <IconClock /> },
  ];

  return (
    <nav className="cr-tabs" aria-label={t("tabs.label")}>
      {items.map((item) =>
        item.key === "report" ? (
          <CameraTabLink key={item.key} href={item.href} active={active === "report"}>
            <span className="cr-tab-i" aria-hidden>
              {item.icon}
            </span>
            <span className="cr-tab-l">{item.label}</span>
          </CameraTabLink>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            className="cr-tab"
            aria-current={item.key === active ? "page" : undefined}
          >
            <span className="cr-tab-i" aria-hidden>
              {item.icon}
            </span>
            <span className="cr-tab-l">{item.label}</span>
          </Link>
        )
      )}
    </nav>
  );
}

// Icons are inline rather than a dependency: four of them, twenty lines, and a
// icon package would be a runtime dependency for a phone on a bad connection.
const S = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconGauge() {
  return (
    <svg {...S}>
      <path d="M4 20V10M10 20V5M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg {...S} strokeWidth={1.9}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l1-1.3a1 1 0 0 1 .8-.4h5.4a1 1 0 0 1 .8.4l1 1.3a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function IconDiary() {
  return (
    <svg {...S}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17h14M9 8h6M9 11.5h4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}
