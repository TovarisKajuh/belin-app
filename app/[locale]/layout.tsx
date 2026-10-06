import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { appBaseUrl } from "@/lib/app-url";
import { SplashGate } from "@/components/SplashGate";
import { Toaster } from "@/components/ui/Toaster";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import "../globals.css";

/**
 * What a shared link looks like before anyone has clicked it.
 *
 * This product spreads by one person pasting a URL into WhatsApp, so the
 * preview card is not decoration: without it a share is a bare blue link. The
 * copy is per locale because the card is per locale, and it is written here
 * rather than pulled from the message catalog on purpose. Metadata is
 * generated at build time for a static page, the strings are three lines, and
 * a catalog lookup here would make the share card depend on request context
 * that the crawler never provides.
 */
const SHARE = {
  sl: {
    title: "Belin, vaš projekt na enem mestu",
    description:
      "Belin povezuje EPC izvajalce in njihove podizvajalce. Dnevna poročila s fotografijami, izračunan napredek, režijske ure in dodatna dela, vse na enem mestu.",
  },
  de: {
    title: "Belin, Ihr Projekt an einem Ort",
    description:
      "Belin verbindet EPC-Unternehmen und ihre Montagepartner. Tagesberichte mit Fotos, berechneter Fortschritt, Regiestunden und Nachträge, alles an einem Ort.",
  },
  en: {
    title: "Belin, your project in one place",
    description:
      "Belin connects solar EPCs and their installation subcontractors. Daily reports with photos, calculated progress, extra hours and change orders, all in one place.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const share = SHARE[locale as keyof typeof SHARE] ?? SHARE.sl;
  // Absolute URLs are required for og:image, and the base comes from the same
  // helper the emailed links use: never from the request's Host header.
  const base = appBaseUrl();

  return {
    ...BASE,
    title: share.title,
    description: share.description,
    ...(base ? { metadataBase: new URL(base) } : {}),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "Belin",
      locale,
      url: `/${locale}`,
      title: share.title,
      description: share.description,
      images: [{ url: `/og/belin-${locale}.jpg`, width: 1200, height: 630, alt: share.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description: share.description,
      images: [`/og/belin-${locale}.jpg`],
    },
  };
}

/**
 * Everything that does not depend on the language.
 *
 * NOT exported: Next refuses a file that exports both `metadata` and
 * `generateMetadata`, and the share card has to vary by locale, so the static
 * half becomes a plain constant that the generated half spreads.
 */
const BASE: Metadata = {
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS ignores apple-mobile-web-app-status-bar-style unless
  // apple-mobile-web-app-capable is also present. Next.js only emits the
  // standardised "mobile-web-app-capable" for appleWebApp.capable, so the
  // status bar style was being dropped and iOS fell back to its default, which
  // is the white bar. Set the Apple tag explicitly alongside it.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    title: "Belin",
    // black-translucent lets the app's own dark background run edge to edge
    // behind the iOS clock and battery instead of iOS painting a bar there.
    // The status bar itself cannot be removed by any web app; this is the
    // seamless look. Pairs with viewportFit "cover" and the safe-area padding
    // on the sticky headers in globals.css.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Was #f5f6f8, a near-white, which is what painted the white strip above the
  // app on an installed phone. Matches the dark app background now.
  themeColor: "#0b1524",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {children}
          <Toaster />
        </NextIntlClientProvider>
        <SplashGate />
      </body>
    </html>
  );
}
