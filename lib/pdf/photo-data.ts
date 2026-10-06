// Downloading photographs for a document.
//
// Not "server-only", following render-po.tsx: it takes the database client as
// a parameter, so a script can call it under plain Node.
//
// SHRUNK FOR PRINT, THEN MEASURED. A phone photo is several megabytes and
// prints a few centimetres wide; embedding it whole made a nine day completion
// report about 10 MB (documents M6, Task 3.4). Every photo is turned upright and
// resized to at most 1200 px on its long edge, JPEG quality 72, BEFORE its size
// is read, so the width and height a layout uses describe the bytes that are
// printed. This is Task 3.4's shrinkForPrint, moved here so every document
// shares it.
//
// Six downloads at a time (Task 3.4's number): one at a time made a long report
// slow, and all at once on a weak connection fails the whole batch. A photo
// that fails, or is not JPEG or PNG after shrinking (@react-pdf cannot draw
// WebP or HEIC), is skipped and never thrown: a document missing one photo is
// worth more than no document.

import type { SupabaseClient } from "@supabase/supabase-js";
import { imageSize } from "@/lib/pdf/image-size";
import type { DocPhoto } from "@/lib/pdf/photos";

export interface PhotoRequest {
  /** A path in the private photos bucket, read from a row the caller is authorized for. */
  path: string;
  caption: string | null;
}

/** Long edge of a printed photo: two per row on A4 at about 200 dpi need less than this. */
const PRINT_EDGE_PX = 1200;

/** If sharp cannot load on the server, the original bytes are used: bigger, never wrong. */
export async function shrinkForPrint(bytes: Buffer): Promise<Buffer> {
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(bytes)
      .rotate()
      .resize({ width: PRINT_EDGE_PX, height: PRINT_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn(`[photos] sharp unavailable, embedding the original photo: ${err instanceof Error ? err.message : String(err)}`);
    return bytes;
  }
}

/**
 * One result per request, in order, null where a photo was skipped. A caller
 * that batches several days into ONE parallel download (the completion report)
 * uses this to split the results back per day.
 */
export async function downloadDocPhotosAligned(
  db: SupabaseClient<any, any, any>,
  requests: PhotoRequest[],
  { concurrency = 6, shrink = true }: { concurrency?: number; shrink?: boolean } = {},
): Promise<(DocPhoto | null)[]> {
  const out: (DocPhoto | null)[] = requests.map(() => null);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < requests.length) {
      const i = next++;
      try {
        const file = await db.storage.from("photos").download(requests[i].path);
        if (file.error || !file.data) continue;
        const original = Buffer.from(await file.data.arrayBuffer());
        const bytes = shrink ? await shrinkForPrint(original) : original;
        const size = imageSize(bytes);
        if (!size) continue;
        out[i] = { bytes, width: size.width, height: size.height, caption: requests[i].caption };
      } catch {
        // skipped: see the header
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, requests.length) }, () => worker()));
  return out;
}

/** The photos that could be downloaded and drawn, in request order. */
export async function downloadDocPhotos(
  db: SupabaseClient<any, any, any>,
  requests: PhotoRequest[],
  options: { concurrency?: number; shrink?: boolean } = {},
): Promise<DocPhoto[]> {
  const out = await downloadDocPhotosAligned(db, requests, options);
  return out.filter((photo): photo is DocPhoto => photo !== null);
}
