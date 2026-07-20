import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The organization's own country, used only as the DEFAULT for a new project
 * when the uploaded plan does not name one. An EPC routinely builds across the
 * border, so the plan's own country always wins over this.
 */
export async function orgCountry(orgId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .select("country")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data?.country) return null;
  return data.country.toLowerCase();
}
