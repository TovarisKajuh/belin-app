import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfReadFailed } from "@/lib/db-error";
import { isUuid } from "@/lib/actor-shared";
import { requireOfficeActor, requireProjectActor, type Actor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { getSignedPhotoUrlMap, readObjectFresh, storeReportPdf } from "@/lib/storage";
import { isPng, signingProblem, startDecision } from "@/lib/acceptance-rules";
import { projectToday, projectZone } from "@/lib/project-time";
import { fmtDate } from "@/lib/format";
import { renderDocument } from "@/lib/pdf/theme";
import { loadIssuer } from "@/lib/pdf/issuer";
import { AbnahmeDocument } from "@/lib/pdf/abnahme";
import { abnahmeStrings, docString, type DocLocale } from "@/lib/pdf/strings";
import type {
  AcceptanceStepPayload,
  AcceptanceView,
  Declaration,
} from "@/lib/acceptance-view";

export type {
  AcceptanceDefect,
  AcceptanceKind,
  AcceptanceStepPayload,
  AcceptanceView,
  Declaration,
} from "@/lib/acceptance-view";

// The Abnahme: the moment the work is formally handed over.
//
// Legally this is the heaviest thing in the product. Acceptance starts the
// warranty clock, shifts the risk, and is the last moment at which a client can
// reserve the right to a contractual penalty. Miss that reservation and it is
// gone, which is why the reservation here is a CHECKBOX with fixed wording
// rather than something somebody has to remember to type.
//
// THE PERSISTENCE RULE: every step writes immediately. This is conducted on a
// roof, on two phones, passing one device back and forth, on whatever signal
// the site has. A flow that keeps its state in the browser and saves at the end
// is a flow that loses a completed inspection to a dropped connection, and
// nobody walks the roof twice.

const CONFLICT = "final.conflict";

function localeOf(language: string | null): DocLocale {
  return language === "de" || language === "en" ? language : "sl";
}

export async function getAcceptance(
  actor: Actor,
  projectId: string,
): Promise<AcceptanceView | null> {
  await requireProjectActor(actor, projectId);
  const db = createAdminClient();

  const { data, error } = await db
    .from("acceptances")
    .select(
      "id, kind, status, conducted_at, attendees, declaration, penalty_reserved, warranty_start, epc_signer_name, sub_signer_name, epc_signature_path, sub_signature_path, note, acceptance_defects (id, description, due_date, agreement, photo_path, sort_order)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // A failed read must not offer to start an acceptance that already exists.
  throwIfReadFailed(error, "getAcceptance");
  if (!data) return null;

  // The site's calendar, not the server's: the warranty may not start before
  // the acceptance day where the roof is (L4).
  const { data: project } = await db.from("projects").select("country").eq("id", projectId).maybeSingle();
  const country = project?.country ?? null;

  const defects = (data.acceptance_defects ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const signed = await getSignedPhotoUrlMap(
    defects.map((defect) => defect.photo_path).filter((path): path is string => Boolean(path)),
  );

  return {
    id: data.id,
    kind: data.kind as "final" | "partial",
    status: data.status as "draft" | "signed",
    conductedAt: data.conducted_at,
    attendees: data.attendees,
    declaration: data.declaration as Declaration | null,
    penaltyReserved: data.penalty_reserved,
    warrantyStart: data.warranty_start,
    epcSignerName: data.epc_signer_name,
    subSignerName: data.sub_signer_name,
    hasEpcSignature: Boolean(data.epc_signature_path),
    hasSubSignature: Boolean(data.sub_signature_path),
    note: data.note,
    defects: defects.map((defect) => ({
      id: defect.id,
      description: defect.description,
      dueDate: defect.due_date,
      agreement: defect.agreement as "agreed" | "disputed",
      photoUrl: defect.photo_path ? (signed[defect.photo_path] ?? null) : null,
    })),
    siteToday: projectToday(country),
    conductedDay: data.conducted_at ? projectToday(country, new Date(data.conducted_at)) : null,
  };
}

/**
 * Opens the protocol. The EPC conducts the acceptance, including their
 * Bauleiter, who is the person actually walking the roof with a clipboard.
 */
export async function startAcceptance(
  actor: Actor,
  projectId: string,
  kind: "final" | "partial",
): Promise<string> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden: the client conducts the acceptance.");

  const db = createAdminClient();

  // One draft at a time. A second protocol for the same handover is two
  // versions of one event, and only one of them can be the truth. A signed
  // PARTIAL or a REFUSED acceptance is followed by a new one (flows M2).
  const existing = await getAcceptance(actor, projectId);
  const decision = startDecision(
    existing ? { status: existing.status, kind: existing.kind, declaration: existing.declaration } : null,
  );
  if (decision === "reuse" && existing) return existing.id;
  if (decision === "alreadySigned") throw new Error("final.alreadySigned");

  const { data, error } = await db
    .from("acceptances")
    .insert({
      project_id: projectId,
      kind,
      status: "draft",
      epc_signer_name: person.fullName,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Could not open the acceptance");

  return data.id;
}

/** Saves whatever the inspection has produced so far. Draft only. */
export async function saveAcceptanceStep(
  actor: Actor,
  projectId: string,
  acceptanceId: string,
  payload: AcceptanceStepPayload,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden.");
  if (!isUuid(acceptanceId)) throw new Error("Invalid acceptance id");

  // The warranty clock cannot start before the acceptance day at the site.
  if (payload.warrantyStart) {
    const { data: project } = await createAdminClient()
      .from("projects")
      .select("country")
      .eq("id", projectId)
      .maybeSingle();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(payload.warrantyStart) ||
      payload.warrantyStart < projectToday(project?.country ?? null)
    ) {
      throw new Error("final.err.warrantyBeforeAcceptance");
    }
  }

  // Typed rather than a loose bag: the update below is the only writer of
  // these columns, and a typo in a key name would otherwise be a silent no-op.
  const fields: {
    kind?: string;
    attendees?: string | null;
    declaration?: string | null;
    penalty_reserved?: boolean;
    warranty_start?: string | null;
    epc_signer_name?: string | null;
    sub_signer_name?: string | null;
    note?: string | null;
  } = {};
  if (payload.kind !== undefined) fields.kind = payload.kind;
  if (payload.attendees !== undefined) fields.attendees = payload.attendees?.trim() || null;
  if (payload.declaration !== undefined) fields.declaration = payload.declaration;
  if (payload.penaltyReserved !== undefined) fields.penalty_reserved = payload.penaltyReserved;
  if (payload.warrantyStart !== undefined) fields.warranty_start = payload.warrantyStart || null;
  if (payload.epcSignerName !== undefined) fields.epc_signer_name = payload.epcSignerName?.trim() || null;
  if (payload.subSignerName !== undefined) fields.sub_signer_name = payload.subSignerName?.trim() || null;
  if (payload.note !== undefined) fields.note = payload.note?.trim() || null;
  if (Object.keys(fields).length === 0) return;

  const { data, error } = await createAdminClient()
    .from("acceptances")
    .update(fields)
    .eq("id", acceptanceId)
    .eq("project_id", projectId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error(CONFLICT);
}

export async function addDefect(
  actor: Actor,
  projectId: string,
  acceptanceId: string,
  payload: { description: string; dueDate: string | null; agreement: "agreed" | "disputed" },
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden.");
  if (!isUuid(acceptanceId)) throw new Error("Invalid acceptance id");

  const description = payload.description.trim();
  if (!description) throw new Error("final.err.defect");

  const db = createAdminClient();
  const { data: acceptance } = await db
    .from("acceptances")
    .select("id, status")
    .eq("id", acceptanceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!acceptance || acceptance.status !== "draft") throw new Error(CONFLICT);

  const { data: top } = await db
    .from("acceptance_defects")
    .select("sort_order")
    .eq("acceptance_id", acceptanceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await db.from("acceptance_defects").insert({
    acceptance_id: acceptanceId,
    description,
    due_date: payload.dueDate || null,
    agreement: payload.agreement,
    sort_order: (top?.sort_order ?? 0) + 1,
  });
}

export async function removeDefect(
  actor: Actor,
  projectId: string,
  defectId: string,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden.");
  if (!isUuid(defectId)) throw new Error("Invalid defect id");

  const db = createAdminClient();
  const { data: defect } = await db
    .from("acceptance_defects")
    .select("id, acceptances!inner (id, status, project_id)")
    .eq("id", defectId)
    .maybeSingle();

  if (!defect || defect.acceptances.project_id !== projectId) throw new Error(CONFLICT);
  if (defect.acceptances.status !== "draft") throw new Error(CONFLICT);

  await db.from("acceptance_defects").delete().eq("id", defectId);
}

/** Stores one party's signature PNG. Draft only; a signed protocol is closed. */
export async function saveSignature(
  actor: Actor,
  projectId: string,
  acceptanceId: string,
  side: "epc" | "sub",
  png: ArrayBuffer,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden.");
  if (!isUuid(acceptanceId)) throw new Error("Invalid acceptance id");
  if (png.byteLength === 0 || png.byteLength > 2_000_000 || !isPng(new Uint8Array(png))) {
    throw new Error("final.err.signature");
  }

  const db = createAdminClient();
  const { data: acceptance } = await db
    .from("acceptances")
    .select("id, status")
    .eq("id", acceptanceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!acceptance || acceptance.status !== "draft") throw new Error(CONFLICT);

  // A NEW path for every confirmed signature. Re-signing writes a second file
  // instead of overwriting the first: storage keeps the original bytes at a
  // reused path (docs/known-issues.md entry 2), which is exactly how a
  // three-stroke signature used to print as one stroke. The superseded file is
  // left in place; it is a few kilobytes and it is evidence of the re-sign.
  const path = `${projectId}/acceptance/${acceptanceId}-${side}-${randomUUID()}.png`;
  const { error } = await db.storage
    .from("signatures")
    .upload(path, Buffer.from(png), { contentType: "image/png", upsert: false });
  if (error) throw new Error("Could not store the signature");

  await db
    .from("acceptances")
    .update(side === "epc" ? { epc_signature_path: path } : { sub_signature_path: path })
    .eq("id", acceptanceId)
    .eq("status", "draft");
}

/**
 * Closes the protocol.
 *
 * Both signatures and both names are required, because an acceptance signed by
 * one party is not an acceptance, it is a note. The declaration is required for
 * the same reason: "accepted", "accepted with reservations" and "refused" have
 * three different legal consequences and the document must say which happened.
 * A refusal or a reservation needs at least one named defect, and the warranty
 * cannot start before the acceptance day (signingProblem).
 */
export async function signAcceptance(
  actor: Actor,
  projectId: string,
  acceptanceId: string,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor, { allowBauleiter: true });
  if (projectActor.role !== "epc") throw new Error("Forbidden.");
  if (!isUuid(acceptanceId)) throw new Error("Invalid acceptance id");

  const db = createAdminClient();
  const { data: row } = await db
    .from("acceptances")
    .select(
      "id, kind, status, declaration, warranty_start, epc_signer_name, sub_signer_name, epc_signature_path, sub_signature_path, acceptance_defects (id)",
    )
    .eq("id", acceptanceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row || row.status !== "draft") throw new Error(CONFLICT);

  const { data: project } = await db
    .from("projects")
    .select("status, country, language")
    .eq("id", projectId)
    .maybeSingle();
  const today = projectToday(project?.country ?? null);
  // The warranty starts with the acceptance unless the parties set a later
  // day. A refusal starts nothing.
  const warrantyStart = row.declaration === "refused" ? null : (row.warranty_start ?? today);

  const problem = signingProblem({
    declaration: row.declaration as Declaration | null,
    defectCount: (row.acceptance_defects ?? []).length,
    warrantyStart,
    today,
    hasEpcSignature: Boolean(row.epc_signature_path),
    hasSubSignature: Boolean(row.sub_signature_path),
    epcSignerName: row.epc_signer_name,
    subSignerName: row.sub_signer_name,
  });
  if (problem) throw new Error(problem);

  // THE DOCUMENT FIRST, THEN THE STATUS, as sendPo does. A protocol that is
  // "signed" with no file behind it is a legal record nobody can produce, and
  // a failed render must leave the draft open for another try (flows M1).
  const conductedAt = new Date().toISOString();
  const path = await renderAndStoreProtocol(projectId, acceptanceId, { conductedAt, warrantyStart });

  const { data: signed, error } = await db
    .from("acceptances")
    .update({
      status: "signed",
      conducted_at: conductedAt,
      warranty_start: warrantyStart,
      report_pdf_path: path,
    })
    .eq("id", acceptanceId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !signed) throw new Error(CONFLICT);

  await db.from("generated_documents").insert({
    project_id: projectId,
    kind: "abnahmeprotokoll",
    language: localeOf(project?.language ?? null),
    storage_path: path,
  });

  // Finishing a project happens HERE and nowhere else (D10): the job is done
  // when the client has accepted it, not when somebody picks a menu item.
  if (row.kind === "final" && row.declaration !== "refused" && project) {
    const { data: moved } = await db
      .from("projects")
      .update({ status: "finished" })
      .eq("id", projectId)
      .in("status", ["active", "paused", "reviewing"])
      .select("id")
      .maybeSingle();
    if (moved) {
      await db.from("activity").insert({
        project_id: projectId,
        kind: "project_updated",
        payload: { from: project.status, to: "finished", by: "epc", via: "acceptance" },
        actor_person: person.personId,
      });
    }
  }

  await emitEventDeferred({
    projectId,
    kind: "acceptance_signed",
    actorPerson: person.personId,
    payload: {},
  });
}

/**
 * Renders the protocol as it is about to be signed and stores it at a NEW
 * path. The two values the signing itself decides (the moment and the
 * warranty start) are passed in, because the row does not hold them yet.
 */
async function renderAndStoreProtocol(
  projectId: string,
  acceptanceId: string,
  at: { conductedAt: string; warrantyStart: string | null },
): Promise<string> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select(
      "name, language, country, epc_org_id, address_street, address_zip, address_city, epc:epc_org_id (name), sub:sub_org_id (name)",
    )
    .eq("id", projectId)
    .maybeSingle();

  const { data: row } = await db
    .from("acceptances")
    .select(
      "id, kind, attendees, declaration, penalty_reserved, epc_signer_name, sub_signer_name, epc_signature_path, sub_signature_path, note, acceptance_defects (description, due_date, agreement, sort_order)",
    )
    .eq("id", acceptanceId)
    .maybeSingle();
  if (!row || !project) throw new Error("Acceptance not found");

  const locale = localeOf(project.language);
  const zone = projectZone(project.country);
  const t = (key: string) => docString(locale, key);
  // A yyyy-mm-dd day (warranty, due date) never shifts; an instant is shown in
  // the site's zone, so a protocol signed after midnight UTC is still dated
  // the day it was signed on the roof (L4).
  const day = (value: string | null) => (value ? fmtDate(value, locale, { timeZone: zone }) : null);

  // Read through a cache-busted signed URL, never storage.download(): a
  // signature somebody just redrew must be the one on the paper
  // (docs/known-issues.md entry 2).
  const [epcImage, subImage] = await Promise.all([
    row.epc_signature_path ? readObjectFresh("signatures", row.epc_signature_path) : null,
    row.sub_signature_path ? readObjectFresh("signatures", row.sub_signature_path) : null,
  ]);
  if (!epcImage || !subImage) throw new Error("final.err.signatures");

  const buffer = await renderDocument(
    AbnahmeDocument({
      projectName: project.name,
      clientName: project.epc?.name ?? "",
      contractorName: project.sub?.name ?? null,
      siteAddress:
        [project.address_street, [project.address_zip, project.address_city].filter(Boolean).join(" ")]
          .filter((part) => part && part.trim())
          .join(", ") || null,
      kindLabel: t(`final.kind${row.kind === "partial" ? "Partial" : "Final"}`),
      conductedOn: day(at.conductedAt),
      attendees: row.attendees,
      declarationLabel: row.declaration ? t(`final.decl.${row.declaration}`) : "",
      penaltyReserved: row.penalty_reserved,
      warrantyStart: day(at.warrantyStart),
      note: row.note,
      defects: (row.acceptance_defects ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((defect) => ({
          description: defect.description,
          dueDate: day(defect.due_date),
          agreementLabel: t(`final.${defect.agreement === "disputed" ? "disputed" : "agreed"}`),
        })),
      epcSigner: { name: row.epc_signer_name ?? "", image: epcImage },
      subSigner: { name: row.sub_signer_name ?? "", image: subImage },
      issuer: await loadIssuer(db, project.epc_org_id),
      s: abnahmeStrings(locale),
    }),
  );

  // A new path for every render: a retry after a failed sign must never meet
  // the bytes of the previous attempt (docs/known-issues.md entry 2).
  return storeReportPdf(`${projectId}/final/abnahme-${acceptanceId}-${randomUUID()}.pdf`, buffer);
}
