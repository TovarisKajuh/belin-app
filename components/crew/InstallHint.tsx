"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const DISMISSED = "belin-install-hint";

// The last step of turning this into an app for the man on the roof.
//
// He has claimed his name and the session is permanent, but if Belin still
// lives in a browser tab he will still be hunting for it every morning. This
// says the one sentence that fixes that, once, and never again.
//
// Deliberately no beforeinstallprompt machinery: it fires on some Android
// Chrome and never on iOS, which is most of this trade's phones, so the copy IS
// the feature. Hidden entirely once the app is running standalone, which is the
// only reliable signal that the job is already done.
export function InstallHint() {
  const t = useTranslations("claim");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's own flag, which predates the standard media query.
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISSED) === "1") return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="ih-strip">
      <div className="ih-text">
        <b>{t("installTitle")}</b>
        <span>{t("installBody")}</span>
      </div>
      <button
        type="button"
        className="ih-x"
        aria-label={t("installDismiss")}
        onClick={() => {
          localStorage.setItem(DISMISSED, "1");
          setShow(false);
        }}
      >
        &times;
      </button>
    </div>
  );
}
