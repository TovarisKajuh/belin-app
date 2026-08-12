import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectActor, type Actor } from "@/lib/actor";
import { buildDayReports, diaryTitleKey } from "@/lib/report-days-shared";
import { effectiveStatus, type SheetStatus } from "@/lib/hours-shared";
import { persistDeemed } from "@/lib/data/hours";
import { formatMoney } from "@/lib/po-shared";
import { storeReportPdf } from "@/lib/storage";
import { weatherCodeToKey } from "@/lib/weather-codes";
import { CompletionDocument } from "@/lib/pdf/completion";
import type { DayReportData } from "@/lib/pdf/day-report";
import { completionStrings, docString, type DocLocale } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";

// Assembling the completion report.
//
// Two traps live here, both of which would be silent.
//
// 1. HOURS. The registers read the STORED status, so a sheet whose deadline
//    passed while nobody was looking would print as "submitted" and could be
//    read as unresolved. persistDeemed runs first, so the document always
//    states the same thing the clock already decided.
// 2. PHOTOS. They come from private storage, one download each, and a report
//    with nine days of pictures is a lot of downloads on a weak connection.
//    They are capped per day and a failed download is skipped rather than
//    aborting: a report missing one photograph is worth infinitely more than
//    no report.

/** Four is enough to show a day and keeps a nine-day report under a sane size. */
const PHOTOS_PER_DAY = 4;

export interface CompletionResult {
  documentId: string;
  storagePath: string;
}

