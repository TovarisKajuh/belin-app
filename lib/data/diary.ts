import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfReadFailed } from "@/lib/db-error";
import type { ProjectActor } from "@/lib/actor";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import type { TodayPost } from "@/lib/reports-shared";

/** One day of the site's history, newest first, as the crew filed it. */
export interface DiaryDay {
  dateIso: string;
  headcount: number | null;
  posts: TodayPost[];
}

/** How far back the roof screen looks. */
const DEFAULT_DAYS = 14;
/** Photos shown per entry. Every one costs a signed URL to mint and a download
 *  on a phone connection, and the diary is for reading what happened, not for
 *  browsing an album. */
const PHOTOS_PER_ENTRY = 4;

/**
 * The site diary: what was filed on this project, day by day, and by whom.
 *
 * Deliberately NOT the completion report's day builder. That one numbers every
 * calendar day of the job, folds in incidents and weather and exists to produce
 * a legal document; this is a phone list of the last two weeks. Sharing the
 * query would tie a screen a roofer opens on LTE to the shape of a PDF.
 */
export async function getCrewDiary(
  actor: ProjectActor,
  { days = DEFAULT_DAYS }: { days?: number } = {},
): Promise<DiaryDay[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("daily_entries")
    .select(
      "id, entry_date, headcount, note, created_at, people:created_by_person (full_name), entry_quantities (qty, scope_items (name, unit)), entry_photos (storage_path, sort_order)",
    )
    .eq("project_id", actor.projectId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    // Generous enough that the day cap below, not this, decides what is shown:
    // several crews can file several reports on one day.
    .limit(days * 8);

  throwIfReadFailed(error, "getCrewDiary");
  if (!data) return [];

  // Signed in ONE batch for the whole page. Minting them per entry would be a
  // request per photo on the connection least able to afford it.
  const paths = data.flatMap((entry) =>
    (entry.entry_photos ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, PHOTOS_PER_ENTRY)
      .map((photo) => photo.storage_path),
  );
  const urlByPath = await getSignedPhotoUrlMap(paths);

  const byDate = new Map<string, DiaryDay>();
  for (const entry of data) {
    if (!byDate.has(entry.entry_date) && byDate.size >= days) continue;

    const day =
      byDate.get(entry.entry_date) ??
      (() => {
        const fresh: DiaryDay = { dateIso: entry.entry_date, headcount: null, posts: [] };
        byDate.set(entry.entry_date, fresh);
        return fresh;
      })();

    const photoUrls = (entry.entry_photos ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, PHOTOS_PER_ENTRY)
      .map((photo) => urlByPath[photo.storage_path])
      .filter((url): url is string => Boolean(url));

    day.posts.push({
      id: entry.id,
      note: entry.note,
      headcount: entry.headcount,
      photoCount: photoUrls.length,
      photoUrls,
      quantities: (entry.entry_quantities ?? [])
        .filter((quantity) => Number(quantity.qty) > 0)
        .map((quantity) => ({
          name: quantity.scope_items?.name ?? "",
          qty: Number(quantity.qty),
          unit: quantity.scope_items?.unit ?? "",
        })),
      createdAt: entry.created_at,
      author: entry.people?.full_name ?? null,
    });

    // The crew count of a day is the one recorded when work started, which is
    // the earliest entry: the rows arrive newest first, so the last one wins.
    if (entry.headcount !== null) day.headcount = entry.headcount;
  }

  return [...byDate.values()];
}
