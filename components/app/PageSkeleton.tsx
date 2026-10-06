import { useTranslations } from "next-intl";

// The shape of the page that is coming, in the dark system. Crew tabs and
// office screens are server routes, so on rural LTE a tap used to look dead
// until the server answered; a loading.tsx renders this instantly instead.
// Sync server component: next-intl supports useTranslations here.
export function PageSkeleton({ variant }: { variant: "portfolio" | "project" | "document" }) {
  const t = useTranslations("errors");
  const tiles = [0, 1, 2].map((i) => <div key={i} className="sk sk-tile" />);
  return (
    <div className="belin-dark" aria-busy="true">
      <div className="e-grain" aria-hidden />
      <div className="sk-top" aria-hidden>
        <div className="sk-top-in">
          <span className="sk sk-mark" />
          <span className="sk sk-line sk-w20" />
        </div>
      </div>
      <main className="sk-page">
        <span className="sk-sr" role="status">
          {t("loading")}
        </span>
        {variant === "portfolio" ? (
          <>
            <div className="sk sk-line sk-w40" />
            <div className="sk-tiles">{tiles}</div>
            <div className="sk-cards">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="sk sk-card" />
              ))}
            </div>
          </>
        ) : null}
        {variant === "project" ? (
          <>
            <div className="sk sk-hero" />
            <div className="sk-tiles">{tiles}</div>
            <div className="sk sk-block" />
            <div className="sk sk-block" />
          </>
        ) : null}
        {variant === "document" ? (
          <>
            <div className="sk sk-line sk-w40" />
            <div className="sk sk-doc" />
          </>
        ) : null}
      </main>
    </div>
  );
}
