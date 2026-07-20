// Who hears about what. This table is the whole notification policy: emitEvent
// reads it and nothing else decides recipients, so changing who gets told about
// an event is a one-line change here rather than a hunt through call sites.
//
// Crew people never appear on either side. They work on a roof and are reached
// through the project surface itself, not through their inbox.

export const NOTIFY_KINDS = [
  "entry_submitted",
  "material_check_completed",
  "request_created",
  "request_resolved",
  "incident_created",
  "hours_submitted",
  "hours_decided",
  "hours_deemed_approved",
  "change_order_submitted",
  "change_order_decided",
  "po_sent",
  "po_accepted",
  "po_rejected",
  "finalization_requested",
  "acceptance_signed",
  "invoice_sent",
  "document_expiring",
] as const;

export type NotifyKind = (typeof NOTIFY_KINDS)[number];
export type Side = "epc" | "sub";

const EPC_ONLY: Side[] = ["epc"];
const SUB_ONLY: Side[] = ["sub"];
const BOTH: Side[] = ["epc", "sub"];

const RECIPIENTS: Record<NotifyKind, Side[]> = {
  // things that happen on site, which the EPC is paying to know about
  entry_submitted: EPC_ONLY,
  material_check_completed: EPC_ONLY,
  request_created: EPC_ONLY,
  incident_created: EPC_ONLY,
  hours_submitted: EPC_ONLY,
  change_order_submitted: EPC_ONLY,
  finalization_requested: EPC_ONLY,

  // decisions and documents the sub is waiting on
  request_resolved: SUB_ONLY,
  hours_decided: SUB_ONLY,
  hours_deemed_approved: SUB_ONLY,
  change_order_decided: SUB_ONLY,
  po_sent: SUB_ONLY,
  document_expiring: SUB_ONLY,

  // contract-forming acts: both sides must end up holding the same record,
  // which is the point of the evidence trail
  po_accepted: BOTH,
  po_rejected: BOTH,
  acceptance_signed: BOTH,
  invoice_sent: BOTH,
};

export function recipientsFor(kind: NotifyKind): Side[] {
  return RECIPIENTS[kind];
}

export function emailSubjectKey(kind: NotifyKind): string {
  return `notify.subject.${kind}`;
}

export function emailBodyKey(kind: NotifyKind): string {
  return `notify.body.${kind}`;
}

// Opt out, never opt in: a person who has never touched their settings gets
// every email meant for them. Only a stored literal false silences a kind, so a
// malformed preference bag costs one unwanted email rather than a missed
// naročilnica.
export function wantsEmail(prefs: unknown, kind: NotifyKind): boolean {
  if (prefs === null || typeof prefs !== "object" || Array.isArray(prefs)) return true;
  return (prefs as Record<string, unknown>)[kind] !== false;
}
