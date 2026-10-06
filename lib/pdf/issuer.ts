// The issuing company of a document: its name and, when uploaded, its logo.
//
// Logos live in the private `docs` bucket at `<orgId>/logo/<uuid>.<png|jpg>`,
// written once per upload (scripts/set-org-logo.ts), and are read with a plain
// download the way signatures are: the path never changes after it is written,
// so the download cache cannot serve a stale file (docs/known-issues.md 2).
//
// Not "server-only": the database client is a parameter, like render-po.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { imageSize } from "@/lib/pdf/image-size";
import type { DocIssuer } from "@/lib/pdf/theme";

type Db = SupabaseClient<any, any, any>;

/** 1.5 MB is far above any sane letterhead logo and far below a slow render. */
const MAX_LOGO_BYTES = 1_500_000;

export async function loadLogo(db: Db, logoPath: string | null | undefined): Promise<Buffer | null> {
  if (!logoPath) return null;
  try {
    const file = await db.storage.from("docs").download(logoPath);
    if (file.error || !file.data) return null;
    const bytes = Buffer.from(await file.data.arrayBuffer());
    if (bytes.byteLength > MAX_LOGO_BYTES) return null;
    // imageSize accepts only PNG and JPEG, which is exactly what @react-pdf can draw.
    return imageSize(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

/** Name, address and logo of one organization. An unknown id prints an empty issuer, never throws. */
export async function loadIssuer(db: Db, orgId: string | null | undefined): Promise<DocIssuer> {
  if (!orgId) return { name: "", address: null, logo: null };
  const { data } = await db.from("organizations").select("name, address, logo_path").eq("id", orgId).maybeSingle();
  if (!data) return { name: "", address: null, logo: null };
  return { name: data.name ?? "", address: data.address ?? null, logo: await loadLogo(db, data.logo_path) };
}
