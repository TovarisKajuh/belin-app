import "server-only";
import { after } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseK2Pdf } from "@/lib/k2/k2-pdf";
import {
  projectDraftFromParse,
  type DraftItem,
  type DraftRoof,
  type ProjectDraft,
} from "@/lib/k2/k2-project";
import { emptyMetadata, type K2ParseResult, type K2WarningCode } from "@/lib/k2/k2-shared";
import type { OrgActor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";

// The cap is enforced on the RECEIVED BYTES, before a single byte reaches the
// parser. Real K2 reports with site photos run to a few tens of megabytes.
const MAX_PDF_BYTES = 30 * 1024 * 1024;

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

function isPdf(fileName: string, mime: string): boolean {
  return mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
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
  actor: OrgActor,
  file: { bytes: Uint8Array; name: string; mime: string },
  opts: { fallbackCountry: string; locale: string },
): Promise<{ ok: true; upload: PlanUpload } | { ok: false; error: PlanUploadError }> {
  if (!isPdf(file.name, file.mime)) return { ok: false, error: "bad_type" };

  // Somebody is starting a wizard, which is the one moment we know abandoned
  // ones exist. Deferred so a slow sweep never delays a 30 MB upload, and
  // swallowed so a failed sweep never fails the upload: the next one retries.
  try {
    after(() => sweepAbandonedPlans().catch(() => {}));
  } catch {
    // Outside a request scope (a script), where there is nothing to defer to.
  }

  if (file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_PDF_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const importId = randomUUID();
  // No project exists yet (the wizard is plan first), so the path is keyed by
  // the import alone. createProjectFromReview leaves it there and records it as
  // the project's plan path.
  const storagePath = `pending/${importId}.pdf`;

  const db = createAdminClient();
  const { error: uploadError } = await db.storage
    .from("plans")
    .upload(storagePath, file.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) return { ok: false, error: "upload_failed" };

  // The parser never throws (its tests pin that), but this call site is where a
  // future vendor adapter might, so the guard stays: a broken parse must
  // degrade to the manual path, never 500 the wizard.
  let parsed: K2ParseResult;
  try {
    parsed = await parseK2Pdf(file.bytes);
  } catch {
    parsed = { ok: false, metadata: emptyMetadata(), items: [], warnings: [], diagnostics: [] };
  }

  const { error: insertError } = await db.from("plan_imports").insert({
    id: importId,
    source: "k2_pdf",
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

/** Rows younger than this are somebody's open wizard tab, not litter. */
const ABANDONED_AFTER_HOURS = 24;

/**
 * Deletes plan uploads that never became a project, file first.
 *
 * Every abandoned upload is a customer's construction plan sitting in storage
 * for no reason: an address, a roof layout and a bill of materials belonging to
 * a third party who never agreed to us keeping it. So this is a retention rule
 * before it is a housekeeping one.
 *
 * The object goes before the row, deliberately. If the delete succeeds and the
 * process dies before the row goes, the next sweep tries again and Storage
 * shrugs at a missing key. The other order would drop the only pointer to the
 * file and leave it in the bucket forever, which is the exact failure this is
 * meant to prevent.
 *
 * A row is abandoned when it never got a project AND is not committed. Both
 * conditions, because either one alone would be a guess: create_project_from
 * _review sets them together, and deleting the plan of a live project would
 * take the file the project page links to.
 *
 * Called opportunistically when somebody starts a new upload rather than from a
 * scheduler, following the same lazy pattern as the deemed-approval clock: this
 * codebase runs no cron, and a sweep nobody triggers is a sweep that never runs.
 *
 * The sweep is global, not scoped to the uploader's org, precisely because of
 * what that leaves uncovered: an EPC who abandons an upload and never returns
 * would otherwise keep a customer's plan forever. Any active EPC now cleans up
 * after every inactive one. The residual gap is a period with no uploads at all
 * anywhere, which is recorded as debt rather than solved with a cron this
 * codebase does not have.
 */
export async function sweepAbandonedPlans(): Promise<{ rows: number; files: number }> {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 3600_000).toISOString();
  const db = createAdminClient();

  const { data: stale } = await db
    .from("plan_imports")
    .select("id, storage_path")
    .is("project_id", null)
    .neq("status", "committed")
    .lt("created_at", cutoff);

  if (!stale?.length) return { rows: 0, files: 0 };

  const paths = stale.map((row) => row.storage_path).filter(Boolean);
  const { data: removed } = await db.storage.from("plans").remove(paths);

  const { data: deleted } = await db
    .from("plan_imports")
    .delete()
    .in("id", stale.map((row) => row.id))
    .select("id");

  return { rows: deleted?.length ?? 0, files: removed?.length ?? 0 };
}

/**
 * The subcontractors this EPC has already worked with. Deliberately not every
 * sub in the database: the picker must not become a directory of other
 * companies' partners.
 */
export async function listKnownSubs(actor: OrgActor): Promise<SubOption[]> {
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
  actor: OrgActor,
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
