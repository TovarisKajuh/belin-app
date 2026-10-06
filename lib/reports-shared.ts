// Pure report shaping, framework-free so vitest can import it without the
// server-only guard (same split as actor-shared.ts, for the same reason).

export interface TodayPost {
  id: string;
  note: string | null;
  headcount: number | null;
  photoCount: number;
  photoUrls: string[];
  quantities: { name: string; qty: number; unit: string }[];
  createdAt: string;
  /**
   * Who filed it. Optional because today's list does not ask: on the crew
   * screen everyone present already knows, and on the EPC's live feed the day
   * is the unit. The diary DOES ask, because "who wrote this" is most of what
   * a record is for once the day is over.
   */
  author?: string | null;
}

export interface EntryRow {
  id: string;
  note: string | null;
  headcount: number | null;
  created_at: string;
}

export function summarizeTodayPosts(
  entries: EntryRow[],
  quantitiesByEntry: Record<string, { scope_item_id: string; qty: number }[]>,
  photoUrlsByEntry: Record<string, string[]>,
  scopeById: Record<string, { name: string; unit: string }>
): TodayPost[] {
  return entries.map((e) => {
    const photoUrls = photoUrlsByEntry[e.id] ?? [];
    return {
      id: e.id,
      note: e.note,
      headcount: e.headcount,
      photoCount: photoUrls.length,
      photoUrls,
      quantities: (quantitiesByEntry[e.id] ?? []).map((q) => ({
        name: scopeById[q.scope_item_id]?.name ?? "",
        unit: scopeById[q.scope_item_id]?.unit ?? "",
        qty: Number(q.qty),
      })),
      createdAt: e.created_at,
    };
  });
}

/** The last reported day before today, for the "Kot včeraj" prefill. */
export interface LastReport {
  date: string;
  headcount: number | null;
  /** Scope item id to the quantity installed that day, summed across entries. */
  quantities: Record<string, number>;
}

export function summarizeLastReport(
  entries: { id: string; entry_date: string; headcount: number | null }[],
  quantities: { entry_id: string; scope_item_id: string; qty: number }[],
): LastReport | null {
  if (entries.length === 0) return null;
  const date = entries.reduce((max, e) => (e.entry_date > max ? e.entry_date : max), entries[0].entry_date);
  const day = entries.filter((e) => e.entry_date === date);
  const ids = new Set(day.map((e) => e.id));
  const heads = day.map((e) => e.headcount).filter((h): h is number => h != null);
  const totals: Record<string, number> = {};
  for (const q of quantities) {
    if (!ids.has(q.entry_id)) continue;
    totals[q.scope_item_id] = (totals[q.scope_item_id] ?? 0) + Number(q.qty);
  }
  return { date, headcount: heads.length > 0 ? Math.max(...heads) : null, quantities: totals };
}

export function remainingQty(target: number, installed: number): number {
  return Math.max(0, target - installed);
}

export function bumpQty(current: number, delta: number, max: number): number {
  return Math.max(0, Math.min(max, current + delta));
}

export function applyLikeLast(
  last: LastReport,
  scope: { id: string; targetQty: number; installedQty: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of scope) {
    const capped = Math.min(last.quantities[item.id] ?? 0, remainingQty(item.targetQty, item.installedQty));
    if (capped > 0) out[item.id] = capped;
  }
  return out;
}

/** Pieces and metres are counted, not measured: digits only, spaces ignored. */
export function parseWholeNumber(raw: string): number | null {
  const digits = raw.replace(/\s/g, "");
  return /^\d{1,6}$/.test(digits) ? Number(digits) : null;
}

export function previousDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
