import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { projectProgress } from "@/lib/progress";
import { effectiveStatus, type SheetStatus } from "@/lib/hours-shared";

// The portfolio: every project the organization is a party to, with the four
// numbers somebody actually opens this screen to find.
//
// The aggregates are HEADLINE NUMBERS, not charts. "Three active projects" and
// "two open hour sheets" are single values, and a bar chart of four unrelated
// counts would be decoration that takes longer to read than the numbers do.
// The only thing here that earns a mark is each project's progress trend,
// which is a shape rather than a value.
//
// Everything is loaded in five queries across the whole portfolio rather than
// per project: an EPC with twenty projects should not pay twenty round trips
// for a list screen.

export interface PortfolioProject {
  id: string;
  name: string;
  city: string | null;
  status: string;
  kwp: number | null;
  subName: string | null;
  progressPercent: number;
  /** Cumulative progress per reported day, oldest first, for the sparkline. */
  trend: number[];
  openHours: number;
  openRequests: number;
  incidentsThisWeek: number;
  lastActivity: string | null;
}

export interface PortfolioData {
  activeCount: number;
  openHourSheets: number;
  incidentsThisWeek: number;
  kwpInProgress: number;
  projects: PortfolioProject[];
}

export async function getPortfolio(actor: OrgActor): Promise<PortfolioData> {
  const empty: PortfolioData = {
    activeCount: 0,
    openHourSheets: 0,
    incidentsThisWeek: 0,
    kwpInProgress: 0,
    projects: [],
  };
  if (!isUuid(actor.orgId)) return empty;

  const db = createAdminClient();

  const { data: projects } = await db
    .from("projects")
    .select(
      "id, name, status, address_city, kwp, created_at, organizations!projects_sub_org_id_fkey (name)",
    )
    .or(`epc_org_id.eq.${actor.orgId},sub_org_id.eq.${actor.orgId}`)
    .order("created_at", { ascending: false });

  if (!projects || projects.length === 0) return empty;
  const ids = projects.map((project) => project.id);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [scopeRes, quantityRes, sheetRes, requestRes, incidentRes, activityRes] = await Promise.all([
    db.from("scope_items").select("id, project_id, weight, target_qty").in("project_id", ids),
    db
      .from("entry_quantities")
      .select("scope_item_id, qty, daily_entries!inner (project_id, entry_date)")
      .in("daily_entries.project_id", ids),
    db
      .from("hour_sheets")
      .select("project_id, status, deadline_at")
      .in("project_id", ids)
      .eq("status", "submitted"),
    db
      .from("requests")
      .select("project_id")
      .in("project_id", ids)
      .eq("status", "open"),
    db
      .from("incidents")
      .select("project_id, occurred_on")
      .in("project_id", ids)
      .gte("occurred_on", weekAgo),
    db
      .from("activity")
      .select("project_id, created_at")
      .in("project_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const scopeByProject = new Map<string, { id: string; weight: number; target: number }[]>();
  for (const item of scopeRes.data ?? []) {
    const list = scopeByProject.get(item.project_id) ?? [];
    list.push({ id: item.id, weight: Number(item.weight), target: Number(item.target_qty) });
    scopeByProject.set(item.project_id, list);
  }

  // Installed quantity per scope item, and per (project, date) for the trend.
  const installedByItem = new Map<string, number>();
  const byProjectDate = new Map<string, Map<string, Map<string, number>>>();
  for (const row of quantityRes.data ?? []) {
    const entry = row.daily_entries as unknown as { project_id: string; entry_date: string };
    const qty = Number(row.qty);
    installedByItem.set(row.scope_item_id, (installedByItem.get(row.scope_item_id) ?? 0) + qty);

    const dates = byProjectDate.get(entry.project_id) ?? new Map();
    const items = dates.get(entry.entry_date) ?? new Map();
    items.set(row.scope_item_id, (items.get(row.scope_item_id) ?? 0) + qty);
    dates.set(entry.entry_date, items);
    byProjectDate.set(entry.project_id, dates);
  }

  const now = new Date();
  const countBy = (rows: { project_id: string }[] | null | undefined) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.project_id, (map.get(row.project_id) ?? 0) + 1);
    return map;
  };

  const openHoursByProject = countBy(
    (sheetRes.data ?? []).filter(
      (sheet) =>
        effectiveStatus(
          { status: sheet.status as SheetStatus, deadline_at: sheet.deadline_at },
          now,
        ) === "submitted",
    ),
  );
  const requestsByProject = countBy(requestRes.data);
  const incidentsByProject = countBy(incidentRes.data);

  const lastActivityByProject = new Map<string, string>();
  for (const row of activityRes.data ?? []) {
    if (!lastActivityByProject.has(row.project_id)) {
      lastActivityByProject.set(row.project_id, row.created_at);
    }
  }

  const rows: PortfolioProject[] = projects.map((project) => {
    const scope = scopeByProject.get(project.id) ?? [];

    const progressPercent = projectProgress(
      scope.map((item) => ({
        weight: item.weight,
        targetQty: item.target,
        installedQty: installedByItem.get(item.id) ?? 0,
      })),
    );

    // Cumulative progress per reported day: the shape of how the job moved,
    // which is the one thing on this screen a number cannot say.
    const dates = [...(byProjectDate.get(project.id)?.keys() ?? [])].sort();
    const running = new Map<string, number>();
    const trend = dates.map((date) => {
      for (const [itemId, qty] of byProjectDate.get(project.id)?.get(date) ?? []) {
        running.set(itemId, (running.get(itemId) ?? 0) + qty);
      }
      return projectProgress(
        scope.map((item) => ({
          weight: item.weight,
          targetQty: item.target,
          installedQty: running.get(item.id) ?? 0,
        })),
      );
    });

    return {
      id: project.id,
      name: project.name,
      city: project.address_city,
      status: project.status,
      kwp: project.kwp === null ? null : Number(project.kwp),
      subName: (project.organizations as { name: string } | null)?.name ?? null,
      progressPercent,
      trend,
      openHours: openHoursByProject.get(project.id) ?? 0,
      openRequests: requestsByProject.get(project.id) ?? 0,
      incidentsThisWeek: incidentsByProject.get(project.id) ?? 0,
      lastActivity: lastActivityByProject.get(project.id) ?? null,
    };
  });

  // What is running comes first.
  //
  // Creation order is the wrong order for this screen. An EPC opens it to see
  // the jobs that can still go wrong today, and a portfolio with four delivered
  // projects in it pushed the live ones to the bottom of the list. Within a
  // band the most recently touched project leads, because that is the one the
  // reader was just thinking about.
  const RANK: Record<string, number> = {
    active: 0,
    reviewing: 1,
    paused: 2,
    draft: 3,
    finished: 4,
    cancelled: 5,
  };
  rows.sort((a, b) => {
    const byStatus = (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
  });

  const active = rows.filter((row) => row.status === "active");

  return {
    activeCount: active.length,
    openHourSheets: rows.reduce((sum, row) => sum + row.openHours, 0),
    incidentsThisWeek: rows.reduce((sum, row) => sum + row.incidentsThisWeek, 0),
    // Only what is actually being built: a finished or cancelled roof is not
    // capacity in progress.
    kwpInProgress: Math.round(active.reduce((sum, row) => sum + (row.kwp ?? 0), 0)),
    projects: rows,
  };
}
