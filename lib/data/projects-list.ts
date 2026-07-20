import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgActor } from "@/lib/actor";

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
export async function listProjectsForOrg(actor: OrgActor): Promise<ProjectListRow[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("projects")
    .select(
      "id, name, status, address_city, kwp, created_at, organizations!projects_sub_org_id_fkey (name), project_tokens (token, role, revoked)",
    )
    .eq("epc_org_id", actor.orgId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

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
