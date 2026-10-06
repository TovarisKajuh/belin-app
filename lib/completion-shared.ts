// What the completion report's summary may claim. Pure, so the rule that the
// report and the invoice state the SAME approved hours is tested, not hoped.

import { effectiveStatus, type SheetStatus } from "@/lib/hours-shared";
import { round2 } from "@/lib/po-shared";

export interface HoursSummary {
  approved: number;
  pending: number;
  rejected: number;
}

/**
 * Approved means approved by a person or by the clock, read through
 * effectiveStatus exactly as approvedHours (lib/data/hours.ts) reads it for
 * the invoice. Open and rejected hours are stated apart, never added in.
 */
export function summarizeHours(
  sheets: { status: SheetStatus; deadline_at: string | null; hours: number }[],
  now: Date,
): HoursSummary {
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  for (const sheet of sheets) {
    const status = effectiveStatus({ status: sheet.status, deadline_at: sheet.deadline_at }, now);
    if (status === "approved" || status === "deemed_approved") approved += sheet.hours;
    else if (status === "submitted") pending += sheet.hours;
    else if (status === "rejected") rejected += sheet.hours;
  }
  return { approved: round2(approved), pending: round2(pending), rejected: round2(rejected) };
}

export interface ExtrasSummary {
  approvedCount: number;
  approvedSum: number;
  approvedUnpriced: number;
  pendingCount: number;
  rejectedCount: number;
}

/** Only approved, priced extras carry money in the summary; the rest are counted. */
export function summarizeExtras(
  orders: { status: "submitted" | "approved" | "rejected"; amount: number | null }[],
): ExtrasSummary {
  const out = { approvedCount: 0, approvedSum: 0, approvedUnpriced: 0, pendingCount: 0, rejectedCount: 0 };
  for (const order of orders) {
    if (order.status === "approved") {
      out.approvedCount++;
      if (order.amount === null) out.approvedUnpriced++;
      else out.approvedSum += order.amount;
    } else if (order.status === "submitted") {
      out.pendingCount++;
    } else {
      out.rejectedCount++;
    }
  }
  return { ...out, approvedSum: round2(out.approvedSum) };
}
