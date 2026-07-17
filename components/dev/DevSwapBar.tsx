import Link from "next/link";

// DEV ONLY. Jumps to the other party's view of the same connected project so
// one person can build and review both intertwined sides. Remove before launch;
// real magic-link auth will separate the two accounts (DECISIONS.md 2026-07-17).
export function DevSwapBar({
  locale,
  siblingToken,
  targetRole,
}: {
  locale: string;
  siblingToken: string;
  targetRole: "epc" | "sub";
}) {
  const label = targetRole === "epc" ? "EPC view" : "Crew view";
  return (
    <Link href={`/${locale}/p/${siblingToken}`} className="b-devbar" prefetch={false}>
      <span className="b-devbar-tag">DEV</span>
      switch to {label}
    </Link>
  );
}
