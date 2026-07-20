import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseK2Pdf } from "@/lib/k2/k2-pdf";
import { parseK2Xlsx } from "@/lib/k2/k2-xlsx";
import {
  projectDraftFromParse,
  type DraftItem,
  type DraftRoof,
  type ProjectDraft,
} from "@/lib/k2/k2-project";
import { emptyMetadata, type K2ParseResult, type K2WarningCode } from "@/lib/k2/k2-shared";
import type { Actor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";

// Caps are enforced on the RECEIVED BYTES, before a single byte reaches a
// parser: an xlsx is a zip, and an unbounded one is a decompression bomb that
// pins a serverless CPU. A PDF gets more room because real K2 reports with
// site photos run to a few tens of megabytes.
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_XLSX_BYTES = 5 * 1024 * 1024;

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type PlanUploadError = "too_large" | "bad_type" | "upload_failed";

export interface PlanUpload {
  importId: string;
  recognized: boolean; // the file parsed as a K2 report
  draft: ProjectDraft;
  warnings: K2WarningCode[];
  itemCount: number;
}

export interface SubOption {
  id: string;
  name: string;
}

function extensionFor(fileName: string, mime: string): "pdf" | "xlsx" | null {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime === XLSX_MIME || lower.endsWith(".xlsx")) return "xlsx";
  return null;
}

/** A URL safe token that satisfies isPlausibleToken (8 to 64 of [A-Za-z0-9_-]). */
function mintToken(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Stores the uploaded plan and parses it.
 *
 * A file that is not a K2 report is NOT an error: the import row is written
 * either way and the EPC continues on the manual path with an empty draft.
 * The only failures are refusals to accept the file at all.
 */
export async function uploadAndParsePlan(
  actor: Actor,
  file: { bytes: Uint8Array; name: string; mime: string },
  opts: { fallbackCountry: string; locale: string },
): Promise<{ ok: true; upload: PlanUpload } | { ok: false; error: PlanUploadError }> {
  const ext = extensionFor(file.name, file.mime);
  if (!ext) return { ok: false, error: "bad_type" };

  const cap = ext === "pdf" ? MAX_PDF_BYTES : MAX_XLSX_BYTES;
  if (file.bytes.byteLength === 0 || file.bytes.byteLength > cap) {
    return { ok: false, error: "too_large" };
  }

  const importId = randomUUID();
  // No project exists yet (the wizard is plan first), so the path is keyed by
  // the import alone. createProjectFromReview leaves it there and records it as
  // the project's plan path.
  const storagePath = `pending/${importId}.${ext}`;

  const db = createAdminClient();
  const { error: uploadError } = await db.storage
    .from("plans")
    .upload(storagePath, file.bytes, {
      contentType: ext === "pdf" ? "application/pdf" : XLSX_MIME,
      upsert: false,
    });
  if (uploadError) return { ok: false, error: "upload_failed" };

  // The parsers never throw (their tests pin that), but this call site is where
  // a future vendor adapter might, so the guard stays: a broken parse must
  // degrade to the manual path, never 500 the wizard.
  let parsed: K2ParseResult;
  try {
    parsed = ext === "pdf" ? await parseK2Pdf(file.bytes) : await parseK2Xlsx(file.bytes);
  } catch {
    parsed = { ok: false, metadata: emptyMetadata(), items: [], warnings: [] };
  }

  const { error: insertError } = await db.from("plan_imports").insert({
    id: importId,
    source: ext === "pdf" ? "k2_pdf" : "k2_xlsx",
    storage_path: storagePath,
    parsed: parsed as unknown as Json,
  });
  if (insertError) return { ok: false, error: "upload_failed" };

  const draft = projectDraftFromParse(parsed, opts);
  return {
    ok: true,
    upload: {
      importId,
      recognized: parsed.ok,
      draft,
      warnings: parsed.warnings,
      itemCount: parsed.items.length,
    },
  };
}

/**
 * The subcontractors this EPC has already worked with. Deliberately not every
 * sub in the database: the picker must not become a directory of other
 * companies' partners.
 */
export async function listKnownSubs(actor: Actor): Promise<SubOption[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("sub_org_id, organizations!projects_sub_org_id_fkey (id, name)")
    .eq("epc_org_id", actor.orgId)
    .not("sub_org_id", "is", null);

  if (error || !data) return [];

  const byId = new Map<string, SubOption>();
  for (const row of data) {
    const org = row.organizations as { id: string; name: string } | null;
    if (org) byId.set(org.id, { id: org.id, name: org.name });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface ReviewPayload {
  importId: string;
  subOrgId: string | null;
  project: {
    name: string;
    country: string;
    language: string;
    addressStreet: string | null;
    addressZip: string | null;
    addressCity: string | null;
    kwp: number | null;
    moduleCount: number | null;
    moduleType: string | null;
    mountingSystem: string | null;
    roofType: string | null;
    plannedStart: string | null;
    plannedEnd: string | null;
  };
  items: DraftItem[];
  roofs: DraftRoof[];
}

/**
 * Creates the project, its tokens and its material list in ONE transaction.
 * Everything the client sent is validated inside the function, which also
 * refuses a second commit of the same import.
 */
export async function createProjectFromReview(
  actor: Actor,
  payload: ReviewPayload,
): Promise<{ ok: true; projectId: string; epcToken: string } | { ok: false }> {
  const db = createAdminClient();

  // Minted here rather than in the function so the caller can hand the EPC its
  // own link immediately, without a second read.
  const epcToken = mintToken();

  const { data, error } = await db.rpc("create_project_from_review", {
    p_import_id: payload.importId,
    p_epc_org_id: actor.orgId,
    p_sub_org_id: payload.subOrgId,
    // Both are plain data the function reads with ->> and validates itself;
    // the cast is only about our interface types lacking a Json index signature.
    p_project: payload.project as unknown as Json,
    p_items: payload.items as unknown as Json,
    p_epc_token: epcToken,
    p_sub_token: payload.subOrgId ? mintToken() : null,
    p_roofs: payload.roofs as unknown as Json,
  });

  if (error || typeof data !== "string") return { ok: false };
  return { ok: true, projectId: data, epcToken };
}
