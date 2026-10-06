"use client";
import { useEffect, useState } from "react";
import { BelinSplash } from "@/components/BelinSplash";

// The launch animation, for the INSTALLED app only, once per session (D8,
// 2026-10-06): four and a half seconds of logo on every page load read as a
// slow product in front of a buyer.
//
// Who sees it is decided twice, and neither time in render. Before hydration
// a CSS rule in globals.css hides [data-splash] unless display-mode is
// standalone. After hydration this effect unmounts it in a browser tab so it
// stops animating unseen. The server and the client render the same tree, so
// nothing can desynchronise (the 2026-08-13 hydration lesson, see DECISIONS).
// Keeping the splash out of product shots is still the capture pipeline's job.
function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches);
  // iOS home-screen apps also expose the older navigator.standalone flag.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

export function SplashGate() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInstalledApp()) setDone(true);
  }, []);

  if (done) return null;
  return <BelinSplash once onFinish={() => setDone(true)} />;
}
