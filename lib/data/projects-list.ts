import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfReadFailed } from "@/lib/db-error";
import type { OrgActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

export interface ProjectListRow {
  id: string;
  name: string;
  status: string;
  city: string | null;
  kwp: number | null;
  subName: string | null;
  epcToken: string | null;
  createdAt: string;
}

/**
 * Every project belonging to the acting EPC organization, newest first.
 *
 * Each row carries its own EPC access token, because identity is still bound to
 * a project token: without it a project created in the wizard would only be
 * reachable through the link shown once on the done screen. When accounts land
 * (master plan Part B) the token stops being needed here and this becomes a
 * plain id link.
 */
/**
 * Every project the acting organization is a party to, on either side, newest
 * first. A signed-in person needs this rather than listProjectsForOrg, because
 * a subcontractor's projects are the ones where their org sits in sub_org_id,
 * and asking only about epc_org_id would show them nothing at all.
 *
 * No token is carried: a person opens a project by id, having proved who they
 * are, so there is nothing to hand out.
 */
export async function listProjectsForPerson(actor: OrgActor): Promise<ProjectListRow[]> {
  // The or() filter builds a query string, so the id is interpolated rather
  // than bound. It comes from our own session lookup, never from a request, but
  // it is checked anyway: a value that reaches a query by interpolation should
  // never be trusted on provenance alone.
  if (!isUuid(actor.orgId)) return [];

  const db = createAdminClient();

  const { data, error } = await db
    .from("projects")
    .select(
      "id, name, status, address_city, kwp, created_at, organizations!projects_sub_org_id_fkey (name)",
    )
    .or(`epc_org_id.eq.${actor.orgId},sub_org_id.eq.${actor.orgId}`)
    .order("created_at", { ascending: false });

  // An outage must not look like an empty portfolio: that reads as data loss.
  throwIfReadFailed(error, "listProjectsForPerson");
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    city: row.address_city,
    kwp: row.kwp,
    subName: (row.organizations as { name: string } | null)?.name ?? null,
    epcToken: null,
    createdAt: row.created_at,
  }));
}

export async function listProjectsForOrg(actor: OrgActor): Promise<ProjectListRow[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("projects")
    .select(
      "id, name, status, address_city, kwp, created_at, organizations!projects_sub_org_id_fkey (name), project_tokens (token, role, revoked)",
    )
    .eq("epc_org_id", actor.orgId)
    .order("created_at", { ascending: false });

  throwIfReadFailed(error, "listProjectsForOrg");
  if (!data) return [];

  return data.map((row) => {
    const tokens = (row.project_tokens ?? []) as {
      token: string;
      role: string;
      revoked: boolean;
    }[];
    const epc = tokens.find((t) => t.role === "epc" && !t.revoked);
    const sub = row.organizations as { name: string } | null;

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      city: row.address_city,
      kwp: row.kwp === null ? null : Number(row.kwp),
      subName: sub?.name ?? null,
      epcToken: epc?.token ?? null,
      createdAt: row.created_at,
    };
  });
}

/**
 * The project's name when it still has no subcontractor, or null when one is
 * attached. Used to decide whether to surface the invite panel.
 */
export async function projectNeedsSub(
  projectId: string,
): Promise<{ name: string } | null> {
  if (!isUuid(projectId)) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("projects")
    .select("name, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!data || data.sub_org_id) return null;
  return { name: data.name };
}
