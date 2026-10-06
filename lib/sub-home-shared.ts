// What is waiting on the subcontractor's office, and whose move it is. Pure,
// so every state the "Čaka na vas" cards can be in is pinned by a test
// rather than discovered on stage.
import { effectiveStatus, workingDaysLeft, type Country, type SheetStatus } from "@/lib/hours-shared";
import type { ProjectStatus } from "@/lib/project-status";

export type CardTone = "action" | "waiting" | "ok" | "idle";

export interface SubWaitingInput {
  po: { number: number; status: string; sentAt: string | null; acceptedAt: string | null; rejectedAt: string | null } | null;
  sheets: { number: number; status: SheetStatus; deadlineAt: string | null; hours: number }[];
  orders: { number: number; status: string; amount: number | null }[];
  projectStatus: ProjectStatus;
  progressPercent: number;
  finalizationRequestedAt: string | null;
  acceptance: { kind: "final" | "partial"; status: "draft" | "signed"; conductedAt: string | null } | null;
  invoice: { number: string; issueDate: string } | null;
  /** Admin or owner: the people who may accept a naročilnica and issue the invoice. */
  isOffice: boolean;
  country: Country;
}

export type PoState = "none" | "sent" | "accepted" | "rejected" | "cancelled";
export interface PoCard { tone: CardTone; state: PoState; number: number | null; date: string | null }
export interface HoursCard {
  tone: CardTone;
  drafts: number;
  awaiting: number;
  rejected: number;
  approvedHours: number;
  nearestDaysLeft: number | null;
}
export interface CoCard { tone: CardTone; submitted: number; approved: number; rejected: number; approvedAmount: number; unpriced: number }
export type FinalState = "running" | "ready" | "requested" | "acceptanceOpen" | "accepted" | "invoiced" | "finished";
export interface FinalCard { tone: CardTone; state: FinalState; date: string | null; invoiceNumber: string | null }
export interface SubWaiting { po: PoCard; hours: HoursCard; co: CoCard; final: FinalCard; actionCount: number }

export function summarizeSubWaiting(input: SubWaitingInput, now: Date): SubWaiting {
  const po = poCard(input);
  const hours = hoursCard(input, now);
  const co = coCard(input);
  const final = finalCard(input);
  const actionCount = [po, hours, co, final].filter((card) => card.tone === "action").length;
  return { po, hours, co, final, actionCount };
}

function poCard({ po, isOffice }: SubWaitingInput): PoCard {
  if (!po || po.status === "draft") return { tone: "idle", state: "none", number: null, date: null };
  if (po.status === "sent") return { tone: isOffice ? "action" : "waiting", state: "sent", number: po.number, date: po.sentAt };
  if (po.status === "accepted") return { tone: "ok", state: "accepted", number: po.number, date: po.acceptedAt };
  if (po.status === "rejected") return { tone: "waiting", state: "rejected", number: po.number, date: po.rejectedAt };
  return { tone: "idle", state: "cancelled", number: po.number, date: null };
}

function hoursCard({ sheets, country }: SubWaitingInput, now: Date): HoursCard {
  let drafts = 0;
  let awaiting = 0;
  let rejected = 0;
  let approvedHours = 0;
  let nearestDaysLeft: number | null = null;
  for (const sheet of sheets) {
    const status = effectiveStatus({ status: sheet.status, deadline_at: sheet.deadlineAt }, now);
    if (status === "draft") drafts++;
    else if (status === "submitted") {
      awaiting++;
      if (sheet.deadlineAt) {
        const left = workingDaysLeft(sheet.deadlineAt.slice(0, 10), now, country);
        nearestDaysLeft = nearestDaysLeft === null ? left : Math.min(nearestDaysLeft, left);
      }
    } else if (status === "rejected") rejected++;
    else approvedHours += sheet.hours;
  }
  const tone: CardTone = drafts > 0 ? "action" : awaiting > 0 ? "waiting" : approvedHours > 0 ? "ok" : "idle";
  return { tone, drafts, awaiting, rejected, approvedHours, nearestDaysLeft };
}

function coCard({ orders }: SubWaitingInput): CoCard {
  let submitted = 0;
  let approved = 0;
  let rejected = 0;
  let approvedAmount = 0;
  let unpriced = 0;
  for (const order of orders) {
    if (order.status === "submitted") submitted++;
    else if (order.status === "approved") {
      approved++;
      if (order.amount === null) unpriced++;
      else approvedAmount += order.amount;
    } else if (order.status === "rejected") rejected++;
  }
  const tone: CardTone = submitted > 0 ? "waiting" : approved > 0 ? "ok" : "idle";
  return { tone, submitted, approved, rejected, approvedAmount, unpriced };
}

function finalCard(input: SubWaitingInput): FinalCard {
  const none = { date: null, invoiceNumber: null };
  if (input.projectStatus === "finished") return { tone: "ok", state: "finished", ...none, invoiceNumber: input.invoice?.number ?? null };
  if (input.invoice) return { tone: "ok", state: "invoiced", date: input.invoice.issueDate, invoiceNumber: input.invoice.number };
  const final = input.acceptance?.kind === "final" ? input.acceptance : null;
  if (final?.status === "signed") return { tone: input.isOffice ? "action" : "waiting", state: "accepted", date: final.conductedAt, invoiceNumber: null };
  if (final?.status === "draft") return { tone: "waiting", state: "acceptanceOpen", ...none };
  if (input.finalizationRequestedAt) return { tone: "waiting", state: "requested", date: input.finalizationRequestedAt, invoiceNumber: null };
  if (input.progressPercent >= 100 && input.projectStatus === "active") {
    return { tone: input.isOffice ? "action" : "waiting", state: "ready", ...none };
  }
  return { tone: "idle", state: "running", ...none };
}
