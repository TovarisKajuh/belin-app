import "server-only";
import { createHash } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOfficeActor, requireProjectActor, type Actor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { getSignedReportUrl, storeReportPdf } from "@/lib/storage";
import { lineTotal, poTotals, round2, type PoLine } from "@/lib/po-shared";
import { NarocilnicaDocument } from "@/lib/pdf/narocilnica";
import { poStrings, type DocLocale } from "@/lib/pdf/strings";

// The naročilnica, and the only place its status ever moves.
//
// Every transition here is a SINGLE conditional update whose guard lives in the
// WHERE clause, returning the row. Zero rows back means somebody else got there
// first, and the caller shows a conflict rather than overwriting a decision.
// A read-then-write check would leave a window in which two tabs, or one EPC
// and one impatient subcontractor, could both act on the same document.
//
// The gates: creating, editing and sending belong to the EPC office and NOT to
// a Bauleiter, because they set a price. Accepting and rejecting belong to the
// sub office. Neither is ever reachable from a project link: a link is a shared
// secret that can be forwarded to anyone, and a forwarded secret must not be
// able to accept a contract.

export type PoStatus = "draft" | "sent" | "accepted" | "rejected" | "cancelled";

export interface PoLineInput {
  description: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  /** Used only when qty and unitPrice cannot produce it (a lump sum line). */
  total: number | null;
}

export interface PoView {
  id: string;
  number: number;
  status: PoStatus;
  totalNet: number;
  regieHourlyRate: number | null;
  paymentTerms: string | null;
  deadline: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  pdfUrl: string | null;
  lines: PoLine[];
}

export interface PoPageData {
  projectId: string;
  projectName: string;
  locale: DocLocale;
  hasSub: boolean;
  role: "epc" | "sub";
  /** True only for a signed-in office person: the crew link never acts here. */
  canManage: boolean;
  canDecide: boolean;
  po: PoView | null;
}

const CONFLICT = "po.conflict";

export async function getPoPageData(actor: Actor, projectId: string): Promise<PoPageData | null> {
  const projectActor = await requireProjectActor(actor, projectId);
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("id, name, language, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const office = actor.kind === "person" && (actor.role === "admin" || actor.role === "owner");

  return {
    projectId: project.id,
    projectName: project.name,
    locale: docLocale(project.language),
    hasSub: Boolean(project.sub_org_id),
    role: projectActor.role,
    canManage: office && projectActor.role === "epc",
    canDecide: office && projectActor.role === "sub",
    po: await loadPo(db, projectId),
  };
}

async function loadPo(
  db: ReturnType<typeof createAdminClient>,
  projectId: string,
): Promise<PoView | null> {
  const { data } = await db
    .from("purchase_orders")
    .select(
      "id, number, status, total_net, regie_hourly_rate, payment_terms, deadline, pdf_path, sent_at, accepted_at, accepted_by_name, rejected_at, rejection_note",
    )
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const { data: lineRows } = await db
    .from("purchase_order_lines")
    .select("description, qty, unit, unit_price, total, sort_order")
    .eq("purchase_order_id", data.id)
    .order("sort_order", { ascending: true });

  return {
    id: data.id,
    number: data.number,
    status: data.status as PoStatus,
    totalNet: Number(data.total_net),
    regieHourlyRate: data.regie_hourly_rate === null ? null : Number(data.regie_hourly_rate),
    paymentTerms: data.payment_terms,
    deadline: data.deadline,
    sentAt: data.sent_at,
    acceptedAt: data.accepted_at,
    acceptedByName: data.accepted_by_name,
    rejectedAt: data.rejected_at,
    rejectionNote: data.rejection_note,
    pdfUrl: data.pdf_path ? await getSignedReportUrl(data.pdf_path) : null,
    lines: (lineRows ?? []).map((row) => ({
      description: row.description,
      qty: row.qty === null ? null : Number(row.qty),
      unit: row.unit,
      unitPrice: row.unit_price === null ? null : Number(row.unit_price),
      total: Number(row.total),
      sortOrder: row.sort_order,
    })),
  };
}

/** Normalizes typed lines: computed totals win, a typed total survives only when nothing can be computed. */
function normalizeLines(lines: PoLineInput[]): PoLine[] {
  return lines
    .map((line, index) => {
      const computed = lineTotal(line.qty, line.unitPrice);
      return {
        description: line.description.trim(),
        qty: line.qty,
        unit: line.unit?.trim() || null,
        unitPrice: line.unitPrice,
        total: computed ?? round2(line.total ?? 0),
        sortOrder: index,
      };
    })
    .filter((line) => line.description.length > 0);
}

export interface SavePoPayload {
  lines: PoLineInput[];
  regieHourlyRate: number | null;
  paymentTerms: string | null;
  deadline: string | null;
}

/**
 * Creates the draft, or rewrites an existing draft in place. A project carries
 * one live naročilnica in v1: once one is accepted, no new one can be created,
 * because a second accepted price on the same job is a dispute waiting to be
 * had rather than a feature.
 */
export async function savePoDraft(
  actor: Actor,
  projectId: string,
  payload: SavePoPayload,
): Promise<string> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "epc") throw new Error("Forbidden: the orderer prepares the naročilnica.");

  const lines = normalizeLines(payload.lines);
  if (lines.length === 0) throw new Error("po.emptyLines");

  const db = createAdminClient();
  const existing = await loadPo(db, projectId);

  if (existing && (existing.status === "accepted" || existing.status === "sent")) {
    throw new Error(existing.status === "accepted" ? "po.alreadyAccepted" : CONFLICT);
  }

  const totals = poTotals(lines);
  const fields: PoFields = {
    total_net: totals,
    regie_hourly_rate: payload.regieHourlyRate,
    payment_terms: payload.paymentTerms?.trim() || null,
    deadline: payload.deadline || null,
  };

  let poId: string;

  if (existing) {
    // Guarded even though the draft was just read: another tab may have sent it
    // in between, and a sent document must never be silently rewritten.
    const { data, error } = await db
      .from("purchase_orders")
      .update(fields)
      .eq("id", existing.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(CONFLICT);
    poId = data.id;
    await db.from("purchase_order_lines").delete().eq("purchase_order_id", poId);
  } else {
    poId = await insertPoWithNextNumber(db, projectId, person.personId, fields);
  }

  const { error: linesError } = await db.from("purchase_order_lines").insert(
    lines.map((line) => ({
      purchase_order_id: poId,
      description: line.description,
      qty: line.qty,
      unit: line.unit,
      unit_price: line.unitPrice,
      total: line.total,
      sort_order: line.sortOrder,
    })),
  );
  if (linesError) throw new Error("Could not save the naročilnica lines");

  return poId;
}

