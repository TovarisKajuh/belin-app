import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { effectiveStatus, type SheetStatus } from "@/lib/hours-shared";
import { RegieberichtDocument } from "@/lib/pdf/regiebericht";
import { regieStrings, sheetStatusLabel, type DocLocale } from "@/lib/pdf/strings";
import { persistDeemed } from "@/lib/data/hours";
import { renderDocument } from "@/lib/pdf/theme";

// The Regiebericht is rendered ON DEMAND and never stored.
//
// Unlike the naročilnica, nothing binds to these bytes: there is no acceptance
// hashed against them, so a stored copy would only be a second version of the
// truth waiting to drift from the rows. The rows are the record; this is a view
// of them.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sheetId: string }> },
) {
  const { sheetId } = await params;
  if (!isUuid(sheetId)) return new NextResponse("Not found", { status: 404 });

  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person" || actor.role === "crew") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const db = createAdminClient();
  const { data: sheet } = await db
    .from("hour_sheets")
    .select(
      "id, number, status, submitted_at, deadline_at, decided_at, project_id, people:decided_by_person (full_name), hour_sheet_lines (work_date, hours, description, people (full_name))",
    )
    .eq("id", sheetId)
    .maybeSingle();
  if (!sheet) return new NextResponse("Not found", { status: 404 });

  try {
    await requireProjectActor(actor, sheet.project_id);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // A deadline that has passed since the last page load decides the sheet
  // before it is printed, so the document can never claim a sheet is still
  // pending when the clock already approved it.
  await persistDeemed(sheet.project_id);

  const { data: project } = await db
    .from("projects")
    .select("name, language, organizations:sub_org_id (name)")
    .eq("id", sheet.project_id)
    .maybeSingle();

  const locale = (project?.language === "de" || project?.language === "en"
    ? project.language
    : "sl") as DocLocale;

  const status = effectiveStatus(
    { status: sheet.status as SheetStatus, deadline_at: sheet.deadline_at },
    new Date(),
  );

  const lines = (sheet.hour_sheet_lines ?? [])
    .map((line) => ({
      date: line.work_date,
      person: line.people?.full_name ?? null,
      hours: Number(line.hours),
      description: line.description,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const fmt = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(value))
      : null;

  const buffer = await renderDocument(
    RegieberichtDocument({
      number: sheet.number,
      projectName: project?.name ?? "",
      contractorName: project?.organizations?.name ?? null,
      submittedOn: fmt(sheet.submitted_at),
      statusLabel: sheetStatusLabel(locale, status),
      deemed: status === "deemed_approved",
      decidedByName: sheet.people?.full_name ?? null,
      decidedOn: fmt(sheet.decided_at),
      totalHours: lines.reduce((sum, line) => sum + line.hours, 0),
      lines: lines.map((line) => ({
        ...line,
        date: `${line.date.slice(8, 10)}.${line.date.slice(5, 7)}.`,
      })),
      s: regieStrings(locale),
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="regie-${sheet.number}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
