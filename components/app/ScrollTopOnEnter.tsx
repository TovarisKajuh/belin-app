"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// Entering the app from outside it (the Demo Door, the login form) lands at the
// top of the screen. Next 15.5 applies a server action's redirect target
// without its usual scroll to top: the action reducer patches the new page in,
// then the redirect boundary pushes a URL that is already current, so the page
// kept the Door panel's scroll position and a phone opened halfway down.
//
// Only a mount on the client does this. While React hydrates server HTML the
// server snapshot (true) is read, so a reload or a back navigation keeps the
// browser's own scroll restoration; a mount after a client navigation reads the
// client snapshot (false) and scrolls. Rendered once, by the /app layout, which
// stays mounted while you move between screens inside the app.
export function ScrollTopOnEnter() {
  const hydrating = useSyncExternalStore(noSubscribe, () => false, () => true);
  const mountedOnClient = useRef(!hydrating);
  useLayoutEffect(() => {
    if (mountedOnClient.current && window.scrollY > 0) window.scrollTo(0, 0);
  }, []);
  return null;
}
