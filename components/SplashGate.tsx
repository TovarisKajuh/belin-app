"use client";
import { useState } from "react";
import { BelinSplash } from "@/components/BelinSplash";

// Shows the launch animation on app open, then unmounts it to reveal the app.
// Mounted once in the locale layout, so it plays on a fresh page load (cold PWA
// launch, hard refresh) but not on in-app navigation, which keeps this component
// mounted with done=true. To play it at most once per browser session instead,
// pass `once` to BelinSplash.
export function SplashGate() {
  const [done, setDone] = useState(false);
  if (done) return null;
  return <BelinSplash onFinish={() => setDone(true)} />;
}
