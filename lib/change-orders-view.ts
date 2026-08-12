// The view shapes for Nachträge, kept out of the server-only data module so
// the client screens can import them. Same split as requests and hours.

export type ChangeOrderStatus = "submitted" | "approved" | "rejected";

export interface ChangeOrderRow {
  id: string;
  number: number;
  title: string;
  description: string | null;
  /** Null is allowed and deliberately visible: an unpriced extra bills nothing. */
  amount: number | null;
  status: ChangeOrderStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
  authorName: string | null;
  photoUrls: string[];
}

export interface CreateChangeOrderPayload {
  clientGeneratedId: string;
  title: string;
  description: string | null;
  amount: number | null;
  photoPaths: string[];
}

export const MAX_CO_PHOTOS = 6;
