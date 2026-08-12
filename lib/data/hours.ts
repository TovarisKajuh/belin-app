import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/actor-shared";
import type { ProjectActor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { projectToday } from "@/lib/project-time";
import {
  addWorkingDays,
  DECISION_WORKING_DAYS,
  deadlineTimestamp,
  effectiveStatus,
  type Country,
  type SheetStatus,
} from "@/lib/hours-shared";

// Regiestunden: hours worked outside the agreed scope, which the client either
// approves, rejects, or, by saying nothing for six working days, approves by
// default under § 15 VOB/B.
//
// The schema for this has existed since the first migration and has never been
// written to. What it needed was not tables but the clock, which now lives in
// lib/hours-shared.ts, and the discipline that every status move is a single
// conditional update. An hour sheet is a money claim: two people deciding it at
// once, or a decision landing after the deadline already approved it, are both
// disputes rather than bugs.

import type { HourLine, HourSheet, AddLinePayload } from "@/lib/hours-view";
import { listChangeOrders } from "@/lib/data/change-orders";
import type { ChangeOrderRow } from "@/lib/change-orders-view";

export type { HourLine, HourSheet, AddLinePayload } from "@/lib/hours-view";

export interface HoursPageData {
  projectId: string;
  country: Country;
  role: "epc" | "sub";
  /** Only a signed-in office person decides; a link can draft and submit. */
  canDecide: boolean;
  sheets: HourSheet[];
  orders: ChangeOrderRow[];
}

const CONFLICT = "hours.conflict";

function countryOf(value: string | null): Country {
  return value === "de" || value === "at" ? value : "si";
}

export async function getHoursPageData(
  actor: ProjectActor,
  canDecide: boolean,
): Promise<HoursPageData | null> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("id, country")
    .eq("id", actor.projectId)
    .maybeSingle();
  if (!project) return null;

  // Deemed approvals are written down before anything is shown, so the page and
  // the database agree from the first render rather than after a refresh.
  await persistDeemed(actor.projectId);

  return {
    projectId: actor.projectId,
    country: countryOf(project.country),
    role: actor.role,
    canDecide,
    sheets: await listSheets(actor),
    orders: await listChangeOrders(actor),
  };
}

export async function listSheets(actor: ProjectActor): Promise<HourSheet[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("hour_sheets")
    .select(
      "id, number, status, submitted_at, deadline_at, decided_at, people:decided_by_person (full_name), hour_sheet_lines (id, work_date, hours, description, person_id, people (full_name))",
    )
    .eq("project_id", actor.projectId)
    .order("number", { ascending: false });

  return (data ?? []).map((row) => {
    const lines = (row.hour_sheet_lines ?? [])
      .map((line) => ({
        id: line.id,
        workDate: line.work_date,
        hours: Number(line.hours),
        description: line.description,
        personId: line.person_id,
        personName: line.people?.full_name ?? null,
      }))
      .sort((a, b) => a.workDate.localeCompare(b.workDate));

    return {
      id: row.id,
      number: row.number,
      status: row.status as SheetStatus,
      submittedAt: row.submitted_at,
      deadlineAt: row.deadline_at,
      decidedAt: row.decided_at,
      decidedByName: row.people?.full_name ?? null,
      totalHours: lines.reduce((sum, line) => sum + line.hours, 0),
      lines,
    };
  });
}

/** A new draft. Numbering is per project, max plus one, with one retry on collision. */
export async function createSheet(actor: ProjectActor): Promise<string> {
  if (actor.role !== "sub") throw new Error("Forbidden: the contractor keeps the hour sheets.");

  const db = createAdminClient();
  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", actor.projectId)
    .maybeSingle();
  if (!project?.sub_org_id) throw new Error("hours.noSub");

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: top } = await db
      .from("hour_sheets")
      .select("number")
      .eq("project_id", actor.projectId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await db
      .from("hour_sheets")
      .insert({
        project_id: actor.projectId,
        sub_org_id: project.sub_org_id,
        number: (top?.number ?? 0) + 1,
        status: "draft",
      })
      .select("id")
      .maybeSingle();

    if (data) return data.id;
    if (error?.code !== "23505") throw new Error("Could not create the hour sheet");
  }
  throw new Error("Could not create the hour sheet");
}


export async function addLine(actor: ProjectActor, payload: AddLinePayload): Promise<void> {
  if (actor.role !== "sub") throw new Error("Forbidden.");
  if (!isUuid(payload.sheetId)) throw new Error("Invalid sheet id");

  const description = payload.description.trim();
  if (!description) throw new Error("hours.err.description");
  if (!(payload.hours > 0)) throw new Error("hours.err.hours");

  const db = createAdminClient();

  // A submitted sheet is evidence in a money claim and stops being editable the
  // moment it leaves. The guard is here rather than in the UI because the UI is
  // a suggestion and this is the rule.
  const { data: sheet } = await db
    .from("hour_sheets")
    .select("id, status")
    .eq("id", payload.sheetId)
    .eq("project_id", actor.projectId)
    .maybeSingle();
  if (!sheet || sheet.status !== "draft") throw new Error(CONFLICT);

  const { error } = await db.from("hour_sheet_lines").insert({
    sheet_id: payload.sheetId,
    work_date: payload.workDate,
    hours: payload.hours,
    description,
    person_id: payload.personId,
  });
  if (error) throw new Error("Could not add the line");
}

