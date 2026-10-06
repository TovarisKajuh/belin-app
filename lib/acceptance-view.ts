// The shapes the acceptance screens render, kept out of the server-only data
// module so the client flow can import them.

export type AcceptanceKind = "final" | "partial";
export type Declaration = "accepted" | "with_reservations" | "refused";
export type DefectAgreement = "agreed" | "disputed";

export const DECLARATIONS: Declaration[] = ["accepted", "with_reservations", "refused"];

export interface AcceptanceDefect {
  id: string;
  description: string;
  dueDate: string | null;
  agreement: DefectAgreement;
  photoUrl: string | null;
}

export interface AcceptanceView {
  id: string;
  kind: AcceptanceKind;
  status: "draft" | "signed";
  conductedAt: string | null;
  attendees: string | null;
  declaration: Declaration | null;
  penaltyReserved: boolean;
  warrantyStart: string | null;
  epcSignerName: string | null;
  subSignerName: string | null;
  hasEpcSignature: boolean;
  hasSubSignature: boolean;
  note: string | null;
  defects: AcceptanceDefect[];
  /** The calendar day at the site, yyyy-mm-dd: the earliest allowed warranty start. */
  siteToday: string;
  /** conducted_at as a site calendar day, yyyy-mm-dd, for display. */
  conductedDay: string | null;
}

export interface AcceptanceStepPayload {
  kind?: AcceptanceKind;
  attendees?: string | null;
  declaration?: Declaration | null;
  penaltyReserved?: boolean;
  warrantyStart?: string | null;
  epcSignerName?: string | null;
  subSignerName?: string | null;
  note?: string | null;
}
