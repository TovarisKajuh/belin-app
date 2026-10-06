import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_ORG_IDS,
  DEMO_PROJECT_TRENUTNO,
  DEMO_SHEET_OPEN,
  DEMO_PO_CURRENT,
  DEMO_PO_START,
} from "@/lib/demo/ids";
import type { DemoHealth } from "@/lib/demo/health-shared";

/** Read only. Never throws: a dead database is a red light, not an error page. */
export async function getDemoHealth(): Promise<DemoHealth> {
  const region = process.env.VERCEL_REGION?.trim() || null;
  const down: DemoHealth = { db: { ok: false, flagged: false, ms: null }, region, fresh: null, sheet: null, po: [] };
  try {
    const db = createAdminClient();
    const started = performance.now();
    const orgs = await db.from("organizations").select("id, is_demo").in("id", [...DEMO_ORG_IDS]);
    const ms = Math.round(performance.now() - started);
    if (orgs.error) return down;

    const [entry, sheet, pos] = await Promise.all([
      db
        .from("daily_entries")
        .select("entry_date")
        .eq("project_id", DEMO_PROJECT_TRENUTNO)
        .order("entry_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("hour_sheets").select("status, deadline_at").eq("id", DEMO_SHEET_OPEN).maybeSingle(),
      db.from("purchase_orders").select("pdf_path, pdf_sha256").in("id", [DEMO_PO_CURRENT, DEMO_PO_START]),
    ]);

    return {
      db: { ok: true, flagged: (orgs.data ?? []).filter((o) => o.is_demo).length === DEMO_ORG_IDS.length, ms },
      region,
      fresh: entry.data?.entry_date ?? null,
      sheet: sheet.data ?? null,
      po: pos.data ?? [],
    };
  } catch {
    return down;
  }
}
