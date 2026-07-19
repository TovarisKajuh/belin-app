"use client";
import { useFormStatus } from "react-dom";

// A submit button that dims and disables itself while its form action is in
// flight. Used by the demo pills so a tap reads as "working" instead of dead.
export function PendingButton({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} title={title} disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
