// How a server action reports a failure the user can fix.
//
// Thrown errors do not survive a production build: React replaces their
// message with a generic one before it reaches the browser, so every screen
// that decoded err.message as a message key showed "conflict" for everything
// on the live site. A RETURNED value is data and arrives intact.
//
// No server-only import: actions return ActionResult, and client components
// call unwrap() on it.

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string };

/** Anything that is not a known message key: the screen shows its own fallback. */
export const UNEXPECTED = "common.unexpected";

// The namespaces lib/data throws keys from. A message outside them is never
// forwarded, so an internal error text cannot leak to the screen by looking
// like a key.
const KEY_NAMESPACES = new Set(["common", "po", "hours", "co", "final", "invoice", "incident", "request"]);
const KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;

export function codeOf(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (!KEY.test(message)) return UNEXPECTED;
  return KEY_NAMESPACES.has(message.slice(0, message.indexOf("."))) ? message : UNEXPECTED;
}

/** Thrown on the CLIENT by unwrap(), so its message is never stripped. */
export class ActionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ActionError";
    this.code = code;
  }
}

/**
 * The data of a successful action, or an ActionError carrying the code.
 * Every component already decodes err.message in its catch block; with
 * unwrap() that block keeps working unchanged, in production too.
 */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new ActionError(result.code);
}