type PoFields = {
  total_net: number;
  regie_hourly_rate: number | null;
  payment_terms: string | null;
  deadline: string | null;
};

/** Numbering is per project, computed as max plus one, with one retry on the unique index. */
async function insertPoWithNextNumber(
  db: ReturnType<typeof createAdminClient>,
  projectId: string,
  personId: string,
  fields: PoFields,
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: top } = await db
      .from("purchase_orders")
      .select("number")
      .eq("project_id", projectId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await db
      .from("purchase_orders")
      .insert({
        project_id: projectId,
        number: (top?.number ?? 0) + 1,
        created_by_person: personId,
        ...fields,
      })
      .select("id")
      .maybeSingle();

    if (data) return data.id;
    // 23505 is the unique(project_id, number) collision: two drafts created in
    // the same instant. Recompute once; a second collision is not a race.
    if (error?.code !== "23505") throw new Error("Could not create the naročilnica");
  }
  throw new Error("Could not create the naročilnica");
}

/**
 * Renders the document, stores it, binds its hash to the row and notifies the
 * subcontractor, all behind one conditional update from draft.
 *
 * The order matters: the PDF is produced and stored BEFORE the status moves, so
 * a row can never be 'sent' without a document behind it. The reverse order
 * would leave the sub staring at a naročilnica they cannot open.
 */
export async function sendPo(actor: Actor, projectId: string, poId: string): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  requireOfficeActor(actor);
  if (projectActor.role !== "epc") throw new Error("Forbidden: the orderer sends the naročilnica.");

  const db = createAdminClient();
  const { data: row } = await db
    .from("purchase_orders")
    .select("id, status, project_id")
    .eq("id", poId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row || row.status !== "draft") throw new Error(CONFLICT);

  const { buffer, sha256 } = await renderPoPdf(db, projectId, poId, null);
  const path = await storeReportPdf(`${projectId}/po/${poId}.pdf`, buffer);

  const { data: sent, error } = await db
    .from("purchase_orders")
    .update({ status: "sent", sent_at: new Date().toISOString(), pdf_path: path, pdf_sha256: sha256 })
    .eq("id", poId)
    .eq("status", "draft")
    .select("id, number")
    .maybeSingle();
  if (error || !sent) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId,
    kind: "po_sent",
    actorPerson: projectActor.personId,
    payload: { number: String(sent.number) },
  });
}

/**
 * Acceptance. The one act in v1 that creates a binding obligation, so it does
 * the most checking:
 *
 * 1. The actor is a named, authenticated person of the SUB office. A link
 *    cannot accept a price.
 * 2. The stored PDF is downloaded and re-hashed, and the hash must equal the
 *    one bound at send time. If the stored file were ever swapped, acceptance
 *    refuses rather than binding somebody to a document they never saw.
 * 3. The move is one conditional update from 'sent'.
 * 4. accepted_by_name is written from the actor's own name as a SNAPSHOT, so
 *    the record still says who accepted it even if that person is later
 *    deleted from the organization.
 */
