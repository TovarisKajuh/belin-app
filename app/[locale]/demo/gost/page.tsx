import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Belin", robots: { index: false, follow: false } };

export default async function GuestCodeExpired({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("demo");
  return (
    <main className="belin-dark dm-page">
      <div className="e-grain" aria-hidden />
      <div className="e-wrap">
        <header className="dm-head">
          <h1 className="dm-title">{t("guestExpiredTitle")}</h1>
          <p className="dm-sub">{t("guestExpiredBody")}</p>
        </header>
      </div>
    </main>
  );
}
