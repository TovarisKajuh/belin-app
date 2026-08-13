"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

// The language switch, everywhere the app is used rather than on the landing
// page alone.
//
// Until now the only way to change language was the landing header, so anyone
// who arrived on a project link, or whose browser asked for English, was stuck
// in that language for the whole session with no control anywhere on screen.
// The crew gets it too: a German-speaking crew can be working for a Slovenian
// EPC, and "one screen, not a menu" is about not burying their work behind
// navigation, not about denying them their own language.
//
// It swaps ONLY the first path segment, so it keeps you exactly where you are,
// including on a token URL where the token is the rest of the path.
export function LocaleSwitch({ label }: { label: string }) {
  const pathname = usePathname();

  const swap = (next: string) => {
    const segments = pathname.split("/");
    // ["", locale, ...rest]
    if (segments.length > 1 && (routing.locales as readonly string[]).includes(segments[1])) {
      segments[1] = next;
      return segments.join("/");
    }
    return `/${next}`;
  };

  const current = pathname.split("/")[1];

  return (
    <nav className="cb-locales" aria-label={label}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={swap(locale)}
          aria-current={locale === current ? "page" : undefined}
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
