import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";

// A product screenshot, or the space one will occupy.
//
// Every section of this page has to read TEXT FIRST. A missing image is the
// normal state today (the founder captures them from the seeded demo later),
// and a page that collapses, stretches, or shows a broken icon without them
// would be worse than one that never had them.
//
// So the slot always reserves its exact aspect ratio, and when the file is
// absent it renders as a deliberate framed panel carrying the caption. Nothing
// jumps when the real image lands: it drops into a box that was already the
// right shape.
export function Shot({
  src,
  caption,
  ratio = "16 / 10",
  priority = false,
}: {
  /** Path under /public, e.g. "/landing/wizard.png". */
  src: string;
  caption: string;
  ratio?: string;
  priority?: boolean;
}) {
  // Checked on the server at render time: no request is made for a file that
  // is not there, so no broken image and no 404 in the console.
  const present = existsSync(join(process.cwd(), "public", src.replace(/^\//, "")));

  return (
    <figure className="lp-shot" style={{ aspectRatio: ratio }}>
      {present ? (
        <Image
          src={src}
          alt={caption}
          fill
          sizes="(max-width: 900px) 100vw, 620px"
          priority={priority}
          className="lp-shot-img"
        />
      ) : (
        <div className="lp-shot-slot">
          <span className="lp-shot-cap">{caption}</span>
        </div>
      )}
    </figure>
  );
}
