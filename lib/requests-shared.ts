// The pure half of requests: the types the crew can choose, and the shape a
// request has once loaded.
//
// This file exists because lib/data/requests.ts is "server-only" and the crew
// sheet is a client component. Importing a TYPE from a server module is free
// (types are erased), but REQUEST_TYPES is a runtime value, and importing it
// dragged the whole data layer, and its service-role client, into the browser
// bundle. tsc cannot see that; the dev server said so immediately.

export const REQUEST_TYPES = ["material", "plan", "instruction"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export interface RequestRow {
  id: string;
  type: RequestType;
  text: string;
  status: "open" | "resolved";
  responseNote: string | null;
  photoUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
  authorName: string | null;
}

export interface CreateRequestPayload {
  clientGeneratedId: string;
  type: string;
  text: string;
  photoPath: string | null;
}
