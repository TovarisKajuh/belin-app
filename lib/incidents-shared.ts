// What counts as a reportable incident, and what a crew member has to type.
//
// The whole point of this module is the asymmetry in the note rule. A rain stop
// and an obstruction are self describing: the kind IS the message, and asking
// somebody on a wet roof to compose a sentence before the app will accept the
// report is how you end up with no report at all. A general "zaplet" is the
// opposite: without words nobody downstream knows what happened.
//
// The note is stored empty rather than filled with a label, because a label is
// UI copy in one language and this row outlives the language it was written in.

export type IncidentKind = "incident" | "rain_stop" | "obstruction";

export const INCIDENT_KINDS: IncidentKind[] = ["incident", "rain_stop", "obstruction"];

/** Six is a generous cap for a phone on a roof, and a hard stop on abuse. */
export const MAX_INCIDENT_PHOTOS = 6;

export type IncidentValidation =
  | { ok: true; kind: IncidentKind; note: string }
  | { ok: false; error: "kind" | "note" | "photos" };

export function validateIncident(input: {
  kind: string;
  note: string;
  photoCount: number;
}): IncidentValidation {
  const kind = INCIDENT_KINDS.find((candidate) => candidate === input.kind);
  if (!kind) return { ok: false, error: "kind" };

  if (
    !Number.isInteger(input.photoCount) ||
    input.photoCount < 0 ||
    input.photoCount > MAX_INCIDENT_PHOTOS
  ) {
    return { ok: false, error: "photos" };
  }

  const note = input.note.trim();
  if (kind === "incident" && note.length === 0) return { ok: false, error: "note" };

  return { ok: true, kind, note };
}
