/**
 * A read that FAILED, as opposed to a read that found nothing.
 *
 * The two used to be the same thing here. Every loader returned null on a
 * query error and every page turned null into notFound(), so when the free
 * database paused on 05.10.2026 every project link on production told its
 * holder that the link did not exist or had been revoked, for an outage that
 * was ours. A missing row is still null and still a not-found page. A failed
 * read throws this, and app/[locale]/error.tsx answers it with a temporary
 * error and a retry button.
 *
 * Pure, no server-only import: loaders, pages and tests share it.
 */
export class DataUnavailableError extends Error {
  readonly where: string;

  constructor(where: string, detail?: string) {
    super(`Data unavailable at ${where}${detail ? `: ${detail}` : ""}`);
    this.name = "DataUnavailableError";
    this.where = where;
  }
}

export function isDataUnavailable(err: unknown): err is DataUnavailableError {
  return err instanceof Error && err.name === "DataUnavailableError";
}

/** Call right after a query with its `error`; throws when the read failed. */
export function throwIfReadFailed(error: { message: string } | null | undefined, where: string): void {
  if (error) throw new DataUnavailableError(where, error.message);
}

/**
 * For a page's catch block around requireProjectActor: an outage goes on to
 * the error page, anything else (not a party, no such project) falls through
 * to the caller's notFound().
 */
export function rethrowIfUnavailable(err: unknown): void {
  if (isDataUnavailable(err)) throw err;
}
