"use client";
import Link from "next/link";
import { OPEN_CAMERA_EVENT } from "@/lib/crew-events";

// The raised gold camera promises a photo. When the report is already open,
// it opens the camera instead of reloading the screen it is already on. If no
// report form is listening (the material gate is showing), it is a plain link.
export function CameraTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="cr-tab cr-tab--go"
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (!active) return;
        const handled = !window.dispatchEvent(new CustomEvent(OPEN_CAMERA_EVENT, { cancelable: true }));
        if (handled) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
