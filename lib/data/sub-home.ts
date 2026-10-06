import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import type { CrewHomeData } from "@/lib/data/reports";
import type { Country, SheetStatus } from "@/lib/hours-shared";
import { summarizeSubWaiting, type SubWaiting } from "@/lib/sub-home-shared";

// Six small reads in parallel, shaped by the pure rules in sub-home-shared.
// A failed read THROWS: a card that says "nothing is waiting" because the
// database hiccuped is the exact lie this screen used to tell.
export async function getSubWaiting(project: ProjectActor, home: CrewHomeData, isOffice: boolean): Promise<SubWaiting> {
  const db = createAdminClient();
  const id = project.projectId;
  const [poRes, sheetRes, coRes, requestedRes, acceptanceRes, invoiceRes] = await Promise.all([
    db
      .from("purchase_orders")
      .select("number, status, sent_at, accepted_at, rejected_at")
      .eq("project_id", id)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("hour_sheets").select("number, status, deadline_at, hour_sheet_lines (hours)").eq("project_id", id),
    db.from("change_orders").select("number, status, amount").eq("project_id", id),
    db
      .from("activity")
      .select("created_at")
      .eq("project_id", id)
      .eq("kind", "finalization_requested")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("acceptances")
      .select("kind, status, conducted_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("invoices")
      .select("number, issue_date")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (const res of [poRes, sheetRes, coRes, requestedRes, acceptanceRes, invoiceRes]) {
    if (res.error) throw new Error(`sub-home: ${res.error.message}`);
  }

  const country: Country = home.country === "de" || home.country === "at" ? home.country : "si";
  return summarizeSubWaiting(
    {
      po: poRes.data
        ? {
            number: poRes.data.number,
            status: poRes.data.status,
            sentAt: poRes.data.sent_at,
            acceptedAt: poRes.data.accepted_at,
            rejectedAt: poRes.data.rejected_at,
          }
        : null,
      sheets: (sheetRes.data ?? []).map((sheet) => ({
        number: sheet.number,
        status: sheet.status as SheetStatus,
        deadlineAt: sheet.deadline_at,
        hours: (sheet.hour_sheet_lines ?? []).reduce((sum, line) => sum + Number(line.hours), 0),
      })),
      orders: (coRes.data ?? []).map((order) => ({
        number: order.number,
        status: order.status,
        amount: order.amount === null ? null : Number(order.amount),
      })),
      projectStatus: home.status,
      progressPercent: home.progressPercent,
      finalizationRequestedAt: requestedRes.data?.created_at ?? null,
      acceptance: acceptanceRes.data
        ? {
            kind: acceptanceRes.data.kind === "partial" ? "partial" : "final",
            status: acceptanceRes.data.status === "signed" ? "signed" : "draft",
            conductedAt: acceptanceRes.data.conducted_at,
          }
        : null,
      invoice: invoiceRes.data ? { number: invoiceRes.data.number, issueDate: invoiceRes.data.issue_date } : null,
      isOffice,
      country,
    },
    new Date(),
  );
}
