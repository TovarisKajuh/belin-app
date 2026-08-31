import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal-copy";
import { legalPublished } from "@/lib/legal";

// The privacy policy.
//
// Gated on the same check as the Impressum, because it names the controller and
// a privacy policy that cannot say who the controller is has not made the one
// statement it exists to make.
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!legalPublished()) notFound();

  const copy = (LEGAL[locale] ?? LEGAL.sl).privacy;

  return (
    <LegalPage locale={locale} path="zasebnost" title={copy.title} subtitle={copy.updated} sections={copy.sections} />
  );
}
