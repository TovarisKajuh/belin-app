import Link from "next/link";

// DEV ONLY. Jumps to the other party's view of the same connected project so
// one person can build and review both intertwined sides. Remove before launch;
// real magic-link auth will separate the two accounts (DECISIONS.md 2026-07-17).
export function DevSwapBar({
  locale,
  siblingToken,
  targetRole,
  raised = false,
}: {
  locale: string;
  siblingToken: string;
  targetRole: "epc" | "sub";
  /** Lift clear of the crew screen's fixed submit bar. */
  raised?: boolean;
}) {
  const label = targetRole === "epc" ? "switch to EPC view" : "switch to Crew view";
  return (
    <Link
      href={`/${locale}/p/${siblingToken}`}
      className={raised ? "b-devbar b-devbar--raised" : "b-devbar"}
      prefetch={false}
      title={label}
      aria-label={label}
    >
      DEV
    </Link>
  );
}