export async function acceptPo(actor: Actor, projectId: string, poId: string): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "sub") throw new Error("Forbidden: the contractor accepts the naročilnica.");

  const db = createAdminClient();
  const { data: row } = await db
    .from("purchase_orders")
    .select("id, status, pdf_path, pdf_sha256, number")
    .eq("id", poId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row || row.status !== "sent") throw new Error(CONFLICT);
  if (!row.pdf_path || !row.pdf_sha256) throw new Error(CONFLICT);

  const stored = await db.storage.from("reports").download(row.pdf_path);
  if (stored.error || !stored.data) throw new Error("po.hashMismatch");
  const bytes = Buffer.from(await stored.data.arrayBuffer());
  if (sha256Of(bytes) !== row.pdf_sha256) throw new Error("po.hashMismatch");

  const { data: accepted, error } = await db
    .from("purchase_orders")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_person: person.personId,
      accepted_by_name: person.fullName,
    })
    .eq("id", poId)
    .eq("status", "sent")
    .select("id, number")
    .maybeSingle();
  if (error || !accepted) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId,
    kind: "po_accepted",
    actorPerson: person.personId,
    payload: { number: String(accepted.number), name: person.fullName },
  });
}

export async function rejectPo(
  actor: Actor,
  projectId: string,
  poId: string,
  note: string,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "sub") throw new Error("Forbidden: the contractor decides.");

  const reason = note.trim();
  if (!reason) throw new Error("po.rejectNote");

  const db = createAdminClient();
  const { data: rejected, error } = await db
    .from("purchase_orders")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_note: reason,
    })
    .eq("id", poId)
    .eq("project_id", projectId)
    .eq("status", "sent")
    .select("id, number")
    .maybeSingle();
  if (error || !rejected) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId,
    kind: "po_rejected",
    actorPerson: person.personId,
    payload: { number: String(rejected.number), note: reason },
  });
}

export function sha256Of(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function docLocale(language: string | null): DocLocale {
  return language === "de" || language === "en" ? language : "sl";
}

/**
 * Renders the document from the CURRENT database state. Exported because the
 * demo seed renders the same documents through this exact path, so a staged
 * naročilnica is a real one rather than a row pretending to be one.
 */
export async function renderPoPdf(
  db: ReturnType<typeof createAdminClient>,
  projectId: string,
  poId: string,
  acceptance: { name: string; at: string } | null,
): Promise<{ buffer: Buffer; sha256: string }> {
  const { data: project } = await db
    .from("projects")
    .select(
      "id, name, language, address_street, address_zip, address_city, epc_org_id, sub_org_id",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");

  const { data: po } = await db
    .from("purchase_orders")
    .select("id, number, total_net, regie_hourly_rate, payment_terms, deadline, created_at")
    .eq("id", poId)
    .maybeSingle();
  if (!po) throw new Error("Naročilnica not found");

  const { data: lines } = await db
    .from("purchase_order_lines")
    .select("description, qty, unit, unit_price, total, sort_order")
    .eq("purchase_order_id", poId)
    .order("sort_order", { ascending: true });

  const orgIds = [project.epc_org_id, project.sub_org_id].filter(Boolean) as string[];
  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, address, vat_id")
    .in("id", orgIds);

  const orgById = new Map((orgs ?? []).map((org) => [org.id, org]));
  const epc = orgById.get(project.epc_org_id);
  const sub = project.sub_org_id ? orgById.get(project.sub_org_id) : null;

  const locale = docLocale(project.language);
  const address = [project.address_street, [project.address_zip, project.address_city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");

  const buffer = await renderToBuffer(
    NarocilnicaDocument({
      number: po.number,
      locale,
      projectName: project.name,
      siteAddress: address || null,
      issuedOn: formatDate(po.created_at, locale),
      deadline: po.deadline ? formatDate(po.deadline, locale) : null,
      paymentTerms: po.payment_terms,
      regieHourlyRate: po.regie_hourly_rate === null ? null : Number(po.regie_hourly_rate),
      totalNet: Number(po.total_net),
      lines: (lines ?? []).map((line) => ({
        description: line.description,
        qty: line.qty === null ? null : Number(line.qty),
        unit: line.unit,
        unitPrice: line.unit_price === null ? null : Number(line.unit_price),
        total: Number(line.total),
      })),
      epcOrg: {
        name: epc?.name ?? "",
        address: epc?.address ?? null,
        vatId: epc?.vat_id ?? null,
      },
      subOrg: {
        name: sub?.name ?? "",
        address: sub?.address ?? null,
        vatId: sub?.vat_id ?? null,
      },
      acceptance,
      s: poStrings(locale),
    }),
  );

  return { buffer, sha256: sha256Of(buffer) };
}

function formatDate(value: string, locale: DocLocale): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
