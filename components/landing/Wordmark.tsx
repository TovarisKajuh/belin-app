import Link from "next/link";

// A rising-gold cell pattern, the same mark the command bar and the launch
// animation use, drawn larger here.
const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

/**
 * The brand lockup in the landing header.
 *
 * Extracted the moment a second public page needed it. Two copies of a
 * hand-written twelve cell array is exactly the kind of thing that drifts by
 * one cell and nobody notices for a month.
 *
 * `href` makes it a link home. The landing page itself passes nothing, because
 * a logo that navigates to the page you are already on is a dead control.
 */
export function Wordmark({ href }: { href?: string }) {
  const inner = (
    <>
      <span className="lp-mark" aria-hidden>
        {MARK.map((v, i) => (
          <i key={i} className={v ? "g" : undefined} />
        ))}
      </span>
      <span className="lp-wm">BELIN</span>
    </>
  );

  if (!href) return <div className="lp-brand">{inner}</div>;

  return (
    <Link href={href} className="lp-brand lp-brand-link">
      {inner}
    </Link>
  );
}
