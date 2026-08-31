import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { legalPublished } from "@/lib/legal";

/**
 * The Impressum and privacy links in a footer.
 *
 * Renders NOTHING until lib/legal.ts identifies a real company, so the site
 * never advertises a page that 404s. German law wants these permanently
 * reachable and clearly labelled, which is why the label is the plain word
 * "Impressum" in German rather than something friendlier.
 */
export async function LegalLinks({ locale }: { locale: string }) {
  if (!legalPublished()) return null;
  const t = await getTranslations("landing");

  return (
    <span className="lp-foot-links">
      <Link href={`/${locale}/impressum`}>{t("legalImprint")}</Link>
      <Link href={`/${locale}/zasebnost`}>{t("legalPrivacy")}</Link>
    </span>
  );
}
