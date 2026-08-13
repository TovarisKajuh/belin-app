import "server-only";
import { cookies } from "next/headers";

/**
 * Screenshot mode: the marketing pipeline is driving this browser.
 *
 * The chrome that helps a developer ruins a product shot. The logout pill, the
 * demo scenario switch and the dev swap bar all float over the corners of every
 * screen, and cropping them out by hand is exactly the manual labour this
 * pipeline exists to delete.
 *
 * A cookie rather than an env var, because the shooter drives the SAME running
 * dev server the founder is using, and a server-wide flag would blank his
 * screen too. Set by scripts/marketing/shoot.mjs, meaningless anywhere else:
 * the worst a curious visitor achieves by setting it is hiding their own
 * logout button.
 */
export async function isShotMode(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get("belin-shot")?.value === "1";
  } catch {
    // Outside a request scope: a script, or a unit test calling a data function
    // directly. There is no browser to take a screenshot for, so the honest
    // answer is no, and throwing here would make a display concern able to
    // break a caller that has nothing to do with screenshots.
    return false;
  }
}
