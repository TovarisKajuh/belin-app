import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("project");
  return (
    <main className="container section">
      <div className="card card-full fade-up">
        <h1 className="section-title">{t("notFoundTitle")}</h1>
        <p className="section-label">{t("notFoundBody")}</p>
      </div>
    </main>
  );
}