export async function generateCompletionReport(
  actor: Actor,
  projectId: string,
): Promise<CompletionResult> {
  const projectActor = await requireProjectActor(actor, projectId);
  if (actor.kind !== "person" || actor.role === "crew") {
    throw new Error("common.askOffice");
  }

  const db = createAdminClient();

  // The deemed approvals land BEFORE anything is read, so the registers and the
  // rows agree.
  await persistDeemed(projectId);

  const { data: project } = await db
    .from("projects")
    .select(
      "id, name, language, country, kwp, address_street, address_zip, address_city, planned_start, planned_end, epc:epc_org_id (name), sub:sub_org_id (name)",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");

  const locale: DocLocale =
    project.language === "de" || project.language === "en" ? project.language : "sl";
  const t = (key: string) => docString(locale, key);

  const [entriesRes, incidentsRes, sheetsRes, ordersRes] = await Promise.all([
    db
      .from("daily_entries")
      .select(
        "id, entry_date, headcount, note, weather, created_at, people:created_by_person (full_name), entry_quantities (qty, scope_items (name, unit)), entry_photos (storage_path, sort_order)",
      )
      .eq("project_id", projectId)
      .order("entry_date")
      .order("created_at"),
    db
      .from("incidents")
      .select("kind, note, occurred_on")
      .eq("project_id", projectId)
      .order("occurred_on"),
    db
      .from("hour_sheets")
      .select("number, status, deadline_at, hour_sheet_lines (hours)")
      .eq("project_id", projectId)
      .order("number"),
    db
      .from("change_orders")
      .select("number, title, amount, status")
      .eq("project_id", projectId)
      .order("number"),
  ]);

  const entries = entriesRes.data ?? [];
  const incidents = incidentsRes.data ?? [];
  const sheets = sheetsRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const dayRefs = buildDayReports(
    entries.map((entry) => entry.entry_date),
    incidents.map((incident) => incident.occurred_on),
  );

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const shortFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
  });

  const days: DayReportData[] = [];
  for (const ref of dayRefs) {
    const dayEntries = entries.filter((entry) => entry.entry_date === ref.dateIso);
    const dayIncidents = incidents.filter((incident) => incident.occurred_on === ref.dateIso);

    // Weather and headcount come from the FIRST entry of the date: several
    // reports on one day are the same day's weather, and the crew count is the
    // one recorded when work started.
    const first = dayEntries[0];
    const weather = first?.weather as { code?: number; tempC?: number } | null;

    const photoPaths = dayEntries
      .flatMap((entry) => entry.entry_photos ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, PHOTOS_PER_DAY)
      .map((photo) => photo.storage_path);

    days.push({
      reportNo: ref.reportNo,
      dateLabel: dateFmt.format(new Date(`${ref.dateIso}T12:00:00Z`)),
      weatherLabel: weather?.code === undefined
        ? null
        : `${t(`weather.${weatherCodeToKey(weather.code ?? null)}`)}${
            weather.tempC === undefined ? "" : `, ${weather.tempC} °C`
          }`,
      headcount: first?.headcount ?? null,
      entries: dayEntries.map((entry) => ({
        note: entry.note,
        author: entry.people?.full_name ?? null,
        quantities: (entry.entry_quantities ?? [])
          .filter((quantity) => Number(quantity.qty) > 0)
          .map((quantity) => ({
            name: quantity.scope_items?.name ?? "",
            qty: Number(quantity.qty),
            unit: quantity.scope_items?.unit ?? "",
          })),
      })),
      incidents: dayIncidents.map((incident) => ({
        kindLabel: t(`incident.kinds.${incident.kind}`),
        note: incident.note,
      })),
      photos: await downloadPhotos(db, photoPaths),
    });
  }

  const now = new Date();
  const totalHours = sheets.reduce(
    (sum, sheet) => sum + (sheet.hour_sheet_lines ?? []).reduce((s, l) => s + Number(l.hours), 0),
    0,
  );

  const address = [
    project.address_street,
    [project.address_zip, project.address_city].filter(Boolean).join(" "),
  ]
    .filter((part) => part && part.trim())
    .join(", ");

  const period =
    dayRefs.length > 0
      ? `${dateFmt.format(new Date(`${dayRefs[0].dateIso}T12:00:00Z`))} - ${dateFmt.format(
          new Date(`${dayRefs[dayRefs.length - 1].dateIso}T12:00:00Z`),
        )}`
      : null;

  const strings = completionStrings(locale);
  // The diary title follows the SITE, not the reader: a Slovenian project is
  // never titled as a statutory gradbeni dnevnik in any language.
  strings.day.title = t(diaryTitleKey(project.country));

  const buffer = await renderDocument(
    CompletionDocument({
      projectName: project.name,
      clientName: project.epc?.name ?? "",
      contractorName: project.sub?.name ?? null,
      siteAddress: address || null,
      periodLabel: period,
      powerLabel: project.kwp ? `${project.kwp} kWp` : null,
      dayCount: dayRefs.length,
      totalHours,
      days,
      hoursRegister: sheets.map((sheet) => ({
        number: sheet.number,
        hours: (sheet.hour_sheet_lines ?? []).reduce((sum, line) => sum + Number(line.hours), 0),
        status: docString(
          locale,
          `hours.status.${effectiveStatus(
            { status: sheet.status as SheetStatus, deadline_at: sheet.deadline_at },
            now,
          )}`,
        ),
      })),
      coRegister: orders.map((order) => ({
        number: order.number,
        title: order.title,
        amount: order.amount === null ? t("co.noAmount") : formatMoney(Number(order.amount), locale),
        status: docString(locale, `co.status.${order.status}`),
      })),
      incidentRegister: incidents.map((incident) => ({
        date: shortFmt.format(new Date(`${incident.occurred_on}T12:00:00Z`)),
        kindLabel: t(`incident.kinds.${incident.kind}`),
        note: incident.note,
      })),
      s: strings,
    }),
  );

  const { data: doc, error } = await db
    .from("generated_documents")
    .insert({
      project_id: projectId,
      kind: "completion_report",
      language: locale,
      storage_path: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error || !doc) throw new Error("Could not record the document");

  const path = await storeReportPdf(`${projectId}/final/completion-${doc.id}.pdf`, buffer);
  await db.from("generated_documents").update({ storage_path: path }).eq("id", doc.id);

  return { documentId: doc.id, storagePath: path };
}

/**
 * Photo bytes for one day. Failures are skipped, never thrown: the report is
 * the point, and a missing photograph is a smaller loss than no document at
 * all on the afternoon somebody needs it.
 */
async function downloadPhotos(
  db: ReturnType<typeof createAdminClient>,
  paths: string[],
): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const path of paths) {
    try {
      const file = await db.storage.from("photos").download(path);
      if (file.error || !file.data) continue;
      out.push(Buffer.from(await file.data.arrayBuffer()));
    } catch {
      // skip
    }
  }
  return out;
}
