// Pure rules for crew name claiming. No server imports, so the claim form can
// validate with exactly the function the server enforces, and so vitest can
// exercise them directly.

/**
 * A usable crew name, or null.
 *
 * This takes free text from a phone keyboard held in a glove on a roof, so it
 * is forgiving about spacing and unforgiving about everything else: two
 * characters minimum so a stray keypress does not become a person, eighty
 * maximum so a paste cannot.
 */
export function normalizeCrewName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

/**
 * The roster entry this free-typed name already IS, or null when it is new.
 *
 * Case and spacing insensitive on purpose: "luka zupan" typed by a man who does
 * not capitalise must find the Luka Zupan already on the list, or the roster
 * grows a second one of him every time somebody gets a new phone.
 */
export function matchRosterName(
  roster: { id: string; fullName: string }[],
  name: string,
): string | null {
  const normalized = normalizeCrewName(name);
  if (!normalized) return null;
  const wanted = normalized.toLowerCase();
  const hit = roster.find(
    (entry) => entry.fullName.trim().replace(/\s+/g, " ").toLowerCase() === wanted,
  );
  return hit?.id ?? null;
}
