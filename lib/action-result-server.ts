import "server-only";
import { unstable_rethrow } from "next/navigation";
import { UNEXPECTED, codeOf, type ActionResult } from "@/lib/action-result";

/**
 * Runs an action body and RETURNS its failure instead of throwing it.
 *
 * redirect() and notFound() are Next's own control flow and must keep
 * propagating, which unstable_rethrow does. A message key from lib/data comes
 * back as its code; anything else is logged here with its full message, where
 * the Vercel log keeps it, and reaches the client only as common.unexpected.
 */
export async function toResult<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (err) {
    unstable_rethrow(err);
    const code = codeOf(err);
    if (code === UNEXPECTED) console.error("[action] unexpected failure", err);
    return { ok: false, code };
  }
}