export async function removeLine(actor: ProjectActor, lineId: string): Promise<void> {
  if (actor.role !== "sub") throw new Error("Forbidden.");
  if (!isUuid(lineId)) throw new Error("Invalid line id");

  const db = createAdminClient();
  const { data: line } = await db
    .from("hour_sheet_lines")
    .select("id, hour_sheets!inner (id, status, project_id)")
    .eq("id", lineId)
    .maybeSingle();

  if (!line || line.hour_sheets.project_id !== actor.projectId) throw new Error(CONFLICT);
  if (line.hour_sheets.status !== "draft") throw new Error(CONFLICT);

  await db.from("hour_sheet_lines").delete().eq("id", lineId);
}

/**
 * Submitting starts the six working day clock. The deadline is computed here,
 * once, and stored: recomputing it later from the submission date would let a
 * holiday table change move a deadline that both parties already relied on.
 */
export async function submitSheet(actor: ProjectActor, sheetId: string): Promise<void> {
  if (actor.role !== "sub") throw new Error("Forbidden.");
  if (!isUuid(sheetId)) throw new Error("Invalid sheet id");

  const db = createAdminClient();
  const { data: project } = await db
    .from("projects")
    .select("country")
    .eq("id", actor.projectId)
    .maybeSingle();

  const country = countryOf(project?.country ?? null);
  const today = projectToday(project?.country ?? null);
  const deadline = deadlineTimestamp(addWorkingDays(today, DECISION_WORKING_DAYS, country), country);

  const { data: lines } = await db
    .from("hour_sheet_lines")
    .select("hours")
    .eq("sheet_id", sheetId);
  if (!lines || lines.length === 0) throw new Error("hours.err.empty");

  const { data, error } = await db
    .from("hour_sheets")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      deadline_at: deadline,
    })
    .eq("id", sheetId)
    .eq("project_id", actor.projectId)
    .eq("status", "draft")
    .select("id, number")
    .maybeSingle();

  if (error || !data) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "hours_submitted",
    actorPerson: actor.personId,
    payload: {
      number: String(data.number),
      hours: String(lines.reduce((sum, line) => sum + Number(line.hours), 0)),
    },
  });
}

/**
 * The client's decision.
 *
 * The guard does two jobs in one statement: it stops two Bauleiter deciding the
 * same sheet, AND it refuses a decision that arrives after the deadline has
 * already approved the sheet by silence. Rejecting a claim that lapsed into
 * approval yesterday is exactly the dispute § 15 exists to prevent.
 */
export async function decideSheet(
  actor: ProjectActor,
  sheetId: string,
  approve: boolean,
): Promise<void> {
  if (actor.role !== "epc") throw new Error("Forbidden: the client decides.");
  if (!isUuid(sheetId)) throw new Error("Invalid sheet id");

  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("hour_sheets")
    .update({
      status: approve ? "approved" : "rejected",
      decided_at: now,
      decided_by_person: actor.personId,
    })
    .eq("id", sheetId)
    .eq("project_id", actor.projectId)
    .eq("status", "submitted")
    .gt("deadline_at", now)
    .select("id, number")
    .maybeSingle();

  if (error || !data) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "hours_decided",
    actorPerson: actor.personId,
    payload: {
      number: String(data.number),
      decision: approve ? "approved" : "rejected",
    },
  });
}

/**
 * Writes down the approvals the clock already made.
 *
 * Called on the hours page, and before anything that quotes hours as money (the
 * invoice, the completion report). Those read the STORED status, so without
 * this a deemed-approved sheet would silently drop out of an invoice: the
 * subcontractor would be paid less because nobody clicked anything, which is
 * precisely backwards.
 */
export async function persistDeemed(projectId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await createAdminClient()
    .from("hour_sheets")
    .update({ status: "deemed_approved" })
    .eq("project_id", projectId)
    .eq("status", "submitted")
    .lte("deadline_at", now)
    .select("id, number");

  for (const row of data ?? []) {
    await emitEventDeferred({
      projectId,
      kind: "hours_deemed_approved",
      actorPerson: null,
      payload: { number: String(row.number) },
    });
  }
}

/** Approved hours for the invoice: explicit approvals and deemed ones both count. */
export async function approvedHours(
  projectId: string,
): Promise<{ sheetNumber: number; hours: number }[]> {
  await persistDeemed(projectId);

  const db = createAdminClient();
  const { data } = await db
    .from("hour_sheets")
    .select("number, status, deadline_at, hour_sheet_lines (hours)")
    .eq("project_id", projectId)
    .in("status", ["approved", "deemed_approved"])
    .order("number");

  const now = new Date();
  return (data ?? [])
    .filter((row) =>
      ["approved", "deemed_approved"].includes(
        effectiveStatus({ status: row.status as SheetStatus, deadline_at: row.deadline_at }, now),
      ),
    )
    .map((row) => ({
      sheetNumber: row.number,
      hours: (row.hour_sheet_lines ?? []).reduce((sum, line) => sum + Number(line.hours), 0),
    }));
}
