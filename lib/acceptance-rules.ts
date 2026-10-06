// Rules of the acceptance protocol, pure so they are tested and shared by the
// server (which enforces them) and the screen (which explains them).

import type { AcceptanceKind, Declaration } from "@/lib/acceptance-view";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A signature is stored only if it is what the pad produces: a PNG. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= PNG_MAGIC.length && PNG_MAGIC.every((value, i) => bytes[i] === value);
}

export interface SigningInput {
  declaration: Declaration | null;
  defectCount: number;
  /** yyyy-mm-dd, or null for a refusal (no warranty starts). */
  warrantyStart: string | null;
  /** yyyy-mm-dd at the site. */
  today: string;
  hasEpcSignature: boolean;
  hasSubSignature: boolean;
  epcSignerName: string | null;
  subSignerName: string | null;
}

/**
 * Why this protocol cannot be signed yet, as a message key, or null.
 *
 * A refusal and an acceptance with reservations both stand on named defects:
 * refusing without saying what is wrong, or reserving without saying what
 * the reservation covers, is a declaration nobody can act on (§ 12 Abs. 3 and
 * § 640 Abs. 3 BGB are the German statement of it). The warranty clock
 * cannot start before the handover it follows.
 */
export function signingProblem(input: SigningInput): string | null {
  if (!input.declaration) return "final.err.declaration";
  if (input.declaration === "refused" && input.defectCount === 0) return "final.err.refusedNeedsDefects";
  if (input.declaration === "with_reservations" && input.defectCount === 0) {
    return "final.err.reservationsNeedDefects";
  }
  if (input.warrantyStart && input.warrantyStart < input.today) return "final.err.warrantyBeforeAcceptance";
  if (!input.hasEpcSignature || !input.hasSubSignature) return "final.err.signatures";
  if (!input.epcSignerName?.trim() || !input.subSignerName?.trim()) return "final.err.signerNames";
  return null;
}

/**
 * Whether a new protocol may be opened. A partial acceptance is followed by a
 * final one; a refused acceptance is followed by another attempt once the
 * defects are fixed. Only an accepted FINAL acceptance closes the door.
 */
export function startDecision(
  latest: { status: "draft" | "signed"; kind: AcceptanceKind; declaration: Declaration | null } | null,
): "create" | "reuse" | "alreadySigned" {
  if (!latest) return "create";
  if (latest.status === "draft") return "reuse";
  if (latest.kind === "partial" || latest.declaration === "refused") return "create";
  return "alreadySigned";
}
