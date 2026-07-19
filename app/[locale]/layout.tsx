import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SplashGate } from "@/components/SplashGate";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import "../globals.css";

export const metadata: Metadata = {
  title: "Belin",
  description: "Collaboration between solar EPCs and their installation subcontractors.",
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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <SplashGate />
      </body>
    </html>
  );
}
