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
