// Pure report shaping, framework-free so vitest can import it without the
// server-only guard (same split as actor-shared.ts, for the same reason).

export interface TodayPost {
  id: string;
  note: string | null;
  headcount: number | null;
  photoCount: number;
  quantities: { name: string; qty: number; unit: string }[];
  createdAt: string;
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
  photoCountByEntry: Record<string, number>,
  scopeById: Record<string, { name: string; unit: string }>
): TodayPost[] {
  return entries.map((e) => ({
    id: e.id,
    note: e.note,
    headcount: e.headcount,
    photoCount: photoCountByEntry[e.id] ?? 0,
    quantities: (quantitiesByEntry[e.id] ?? []).map((q) => ({
      name: scopeById[q.scope_item_id]?.name ?? "",
      unit: scopeById[q.scope_item_id]?.unit ?? "",
      qty: Number(q.qty),
    })),
    createdAt: e.created_at,
  }));
}
