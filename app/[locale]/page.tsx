import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">{t("home.eyebrow")}</div>
          <h1>{t("common.appName")}</h1>
          <p className="hero-sub">{t("common.tagline")}. {t("home.subtitle")}</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="label">{t("home.languageLabel")}</div>
              <div className="value" style={{ display: "flex", gap: 14 }}>
                {routing.locales.map((l) => (
                  <Link
                    key={l}
                    href={`/${l}`}
                    style={{
                      color: l === locale ? "white" : "rgba(255,255,255,0.55)",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
