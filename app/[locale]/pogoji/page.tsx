import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal-copy";
import { legalPublished } from "@/lib/legal";

// The Pogoji uporabe a signup agrees to.
//
// Gated on the same check as the Impressum: terms that cannot say who the
// provider is are not terms anybody can agree to, and signup itself stays
// closed while this page would 404 (signupOpen requires legalPublished).
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!legalPublished()) notFound();

  const copy = (LEGAL[locale] ?? LEGAL.sl).terms;
  return (
    <LegalPage locale={locale} path="pogoji" title={copy.title} subtitle={copy.updated} sections={copy.sections} />
  );
}
