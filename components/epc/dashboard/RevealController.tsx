"use client";
import { useEffect } from "react";

// Scroll reveal for the sections below the hero, dependency free.
//
// Two deliberate safeguards, both carried over from the approved mockup:
// the `js` class is only added once this runs, so with JavaScript off or
// broken every section stays visible instead of invisible; and a timeout
// force-reveals everything after 5 seconds if scroll detection ever fails.
// A dashboard that hides the founder's data is worse than one without motion.
export function RevealController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".belin-dark");
    if (!root) return;

    // Adding `js` and revealing what is already on screen happen in the same
    // task, so the browser never paints the intermediate hidden state.
    root.classList.add("js");

    let pending = Array.from(document.querySelectorAll<HTMLElement>(".e-reveal"));
    const reveal = () => {
      const vh = window.innerHeight || 800;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < vh * 0.9) {
          el.classList.add("in");
          return false;
        }
        return true;
      });
    };

    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    const safetyNet = window.setTimeout(() => {
      document.querySelectorAll(".e-reveal").forEach((el) => el.classList.add("in"));
    }, 5000);

    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
      window.clearTimeout(safetyNet);
    };
  }, []);

  return null;
}
