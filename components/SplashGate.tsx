"use client";
import { useState } from "react";
import { BelinSplash } from "@/components/BelinSplash";

// Shows the launch animation on app open, then unmounts it to reveal the app.
// Mounted once in the locale layout, so it plays on a fresh page load (cold PWA
// launch, hard refresh) but not on in-app navigation, which keeps this component
// mounted with done=true. To play it at most once per browser session instead,
// pass `once` to BelinSplash.
// Keeping the splash out of product shots is the PIPELINE's job, not this
// component's. A cookie check here read correctly and still broke the page: the
// server renders the splash and the client rendered null, and that mismatch
// left the server's DOM in place, unhydrated, with nothing on the page
// interactive at all. The marketing scripts hide it with an init script
// instead, which runs before any of this exists and cannot desynchronise
// anything.
export function SplashGate() {
  const [done, setDone] = useState(false);
  if (done) return null;
  return <BelinSplash onFinish={() => setDone(true)} />;
}
