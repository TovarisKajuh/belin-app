import "server-only";
import { randomUUID } from "node:crypto";
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
import { loadIssuer } from "@/lib/pdf/issuer";
import type { ChangeOrderStatus } from "@/lib/change-orders-view";
import { summarizeExtras, summarizeHours } from "@/lib/completion-shared";
import { mapWithLimit } from "@/lib/async-pool";
import { formatTemplate } from "@/lib/notify-shared";
import { fmtDate, fmtNumber } from "@/lib/format";
import { projectZone } from "@/lib/project-time";

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
//    They are capped per day, fetched six at a time for the whole job, and
//    shrunk to print size before they are embedded. A failed download is
//    skipped rather than aborting: a report missing one photograph is worth
//    infinitely more than no report.

/** Four is enough to show a day and keeps a nine-day report under a sane size. */
const PHOTOS_PER_DAY = 4;
/** Parallel photo downloads: enough to hide latency, few enough for a weak uplink. */
const PHOTO_CONCURRENCY = 6;
/** Long edge of a printed photo: two per row on A4 at about 200 dpi need less than this. */
const PRINT_EDGE_PX = 1200;

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
      "id, name, language, country, kwp, sub_org_id, address_street, address_zip, address_city, planned_start, planned_end, epc:epc_org_id (name), sub:sub_org_id (name)",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");

  const locale: DocLocale =
    project.language === "de" || project.language === "en" ? project.language : "sl";
  const t = (key: string) => docString(locale, key);
  const zone = projectZone(project.country);

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

  const shortFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
  });

  type DayDraft = Omit<DayReportData, "photos"> & { photoPaths: string[] };
  const drafts: DayDraft[] = dayRefs.map((ref) => {
    const dayEntries = entries.filter((entry) => entry.entry_date === ref.dateIso);
    const dayIncidents = incidents.filter((incident) => incident.occurred_on === ref.dateIso);
    // Weather and headcount come from the FIRST entry of the date: several
    // reports on one day are the same day's weather, and the crew count is
    // the one recorded when work started.
    const first = dayEntries[0];
    const weather = first?.weather as { code?: number; tempC?: number } | null;
    return {
      reportNo: ref.reportNo,
      dateLabel: fmtDate(ref.dateIso, locale, { timeZone: zone }),
      weatherLabel:
        weather?.code === undefined
          ? null
          : `${t(`weather.${weatherCodeToKey(weather.code ?? null)}`)}${
              weather.tempC === undefined ? "" : `, ${fmtNumber(weather.tempC, locale, { maxDecimals: 0 })} °C`
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
      photoPaths: dayEntries
        .flatMap((entry) => entry.entry_photos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, PHOTOS_PER_DAY)
        .map((photo) => photo.storage_path),
    };
  });

  // Every photo of the job, six at a time, each shrunk for print. Sequential
  // downloads cost seconds per day of a long job (flows M10).
  const photoBytes = await mapWithLimit(
    drafts.flatMap((day) => day.photoPaths),
    PHOTO_CONCURRENCY,
    (path) => loadPrintPhoto(db, path),
  );
  let cursor = 0;
  const days: DayReportData[] = drafts.map(({ photoPaths, ...day }) => {
    const photos = photoBytes
      .slice(cursor, cursor + photoPaths.length)
      .filter((bytes): bytes is Buffer => bytes !== null);
    cursor += photoPaths.length;
    return { ...day, photos };
  });

  const now = new Date();
  const sheetHours = sheets.map((sheet) => ({
    number: sheet.number,
    status: sheet.status as SheetStatus,
    deadline_at: sheet.deadline_at,
    hours: (sheet.hour_sheet_lines ?? []).reduce((sum, line) => sum + Number(line.hours), 0),
  }));
  // The report states the hours the INVOICE bills, and lists the rest apart
  // (DOC-H3: a report saying 33 h next to an invoice billing 28 h).
  const hours = summarizeHours(sheetHours, now);
  const extras = summarizeExtras(
    orders.map((order) => ({
      status: order.status as ChangeOrderStatus,
      amount: order.amount === null ? null : Number(order.amount),
    })),
  );
  const h = (n: number) => `${fmtNumber(n, locale)} h`;
  const summaryRows: { label: string; value: string }[] = [
    { label: t("final.doc.hoursApproved"), value: h(hours.approved) },
  ];
  if (hours.pending > 0) summaryRows.push({ label: t("final.doc.hoursPending"), value: h(hours.pending) });
  if (hours.rejected > 0) summaryRows.push({ label: t("final.doc.hoursRejected"), value: h(hours.rejected) });
  summaryRows.push({
    label: t("final.doc.extrasApproved"),
    value: [
      String(extras.approvedCount),
      extras.approvedCount > extras.approvedUnpriced ? formatMoney(extras.approvedSum, locale) : null,
      extras.approvedUnpriced > 0
        ? formatTemplate(t("final.doc.extrasUnpriced"), { n: String(extras.approvedUnpriced) })
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });
  if (extras.pendingCount > 0) {
    summaryRows.push({ label: t("final.doc.extrasPending"), value: String(extras.pendingCount) });
  }
  if (extras.rejectedCount > 0) {
    summaryRows.push({ label: t("final.doc.extrasRejected"), value: String(extras.rejectedCount) });
  }
  summaryRows.push({ label: t("final.doc.incidentsCount"), value: String(incidents.length) });

  const address = [
    project.address_street,
    [project.address_zip, project.address_city].filter(Boolean).join(" "),
  ]
    .filter((part) => part && part.trim())
    .join(", ");

  const period =
    dayRefs.length > 0
      ? `${fmtDate(dayRefs[0].dateIso, locale, { timeZone: zone })} - ${fmtDate(
          dayRefs[dayRefs.length - 1].dateIso,
          locale,
          { timeZone: zone },
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
      powerLabel: project.kwp ? `${fmtNumber(Number(project.kwp), locale, { maxDecimals: 1 })} kWp` : null,
      dayCount: dayRefs.length,
      approvedHours: fmtNumber(hours.approved, locale),
      summaryRows,
      days,
      hoursRegister: sheetHours.map((sheet) => ({
        number: sheet.number,
        hours: fmtNumber(sheet.hours, locale),
        status: docString(
          locale,
          `hours.status.${effectiveStatus({ status: sheet.status, deadline_at: sheet.deadline_at }, now)}`,
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
      issuer: await loadIssuer(db, project.sub_org_id),
      s: strings,
    }),
  );

  // The id is chosen BEFORE the file is stored, so the row is written once,
  // complete, after the bytes exist. No "pending" row is ever left for a
  // double click or a failed run to find (flows M10).
  const documentId = randomUUID();
  const path = await storeReportPdf(`${projectId}/final/completion-${documentId}.pdf`, buffer);
  const { error } = await db.from("generated_documents").insert({
    id: documentId,
    project_id: projectId,
    kind: "completion_report",
    language: locale,
    storage_path: path,
  });
  if (error) throw new Error("Could not record the document");

  return { documentId, storagePath: path };
}

/**
 * One photo, ready for paper: downloaded, turned upright, shrunk to print
 * size and re-encoded. A phone photo is several megabytes and prints a few
 * centimetres wide; embedding it whole made a nine day report about 10 MB
 * (DOC-M6). Photo paths are written once, so download() is safe here. A
 * failed download is skipped, never thrown: a report missing one picture
 * beats no report.
 */
async function loadPrintPhoto(
  db: ReturnType<typeof createAdminClient>,
  path: string,
): Promise<Buffer | null> {
  try {
    const file = await db.storage.from("photos").download(path);
    if (file.error || !file.data) return null;
    return await shrinkForPrint(Buffer.from(await file.data.arrayBuffer()));
  } catch {
    return null;
  }
}

/** If sharp cannot load on the server, the original bytes are used: bigger, never wrong. */
async function shrinkForPrint(bytes: Buffer): Promise<Buffer> {
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(bytes)
      .rotate()
      .resize({ width: PRINT_EDGE_PX, height: PRINT_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn(
      `[completion] sharp unavailable, embedding the original photo: ${err instanceof Error ? err.message : String(err)}`,
    );
    return bytes;
  }
}
