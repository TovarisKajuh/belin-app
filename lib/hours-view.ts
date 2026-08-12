// The shapes the hour sheet screens render, kept out of lib/data/hours.ts
// because that module is "server-only" and these are read by client
// components. Types alone would be erased safely, but keeping the whole view
// contract here means a future value (a label map, a default) cannot quietly
// drag the service-role client into the browser bundle, which is exactly what
// happened once with requests before it was caught.

import type { SheetStatus } from "@/lib/hours-shared";

export interface HourLine {
  id: string;
  workDate: string;
  hours: number;
  description: string;
  personId: string | null;
  personName: string | null;
}

export interface HourSheet {
  id: string;
  number: number;
  /** The STORED status. Always read through effectiveStatus before showing it. */
  status: SheetStatus;
  submittedAt: string | null;
  deadlineAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  totalHours: number;
  lines: HourLine[];
}

export interface AddLinePayload {
  sheetId: string;
  workDate: string;
  hours: number;
  description: string;
  personId: string | null;
}
