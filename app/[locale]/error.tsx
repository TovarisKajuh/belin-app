"use client";
import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Wordmark } from "@/components/landing/Wordmark";

// Every unexpected failure under a locale lands here: a failed database read
// (lib/db-error.ts), a crash in a component, a dropped connection mid render.
// It never says "your link is invalid": that sentence belongs to a link that
// really does not exist, and it lives in app/[locale]/p/[token]/not-found.tsx.
//
// In production Next hides the message and passes only a digest, which is
// shown small so a screenshot from a customer can be matched to the log.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // A server component error needs the server to render again, not only the
  // boundary to reset: refresh first, then reset, in one transition.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="belin-dark lp">
      <div className="e-grain" aria-hidden />
      <div className="lp-wrap">
        <header className="lp-top">
          <Wordmark href={`/${locale}`} />
        </header>
        <div className="lp-solo">
          <section className="lp-card" role="alert" aria-labelledby="er-title">
            <div className="lp-card-glow" aria-hidden />
            <h1 id="er-title" className="lp-card-title">
              {t("title")}
            </h1>
            <p className="lp-card-sub">{t("body")}</p>
            <div className="er-actions">
              <button type="button" className="lp-submit" onClick={retry} disabled={pending}>
                {t("retry")}
              </button>
              <Link className="er-link" href={`/${locale}`}>
                {t("home")}
              </Link>
            </div>
            {error.digest ? <p className="er-code">{t("code", { digest: error.digest })}</p> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
