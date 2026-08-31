import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage, OperatorBlock } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal-copy";
import { legalPublished } from "@/lib/legal";

// The Impressum.
//
// 404 until lib/legal.ts identifies a real company. An Impressum is a legal
// declaration, and one filled with plausible invented details is a false
// statement rather than a missing one, which is strictly worse. The footer
// links are hidden by the same check, so nothing points at a dead page.
export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!legalPublished()) notFound();

  const copy = (LEGAL[locale] ?? LEGAL.sl).impressum;

  return (
    <LegalPage locale={locale} path="impressum" title={copy.title} subtitle={copy.intro} sections={copy.sections}>
      <OperatorBlock copy={copy} />
    </LegalPage>
  );
}
